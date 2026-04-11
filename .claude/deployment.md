# Deployment Guide

Step-by-step instructions to deploy Pepa to production.
Final deliverable: live Vercel URL + working Telegram bot.

---

## Prerequisites checklist

Before starting deployment, have these ready:
- [ ] GitHub repository created and code pushed
- [ ] Supabase account (free tier sufficient for demo)
- [ ] Vercel account connected to GitHub
- [ ] Anthropic API key with sufficient credits
- [ ] Telegram account to create the bot
- [ ] Google Cloud account for Calendar OAuth
- [ ] Resend account for email (free tier: 3000 emails/month)
- [ ] Domain (optional — Vercel provides `.vercel.app` subdomain for free)

---

## Step 1 — Supabase production project

### 1.1 Create project
1. supabase.com → New project
2. Name: `pepa-agent-prod`
3. Database password: generate strong password, save securely
4. Region: `eu-central-1` (Frankfurt — closest to Czech Republic)

### 1.2 Run migrations
```bash
# Link local project to production
pnpm supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
pnpm supabase db push

# Verify in Studio that all tables exist
```

### 1.3 Run seed data
```bash
# Push seed data to production
pnpm supabase db seed --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

### 1.4 Enable pg_cron extension
Supabase Dashboard → Database → Extensions → search "pg_cron" → Enable

### 1.5 Enable pg_net extension (for cron → Edge Function calls)
Supabase Dashboard → Database → Extensions → search "pg_net" → Enable

### 1.6 Create storage bucket
Run in Supabase SQL editor:
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  false,
  10485760,
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
);

CREATE POLICY "Users can read own reports"
ON storage.objects FOR SELECT
USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Service role can write reports"
ON storage.objects FOR INSERT
WITH CHECK (true);  -- enforced by service role key usage
```

### 1.7 Set app config in DB (for Edge Functions)
```sql
ALTER DATABASE postgres SET app.supabase_functions_url = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1';
ALTER DATABASE postgres SET app.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

### 1.8 Deploy Edge Functions
```bash
# Deploy all Edge Functions
pnpm supabase functions deploy market-monitor
pnpm supabase functions deploy daily-briefing

# Set secrets for Edge Functions
pnpm supabase secrets set ANTHROPIC_API_KEY=your_key
pnpm supabase secrets set TELEGRAM_BOT_TOKEN=your_token
pnpm supabase secrets set TELEGRAM_WEBHOOK_SECRET=your_secret
```

### 1.9 Schedule cron jobs
Run in Supabase SQL editor:
```sql
-- Market monitor: every day at 6:45 AM
SELECT cron.schedule(
  'market-monitor-daily',
  '45 6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_functions_url') || '/market-monitor',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);

-- Daily briefing: every day at 7:00 AM
SELECT cron.schedule(
  'daily-briefing',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_functions_url') || '/daily-briefing',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  )
  $$
);
```

### 1.10 Collect production Supabase values
From Supabase Dashboard → Settings → API:
```
NEXT_PUBLIC_SUPABASE_URL = https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
SUPABASE_SERVICE_ROLE_KEY = eyJ...
```

---

## Step 2 — Google Cloud setup

### 2.1 Create project
1. console.cloud.google.com → New Project → "Pepa Agent"

### 2.2 Enable Calendar API
APIs & Services → Library → search "Google Calendar API" → Enable

### 2.3 Create OAuth credentials
1. APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client IDs
2. Application type: Web application
3. Name: "Pepa Agent"
4. Authorised redirect URI: `https://YOUR_VERCEL_DOMAIN.vercel.app/api/auth/google/callback`
5. Save Client ID and Client Secret

### 2.4 Configure OAuth consent screen
1. OAuth consent screen → External → Create
2. App name: "Pepa Agent"
3. Scopes: add `https://www.googleapis.com/auth/calendar.readonly`
4. Test users: add your email (while in testing mode)

```
GOOGLE_CLIENT_ID = [from credentials]
GOOGLE_CLIENT_SECRET = [from credentials]
GOOGLE_REDIRECT_URI = https://YOUR_DOMAIN.vercel.app/api/auth/google/callback
```

---

## Step 3 — Telegram bot setup

### 3.1 Create bot
Message @BotFather on Telegram:
```
/newbot
Name: Pepa Realitní Asistent
Username: PepaRealitniBot (or any available username)
```
Copy the bot token.

### 3.2 Generate webhook secret
```bash
openssl rand -hex 32
# Example output: a8f3d9c2e1b4...
```

### 3.3 Get your Telegram chat ID
1. Message your bot `/start`
2. Visit: `https://api.telegram.org/bot{YOUR_TOKEN}/getUpdates`
3. Find `message.from.id` in the response — this is your chat ID

```
TELEGRAM_BOT_TOKEN = [from BotFather]
TELEGRAM_WEBHOOK_SECRET = [generated above]
TELEGRAM_ALLOWED_USER_IDS = [your chat ID]  # comma-separated for multiple users
```

---

## Step 4 — Resend setup

1. resend.com → Create account
2. API Keys → Create API key → name "pepa-prod"
3. Domains → Add domain (or use shared domain for testing)
4. Copy API key

```
RESEND_API_KEY = re_...
```

---

## Step 5 — Vercel deployment

