# Project Phases — Pepa Back Office Agent

## How to use this file
Work through phases sequentially. Complete every task in a phase before moving to the next.
Each task is written as a direct instruction for Claude Code.
Mark tasks done by adding ✅ before the line.

---

## Phase 0 — Project bootstrap
**Goal:** Runnable skeleton with correct tooling, folder structure, and empty pages.

### ✅ 0.1 Init Next.js project
```
pnpm create next-app@latest pepa-agent \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-pnpm
```

### ✅ 0.2 Install all dependencies
```bash
# UI
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip
pnpm add class-variance-authority clsx tailwind-merge lucide-react
pnpm add recharts

# Supabase
pnpm add @supabase/supabase-js @supabase/ssr

# AI
pnpm add @anthropic-ai/sdk

# Forms & validation
pnpm add react-hook-form zod @hookform/resolvers

# State
pnpm add zustand

# Email
pnpm add resend

# Reports
pnpm add pptxgenjs jspdf

# Telegram
pnpm add node-telegram-bot-api
pnpm add -D @types/node-telegram-bot-api

# Utils
pnpm add date-fns nanoid

# Dev
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom
pnpm add -D playwright @playwright/test msw
```

### ✅ 0.3 Install and configure shadcn/ui
```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input card badge dialog dropdown-menu
pnpm dlx shadcn@latest add table tabs tooltip avatar skeleton separator
```

### ✅ 0.4 Create full folder structure
Create all directories as defined in `CLAUDE.md` project structure section.
Create empty `index.ts` barrel files in each `lib/` subfolder.

### ✅ 0.5 Configure TypeScript paths
`tsconfig.json` — ensure `@/*` maps to `./src/*`.

### ✅ 0.6 Configure Tailwind
Set up `tailwind.config.ts` with custom design tokens from `.claude/design/design_system.md`:
- Custom color: `brand: #6366F1`, `brand-hover: #4F46E5`
- Font: Inter from Google Fonts in `app/layout.tsx`
- Custom animation: `pulse-slow` for skeleton loaders

### ✅ 0.7 Create `.env.local` template
Create `.env.local.example` with all variables from `CLAUDE.md` env section, empty values.
Create `.env.local` from the template (user will fill in values).
Add `.env.local` to `.gitignore`.

### ✅ 0.8 Configure Vitest
Create `vitest.config.ts` with jsdom environment, path aliases, and setup file.
Create `src/test/setup.ts` with Testing Library jest-dom matchers.

### ✅ 0.9 Set up Supabase local
```bash
pnpm add -D supabase
pnpm supabase init
pnpm supabase start
```

**Definition of done:** `pnpm dev` runs without errors. `pnpm test` runs (0 tests, no failures). Supabase Studio accessible at localhost:54323.

---

## Phase 1 — Database schema & seed data
**Goal:** Complete Supabase schema with RLS, indexes, and realistic Czech seed data.

### ✅ 1.1 Create base migration
File: `supabase/migrations/20240101000000_initial_schema.sql`

Create tables in this order (respects foreign keys):
1. `profiles` — extends `auth.users`
2. `properties`
3. `clients`
4. `leads`
5. `activities`
6. `reports`
7. `agent_conversations`
8. `monitoring_jobs`
9. `market_listings`

Full schema per `.claude/supabase_expert.md` — all tables need: uuid PK, `created_at`, `updated_at`, `deleted_at` where applicable.

### ✅ 1.2 Add enums
```sql
CREATE TYPE property_type AS ENUM ('byt', 'dum', 'komercni', 'pozemek', 'garaze');
CREATE TYPE property_status AS ENUM ('active', 'pending', 'sold', 'withdrawn');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'viewing_scheduled', 'offer_made', 'closed_won', 'closed_lost');
CREATE TYPE lead_source AS ENUM ('referral', 'sreality', 'bezrealitky', 'reality_cz', 'direct', 'social', 'event', 'other');
CREATE TYPE activity_type AS ENUM ('call', 'email', 'viewing', 'offer', 'contract', 'note', 'task');
CREATE TYPE report_type AS ENUM ('weekly', 'monthly', 'quarterly', 'custom');
CREATE TYPE user_role AS ENUM ('admin', 'agent', 'viewer');
```

### ✅ 1.3 Add `updated_at` triggers
Apply `moddatetime` trigger on every table with `updated_at` column.

### ✅ 1.4 Create indexes
```sql
-- Foreign keys
CREATE INDEX idx_leads_client_id ON leads(client_id);
CREATE INDEX idx_leads_property_id ON leads(property_id);
CREATE INDEX idx_activities_related ON activities(related_to_type, related_to_id);
CREATE INDEX idx_agent_conversations_user ON agent_conversations(user_id, created_at DESC);
CREATE INDEX idx_market_listings_district ON market_listings(district, first_seen_at DESC);

-- Common filters
CREATE INDEX idx_properties_status ON properties(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_district ON properties(district) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_clients_created ON clients(created_at DESC);
```

### ✅ 1.5 Enable pgvector
```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE agent_conversations ADD COLUMN embedding vector(1536);
CREATE INDEX ON agent_conversations USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### ✅ 1.6 Enable RLS on all tables
Enable RLS and create policies:
- `profiles`: user reads/updates their own row; admin reads all
- `properties`: agent reads own + admin reads all; service role full access
- `clients`: agent reads own + admin reads all
- `leads`: agent reads own + admin reads all
- `activities`: agent reads related + admin reads all
- `agent_conversations`: user reads own only
- `monitoring_jobs`: user reads own; admin reads all
- `market_listings`: all authenticated users read; service role writes
- `reports`: user reads own + admin reads all

### ✅ 1.7 Create database views
```sql
-- v_property_summary: properties with lead count and last activity
CREATE VIEW v_property_summary AS
SELECT
  p.*,
  COUNT(DISTINCT l.id) AS lead_count,
  MAX(a.created_at) AS last_activity_at,
  pr.full_name AS agent_name
