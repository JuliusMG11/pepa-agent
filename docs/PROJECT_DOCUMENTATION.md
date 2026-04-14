# Pepa — AI Back Office Operations Agent
## Project Documentation

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Architecture](#3-architecture)
4. [Tech Stack](#4-tech-stack)
5. [Database Schema](#5-database-schema)
6. [AI Agent System](#6-ai-agent-system)
7. [Features](#7-features)
8. [Integrations](#8-integrations)
9. [Project Structure](#9-project-structure)
10. [Environment Variables](#10-environment-variables)
11. [Development Setup](#11-development-setup)
12. [Deployment](#12-deployment)
13. [How We Built It — Phase by Phase](#13-how-we-built-it--phase-by-phase)
14. [Security Considerations](#14-security-considerations)

---

## 1. Project Overview

**Pepa** is an AI-powered back office operations agent built for a Czech/Slovak real estate company. It replaces the manual, repetitive coordination work of a back office manager by connecting the company's internal database with modern AI, external calendar and email services, market monitoring, and automated reporting.

Instead of switching between spreadsheets, email clients, and reporting tools, the user simply types a question in natural language — and Pepa handles the rest.

**Core value proposition:**
- Query the entire property, client, and lead database in plain language
- Read Gmail inbox and draft professional replies without leaving the app
- Generate weekly/monthly reports and PPTX presentations with one click
- Monitor real estate portals (Sreality, Bezrealitky) automatically
- Access everything via Telegram on mobile

---

## 2. Problem Statement

A real estate back office manager spends their day on high-volume, repetitive tasks:

| Task | Manual effort | With Pepa |
|---|---|---|
| "How many active listings do we have in Praha 2?" | Open database, run query, count rows | Ask in chat → instant answer |
| Weekly report for management | Aggregate data from multiple sheets | Click "Generate Report" → PDF + PPTX ready |
| Email a lead with viewing times | Open calendar, find free slots, write email | Ask Pepa → draft generated with 3 time slots |
| Monitor portal for new listings | Check Sreality manually each morning | Automated daily scrape → Telegram notification |
| Check unread emails | Switch to Gmail, read inbox | Ask Pepa → emails shown directly in chat |

This is exactly the type of work an LLM agent excels at: context-dependent, data-heavy, multi-step tasks that require connecting multiple systems.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User interfaces                       │
│  Web app (Next.js)    │    Telegram Bot    │  Mobile browser │
└───────────┬──────────────────────┬────────────────┬─────────┘
            │                      │                │
            ▼                      ▼                │
┌───────────────────────┐  ┌──────────────────┐    │
│   Next.js App Router  │  │  Telegram Webhook │    │
│   /app (SSR + RSC)    │  │  /api/telegram/   │    │
└───────────┬───────────┘  └────────┬─────────┘    │
            │                       │               │
            ▼                       ▼               │
┌─────────────────────────────────────────────────────────────┐
│                     API Route Handlers                       │
│  /api/agent/chat   /api/reports/generate   /api/auth/google │
└───────────────────────────┬─────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
┌──────────────────┐ ┌────────────┐ ┌────────────────┐
│  Claude AI Agent │ │  Supabase  │ │  Google APIs   │
│  (tool use +     │ │  Postgres  │ │  Calendar +    │
│   streaming)     │ │  RLS + RPC │ │  Gmail         │
└──────────────────┘ └────────────┘ └────────────────┘
            │
    ┌───────┴────────┐
    ▼                ▼
┌────────┐    ┌─────────────┐
│ Resend │    │  Sreality / │
│ Email  │    │ Bezrealitky │
└────────┘    └─────────────┘
```

**Key architectural decisions:**

- **Server-side AI calls** — All Claude API calls happen server-side via Next.js Route Handlers. The API key never reaches the client.
- **Streaming via SSE** — Agent responses stream to the browser using Server-Sent Events, enabling real-time text output and progressive rendering of rich blocks (charts, email drafts, download links).
- **Tool use loop** — The agent runs a `while` loop: stream response → detect `tool_use` → execute tool → feed result back → continue until `end_turn`. This allows multi-step reasoning across multiple API calls.
- **Conversation persistence** — Every user message, assistant response, tool call, and tool result is saved to Supabase. On the next message, the full history is reconstructed and sent to Claude as context.
- **RLS everywhere** — Every Supabase table has Row Level Security policies. Users can only access their own data.

---

## 4. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack React with server components |
| Language | TypeScript (strict mode) | Type safety across the entire codebase |
| Database | Supabase (PostgreSQL 15) | Primary data store, auth, real-time, storage |
| Auth | Supabase Auth + `@supabase/ssr` | Server-side session management, OAuth |
| AI | Anthropic Claude API (`claude-sonnet-4`) | Agent intelligence, tool use, streaming |
| Styling | Tailwind CSS v4 + shadcn/ui | Component library built on Radix primitives |
| Charts | Recharts | Interactive charts rendered in the browser |
| Forms | React Hook Form + Zod | Validated forms with TypeScript inference |
| Reports | pptxgenjs + jsPDF | PPTX presentation and PDF report generation |
| Email | Resend | Transactional email delivery |
| Calendar | Google Calendar API (OAuth 2.0) | Free slot calculation for viewing proposals |
| Gmail | Gmail API (OAuth 2.0) | Read inbox messages from within the chat |
| Telegram | Telegram Bot API (webhook) | Mobile access to the full agent |
| Scraping | Sreality public API + Bezrealitky GraphQL | Market monitoring for new listings |
| Scheduled jobs | Supabase Edge Functions + pg_cron | Daily market monitoring, weekly briefings |
| Deployment | Vercel (frontend) + Supabase Cloud (backend) | Production infrastructure |

---

## 5. Database Schema

The database runs on Supabase (PostgreSQL 15) with Row Level Security enabled on all tables.

### Tables

#### `profiles`
Extends `auth.users`. Stores user profile data and Google OAuth tokens.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | References `auth.users.id` |
| `email` | text | User email |
| `full_name` | text | Display name |
| `google_access_token` | text | Google OAuth access token |
| `google_refresh_token` | text | Google OAuth refresh token |
| `google_token_expiry` | timestamptz | Token expiry for auto-refresh |
| `google_email` | text | Connected Google account email |

#### `properties`
Real estate listings managed by the agency.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | — |
| `user_id` | uuid (FK) | Owner/agent |
| `address` | text | Full street address |
| `district` | text | Prague district (Praha 1, Praha 2, ...) |
| `type` | enum | `byt`, `dum`, `komercni`, `pozemek`, `garaze` |
| `status` | enum | `active`, `pending`, `sold`, `withdrawn` |
| `price` | numeric | Price in CZK |
| `area_m2` | numeric | Floor area |
| `floor` | integer | Floor number |
| `description` | text | Full listing description |
| `reconstruction_notes` | text | Renovation history |

#### `clients`
People tracked by the agency.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | — |
| `user_id` | uuid (FK) | Assigned agent |
| `full_name` | text | — |
| `email` | text | — |
| `phone` | text | — |
| `source` | enum | `referral`, `portal`, `direct`, `social`, `event` |
| `notes` | text | Free-form notes |

#### `leads`
Links a client to a specific property interest. Tracks the sales pipeline.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | — |
| `user_id` | uuid (FK) | Assigned agent |
| `client_id` | uuid (FK) | → clients |
| `property_id` | uuid (FK, nullable) | → properties |
| `status` | enum | `new` → `contacted` → `viewing_scheduled` → `offer_made` → `closed_won` / `closed_lost` |
| `notes` | text | — |

#### `activities`
All interactions logged against a lead.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | — |
| `lead_id` | uuid (FK) | → leads |
| `performed_by` | uuid (FK) | → profiles |
| `type` | enum | `call`, `email`, `viewing`, `offer`, `note`, `meeting` |
| `notes` | text | Activity details |
| `scheduled_at` | timestamptz | When it happened / is scheduled |

#### `agent_conversations`
Persisted conversation history for the AI chat. Enables multi-turn context.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | — |
| `session_id` | uuid | Groups messages into a chat session |
| `user_id` | uuid (FK) | — |
| `role` | text | `user`, `assistant`, `tool` |
| `content` | text | Message text (or JSON for tool results) |
| `tool_calls` | jsonb | Tool use blocks from Claude (for round-tripping) |
| `tool_results` | jsonb | Tool results keyed by `tool_use_id` |
| `rich_blocks` | jsonb | Charts, email drafts, download links |

#### `chat_sessions`
Named conversation sessions shown in the sidebar.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | — |
| `user_id` | uuid (FK) | — |
| `title` | text | Auto-generated from first message |

#### `reports`
Generated report metadata and storage paths.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | — |
| `user_id` | uuid (FK) | — |
| `period_type` | text | `weekly`, `monthly` |
| `period_start` | date | — |
| `period_end` | date | — |
| `pdf_url` | text | Signed Supabase Storage URL |
| `presentation_pptx_url` | text | PPTX signed URL |

#### `monitoring_jobs`
Configured market monitoring searches.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | — |
| `user_id` | uuid (FK) | — |
| `location` | text | Prague district to monitor |
| `property_type` | text | Property type filter |
| `price_max` | numeric | Maximum price filter |
| `is_active` | boolean | Whether the job runs |

#### `market_listings`
Listings scraped from external portals.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | — |
| `source` | text | `sreality`, `bezrealitky` |
| `external_id` | text | Portal's own ID (unique constraint) |
| `title` | text | Listing headline |
| `address` | text | Full address |
| `district` | text | — |
| `price` | numeric | Listed price in CZK |
| `area_m2` | numeric | — |
| `url` | text | Deep link to portal |
| `is_new` | boolean | Set `true` on insert, `false` after notification sent |

---

## 6. AI Agent System

### Overview

The agent is implemented as a tool-use loop over the Anthropic Messages API. It runs entirely server-side in a Next.js Route Handler and streams responses to the browser via SSE.

### Agent tools

| Tool | Purpose |
|---|---|
| `query_database` | Execute parameterised SQL SELECT queries against Supabase. Returns rows as JSON. |
| `get_calendar_availability` | Fetch free time slots from the user's Google Calendar. Returns formatted Czech time strings. |
| `draft_email` | Generate a professional Czech email (to a lead, with viewing slots, etc.). Displayed as a rich block — not sent automatically. |
| `find_data_gaps` | Detect properties with missing fields (null description, price, area, etc.). |
| `generate_report` | Aggregate weekly or monthly stats into a structured report object. |
| `create_presentation` | Generate a PPTX presentation from a report. Returns a download link. |
| `search_market_listings` | Query scraped portal data by location, type, and price. |
| `create_monitoring_job` | Save a new scraping schedule to the database. |
| `render_chart` | Return a chart data structure rendered as an interactive Recharts chart in the UI. |
| `get_emails` | Fetch messages from the user's Gmail inbox (read-only). Displayed as a rich email list block. |

### Streaming protocol (SSE)

The API endpoint (`POST /api/agent/chat`) returns a `text/event-stream` response. Each event is a JSON object on a `data:` line:

```
data: {"type":"text","chunk":"Tady jsou výsledky..."}

data: {"type":"chart","payload":{...}}

data: {"type":"email","payload":{...}}

data: {"type":"email_list","payload":{...}}

data: {"type":"download","payload":{...}}

data: {"type":"report","payload":{...}}

data: {"type":"done"}
```

The frontend (`useAgentChat.ts` hook) reads these events and builds a message with text content and zero or more rich blocks.

### Conversation history

History is stored in the `agent_conversations` table with three row types:
- `user` — plain user message
- `assistant` — Claude's text response + tool call metadata (as `tool_calls` JSONB)
- `tool` — tool results (as JSON array in `content`, keyed by `tool_use_id`)

On each new message, the server loads the last 20 rows, reconstructs the Anthropic `MessageParam[]` array (respecting the strict `assistant → tool_result` pairing requirement), and appends the new user message.

---

## 7. Features

### Dashboard
- Live KPI cards: active properties, total clients, open leads, activities this week
- Lead pipeline overview (count per status stage)
- Recent activity feed
- Quick action shortcuts

### Properties
- Full CRUD for property listings
- Filter by district, type, status, price range
- Property detail: photos, description, floor plan data, renovation notes
- Activity history linked to the property
- Client interest connections

### Clients & Leads
- Client directory with contact details and notes
- Lead pipeline with drag-and-drop status updates
- Activity log per lead (calls, viewings, emails, offers, notes)
- Source tracking (referral, portal, direct, social, event)

### Ask Pepa (AI Chat)
- Natural language queries over the entire database
- Multi-turn conversations with persistent history
- Named chat sessions (sidebar with full history)
- Rich blocks rendered inline:
  - **Charts** — interactive Recharts visualisations
  - **Email drafts** — formatted preview with copy/send action
  - **Gmail inbox** — list of messages with subject, sender, snippet, date
  - **Presentations** — one-click PPTX download
  - **Reports** — structured report data view
- Streaming response (text appears as Claude types)
- Rate limiting: 10 messages per minute per user

### Reports
- One-click report generation for any date range
- Report types: weekly, monthly
- Output 1: **PDF report** — full narrative with charts and data tables
- Output 2: **PPTX presentation** — 7 slides, branded design, ready to present
- Stored in Supabase Storage with 7-day signed URLs
- History of all generated reports

### Market Monitoring
- Configure monitoring jobs by district, property type, max price
- Daily automated scraping of Sreality and Bezrealitky (via Supabase Edge Functions + pg_cron)
- New listings shown in the monitoring tab
- Telegram notification when new matching listings appear
- Create monitoring jobs directly from the AI chat

### Telegram Bot
- Full access to the AI agent from mobile
- Supports `/start`, `/report`, `/leads`, free-text queries
- Charts sent as photos, reports as documents
- Restricted to configured `TELEGRAM_ALLOWED_USER_IDS`
- Secured with webhook secret header validation

### Settings
- Google account connection (Calendar + Gmail via OAuth 2.0)
- Reconnect / disconnect Google account
- User profile management

---

## 8. Integrations

### Anthropic Claude API
- Model: `claude-sonnet-4-20250514`
- Features used: tool use, streaming messages
- All calls server-side (API key never exposed to browser)
- Error handling for rate limits (429) and overload (529)

### Supabase
- **PostgreSQL** — primary database with full RLS
- **Auth** — email/password with `@supabase/ssr` for cookie-based sessions
- **Storage** — `reports` bucket for PDF and PPTX files
- **Edge Functions** — Deno-based serverless functions for scheduled jobs
- **pg_cron** — cron scheduler for daily market monitoring

### Google OAuth 2.0
- Scopes: `calendar.readonly` + `gmail.readonly`
- Tokens stored encrypted in `profiles` table
- Auto-refresh: access token refreshed transparently when expired
- Token preservation: refresh token only updated if Google returns a new one (avoids invalidating long-lived tokens on reconnect)

### Gmail API
- Read-only access to INBOX
- Fetches subject, sender, date, unread status, plain-text body snippet
- Supports filtering by unread status and custom query strings
- Displayed as a rich block in the chat UI

### Google Calendar API
- Free/busy queries via the `freeBusy` endpoint
- Inverts busy periods to compute available 1-hour slots
- Returns formatted Czech date strings (e.g., "středa 23. dubna 10:00–11:00")
- Used by the `draft_email` tool to include viewing time proposals

### Telegram Bot API
- Webhook mode (not polling)
- Secured via `X-Telegram-Bot-Api-Secret-Token` header
- Text responses, photo (charts), document (reports)
- Message splitting for responses > 4096 characters

### Sreality
- Public JSON REST API (`sreality.cz/api/cs/v2/estates`)
- Filterable by district, property type, max price
- No authentication required

### Bezrealitky
- GraphQL API
- Same filter capabilities as Sreality
- Both scrapers run in parallel with `Promise.allSettled` (one failure doesn't block the other)

### Resend
- Used for outbound email delivery
- Agent only _drafts_ emails — user must explicitly confirm before sending

---

## 9. Project Structure

```
pepa-agent/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Login / signup pages
│   │   ├── (dashboard)/              # Protected app pages
│   │   │   ├── dashboard/            # KPI overview
│   │   │   ├── properties/           # Property management
│   │   │   ├── clients/              # Client & lead management
│   │   │   ├── ask-pepa/             # AI chat interface
│   │   │   ├── reports/              # Report generation
│   │   │   ├── monitoring/           # Market monitoring
│   │   │   └── settings/             # User settings
│   │   └── api/
│   │       ├── agent/chat/           # Main AI streaming endpoint
│   │       ├── reports/generate/     # Report + PPTX generation
│   │       ├── chat/sessions/        # Chat session CRUD
│   │       ├── auth/google/          # Google OAuth flow
│   │       └── telegram/webhook/     # Telegram bot webhook
│   ├── components/
│   │   ├── ui/                       # Primitive shadcn components
│   │   ├── features/                 # Domain-specific components
│   │   │   ├── chat/                 # Chat UI, message bubbles, rich blocks
│   │   │   ├── properties/           # Property list, detail, form
│   │   │   ├── clients/              # Client list, lead pipeline
│   │   │   ├── reports/              # Report generator UI
│   │   │   ├── monitoring/           # Market monitoring UI
│   │   │   └── settings/             # Settings panel
│   │   └── layouts/                  # Sidebar, topbar, page shell
│   ├── hooks/
│   │   └── useAgentChat.ts           # SSE streaming hook, session management
│   ├── lib/
│   │   ├── supabase/                 # Client, server, service role factories
│   │   ├── claude/                   # Agent core
│   │   │   ├── agent.ts              # Tool-use loop + streaming
│   │   │   ├── tool-executor.ts      # Dispatches tool calls to implementations
│   │   │   ├── history.ts            # Conversation history load/save
│   │   │   ├── system-prompt.ts      # Agent instructions + language rules
│   │   │   └── tools/                # Individual tool implementations
│   │   ├── google/                   # Calendar + Gmail clients
│   │   ├── telegram/                 # Bot handler, command router, formatter
│   │   ├── reports/                  # PDF + PPTX generation
│   │   └── scraper/                  # Sreality + Bezrealitky scrapers
│   └── types/                        # Shared TypeScript types + DB types
├── supabase/
│   ├── migrations/                   # SQL migration files (versioned)
│   ├── functions/
│   │   ├── daily-briefing/           # Morning Telegram summary
│   │   ├── market-monitor/           # Daily portal scraping
│   │   └── weekly-report/            # Automated weekly report
│   └── seed.sql                      # Czech development seed data
└── __tests__/
    ├── e2e/                          # Playwright end-to-end tests
    └── integration/                  # Supabase integration tests
```

---

## 10. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=            # Project URL from Supabase dashboard
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # Anon key (safe for browser)
SUPABASE_SERVICE_ROLE_KEY=           # Service role key (server only — never expose)

# Anthropic
ANTHROPIC_API_KEY=                   # From console.anthropic.com

# Telegram
TELEGRAM_BOT_TOKEN=                  # From @BotFather
TELEGRAM_WEBHOOK_SECRET=             # Random hex: openssl rand -hex 32
TELEGRAM_ALLOWED_USER_IDS=           # Comma-separated Telegram chat IDs

# Google
GOOGLE_CLIENT_ID=                    # OAuth 2.0 client ID
GOOGLE_CLIENT_SECRET=                # OAuth 2.0 client secret
GOOGLE_REDIRECT_URI=                 # https://yourdomain.com/api/auth/google/callback

# Email
RESEND_API_KEY=                      # From resend.com dashboard

# App
NEXT_PUBLIC_APP_URL=                 # https://yourdomain.com
```

---

## 11. Development Setup

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker (for local Supabase)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/your-org/pepa-agent.git
cd pepa-agent

# 2. Install dependencies
pnpm install

# 3. Copy and fill in environment variables
cp .env.local.example .env.local
# Edit .env.local with your keys

# 4. Start local Supabase
pnpm supabase start
# Supabase Studio: http://localhost:54323

# 5. Apply migrations and seed data
pnpm supabase db reset

# 6. Start the development server
pnpm dev
# App: http://localhost:3000
```

### Useful commands

```bash
pnpm dev                    # Start dev server (Turbopack)
pnpm build                  # Production build
pnpm test                   # Run Vitest unit tests
pnpm test:e2e               # Run Playwright e2e tests
supabase start              # Start local Supabase
supabase db reset           # Reset local DB + seed
supabase functions serve    # Run Edge Functions locally
```

---

## 12. Deployment

### Frontend — Vercel

1. Push to GitHub → connect repo in Vercel
2. Set all environment variables in Vercel project settings
3. Deploy — Vercel builds and deploys automatically on each push to `main`

### Backend — Supabase Cloud

1. Create a new Supabase project
2. Run all migrations: paste contents of `supabase/migrations/` in SQL Editor (in order)
3. Enable Gmail API in Google Cloud Console (required for email features)
4. Set up Google OAuth credentials with the production redirect URI
5. Deploy Edge Functions:
   ```bash
   supabase functions deploy daily-briefing
   supabase functions deploy market-monitor
   supabase functions deploy weekly-report
   ```
6. Register Telegram webhook (run once after deploy):
   ```bash
   curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://yourdomain.com/api/telegram/webhook","secret_token":"YOUR_SECRET"}'
   ```

---

## 13. How We Built It — Phase by Phase

The project was built iteratively across 8 phases, each producing a working, testable increment.

### Phase 0 — Bootstrap
Set up Next.js 15 with TypeScript strict mode, Tailwind CSS v4, shadcn/ui, Vitest, Playwright, and local Supabase. Established folder structure, path aliases, and environment variable templates.

### Phase 1 — Database Schema
Designed and implemented the full PostgreSQL schema with 9 tables, custom enums, foreign keys, indexes, and Row Level Security policies. Created realistic Czech seed data (Prague properties, clients, leads, activities).

### Phase 2 — Authentication
Implemented Supabase Auth with `@supabase/ssr` for server-side cookie management. Protected routes with middleware. Built login, signup, and password reset pages.

### Phase 3 — Property & Client Management
Built full CRUD UI for properties and clients with server components for data fetching and client components for interactive elements. Implemented lead pipeline with status tracking and activity logging.

### Phase 4 — AI Agent Core
Implemented the Claude tool-use streaming loop in `agent.ts`. Built 9 agent tools covering database queries, calendar, email drafting, report generation, chart rendering, and market search. Wired the streaming SSE endpoint and the `useAgentChat` hook.

### Phase 5 — Google Integration
Implemented Google OAuth 2.0 flow for Calendar and Gmail. Built the `getFreeSlots` algorithm (busy → free inversion). Added Gmail `listGmailMessages` with parallel message fetching. Stored tokens securely in `profiles` with auto-refresh logic.

### Phase 6 — Reports & Presentations
Built report aggregation pipeline collecting metrics across leads, activities, clients, and properties. Generated PDF reports with narrative summaries. Generated PPTX presentations using pptxgenjs with branded slides (title, KPI cards, pipeline chart, activity breakdown, market section, recommendations).

### Phase 7 — Telegram Bot
Implemented webhook handler with secret token validation. Routed commands and free-text messages to the same Claude agent used by the web app. Formatted responses for Telegram Markdown. Added support for sending charts as photos and reports as documents.

### Phase 8 — Market Monitoring
Built scrapers for Sreality (REST) and Bezrealitky (GraphQL). Implemented Supabase Edge Functions for daily automated scraping with pg_cron scheduling. Built the monitoring jobs UI. Added Telegram notifications for new matching listings.

### Ongoing — Bug Fixes & Polish
- Fixed `fs` module bundling in Vercel (dynamic `import('fs')` inside async functions)
- Fixed Gmail `labelIds` format (must use repeated query params, not comma-separated)
- Fixed conversation history: only include `tool_use` blocks when a matching `tool_result` row follows
- Fixed token preservation on Google re-auth (refresh token only updated when Google returns a new one)
- Fixed RLS policy for activities (broadened from `performed_by = auth.uid()` to any authenticated user)
- Added multilingual Gmail triggers in system prompt (Czech + Slovak + English)
- Added `email_list` SSE event type and rich block rendering

---

## 14. Security Considerations

| Concern | Mitigation |
|---|---|
| API keys in client bundle | All secret keys are server-only. Only `NEXT_PUBLIC_` prefixed vars reach the browser. |
| Unauthorized database access | Every table has RLS policies. All server routes verify `supabase.auth.getUser()` before any DB access. |
| SQL injection | All database queries use parameterised Supabase query builder. `query_database` tool uses an allowlist of permitted tables and disallows mutations. |
| Telegram webhook spoofing | Webhook handler validates `X-Telegram-Bot-Api-Secret-Token` header before processing any update. |
| Telegram unauthorized users | `TELEGRAM_ALLOWED_USER_IDS` allowlist checked on every incoming message. |
| Google token exposure | Tokens stored in `profiles` table, only accessible to the owning user via RLS. Never returned to the client. |
| Rate limiting | `/api/agent/chat` enforces 10 requests/minute per user via Supabase query count. |
| Input validation | All API routes validate request bodies with Zod schemas before processing. |
| XSS in chat | AI-generated content rendered with React (escaped by default). Rich blocks use structured JSON payloads, not raw HTML. |
