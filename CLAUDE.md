# Pepa — Back Office Operations Agent

## Quick reference
Read these files before starting any task:

| File | When to read |
|---|---|
| `.claude/setup.md` | **First** — run this before anything else on a new machine |
| `.claude/project_business_context.md` | Always — understand what we're building and why |
| `.claude/supabase_expert.md` | Any DB schema, query, migration, or Edge Function work |
| `.claude/frontend_expert.md` | Any Next.js, React, or UI work |
| `.claude/design.md` + `.claude/design/design_system.md` | Any visual or UI component work |
| `.claude/clean_code.md` | All code — naming, structure, TypeScript patterns |
| `.claude/web_security.md` | API routes, auth, Telegram webhook, input handling |
| `.claude/testing_expert.md` | Writing or reviewing tests |
| `.claude/project_phases.md` | **Start here** — step-by-step build order with exact tasks |
| `.claude/agent_system_prompt.md` | Agent system prompt, tool chaining rules, Czech language rules |
| `.claude/api_integrations.md` | Exact API clients for Claude, Supabase, Google Calendar, Telegram, scrapers |
| `.claude/error_handling.md` | Result pattern, typed errors, streaming errors, user-facing Czech messages |
| `.claude/deployment.md` | Step-by-step Vercel + Supabase production deploy + delivery checklist |

## Tech stack
- **Framework:** Next.js 15, App Router, TypeScript strict mode
- **Database:** Supabase (PostgreSQL 15 + pgvector + RLS)
- **Auth:** Supabase Auth with `@supabase/ssr`
- **AI:** Anthropic Claude API (`claude-sonnet-4`) with tool use + streaming
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **Mobile access:** Telegram Bot API (webhook)
- **Scheduled jobs:** Supabase Edge Functions with pg_cron
- **Email:** Resend
- **Calendar:** Google Calendar API (OAuth 2.0)
- **Deploy:** Vercel (frontend) + Supabase Cloud (backend)

## Project structure
```
pepa-agent/
  .claude/                    # Claude Code memory files (this folder)
  src/
    app/                      # Next.js App Router
    components/
      ui/                     # Primitive shadcn components
      features/               # Domain components
      layouts/                # Page layouts
    lib/
      supabase/               # Supabase client factories
      claude/                 # Agent core: tools, system prompt, streaming
      telegram/               # Telegram bot handler and command router
      google/                 # Google Calendar OAuth + API client
      reports/                # PDF/PPTX generation
      scraper/                # Sreality + Bezrealitky scrapers
      utils/                  # Shared utilities
    hooks/                    # Custom React hooks
    types/                    # Shared TypeScript types
    constants/                # App-wide constants
  supabase/
    migrations/               # SQL migration files
    functions/                # Edge Functions (Deno)
      daily-briefing/
      market-monitor/
      weekly-report/
    seed.sql                  # Development seed data
  __tests__/
    e2e/                      # Playwright tests
    integration/              # Supabase integration tests
```

## Core agent tools
The Claude agent has access to these tools (defined in `src/lib/claude/tools/`):

1. `query_database` — Execute parameterised queries against Supabase
2. `get_calendar_availability` — Fetch free slots from Google Calendar
3. `draft_email` — Generate Czech professional email with calendar slots
4. `find_data_gaps` — Detect properties with missing fields
5. `generate_report` — Aggregate weekly/monthly stats into a report
6. `create_presentation` — Generate 3-slide PPTX from report data
7. `search_market_listings` — Query scraped portal data
8. `create_monitoring_job` — Save a new scraping schedule to DB
9. `render_chart` — Return chart data structure for frontend to render

## Environment variables required
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_ALLOWED_USER_IDS=        # comma-separated chat IDs

# Google
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Email
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

## Key commands
```bash
pnpm dev                    # Start dev server
pnpm build                  # Production build
pnpm test                   # Run Vitest unit tests
pnpm test:e2e               # Run Playwright e2e tests
supabase start              # Start local Supabase
supabase db reset           # Reset local DB + apply seed
supabase functions serve    # Run Edge Functions locally
```

## Coding standards (summary)
- TypeScript strict — no `any`
- Zod validation on all external input
- Server-side auth check on every protected route/action
- No secrets in client bundle — check `NEXT_PUBLIC_` prefixes
- Result pattern `{ success, data } | { success, error }` for agent tools
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`
- Czech language for all agent responses and UI copy