FROM properties p
LEFT JOIN leads l ON l.property_id = p.id
LEFT JOIN activities a ON a.related_to_id = p.id AND a.related_to_type = 'property'
LEFT JOIN profiles pr ON pr.id = p.agent_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, pr.full_name;

-- v_lead_pipeline: leads with client and property info
CREATE VIEW v_lead_pipeline AS
SELECT
  l.*,
  c.full_name AS client_name,
  c.email AS client_email,
  c.phone AS client_phone,
  p.title AS property_title,
  p.address AS property_address,
  p.price AS property_price,
  pr.full_name AS agent_name
FROM leads l
JOIN clients c ON c.id = l.client_id
LEFT JOIN properties p ON p.id = l.property_id
LEFT JOIN profiles pr ON pr.id = l.assigned_agent_id;

-- v_weekly_kpis: pre-aggregated metrics for dashboard
CREATE VIEW v_weekly_kpis AS
SELECT
  DATE_TRUNC('week', created_at) AS week,
  COUNT(*) FILTER (WHERE status = 'new') AS new_leads,
  COUNT(*) FILTER (WHERE status = 'closed_won') AS closed_won,
  COUNT(*) FILTER (WHERE status = 'closed_lost') AS closed_lost
FROM leads
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week DESC;
```

### ✅ 1.8 Create seed data
File: `supabase/seed.sql`

Seed with realistic Czech data:
- 3 agent profiles (Jan Novák, Marie Kovaříková, Tomáš Hrubý)
- 25 properties across Prague districts (Holešovice, Vinohrady, Žižkov, Smíchov, Dejvice)
  - Mix of types: byt 1+kk to 4+kk, dům, komerční
  - Mix of statuses: 15 active, 5 pending, 4 sold, 1 withdrawn
  - 8 properties intentionally missing `reconstruction_notes` or `permit_data` (for data gap feature)
  - Prices: 3.5M – 18M CZK realistic range
- 20 clients (Czech names, emails, phones)
  - Sources distributed: 8 referral, 6 sreality, 3 bezrealitky, 2 direct, 1 social
- 35 leads linking clients to properties
  - Distributed across all statuses
  - `created_at` spread across last 6 months (for trend charts)
- 50 activities (calls, viewings, emails, notes)
- 3 monitoring jobs (Praha Holešovice, Praha Vinohrady, Praha Žižkov)
- 30 market_listings (scraped data from last 14 days)

**Definition of done:** `pnpm supabase db reset` completes without error. All tables visible in Studio with seed data.

---

## Phase 2 — Authentication
**Goal:** Working login, session management, protected routes. No real features yet.

### ✅ 2.1 Supabase client factories
Create `src/lib/supabase/server.ts` — `createServerClient` using `@supabase/ssr` with cookies.
Create `src/lib/supabase/client.ts` — `createBrowserClient` singleton.
Create `src/lib/supabase/middleware.ts` — session refresh logic.

### ✅ 2.2 Next.js proxy (session + auth routes)
File: `src/proxy.ts` (Next.js 16; náhrada za `middleware.ts`)

- Refresh Supabase session on every request
- Redirect unauthenticated users from chránených ciest (`/dashboard`, `/chat`, `/properties`, …) to `/login`
- Redirect authenticated users from `/login` a `/register` to `/dashboard`
- Callback `/callback` nechaj prebehnúť

### ✅ 2.3 Shared TypeScript types
File: `src/types/database.ts` — generate from Supabase schema:
```bash
pnpm supabase gen types typescript --local > src/types/database.ts
```

File: `src/types/app.ts` — application-level types:
```typescript
export type Property = Database['public']['Tables']['properties']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Lead = Database['public']['Tables']['leads']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type LeadStatus = Database['public']['Enums']['lead_status']
export type PropertyStatus = Database['public']['Enums']['property_status']
// ... all enums and table row types
```

### ✅ 2.4 Login page
Route: `src/app/(auth)/login/page.tsx`

- Email + password form (React Hook Form + Zod)
- "Přihlásit se" button
- Error state display
- Calls `supabase.auth.signInWithPassword()`
- On success: redirects to `/dashboard`
- Design: centered card, Pepa logo, clean layout per design system

### ✅ 2.4b Registration page
Route: `src/app/(auth)/register/page.tsx` — e-mail, heslo, potvrdenie; `supabase.auth.signUp`, redirect `/callback` v e-maile; odkaz z `/login` a z CTA na landing page; `src/proxy.ts` povoľuje `/register`.

### ✅ 2.5 OAuth callback route
Route: `src/app/(auth)/callback/route.ts`
Handles Supabase auth code exchange.

### ✅ 2.6 Profile sync trigger
Supabase function that creates a `profiles` row when a new `auth.users` row is inserted:
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### ✅ 2.7 useUser hook
`src/hooks/useUser.ts` — returns current user and profile from Supabase client-side.

**Definition of done:** Login works. Unauthenticated visit to `/dashboard` redirects to `/login`. After login, redirects to `/dashboard`. Session persists on page refresh.

---

## Phase 3 — Dashboard shell & navigation
**Goal:** Full layout with sidebar, topbar, and empty page placeholders for all routes.

### ✅ 3.1 Root layout
`src/app/layout.tsx` — Inter font, metadata, providers wrapper.

### ✅ 3.2 Dashboard layout
`src/app/(dashboard)/layout.tsx`

Components needed:
- `<Sidebar />` — 220px fixed, logo, nav items, user avatar at bottom
- `<Topbar />` — greeting, notification bell, user menu
- Main content area with padding

Sidebar nav items (with Lucide icons):
| Label | Icon | Route |
|---|---|---|
| Dashboard | `LayoutDashboard` | `/dashboard` |
| Ask Pepa | `MessageSquare` | `/chat` |
| Nemovitosti | `Building2` | `/properties` |
| Klienti | `Users` | `/clients` |
| Leady | `TrendingUp` | `/leads` |
| Reporty | `FileText` | `/reports` |
| Monitoring | `Bell` | `/monitoring` |
| Nastavení | `Settings` | `/settings` |

Active state: indigo pill background, white text+icon.

### ✅ 3.3 Empty page stubs
Create stub pages (just a heading) for all routes:
- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/chat/page.tsx`
- `app/(dashboard)/properties/page.tsx`
- `app/(dashboard)/properties/[id]/page.tsx`
- `app/(dashboard)/clients/page.tsx`
- `app/(dashboard)/clients/[id]/page.tsx`
- `app/(dashboard)/leads/page.tsx`
- `app/(dashboard)/reports/page.tsx`
- `app/(dashboard)/monitoring/page.tsx`
- `app/(dashboard)/settings/page.tsx`

