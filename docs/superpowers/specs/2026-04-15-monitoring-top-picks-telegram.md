# Monitoring — AI Top 5 Telegram Notification

**Date:** 2026-04-15
**Status:** Approved

## Summary

After every scheduled scraper run, the system selects the top 5 properties using AI (same logic as the dashboard) and sends them as a Telegram message to a single fixed chat configured via `TELEGRAM_CHAT_ID`.

## Scope

- New Next.js API endpoint `POST /api/monitoring/top-picks`
- Edge Function (`market-monitor`) calls the endpoint after all jobs finish scraping
- Reuses existing `fetchMarketListingCandidatesForTopPicks` + `selectTopBuyListingsWithAI` exactly
- Sends one Telegram message to the first chat ID from `TELEGRAM_ALLOWED_USER_IDS` env var
- Silent skip if AI selection fails (fewer than 3 candidates, API error)

## Out of scope

- Per-user top picks
- Per-locality top picks
- Storing the top picks in `dashboard_snapshots` (that stays as a separate dashboard action)
- UI changes

---

## 1. New endpoint: `POST /api/monitoring/top-picks`

**File:** `src/app/api/monitoring/top-picks/route.ts`

**Auth:** Verifies `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` header. Returns 401 if missing or wrong.

**Flow:**
1. Create Supabase service client via `createServiceClient()` from `@/lib/supabase/server`
2. Call `fetchMarketListingCandidatesForTopPicks(supabase)`
3. Call `selectTopBuyListingsWithAI(candidates)`
4. If result has error → return `{ success: false, skipped: true, reason: result.error }`
5. Format Telegram message from `snapshot.items`
6. Parse owner chat ID: first entry of `process.env.TELEGRAM_ALLOWED_USER_IDS` split by `,`
7. Send via `sendMessage` from `@/lib/telegram/client`
8. Return `{ success: true }`

**Error behaviour:** Any failure (AI error, Telegram send error, missing env var) returns a non-2xx response so the Edge Function can log it, but does NOT crash the scraper run.

---

## 2. Telegram message format

```
🏆 *Top 5 nemovitostí dnes*

1. {title} — {district}
   💰 {price} · {source}
   ✨ {reason}
   → {url}

2. ...
```

Helper `formatCzk` mirrors the one in `MonitoringClient` (1 mil. Kč threshold).

---

## 3. Edge Function change

**File:** `supabase/functions/market-monitor/index.ts`

After the `for (const job of jobs)` loop completes, add:

```ts
const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (appUrl && serviceRoleKey) {
  await fetch(`${appUrl}/api/monitoring/top-picks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  }).catch(() => {}); // silent — never crash the scraper
}
```

`NEXT_PUBLIC_APP_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already set as Edge Function secrets.

---

## 4. Files changed

| File | Action |
|------|--------|
| `src/app/api/monitoring/top-picks/route.ts` | Create — new endpoint |
| `supabase/functions/market-monitor/index.ts` | Modify — call endpoint after scraping |

---

## 5. Error handling

| Scenario | Behaviour |
|----------|-----------|
| Fewer than 3 listing candidates | Skip silently, return `{ success: false, skipped: true }` |
| Anthropic API error | Skip silently, return `{ success: false, skipped: true }` |
| `TELEGRAM_ALLOWED_USER_IDS` missing or first entry not a valid number | Skip silently |
| Telegram send fails | Log error, still return 200 |
| Edge Function fetch to endpoint fails | `.catch(() => {})` — scraper continues normally |
