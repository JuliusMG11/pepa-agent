# Error Handling

Every layer of the app has a specific error handling strategy. This file defines the patterns — follow them consistently.

---

## Hierarchy

```
User-facing message (Czech)
    ↑
API route / Server Action (catches, formats)
    ↑
Service / lib function (throws typed errors)
    ↑
External API / DB call (raw errors)
```

Never let raw errors reach the user. Never swallow errors silently.

---

## Result pattern — all agent tools

Every tool function returns a `Result<T>` — never throws to the caller.

```typescript
// src/types/result.ts
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E }

export interface AppError {
  code: ErrorCode
  message: string        // technical (English, for logs)
  userMessage: string    // user-facing (Czech, for UI)
}

export type ErrorCode =
  | 'DB_ERROR'
  | 'DB_NOT_FOUND'
  | 'AUTH_REQUIRED'
  | 'AUTH_FORBIDDEN'
  | 'RATE_LIMITED'
  | 'CALENDAR_NOT_CONNECTED'
  | 'CALENDAR_TOKEN_EXPIRED'
  | 'EXTERNAL_API_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN'
```

### Tool function pattern
```typescript
// src/lib/claude/tools/query-database.ts
export async function queryDatabaseTool(
  input: QueryDatabaseInput,
  context: ToolContext
): Promise<Result<unknown[]>> {
  try {
    const validated = QueryDatabaseSchema.safeParse(input)
    if (!validated.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validated.error.message,
          userMessage: 'Neplatný dotaz na databázi.',
        },
      }
    }

    const { data, error } = await context.supabase
      .from(validated.data.entity)
      .select('*')
      .limit(validated.data.limit ?? 50)

    if (error) {
      return {
        success: false,
        error: {
          code: 'DB_ERROR',
          message: error.message,
          userMessage: 'Nepodařilo se načíst data z databáze.',
        },
      }
    }

    return { success: true, data: data ?? [] }
  } catch (e) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: String(e),
        userMessage: 'Nastala neočekávaná chyba.',
      },
    }
  }
}
```

### How Claude agent handles tool errors

When a tool returns `{ success: false }`, the tool executor returns the error as the tool result to Claude. Claude will then:
1. Acknowledge the failure in Czech
2. Suggest an alternative if possible
3. Ask for clarification if needed

```typescript
// src/lib/claude/tool-executor.ts
export async function executeTool(name: string, input: Record<string, unknown>, ctx: ToolContext) {
  const result = await dispatchTool(name, input, ctx)

  if (!result.success) {
    // Return error info to Claude so it can respond intelligently
    return {
      error: true,
      code: result.error.code,
      userMessage: result.error.userMessage,
    }
  }

  return result.data
}
```

---

## API routes — consistent error responses

```typescript
// src/lib/api/response.ts
export function apiError(message: string, status: number, code?: string) {
  return Response.json({ error: message, code: code ?? 'ERROR' }, { status })
}

export function apiSuccess<T>(data: T, status = 200) {
  return Response.json({ data }, { status })
}
```

```typescript
// Every API route follows this pattern:
export async function POST(req: Request) {
  try {
    // 1. Auth check
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return apiError('Unauthorized', 401, 'AUTH_REQUIRED')

    // 2. Input validation
    const body = await req.json().catch(() => null)
    if (!body) return apiError('Invalid JSON', 400, 'VALIDATION_ERROR')
    const parsed = MySchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.message, 400, 'VALIDATION_ERROR')

    // 3. Rate limit check
    const allowed = await checkRateLimit(user.id)
    if (!allowed) return apiError('Příliš mnoho požadavků. Zkus to za minutu.', 429, 'RATE_LIMITED')

    // 4. Business logic
    const result = await doWork(parsed.data)

    return apiSuccess(result)
  } catch (e) {
    console.error('[API ERROR]', e)
    return apiError('Interní chyba serveru.', 500, 'UNKNOWN')
  }
}
```

---

## Server Actions — error returns

Server Actions cannot throw to the client — return error objects.

```typescript
// src/lib/actions/properties.ts
'use server'

export async function upsertProperty(formData: FormData): Promise<{ error?: string; data?: Property }> {
  try {
    const supabase = await createSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Nejsi přihlášen.' }

    const raw = Object.fromEntries(formData)
    const parsed = PropertySchema.safeParse(raw)
    if (!parsed.success) return { error: 'Neplatná data formuláře.' }

    const { data, error } = await supabase
      .from('properties')
      .upsert(parsed.data)
      .select()
      .single()

    if (error) return { error: 'Nepodařilo se uložit nemovitost.' }

    revalidatePath('/dashboard/properties')
    return { data }
  } catch {
    return { error: 'Neočekávaná chyba. Zkus to znovu.' }
  }
}
```