### ✅ 3.4 Loading and error boundaries
Create `loading.tsx` and `error.tsx` siblings for each route.
`loading.tsx` — skeleton that matches the page layout.
`error.tsx` — error card with retry button.

### ✅ 3.5 Landing page
`src/app/page.tsx` — public landing page.

Sections:
1. Navbar (logo, nav links, login CTA)
2. Hero (headline with gradient, subtitle, CTA buttons, trust badges)
3. Features grid (6 cards per design mockup)
4. Footer (simple, logo + copyright)

No auth required. Redirect to `/dashboard` if already logged in.

**Definition of done:** All routes resolve. Sidebar navigation works. Active route highlighted. Layout is pixel-accurate to design spec.

---

## Phase 4 — Agent core (Claude API + tool use)
**Goal:** Working AI agent with all tools wired to real Supabase data. This is the heart of the product.

### ✅ 4.1 Agent system prompt
File: `src/lib/claude/system-prompt.ts`

```typescript
export const SYSTEM_PROMPT = `
Jsi Pepa, AI asistent pro správu back office realitní společnosti.
Máš přístup k firemní databázi nemovitostí, klientů, leadů a aktivit.
Vždy odpovídej česky, profesionálně a stručně.
Při práci s daty vždy používej dostupné nástroje — nikdy nevymýšlej čísla.
Pokud data nejsou dostupná, řekni to jasně.
Dnešní datum: ${new Date().toLocaleDateString('cs-CZ')}.
`
```

### ✅ 4.2 Tool definitions
File: `src/lib/claude/tools/definitions.ts`

Define all 9 tools as Anthropic tool definitions with JSON Schema input schemas.

**Tool 1: `query_database`**
Input: `{ entity, filters?, date_range?, group_by?, order_by?, limit? }`
Description: Query properties, clients, leads, activities, or market_listings with optional filters and grouping.

**Tool 2: `get_calendar_availability`**
Input: `{ days_ahead?, slot_duration_minutes?, working_hours_start?, working_hours_end? }`
Description: Get free time slots from the agent's Google Calendar.

**Tool 3: `draft_email`**
Input: `{ recipient_name, recipient_email?, purpose, property_id?, proposed_slots?, custom_notes? }`
Description: Draft a professional Czech-language email, optionally with viewing time proposals.

**Tool 4: `find_data_gaps`**
Input: `{ fields?, district?, export_format? }`
Description: Find properties with NULL values in important fields like reconstruction_notes, permit_data.

**Tool 5: `generate_report`**
Input: `{ period, date_from?, date_to?, include_sections? }`
Description: Aggregate business metrics for a time period into a structured ReportData object.

**Tool 6: `create_presentation`**
Input: `{ title, period_label, slides[] }`
Description: Generate a PPTX presentation from report data. Returns Supabase Storage download URL.

**Tool 7: `render_chart`**
Input: `{ chart_type, title, data[], x_key, series[] }`
Description: Return structured chart data for the frontend to render as a Recharts visualisation.

**Tool 8: `create_monitoring_job`**
Input: `{ name, location, property_types?, price_max?, notify_telegram?, notify_email?, schedule? }`
Description: Create a scheduled job that monitors real estate portals for new listings.

**Tool 9: `search_market_listings`**
Input: `{ district?, property_type?, price_min?, price_max?, is_new?, days_back? }`
Description: Search scraped listings from Sreality and Bezrealitky.

### ✅ 4.3 Tool implementations
File per tool in `src/lib/claude/tools/`:

`query-database.ts` — Builds safe Supabase queries from tool input. Routes by entity type. Applies filters, date ranges, group_by aggregation. Returns `Result<unknown[]>`. Never allows raw SQL injection — only whitelisted column names.

`get-calendar-availability.ts` — Calls Google Calendar API with user's access token. Inverts busy periods to get free slots within working hours. Returns `{ slots: TimeSlot[], connected: boolean }`.

`draft-email.ts` — Loads property details from DB if `property_id` provided. Formats proposed_slots as Czech datetime strings. Returns `{ subject: string, body: string, to: string }` — never sends, only drafts.

`find-data-gaps.ts` — Queries properties WHERE specified fields are NULL. Returns `{ properties: GapProperty[], total: number, csv_url?: string }`.

`generate-report.ts` — Runs 5 parallel Supabase queries for the period. Calculates conversion rate, avg deal time, top agent, revenue sum. Returns full `ReportData` struct.

`create-presentation.ts` — Uses `pptxgenjs` to build 3-slide deck. Uploads to Supabase Storage. Returns `{ download_url: string, expires_at: string }`.

`render-chart.ts` — Validates chart data structure, passes through. Frontend renders it as Recharts. Returns the same data with a `chart_id` for React key.

`create-monitoring-job.ts` — Validates location string. Inserts into `monitoring_jobs`. Returns created job with `{ id, name, location, next_run_at }`.

`search-market-listings.ts` — Queries `market_listings` table with type-safe filters. Returns `{ listings: MarketListing[], total: number, new_count: number }`.

### ✅ 4.4 Tool executor
File: `src/lib/claude/tool-executor.ts`

