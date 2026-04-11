# Supabase Expert

## Stack
- Supabase (PostgreSQL 15 + pgvector) as the primary database and backend
- Supabase Auth with Row Level Security (RLS) on every table
- Supabase Edge Functions (Deno) for scheduled jobs and webhooks
- Supabase Realtime for live dashboard updates
- Supabase Storage for documents, reports, and property images

## Database conventions
- All tables use `id uuid DEFAULT gen_random_uuid() PRIMARY KEY`
- All tables have `created_at timestamptz DEFAULT now()` and `updated_at timestamptz DEFAULT now()`
- Use `updated_at` trigger via `moddatetime` extension on every table
- snake_case for all table and column names
- Prefix junction/relation tables with both entity names: `property_clients`, `lead_activities`
- Soft deletes: `deleted_at timestamptz DEFAULT NULL` — never hard-delete business data
- All foreign keys have explicit `ON DELETE` behaviour (usually `RESTRICT` or `CASCADE`)

## Schema — core tables
```sql
-- Users (extended from auth.users)
profiles (id, full_name, email, role, avatar_url, telegram_chat_id, created_at, updated_at)

-- Real estate core
properties (id, title, address, city, district, type, status, price, area_m2,
            floor, total_floors, year_built, last_renovation, reconstruction_notes,
            permit_data, source_url, owner_id, agent_id, deleted_at, created_at, updated_at)

-- Clients & leads
clients (id, full_name, email, phone, source, notes, assigned_agent_id,
         created_at, updated_at, deleted_at)

leads (id, client_id, property_id, status, source, utm_source, utm_medium,
       first_contact_at, last_contact_at, closed_at, created_at, updated_at)

-- Activities & tasks
activities (id, type, title, description, related_to_type, related_to_id,
            performed_by, scheduled_at, completed_at, created_at)

-- Reports & documents
reports (id, title, type, period_start, period_end, generated_by,
         storage_path, format, created_at)

-- Agent memory / chat history
agent_conversations (id, user_id, session_id, role, content, tool_calls,
                     tokens_used, created_at)

-- Monitoring jobs
monitoring_jobs (id, name, query, locations, enabled, last_run_at,
                 next_run_at, notify_telegram, notify_email, created_at)

-- Property market listings (scraped)
market_listings (id, source, external_id, title, address, district, price,
                 area_m2, url, first_seen_at, last_seen_at, is_new, created_at)
```

## RLS patterns
```sql
-- Always enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Agents see their own + company data
CREATE POLICY "agents_read_own" ON properties
  FOR SELECT USING (
    auth.uid() = agent_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role bypasses RLS for Edge Functions
-- Use service role key only in Edge Functions, never in client
```

## Edge Functions patterns
```typescript
// supabase/functions/daily-briefing/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // service role for scheduled jobs
  )
  // ... job logic
})
```

## Migrations
- All schema changes via `supabase/migrations/` — never edit production directly
- Migration naming: `YYYYMMDDHHMMSS_descriptive_name.sql`
- Always include `-- migrate:up` and `-- migrate:down` comments
- Test migrations locally with `supabase db reset` before pushing

## Performance rules
- Add indexes on all foreign keys and frequently filtered columns
- Use `EXPLAIN ANALYZE` before shipping any complex query
- Prefer views for repeated complex joins: `v_property_summary`, `v_lead_pipeline`
- Use `select` column lists — never `SELECT *` in production queries
- Paginate with `range()` or cursor-based pagination for large datasets

## pgvector (for agent semantic search)
```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE agent_conversations ADD COLUMN embedding vector(1536);
CREATE INDEX ON agent_conversations USING ivfflat (embedding vector_cosine_ops);
```

## Environment variables
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # only in Edge Functions / server
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Supabase client setup (Next.js App Router)
- Use `@supabase/ssr` package — not the legacy `auth-helpers`
- Server Components: `createServerClient` with cookies
- Client Components: `createBrowserClient`
- Route Handlers & Server Actions: `createServerClient`
- Middleware: refresh session on every request