### Using server action result in client component
```typescript
'use client'
const result = await upsertProperty(formData)
if (result.error) {
  toast.error(result.error)
  return
}
toast.success('Nemovitost uložena')
```

---

## Streaming API — error events

When an error occurs mid-stream, send a special SSE event before closing.

```typescript
// src/app/api/agent/chat/route.ts
const encoder = new TextEncoder()

return new Response(
  new ReadableStream({
    async start(controller) {
      const send = (data: string) => controller.enqueue(encoder.encode(`data: ${data}\n\n`))

      try {
        await runAgent({
          onText: (text) => send(JSON.stringify({ type: 'text', content: text })),
          onEvent: (type, payload) => send(JSON.stringify({ type, payload })),
          // ...
        })
        send(JSON.stringify({ type: 'done' }))
      } catch (e) {
        console.error('[AGENT STREAM ERROR]', e)
        send(JSON.stringify({
          type: 'error',
          message: 'Nastala chyba při zpracování. Zkus to znovu.',
        }))
      } finally {
        controller.close()
      }
    },
  }),
  { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } }
)
```

### Client-side stream error handling
```typescript
// src/hooks/useAgentChat.ts
for await (const event of parseSSE(reader)) {
  if (event.type === 'error') {
    setMessages(prev => prev.map(m =>
      m.id === assistantMessageId
        ? { ...m, error: event.message, isStreaming: false }
        : m
    ))
    break
  }
  // ... handle other events
}
```

---

## External API errors

### Google Calendar
```typescript
export class CalendarError extends Error {
  constructor(
    public code: 'NOT_CONNECTED' | 'TOKEN_EXPIRED' | 'ACCESS_DENIED' | 'API_ERROR',
    message: string
  ) { super(message) }
}

// In tool:
if (!profile.google_access_token) {
  throw new CalendarError('NOT_CONNECTED', 'No Google token stored')
}
// Returns to Claude as:
// { error: true, code: 'CALENDAR_NOT_CONNECTED', userMessage: 'Kalendář není propojen...' }
```

### Scraper failures
```typescript
// Individual scraper failure must not block others
// Log but never surface raw scraper errors to users

async function runScrapers(options: ScraperOptions) {
  const results = await Promise.allSettled([
    scrapeSreality(options).catch(e => {
      console.error('[SREALITY SCRAPER]', e.message)
      return []
    }),
    scrapeBezrealitky(options).catch(e => {
      console.error('[BEZREALITKY SCRAPER]', e.message)
      return []
    }),
  ])
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
}
```

### Telegram send failure
```typescript
// Non-critical — log and continue, never crash webhook handler
async function notifySafely(chatId: number, message: string) {
  try {
    await sendMessage(chatId, message)
  } catch (e) {
    console.error(`[TELEGRAM] Failed to notify chat ${chatId}:`, e)
    // Mark job notification as failed in DB for retry
    await supabase.from('monitoring_jobs')
      .update({ last_notification_error: String(e) })
      .eq('telegram_chat_id', chatId)
  }
}
```

---

## Logging strategy

```typescript
// src/lib/logger.ts
// Structured logging — always include context
export const logger = {
  info: (msg: string, ctx?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: 'info', msg, ...ctx, ts: new Date().toISOString() })),
  error: (msg: string, error: unknown, ctx?: Record<string, unknown>) =>
    console.error(JSON.stringify({ level: 'error', msg, error: String(error), ...ctx, ts: new Date().toISOString() })),
  warn: (msg: string, ctx?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ level: 'warn', msg, ...ctx, ts: new Date().toISOString() })),
}

// Usage
logger.info('Agent tool called', { tool: 'query_database', userId, entity: 'properties' })
logger.error('Scraper failed', error, { source: 'sreality', district: 'Holešovice' })
```

Vercel automatically captures all `console.*` output — searchable in Vercel Logs.

---

## User-facing error messages (Czech)

| Situation | Message |
|---|---|
| Not logged in | "Nejsi přihlášen. Přihlás se prosím." |
| Rate limited | "Příliš mnoho požadavků. Zkus to za minutu." |
| DB unavailable | "Momentálně nemohu přistoupit k datům. Zkus to za chvíli." |
| Calendar not connected | "Kalendář není propojen. Jdi do Nastavení → Google Kalendář." |
| Scraper returned nothing | "Nenašli jsme žádné nabídky odpovídající zadaným kritériím." |
| Report generation failed | "Nepodařilo se vygenerovat report. Zkus to znovu." |
| PPTX upload failed | "Soubor byl vytvořen, ale nepodařilo se ho nahrát. Zkus to znovu." |
| Generic error | "Nastala neočekávaná chyba. Zkus to znovu nebo kontaktuj podporu." |

Never show: raw SQL errors, stack traces, internal IDs, API error codes.