```typescript
export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: { userId: string; supabase: SupabaseClient }
): Promise<unknown> {
  switch (toolName) {
    case 'query_database': return queryDatabaseTool(toolInput, context)
    case 'get_calendar_availability': return getCalendarAvailabilityTool(toolInput, context)
    case 'draft_email': return draftEmailTool(toolInput, context)
    case 'find_data_gaps': return findDataGapsTool(toolInput, context)
    case 'generate_report': return generateReportTool(toolInput, context)
    case 'create_presentation': return createPresentationTool(toolInput, context)
    case 'render_chart': return renderChartTool(toolInput, context)
    case 'create_monitoring_job': return createMonitoringJobTool(toolInput, context)
    case 'search_market_listings': return searchMarketListingsTool(toolInput, context)
    default: throw new Error(`Unknown tool: ${toolName}`)
  }
}
```

### ✅ 4.5 Agent API route (streaming)
File: `src/app/api/agent/chat/route.ts`

Full agentic loop:
1. Validate input (Zod): `{ message, sessionId, history? }`
2. Verify Supabase session — return 401 if not authenticated
3. Check rate limit — return 429 if exceeded (10 req/min)
4. Save user message to `agent_conversations`
5. Load last 10 messages from session as conversation history
6. Call Claude API with all 9 tools, stream enabled
7. **Agentic loop:** while `stop_reason === 'tool_use'`:
   a. Parse tool call from response
   b. Execute tool via `executeTool()`
   c. Send tool result back to Claude
   d. Continue streaming
8. Stream final text response as SSE
9. For `render_chart` tool results: inject SSE event `data: {"type":"chart","payload":{...}}\n\n`
10. For `draft_email` results: inject SSE event `data: {"type":"email","payload":{...}}\n\n`
11. For `create_presentation` results: inject SSE event `data: {"type":"download","payload":{...}}\n\n`
12. Save assistant message + tool calls to `agent_conversations`

### ✅ 4.6 Conversation history
File: `src/lib/claude/history.ts`

Load last 20 messages for session from `agent_conversations`.
Convert to Anthropic `MessageParam[]` format (handle tool_use and tool_result message types).
Trim to fit context window if needed.

**Definition of done:** POST to `/api/agent/chat` with Czech question returns correct streamed answer using real seed data. Tool calls visible in `agent_conversations` table.

---

## Phase 5 — Chat UI
**Goal:** Full chat interface where the user converses with Pepa and sees rich inline outputs.

### ✅ 5.1 Chat page layout
`src/app/(dashboard)/chat/page.tsx`

Two-column layout:
- Left (65%): `<ChatPanel />` — message history + input
- Right (35%): `<ChatSidebar />` — suggested questions, recent sessions

### ✅ 5.2 ChatPanel component
`src/components/features/chat/ChatPanel.tsx`

- Auto-scroll to bottom on new messages (`useRef` + `useEffect`)
- User bubbles: right-aligned, indigo background, white text
- Agent bubbles: left-aligned, card background, border
- Each agent bubble can contain mixed content: text + one or more rich blocks
- Streaming: text appears character by character as SSE arrives
- Typing indicator: three animated dots while waiting for first token
- Error state: inline error message with "Zkusit znovu" button

### ✅ 5.3 Rich block renderers (inside agent bubbles)

`<InlineChart chart={ChartPayload} />` — Recharts chart, 240px height, responsive container. Renders on `type: "chart"` SSE event.

`<InlineTable data={rows} columns={cols} />` — scrollable table, export CSV button top-right. Renders when agent returns tabular data.

`<EmailDraft email={EmailPayload} />` — styled email card with subject, recipient, body. Copy button, "Otevřít v mailu" mailto link, edit toggle. Renders on `type: "email"` SSE event.

`<DownloadCard url={string} label={string} />` — file download card with icon, filename, expiry. Renders on `type: "download"` SSE event.

`<DataGapTable gaps={GapProperty[]} />` — table of properties with missing fields, each row has a link to the property detail page.

### ✅ 5.4 ChatInput component
`src/components/features/chat/ChatInput.tsx`

- Auto-resizing textarea (min 1 row, max 5 rows)
- Send button: arrow-up icon, indigo, `disabled` when empty or `isLoading`
- Enter = send, Shift+Enter = newline
- Character counter at 1500+ characters
- Max 2000 characters

### ✅ 5.5 useAgentChat hook
`src/hooks/useAgentChat.ts`

Manages: messages array, loading state, streaming state, session ID.
`sendMessage(text)`:
1. Optimistic add of user message
2. Add empty assistant message with `isStreaming: true`
3. Fetch `/api/agent/chat` with full history
4. Read SSE stream: parse text chunks + event chunks
5. Update assistant message content as tokens arrive
6. On `type: "chart"` event: append chart block to message
7. On `type: "email"` event: append email draft block
8. On `type: "download"` event: append download card
9. On stream end: set `isStreaming: false`
10. On error: set error state on message

### ✅ 5.6 ChatSidebar component

Suggested question chips (click = sends immediately):
- "Kolik nových klientů jsme měli tento měsíc?"
- "Které nemovitosti mají chybějící data?"
- "Napiš shrnutí minulého týdne"
- "Jaký je vývoj leadů za posledních 6 měsíců?"
- "Zobraz aktivní nemovitosti v Holešovicích"
- "Připrav prezentaci výsledků tohoto týdne"

Recent sessions list: last 5 sessions from `agent_conversations`, showing first user message as preview. Click to load session.

**Definition of done:** User types question → streaming response appears → chart renders inline in the bubble. Clicking a suggested question sends it immediately.

---

## Phase 6 — Dashboard home (KPIs + overview)
**Goal:** The `/dashboard` home page with live KPI cards, trend chart, and quick panels.

### ✅ 6.1 KPI data fetchers
`src/lib/data/dashboard.ts` — parallel Supabase queries:

```typescript
export async function getDashboardKpis(supabase: SupabaseClient) {
  const [newClientsQ1, activeListings, leadsThisMonth, avgDaysToClose] = await Promise.all([
    getNewClientsCurrentQuarter(supabase),
    getActiveListingsCount(supabase),
    getLeadsThisMonth(supabase),
    getAvgDaysToClose(supabase),
  ])
  return { newClientsQ1, activeListings, leadsThisMonth, avgDaysToClose }
}
```

Each function returns `{ value: number, trend: number, trendLabel: string }`.