### 5.1 Deploy
1. vercel.com → New Project → Import from GitHub
2. Select `pepa-agent` repository
3. Framework: Next.js (auto-detected)
4. Root directory: leave empty (root of repo)
5. Click Deploy (will fail — env vars not set yet, that's OK)

### 5.2 Set environment variables
Vercel Dashboard → Project → Settings → Environment Variables

Add ALL variables from `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
TELEGRAM_ALLOWED_USER_IDS
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI         # use the vercel.app URL
RESEND_API_KEY
NEXT_PUBLIC_APP_URL         # https://YOUR_PROJECT.vercel.app
```

Set environment: Production + Preview + Development (or just Production for secrets).

### 5.3 Redeploy
Vercel Dashboard → Deployments → latest → Redeploy
Or trigger by pushing a commit.

### 5.4 Note your production URL
`https://pepa-agent-[hash].vercel.app` or custom domain.
Update `NEXT_PUBLIC_APP_URL` and `GOOGLE_REDIRECT_URI` with this URL.

---

## Step 6 — Register Telegram webhook

Run once after Vercel deploy is live:

```bash
# Set the webhook
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://YOUR_DOMAIN.vercel.app/api/telegram/webhook\",
    \"secret_token\": \"${TELEGRAM_WEBHOOK_SECRET}\",
    \"allowed_updates\": [\"message\", \"callback_query\"]
  }"

# Verify webhook is set
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

Expected response: `"url": "https://YOUR_DOMAIN..."`, `"pending_update_count": 0`

---

## Step 7 — Create first admin user

1. Open your Vercel URL
2. Go to `/login`
3. Use Supabase Dashboard → Authentication → Users → Invite user to create your account
4. Or run in SQL editor:
```sql
-- Creates user with confirmed email (for demo purposes)
SELECT supabase_admin.create_user(
  '{"email": "admin@yourcompany.cz", "password": "securepassword123", "email_confirm": true}'::jsonb
);
-- Then manually set role in profiles:
UPDATE profiles SET role = 'admin', full_name = 'Jan Novák' WHERE email = 'admin@yourcompany.cz';
```

---

## Step 8 — Post-deploy smoke tests

Run these after deployment in order:

```bash
# 1. App is reachable
curl -I https://YOUR_DOMAIN.vercel.app  # expect 200

# 2. Health check
curl https://YOUR_DOMAIN.vercel.app/api/health  # expect {"status":"ok"}

# 3. Login works
# → Open browser, go to /login, log in with your credentials

# 4. Dashboard loads
# → Should see KPI cards with data from seed

# 5. Agent responds
# → Go to /dashboard/chat, type "Kolik aktivních nemovitostí máme?"
# → Should see streaming response with correct count

# 6. Telegram bot responds
# → Message your bot: /start
# → Should receive welcome message

# 7. Telegram agent query
# → Message bot: "Kolik leadů máme tento měsíc?"
# → Should receive correct answer within 10 seconds

# 8. Market monitor manual trigger
# → Supabase Dashboard → Edge Functions → market-monitor → Test
# → Should see listings in DB after run
```

---

## Delivery checklist (zadání requirements)

The assignment requires: **Vercel URL + short video**.

### Vercel URL
After Step 5 above: `https://pepa-agent-YOUR_HASH.vercel.app`
This is what you submit.

### Video recording checklist

Use Loom, OBS, or QuickTime. Record desktop at 1080p, audio optional.

**Duration:** 5–7 minutes

**Scenes to record:**
1. **Landing page** (15s) — open app, show hero section, feature cards
2. **Login** (15s) — log in, redirect to dashboard
3. **Dashboard** (30s) — show KPI cards, trend chart, explain data is real
4. **User story 1** (60s) — Chat: "Jaké nové klienty máme za 1. kvartál? Odkud přišli? Znázorni graficky" → pie chart appears
5. **User story 2** (60s) — Chat: "Vytvoř graf vývoje počtu leadů a prodaných nemovitostí za posledních 6 měsíců" → line chart
6. **User story 3** (60s) — Chat: "Napiš e-mail pro zájemce a doporuč termín prohlídky" → email draft with calendar slots
7. **User story 4** (45s) — Chat: "Najdi nemovitosti s chybějícími daty" → data gap table
8. **User story 5** (60s) — Chat: "Shrň výsledky minulého týdne a připrav prezentaci" → report + download PPTX → open file
9. **User story 6** (45s) — Show Monitoring page, explain cron job, trigger manually, show Telegram notification arriving
10. **Telegram on mobile** (45s) — switch to phone, type "Kolik leadů máme?" → answer arrives in Telegram

**Tips:**
- Use seed data — all queries should return real numbers
- Have Telegram open on phone before starting recording
- Pre-connect Google Calendar before recording
- Zoom in on chat when showing streaming text

---

## Troubleshooting common issues

| Problem | Likely cause | Fix |
|---|---|---|
| Vercel build fails | Missing env var | Check all vars in Vercel Settings |
| `supabase.auth.getUser()` returns null | Middleware not running | Check `src/middleware.ts` matcher config |
| Telegram bot doesn't respond | Webhook not set | Re-run Step 6 curl command |
| Telegram webhook returns 401 | Wrong secret | Verify `TELEGRAM_WEBHOOK_SECRET` matches both setWebhook and env |
| Google OAuth returns redirect_uri_mismatch | URI mismatch | Exact match required in Google Console |
| Agent returns empty response | Claude API key invalid | Check `ANTHROPIC_API_KEY` in Vercel |
| Charts not rendering | SSE parsing error | Check browser console, verify SSE format |
| PPTX download 404 | Storage bucket missing | Run Step 1.6 |
| Edge Function not running | pg_cron not enabled | Enable in Supabase Extensions |
