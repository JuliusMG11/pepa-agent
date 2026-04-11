# Web Security

## Core principles
- Defence in depth: multiple layers, assume any single layer can fail
- Principle of least privilege: every component gets only the access it needs
- Never trust client input — validate and sanitise on the server always
- Secrets never touch the client bundle

## Environment variables
```
# NEVER prefix with NEXT_PUBLIC_ unless the value is safe to be public
NEXT_PUBLIC_SUPABASE_URL=          # safe — public anon endpoint
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # safe — anon key with RLS protection

# Server-only — never expose to client
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
TELEGRAM_BOT_TOKEN=
GOOGLE_CLIENT_SECRET=
```

Check: `grep -r "SUPABASE_SERVICE_ROLE_KEY\|ANTHROPIC_API_KEY\|TELEGRAM_BOT_TOKEN" src/` — must return zero results.

## Input validation
Use Zod for all external input: API routes, server actions, Telegram messages, form submissions.

```typescript
import { z } from 'zod'

const AgentQuerySchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
})

// In API route / server action
export async function POST(req: Request) {
  const body = await req.json()
  const parsed = AgentQuerySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 })
  }
  // Use parsed.data — type-safe and validated
}
```

## SQL injection prevention
- NEVER interpolate user input into SQL strings
- Always use Supabase client methods (parameterised queries under the hood)
- For dynamic queries in the agent, use a whitelist of allowed columns/operators

```typescript
// BAD — SQL injection risk
const { data } = await supabase.rpc('run_sql', { query: userInput })

// GOOD — parameterised via Supabase client
const { data } = await supabase
  .from('properties')
  .select('*')
  .eq('district', district)    // district is validated, not interpolated
  .eq('status', status)
```

## Telegram bot security
```typescript
// Verify every incoming webhook is from Telegram
import { createHmac } from 'crypto'

function verifyTelegramWebhook(body: string, secretToken: string, headerToken: string): boolean {
  const hmac = createHmac('sha256', secretToken).update(body).digest('hex')
  return hmac === headerToken
}

// Whitelist authorised Telegram user IDs — only allowed users can query agent
const ALLOWED_TELEGRAM_USER_IDS = process.env.TELEGRAM_ALLOWED_USER_IDS!
  .split(',')
  .map(Number)

function isAuthorisedUser(userId: number): boolean {
  return ALLOWED_TELEGRAM_USER_IDS.includes(userId)
}
```

## Authentication & sessions (Supabase Auth)
- Sessions managed by Supabase — use `@supabase/ssr` middleware to refresh tokens
- Validate session server-side in every API route and server action
- Never pass user ID from the client — always derive from server-side session

```typescript
// Every protected server action starts with this
const supabase = createServerClient(...)
const { data: { user } } = await supabase.auth.getUser()
if (!user) throw new Error('Unauthorised')
```

## API route protection
```typescript
// Middleware: protect all /api/agent/* routes
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/agent')) {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }
  }
}
```

## Rate limiting
- Apply rate limiting to all AI agent endpoints (Claude API is expensive)
- Use Supabase to track request counts per user per minute

```typescript
async function checkRateLimit(userId: string, limitPerMinute = 10): Promise<boolean> {
  const windowStart = new Date(Date.now() - 60_000).toISOString()
  const { count } = await supabase
    .from('agent_conversations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', windowStart)

  return (count ?? 0) < limitPerMinute
}
```

## Content Security Policy (Next.js)
```typescript
// next.config.ts
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://api.telegram.org;
  frame-ancestors 'none';
`
```

## Secrets rotation checklist
- Rotate `SUPABASE_SERVICE_ROLE_KEY` if it ever appears in logs or git history
- Rotate `TELEGRAM_BOT_TOKEN` if bot is cloned or token is exposed
- Use `git-secrets` or similar to prevent accidental commits of secrets

## Dependency security
- Run `pnpm audit` in CI — fail on high/critical vulnerabilities
- Pin exact versions in `package.json` for production dependencies
- Review Supabase RLS policies after every schema change