### ✅ 6.2 KPI cards component
`src/components/features/dashboard/KpiCards.tsx` (Server Component)

4-column grid:
- **Noví klienti Q1** — count + source breakdown in tooltip
- **Aktivní nemovitosti** — count + district breakdown
- **Leady tento měsíc** — count + trend vs last month (green/red)
- **Průměrná doba uzavření** — days + trend arrow

### ✅ 6.3 Lead trend chart
`src/lib/data/dashboard.ts` — `getLeadTrend(supabase, months: 6)`:
Query leads grouped by `DATE_TRUNC('month', created_at)` for last 6 months.
Query sold properties grouped by month for same period.

`src/components/features/dashboard/LeadTrendChart.tsx` (Client Component, Recharts AreaChart):
Two series: leads (indigo, solid) and prodané (green, dashed).
X-axis: month abbreviations in Czech (Led, Úno, Bře...).

### ✅ 6.4 Recent activity panel
`src/components/features/dashboard/RecentActivity.tsx`

Last 8 activities from `activities` table with agent filter.
Each row: type icon + description + related entity link + time ago.
Empty state: "Žádné nedávné aktivity."

### ✅ 6.5 Quick actions panel
`src/components/features/dashboard/QuickActions.tsx`

Three pre-built action buttons:
- "Nový lead" → opens lead creation dialog
- "Nová nemovitost" → opens property dialog
- "Spustit monitoring" → triggers market scrape

Plus upcoming calendar events (if Google Calendar connected): next 3 events.

### ✅ 6.6 New listings banner
If `market_listings` has `is_new = true` entries from today:
Dismissible banner at top: "Dnes ráno: X nových nabídek v [districts] → Zobrazit"
Links to `/dashboard/monitoring`.

**Definition of done:** Dashboard loads with correct numbers from seed data. KPIs, chart, and activity feed all show real data. Page loads under 1 second.

---

## Phase 7 — Properties module
**Goal:** Full property management with list, detail, data quality tracking.

### ✅ 7.1 Properties list page
`src/app/(dashboard)/properties/page.tsx` (Server Component with Client filters)

Columns: adresa, typ, status, cena, plocha, agent, leady, kvalita dat, akce.

Filters (URL search params):
- `status`: all / active / pending / sold / withdrawn
- `type`: all / byt / dum / komercni
- `district`: all / Holešovice / Vinohrady / Žižkov / Smíchov / Dejvice / other
- `agent`: all / [agent uuid]
- `search`: full-text search on title + address
- `missing_data`: checkbox — show only properties with gaps

Pagination: 20 per page, URL-based (`?page=2`).
Export CSV: server action generating CSV of current filter result.

### ✅ 7.2 Property detail page
`src/app/(dashboard)/properties/[id]/page.tsx`

Sections (tabs):
1. **Přehled** — all property fields in two-column grid
2. **Leady** — all leads for this property as mini pipeline
3. **Aktivity** — chronological activity timeline
4. **Dokumenty** — placeholder for future document upload

Data quality card in header:
- Green: all key fields filled
- Amber: 1–3 fields missing
- Red: 4+ fields missing
- List of missing fields with "Doplnit" inline edit buttons

"Ask Pepa" button → opens chat pre-filled with: "Řekni mi vše o nemovitosti [title] na [address]."

### ✅ 7.3 Property dialog (create/edit)
`src/components/features/properties/PropertyDialog.tsx`

Form fields: title, address, city, district (select), type (select), status (select), price, area_m2, floor, total_floors, year_built, last_renovation, reconstruction_notes (textarea), permit_data (textarea), agent (select from profiles).

Server Action: `upsertProperty(formData)` — validates with Zod, upserts to DB, revalidates path.

### ✅ 7.4 Data gap report trigger
"Najít nemovitosti s chybějícími daty" button on properties list.
Sends to chat: "Najdi nemovitosti, u kterých nám v systému chybí data o rekonstrukci a stavebních úpravách a připrav jejich seznam k doplnění."

**Definition of done:** All 25 seed properties listed correctly. Data gap badge shows red on the 8 properties missing fields. Detail page shows all tabs with data.

---

## Phase 8 — Clients & Leads module
**Goal:** Client profiles, lead pipeline management, source analytics.

### ✅ 8.1 Clients list page
`src/app/(dashboard)/clients/page.tsx`

Columns: jméno, email, telefon, zdroj, aktivní leady, celkem leadů, datum přidání.
Filters: source, date range, search.
Source badges with colours matching `lead_source` enum values.

### ✅ 8.2 Client detail page
`src/app/(dashboard)/clients/[id]/page.tsx`

- Header: name, contact info, source badge, assigned agent
- Stats row: total leads, closed won, conversion rate, total value
- Lead history timeline: each lead with property, status, dates, outcome
- Activity log: all activities where `related_to_id = client.id`
- Notes section (free text, saved to `clients.notes`)
- "Ask Pepa" button pre-filled with client context

### ✅ 8.3 Leads pipeline page
`src/app/(dashboard)/leads/page.tsx`

Toggle between two views:

**Kanban view:**
Columns per `lead_status` enum, in order: Nový → Kontaktován → Prohlídka naplánována → Nabídka podána → Uzavřen ✓ → Uzavřen ✗
Lead card: client name + avatar initials, property address, days in current status, agent initials.
Drag-and-drop via `@dnd-kit/core` — on drop calls `updateLeadStatus` Server Action.

**Table view:**
Columns: klient, nemovitost, status, zdroj, agent, poslední aktivita, vytvořeno.
Sortable, filterable.

### ✅ 8.4 Lead detail (inline drawer)
Click on a lead card → opens a right-side drawer (not a new page).
Shows: full lead info, activity timeline, email draft button, calendar availability button.

### ✅ 8.5 New lead dialog
Triggered from leads page and property detail.
Form: client (search or create new), property (search), status (default: new), source, notes.
Server Action: `createLead(formData)`.

### ✅ 8.6 Source breakdown charts
`src/components/features/clients/SourceBreakdownChart.tsx`

