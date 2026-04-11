# Project Setup

Everything you need to go from zero to running dev server.
Follow sections in order on a fresh machine.

---

## Prerequisites

Install these once — skip if already installed.

```bash
# Node.js 20+ (LTS)
# https://nodejs.org or via nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20
node --version  # should print v20.x.x

# pnpm
npm install -g pnpm
pnpm --version  # should print 9.x.x

# Supabase CLI
brew install supabase/tap/supabase        # macOS
# or: https://supabase.com/docs/guides/cli/getting-started

# Docker Desktop (required for local Supabase)
# https://www.docker.com/products/docker-desktop
# Start Docker before running supabase start
```

---

## Step 1 — Clone and install

```bash
git clone https://github.com/YOUR_ORG/pepa-agent.git
cd pepa-agent
pnpm install
```

---

## Step 2 — Environment variables

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in values. For local development you need at minimum:

```env
# Get from Step 3 (supabase start output)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=          # from supabase start output
SUPABASE_SERVICE_ROLE_KEY=              # from supabase start output

# Required for agent to work
ANTHROPIC_API_KEY=sk-ant-...            # https://console.anthropic.com

# Telegram — optional for local dev, required for full testing
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_ALLOWED_USER_IDS=

# Google Calendar — optional for local dev
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Email — optional for local dev
RESEND_API_KEY=

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Minimum to get started:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`. Everything else can be added later.

---

## Step 3 — Start local Supabase

Make sure Docker Desktop is running first.

```bash
# Start all Supabase services (DB, Auth, Storage, Studio)
pnpm supabase start
```

First run takes 2–3 minutes to pull Docker images.

Output will look like:
```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Copy `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`
Copy `service_role key` → `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

---

## Step 4 — Apply database schema and seed data

```bash
# Applies all migrations from supabase/migrations/ + runs supabase/seed.sql
pnpm supabase db reset
```

Verify in Supabase Studio at http://127.0.0.1:54323:
- Table Editor → should see: `profiles`, `properties`, `clients`, `leads`, `activities`, etc.
- `properties` table → should have 25 rows
- `clients` table → should have 20 rows
- `leads` table → should have 35 rows

---

## Step 5 — Create local dev user

```bash
# Option A: via Supabase Studio
# → http://127.0.0.1:54323
# → Authentication → Users → Add user
# Email: dev@pepa.cz
# Password: dev123456
# → Toggle "Auto Confirm User" ON

# Option B: via SQL (run in Studio → SQL Editor)
```

```sql
-- Create user and confirm email immediately
SELECT supabase_admin.create_user(
  '{"email": "dev@pepa.cz", "password": "dev123456", "email_confirm": true}'::jsonb
);

-- Set as admin with full name (run after the above)
UPDATE public.profiles
SET role = 'admin', full_name = 'Jan Novák'
WHERE email = 'dev@pepa.cz';
```

---

## Step 6 — Start dev server

```bash
pnpm dev
```

Open http://localhost:3000

You should see the landing page. Click "Log in", use `dev@pepa.cz` / `dev123456`.
After login you should land on `/dashboard` with KPI cards showing real data from seed.

---

## Step 7 — Verify agent works

1. Go to http://localhost:3000/dashboard/chat
2. Type: `Kolik aktivních nemovitostí máme?`
3. You should see a streaming response: `Aktuálně máme 15 aktivních nemovitostí.`

If you see an error: check `ANTHROPIC_API_KEY` in `.env.local`.

---

## Daily dev workflow

```bash
# Start everything
docker start          # or open Docker Desktop
pnpm supabase start   # start local Supabase (fast if already pulled)
pnpm dev              # start Next.js dev server

# Stop everything
pnpm supabase stop    # stops Supabase containers (preserves data)
# Ctrl+C              # stops Next.js

# Reset database to clean seed state (wipes all local data)
pnpm supabase db reset
```

---

## Optional: Telegram local testing

For testing Telegram locally you need to expose your localhost via a tunnel.

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000

# Output includes a public URL like:
# https://abc123.ngrok-free.app

# Register that URL as webhook:
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://abc123.ngrok-free.app/api/telegram/webhook\",
    \"secret_token\": \"${TELEGRAM_WEBHOOK_SECRET}\"
  }"
```

---

## Optional: Google Calendar local testing

1. In Google Cloud Console → OAuth credentials → add `http://localhost:3000/api/auth/google/callback` as authorised redirect URI
2. Set `GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback` in `.env.local`
3. Go to http://localhost:3000/dashboard/settings → connect Google Calendar

---

## Optional: Edge Functions local testing

```bash
# Serve Edge Functions locally
pnpm supabase functions serve

# Trigger market-monitor manually:
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/market-monitor' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{}'
```

---

## Useful local URLs

| Service | URL |
|---|---|
| App | http://localhost:3000 |
| Supabase Studio | http://127.0.0.1:54323 |
| Supabase API | http://127.0.0.1:54321 |
| Email inbox (Inbucket) | http://127.0.0.1:54324 |
| DB direct connection | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

---

## Common issues

**`supabase start` fails**
→ Make sure Docker Desktop is running
→ Try: `pnpm supabase stop --no-backup && pnpm supabase start`

**`pnpm dev` — module not found errors**
→ Run `pnpm install` again
→ Delete `node_modules` and `.next`, then `pnpm install && pnpm dev`

**Login redirects back to `/login`**
→ Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly
→ Verify user exists in Studio → Authentication → Users

**Agent returns error**
→ Check `ANTHROPIC_API_KEY` is valid: `echo $ANTHROPIC_API_KEY` (should start with `sk-ant-`)
→ Check Supabase is running: `pnpm supabase status`

**KPI cards show 0 or error**
→ Run `pnpm supabase db reset` to restore seed data

**TypeScript errors on `pnpm dev`**
→ Regenerate types: `pnpm supabase gen types typescript --local > src/types/database.ts`

---

## Claude Code — start building

```bash
# In the project root:
claude

# Then in Claude Code:
/build
```

Claude Code reads `CLAUDE.md` automatically on startup.
The `/build` command reads `project_phases.md` and starts Phase 0.
