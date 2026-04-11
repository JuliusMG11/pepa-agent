# Clean Code Standards

## Philosophy
Write code that reads like well-structured prose. The next developer (or future you) should understand intent without comments. Optimise for clarity over cleverness.

## TypeScript
- Strict mode always: `"strict": true` in tsconfig
- No `any` — use `unknown` and narrow, or define proper types
- Prefer `interface` for object shapes, `type` for unions/intersections
- Export types alongside their implementations
- Use `satisfies` operator to validate object literals against types

```typescript
// Bad
const handler = async (req: any, res: any) => { ... }

// Good
const handler = async (req: Request): Promise<Response> => { ... }
```

## Naming
- Variables and functions: `camelCase`, descriptive verbs for functions
- Types and interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE` for true constants, `camelCase` for config objects
- Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- Boolean variables: prefix with `is`, `has`, `can`, `should`

```typescript
// Bad
const d = new Date()
const flag = true
function process(x: Property[]) { ... }

// Good
const createdAt = new Date()
const isLoading = true
function filterActiveProperties(properties: Property[]) { ... }
```

## Functions
- Single responsibility: one function does one thing
- Max 3-4 parameters — group related params into an options object
- Return early to avoid deep nesting
- Pure functions where possible — no hidden side effects

```typescript
// Bad
async function handleLead(leadId, status, note, agentId, sendEmail, notifyTelegram) { ... }

// Good
interface UpdateLeadOptions {
  leadId: string
  status: LeadStatus
  note?: string
  agentId: string
  notifications?: { email?: boolean; telegram?: boolean }
}
async function updateLead(options: UpdateLeadOptions): Promise<Lead> { ... }
```

## Error handling
- Never swallow errors silently
- Use `Result` pattern or typed errors for expected failures
- Only `try/catch` at boundaries (API routes, server actions, edge functions)
- Always log errors with context before rethrowing

```typescript
// Result pattern for agent tools
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

async function queryProperties(sql: string): Promise<Result<Property[]>> {
  try {
    const { data, error } = await supabase.rpc('execute_query', { sql })
    if (error) return { success: false, error: new Error(error.message) }
    return { success: true, data }
  } catch (e) {
    return { success: false, error: e as Error }
  }
}
```

## File and folder structure
```
src/
  app/                    # Next.js App Router pages
  components/
    ui/                   # Primitive components (Button, Input, Card)
    features/             # Feature-specific components (PropertyCard, LeadTable)
    layouts/              # Page layout components
  lib/
    supabase/             # Supabase client factories
    claude/               # Claude API client and agent tools
    telegram/             # Telegram bot handler
    utils/                # Pure utility functions
  hooks/                  # Custom React hooks
  types/                  # Shared TypeScript types
  constants/              # App-wide constants
```

## Comments
- Code should be self-documenting — comments explain *why*, not *what*
- JSDoc for all exported functions and types
- TODO comments must include owner and issue: `// TODO(jan): fix after #123`
- Never commit commented-out code

## Imports
- Group: 1) Node built-ins, 2) external packages, 3) internal aliases, 4) relative
- Use `@/` path alias for all internal imports
- No default exports from utility files — named exports only
- Default exports only for Next.js pages and layouts

## Constants and magic numbers
```typescript
// Bad
if (leads.length > 50) { ... }
await sleep(3000)

// Good
const MAX_LEADS_PER_PAGE = 50
const SCRAPER_DELAY_MS = 3_000

if (leads.length > MAX_LEADS_PER_PAGE) { ... }
await sleep(SCRAPER_DELAY_MS)
```

## React components
- Functional components only — no class components
- Extract logic into custom hooks, keep components focused on rendering
- Colocate component types at the top of the file
- Use `React.memo` only when profiling proves a performance issue

## Git hygiene
- Commits: conventional commits format (`feat:`, `fix:`, `chore:`, `refactor:`)
- One logical change per commit
- PR description must explain *why*, not just *what*