Used on dashboard and clients page. PieChart of client sources.
Shows: referral (teal), sreality (indigo), bezrealitky (amber), direct (green), other (gray).

**Definition of done:** Kanban shows all 35 seed leads in correct columns. Drag-and-drop updates status in DB. Client detail shows complete lead history.

---

## Phase 9 — Reports module
**Goal:** Manual and AI-generated reports with PDF and PPTX export.

### ✅ 9.1 Reports list page
`src/app/(dashboard)/reports/page.tsx`

Table of generated reports from `reports` table.
Columns: název, typ, období, vygeneroval, vytvořeno, stáhnout (PDF + PPTX icons).
"Generovat nový report" button → sends to chat: "Shrň výsledky minulého týdne do krátkého reportu pro vedení a připrav k tomu prezentaci se třemi slidy."

### ✅ 9.2 ReportData type
`src/types/reports.ts`

```typescript
interface ReportData {
  period: { from: Date; to: Date; label: string }
  metrics: {
    newLeads: number; closedWon: number; closedLost: number
    conversionRate: number; newClients: number
    newProperties: number; soldProperties: number
    totalRevenue: number; avgDaysToClose: number
    topAgent: { name: string; deals: number }
  }
  leadsBySource: { source: string; count: number }[]
  propertiesByDistrict: { district: string; count: number; revenue: number }[]
  activitiesByType: { type: string; count: number }[]
  weeklyBreakdown: { week: string; leads: number; sold: number }[]
}
```

### ✅ 9.3 Report generator
`src/lib/reports/generator.ts`

`generateReport(supabase, period)`:
Runs all queries in parallel with `Promise.all`.
Returns `ReportData`.

### ✅ 9.4 PDF export
`src/lib/reports/pdf-export.ts`

Page 1: Pepa logo, report title, period, 6-metric grid (new leads, closed, conversion rate, new clients, revenue, avg days).
Page 2: Lead sources table, activities summary, top 3 properties by value.

Upload to `reports/{userId}/{id}.pdf` in Supabase Storage.
Return signed URL valid 7 days.

### ✅ 9.5 PPTX export
`src/lib/reports/pptx-export.ts` (generovanie cez API `/api/reports/generate` + klient)

Slide 1: Title slide — company logo placeholder, period label, "Připraveno Pepou".
Slide 2: KPI grid — 6 large numbers with labels and trend arrows.
Slide 3: Bar chart data as table (pptxgenjs table), top 3 agents leaderboard.

Upload to `reports/{userId}/{id}.pptx`.
Return signed URL.

### ✅ 9.6 Report inline view
When agent calls `generate_report`, the ReportData is also rendered in the chat as a structured summary with inline metrics (`InlineReportSummary`, SSE `type: "report"`).

**Definition of done:** Agent generates report → PPTX downloads → opens in PowerPoint with 3 correct slides. PDF generates and downloads.

---

## Phase 10 — Google Calendar integration
**Goal:** Read calendar availability for email drafting. One-time OAuth setup per agent.

### 10.1 Google Cloud setup
Document: create OAuth 2.0 credentials, enable Calendar API, add redirect URI.
Required scope: `https://www.googleapis.com/auth/calendar.readonly`

### ✅ 10.2 Token storage migration
Sloupce `google_*` a `google_email` v `profiles` (viz `initial_schema` + migrace `20260112000000_add_google_email.sql` pro existující projekty).

### ✅ 10.3 OAuth initiation route
`src/app/api/auth/google/route.ts`

Generates Google OAuth URL with state = user ID (signed JWT).
Redirects user to Google consent screen.

### ✅ 10.4 OAuth callback route
`src/app/api/auth/google/callback/route.ts`

Exchanges code for tokens.
Saves tokens to `profiles` table for the user (from state JWT).
Fetches user's Google email and saves.
Redirects to `/settings?google=connected`.

### ✅ 10.5 Google Calendar client
`src/lib/google/calendar.ts`

```typescript
async function getFreeBusySlots(accessToken: string, options: {
  daysAhead: number
  slotDuration: number
  workStart: string
  workEnd: string
}): Promise<TimeSlot[]>

async function refreshTokenIfExpired(profile: Profile): Promise<string>
```

Calls Google Calendar FreeBusy API. Inverts busy → free. Formats slots as human-readable Czech strings ("Středa 23. dubna 10:00–11:00").

### ✅ 10.6 Settings page
`src/app/(dashboard)/settings/page.tsx`

Sections:
- **Profil** — name, email (read-only), role
- **Google Kalendář** — connect status, connected email, disconnect button
- **Telegram** — current chat ID (if set), instructions for connecting
- **Notifikace** — toggle email/telegram notifications

**Definition of done:** After OAuth, asking agent "Navrhni termíny prohlídky" returns real free slots from Google Calendar.

---

## Phase 11 — Telegram bot
**Goal:** All agent capabilities accessible from Telegram on mobile.

### ✅ 11.1 Bot setup
Via @BotFather: create bot, copy token to `TELEGRAM_BOT_TOKEN`.
Set webhook via API: `POST https://api.telegram.org/bot{token}/setWebhook?url=https://your-domain.com/api/telegram/webhook&secret_token={TELEGRAM_WEBHOOK_SECRET}`

### ✅ 11.2 Webhook route
`src/app/api/telegram/webhook/route.ts`

```typescript
export async function POST(req: Request) {
  const secretHeader = req.headers.get('X-Telegram-Bot-Api-Secret-Token')
  if (secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  const update = await req.json()
  const userId = update.message?.from?.id
  if (!ALLOWED_USER_IDS.includes(userId)) {
    await sendTelegramMessage(update.message.chat.id, 'Přístup zamítnut.')
    return new Response('OK')
  }
  // Route to handler (non-blocking — return 200 immediately)
  routeUpdate(update).catch(console.error)
  return new Response('OK')
}
```

### ✅ 11.3 Telegram API client
`src/lib/telegram/client.ts`

```typescript
async function sendMessage(chatId: number, text: string, parseMode?: 'Markdown' | 'HTML'): Promise<void>
async function sendPhoto(chatId: number, photo: Buffer, caption?: string): Promise<void>
async function sendDocument(chatId: number, document: Buffer, filename: string, caption?: string): Promise<void>
async function sendChatAction(chatId: number, action: 'typing' | 'upload_document'): Promise<void>
```

### ✅ 11.4 Command router
`src/lib/telegram/router.ts`

Routes:
- `/start` → welcome message + command list
- `/report` → generate weekly report, send as text summary
- `/leads` → today's leads (new + updated), formatted list
- `/alert Praha Holešovice` → create monitoring job, confirm
- `/status` → quick KPI snapshot (active listings, leads today, last sync time)
- Any other text → `handleAgentQuery(chatId, text)`

### ✅ 11.5 Agent query handler for Telegram
`src/lib/telegram/agent-handler.ts`

1. Send `typing` chat action immediately
2. Find/create agent session for this Telegram chat ID
3. Look up the `profiles` row with `telegram_chat_id = chatId` to get user context
4. Call agent with full tool access (same as web)
5. Collect complete response (no streaming — Telegram doesn't support it)
6. If response contains `render_chart` data: render chart to PNG buffer → `sendPhoto`
7. If response contains `create_presentation` result: download PPTX from Storage → `sendDocument`
8. Send text response as Telegram message (Markdown formatted)

### ✅ 11.6 Telegram chat ID linking
In Settings page: show "Propojit Telegram" section.
Instructions: "Otevři @PepaRealitniBot a pošli /link [váš kód]"
Generate a one-time 6-digit link code saved to `profiles.telegram_link_code`.
When bot receives `/link [code]`, look up profile, save `telegram_chat_id`, clear code.

**Definition of done:** Telegram bot responds to all commands. Free-text question returns correct answer. `/report` returns last week's summary. Charts sent as photos.

---

## Phase 12 — Market monitoring
**Goal:** Automated daily scraping of Sreality + Bezrealitky with Telegram notifications.

### ✅ 12.1 Sreality scraper
`src/lib/scraper/sreality.ts`

Sreality exposes a JSON API at `https://www.sreality.cz/api/cs/v2/estates`.
Query params: `category_main_cb` (1=byty, 2=domy), `locality_district_id`, `price_max`.

```typescript
async function scrapeSreality(options: ScraperOptions): Promise<MarketListing[]>
```

Parse response, map to `MarketListing` shape:
```typescript
interface MarketListing {
  source: 'sreality' | 'bezrealitky'
  external_id: string
  title: string
  address: string
  district: string
  price: number
  area_m2: number | null
  url: string
}
```

### ✅ 12.2 Bezrealitky scraper
`src/lib/scraper/bezrealitky.ts`

Bezrealitky uses GraphQL at `https://www.bezrealitky.cz/api/graphql`.
Query for `advertList` with location and type filters.

### ✅ 12.3 Listing persistence
`src/lib/scraper/persist.ts`

```typescript
async function upsertListings(supabase: SupabaseClient, listings: MarketListing[]): Promise<{
  new_count: number
  updated_count: number
}> {
  // For each listing: upsert on (source, external_id)
  // New listings: is_new = true, first_seen_at = now()
  // Existing: update last_seen_at, is_new = false
}

async function markOldListingsAsSeen(supabase: SupabaseClient): Promise<void> {
  // Set is_new = false where first_seen_at < now() - interval '24 hours'
}
```

### ✅ 12.4 Notification formatter
`src/lib/scraper/notify.ts`

Format Telegram message for new listings:
```
🏠 Nové nabídky v Holešovicích (5)

1. Byt 2+kk, 58 m² — 6 200 000 Kč
   Osadní 35, Praha 7
   → sreality.cz/detail/...

2. Byt 3+kk, 75 m² — 8 900 000 Kč
   ...

Sledováno: Sreality + Bezrealitky
```

### ✅ 12.5 Edge Function — market-monitor
`supabase/functions/market-monitor/index.ts`

```typescript
serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // 1. Mark old listings as seen
  await markOldListingsAsSeen(supabase)

  // 2. Get all enabled monitoring jobs
  const { data: jobs } = await supabase
    .from('monitoring_jobs')
    .select('*')
    .eq('enabled', true)

  // 3. For each job: scrape, persist, notify
  for (const job of jobs) {
    const sreality = await scrapeSreality({ district: job.locations[0], ...job.filters })
    const bezrealitky = await scrapeBezrealitky({ district: job.locations[0], ...job.filters })
    const all = [...sreality, ...bezrealitky]
    const { new_count } = await upsertListings(supabase, all)

    if (new_count > 0 && job.notify_telegram) {
      const message = formatNotification(job.locations[0], all.filter(l => l.is_new))
      await sendTelegramMessage(job.telegram_chat_id, message)
    }

    await supabase.from('monitoring_jobs').update({
      last_run_at: new Date().toISOString(),
      next_run_at: tomorrow7am(),
    }).eq('id', job.id)
  }
})
```

### ✅ 12.6 pg_cron schedule
```sql
SELECT cron.schedule(
  'market-monitor-daily',
  '45 6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_functions_url') || '/market-monitor',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
  )
  $$
);
```

### ✅ 12.7 Monitoring UI page
`src/app/(dashboard)/monitoring/page.tsx`

- Active jobs list: location, schedule pill, last run time, new listings today count
- Toggle enable/disable (Server Action)
- "Spustit nyní" button (calls Edge Function manually)
- Recent listings table for selected job with source badges and links
- "Přidat lokalitu" → sends to chat for job creation via agent

**Definition of done:** Manual Edge Function trigger scrapes listings, saves to DB, sends Telegram message. Cron schedules created in Supabase. Monitoring page shows live data.

---

## Phase 13 — Polish, errors, production
**Goal:** Production quality. Every edge case handled. Deployed to Vercel.

### ✅ 13.1 Global error handling
`src/app/global-error.tsx` — catches unhandled Next.js errors.
All server actions wrapped in try/catch — return `{ error: string }` shape, never throw to client.
API routes return consistent `{ error: string, code: string }` on failure.

### ✅ 13.2 Empty states
Design and implement empty states for every list:
- Properties: "Žádné nemovitosti. Přidejte první nemovitost." + button
- Clients: "Žádní klienti."
- Leads: "Žádné leady v tomto období."
- Chat (new session): greeting card + suggested questions grid
- Reports: "Zatím žádné reporty. Zeptejte se Pepy."
- Monitoring: "Žádné sledované lokality."
- Market listings: "Žádné nové nabídky dnes."

### ✅ 13.3 Toast notifications (základ)
Použiť vlastný `Toaster` (`src/components/ui/toaster.tsx`). Toasty při: uložení nemovitosti, generování reportu/PDF, přesunu leadu, monitoring toggle/trigger, odpojení Google; chyby červeně.

### ✅ 13.4 Responsive layout
Test and fix at breakpoints: 1024px, 1280px, 1440px, 1920px.
At 1024px: sidebar collapses to icon-only (tooltips on hover).
Tables: horizontal scroll wrapper on small viewports.
KPI grid: 2 columns below 1280px.

### ✅ 13.5 Dark mode audit
Run through every page in dark mode.
Fix any hardcoded colours (should be CSS variables).
Charts: use `useTheme()` or media query to swap series colours.
Ensure no white-on-white or black-on-black text.

### ✅ 13.6 Performance
`pnpm build` — check bundle sizes.
Dynamic imports for: `InlineChart`, `pptxgenjs`, `jspdf`.
- `jspdf` dynamic import in `ReportsClient.tsx` (code-split on PDF download click)
- `pdf-bar-chart.ts` changed to `import type` so jspdf not bundled statically
- Build clean — zero type errors.
All `<Image>` tags use `next/image`.
`generateStaticParams` for property detail pages (ISR).
Add `Suspense` with skeleton around every async Server Component.

### ✅ 13.7 Security checklist
Per `.claude/web_security.md`:
- ✅ No `SUPABASE_SERVICE_ROLE_KEY` in client bundle — verified server-only files
- ✅ No `ANTHROPIC_API_KEY` in client bundle
- ✅ Zod validation on `/api/agent/chat` — RequestSchema with min/max
- ✅ Zod validation on `/api/telegram/webhook` — handled via secret token auth
- ✅ RLS enforced via Supabase policies (agent-scoped queries)
- ✅ Telegram webhook `X-Telegram-Bot-Api-Secret-Token` verified (5 unit tests)
- ✅ Rate limit: 10 req/min cap on `/api/agent/chat` → 429
- ✅ Google token refresh works when `expires_at` is past

### 13.8 Vercel deployment
1. Push to GitHub
2. Connect repo in Vercel
3. Set all env vars in Vercel dashboard (from `.env.local.example`)
4. Set `NEXT_PUBLIC_APP_URL` to production domain
5. Deploy
6. Set Telegram webhook to production URL
7. Run `supabase db push` against production Supabase project
8. Run seed against production (or create prod-specific seed)

### 13.9 Post-deploy smoke test
- [ ] Login works
- [ ] Dashboard KPIs show data
- [ ] Chat: "Kolik aktivních nemovitostí máme?" returns correct answer
- [ ] Telegram `/start` responds
- [ ] Telegram free-text question works
- [ ] Google Calendar OAuth completes
- [ ] Report PDF download works
- [ ] Market monitor manual trigger works
- [ ] PPTX downloads and opens in PowerPoint

**Definition of done:** Production URL live. All smoke test items pass.

---

## Phase 14 — Demo recording
**Goal:** Video demonstrating all 6 user stories. Delivered alongside Vercel URL.

### Script (5–7 minutes)

**0:00–0:30** Open app, log in, show dashboard — KPI cards, trend chart, activity feed.

**0:30–1:30** User story 1 — type "Jaké nové klienty máme za 1. kvartál? Odkud přišli? Můžeš to znázornit graficky?" → streaming response + pie chart renders inline.

**1:30–2:30** User story 2 — "Vytvoř graf vývoje počtu leadů a prodaných nemovitostí za posledních 6 měsíců." → line chart with two series appears in chat.

**2:30–3:30** User story 3 — "Napiš e-mail pro zájemce o moji nemovitost a doporuč mu termín prohlídky na základě mé dostupnosti v kalendáři." → email draft card with real calendar slots.

**3:30–4:30** User story 4 — "Najdi nemovitosti, u kterých nám v systému chybí data o rekonstrukci a stavebních úpravách." → data gap table with 8 properties.

**4:30–5:30** User story 5 — "Shrň výsledky minulého týdne do krátkého reportu pro vedení a připrav k tomu prezentaci se třemi slidy." → report summary in chat + PPTX download card → open file.

**5:30–6:30** User story 6 — show Monitoring page, trigger manually, Telegram notification arrives on phone.

**6:30–7:00** Show Telegram on phone — type "Kolik leadů máme tento měsíc?" → answer arrives in Telegram.

---

## Summary

| Phase | Deliverable | Est. hours |
|---|---|---|
| 0 | Project bootstrap | 2h |
| 1 | Database + seed | 3h |
| 2 | Auth | 2h |
| 3 | Dashboard shell | 2h |
| 4 | Agent core (Claude API + tools) | 4h |
| 5 | Chat UI | 3h |
| 6 | Dashboard home | 2h |
| 7 | Properties module | 2h |
| 8 | Clients & Leads | 2h |
| 9 | Reports + export | 2h |
| 10 | Google Calendar | 2h |
| 11 | Telegram bot | 2h |
| 12 | Market monitoring | 2h |
| 13 | Polish + deploy | 2h |
| 14 | Demo | 1h |
| **Total** | | **~33h** |

---

## Current phase
<!-- Update this line as you progress through phases -->
**Active: Phase 13.6+ — výkon (dynamic importy), security checklist, deploy (13.8–13.9), potom Phase 14 demo**

*Poznámka: Úlohy sa majú označovať ✅ pri dokončení (horná časť súboru). Fáza 10.1 je manuálny krok v Google Cloud Console — zostáva bez ✅ v kóde.*
