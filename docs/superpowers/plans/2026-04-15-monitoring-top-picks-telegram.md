# Monitoring Top Picks Telegram Notification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After every scheduled scraper run, select the top 5 properties using AI and send them as a Telegram message to the owner's chat.

**Architecture:** A new Next.js API route `POST /api/monitoring/top-picks` reuses the existing `fetchMarketListingCandidatesForTopPicks` + `selectTopBuyListingsWithAI` functions (same as the dashboard). The route is secured with `SUPABASE_SERVICE_ROLE_KEY` as a bearer token. The Supabase Edge Function `market-monitor` calls this route after all scraping jobs complete. Silent skip on any failure — scraping always succeeds regardless.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Zod, Anthropic Claude API (via existing `selectTopBuyListingsWithAI`), Telegram Bot API (via existing `sendMessage`), Supabase Edge Function (Deno).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/api/monitoring/top-picks/route.ts` | Create | Auth check, AI selection, Telegram send |
| `supabase/functions/market-monitor/index.ts` | Modify | Call `/api/monitoring/top-picks` after scraping loop |

---

## Task 1: Create `POST /api/monitoring/top-picks` route

**Files:**
- Create: `src/app/api/monitoring/top-picks/route.ts`

### Background

This endpoint is called by the Edge Function after scraping. It:
1. Verifies `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
2. Fetches listing candidates from `market_listings` via `fetchMarketListingCandidatesForTopPicks`
3. Calls `selectTopBuyListingsWithAI` to pick the top 5
4. Formats a Telegram message and sends it to the first chat ID from `TELEGRAM_ALLOWED_USER_IDS`

Existing functions to reuse (do not copy — import):
- `fetchMarketListingCandidatesForTopPicks(supabase)` from `@/lib/data/dashboard`
- `selectTopBuyListingsWithAI(candidates)` from `@/lib/ai/top-buy-picks`
- `sendMessage(chatId, text, parseMode)` from `@/lib/telegram/client`
- `createServiceClient()` from `@/lib/supabase/server`

- [ ] **Step 1: Create the route file**

Create `src/app/api/monitoring/top-picks/route.ts` with this exact content:

```ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchMarketListingCandidatesForTopPicks } from "@/lib/data/dashboard";
import { selectTopBuyListingsWithAI } from "@/lib/ai/top-buy-picks";
import { sendMessage } from "@/lib/telegram/client";
import type { TopBuyPickRow } from "@/lib/ai/top-buy-picks";

function formatCzk(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mil. Kč`;
  return `${n.toLocaleString("cs-CZ")} Kč`;
}

function formatTopPicksMessage(items: TopBuyPickRow[]): string {
  const lines: string[] = ["🏆 *Top 5 nemovitostí dnes*\n"];
  for (const item of items) {
    const area = item.area_m2 ? `, ${item.area_m2} m²` : "";
    const source = item.source === "sreality" ? "Sreality" : "Bezrealitky";
    lines.push(
      `${item.rank}. *${item.title}*${area} — ${item.district}\n` +
      `   💰 ${formatCzk(item.price)} · ${source}\n` +
      `   ✨ ${item.reason}\n` +
      `   → ${item.url}`
    );
  }
  return lines.join("\n\n");
}

export async function POST(request: Request): Promise<Response> {
  // Auth: Bearer token must equal SUPABASE_SERVICE_ROLE_KEY
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token || token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Resolve owner chat ID from TELEGRAM_ALLOWED_USER_IDS
  const rawIds = process.env.TELEGRAM_ALLOWED_USER_IDS ?? "";
  const ownerChatId = Number(rawIds.split(",")[0]?.trim());
  if (!ownerChatId || !Number.isFinite(ownerChatId)) {
    return NextResponse.json(
      { success: false, skipped: true, reason: "No valid TELEGRAM_ALLOWED_USER_IDS." },
      { status: 200 }
    );
  }

  try {
    const supabase = await createServiceClient();
    const candidates = await fetchMarketListingCandidatesForTopPicks(supabase);
    const result = await selectTopBuyListingsWithAI(candidates);

    if ("error" in result) {
      return NextResponse.json(
        { success: false, skipped: true, reason: result.error },
        { status: 200 }
      );
    }

    const message = formatTopPicksMessage(result.snapshot.items);
    await sendMessage(ownerChatId, message, "Markdown");

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json(
      { success: false, skipped: true, reason: msg },
      { status: 200 }
    );
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/juliuspetrik/Documents/Github/back-office-operation-agent && pnpm tsc --noEmit 2>&1
```

Expected: no new errors (a pre-existing error in a test file is acceptable).

- [ ] **Step 3: Verify build passes**

```bash
pnpm run build 2>&1 | tail -20
```

Expected: build succeeds, `/api/monitoring/top-picks` listed as a dynamic route.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/monitoring/top-picks/route.ts
git commit -m "feat: add POST /api/monitoring/top-picks for AI Telegram notification"
```

---

## Task 2: Call the endpoint from the Edge Function

**Files:**
- Modify: `supabase/functions/market-monitor/index.ts`

### Background

The Edge Function runs in Deno. After the `for (const job of jobs)` loop (around line 447 in the current file), add a call to the new Next.js endpoint. Use `.catch(() => {})` so any failure is silently swallowed — the scraper result must never depend on this call.

The Deno runtime has native `fetch`. It also has access to:
- `Deno.env.get("NEXT_PUBLIC_APP_URL")` — base URL of the Next.js app
- `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` — used as the bearer token

- [ ] **Step 1: Read the current end of the Edge Function**

Read `supabase/functions/market-monitor/index.ts` from line 410 onwards to find the exact location after the jobs loop.

- [ ] **Step 2: Add the top-picks call**

After the closing `}` of the `for (const job of jobs)` loop (and before the final `return new Response(...)` line), add:

```ts
  // AI top picks — fire-and-forget, never crashes the scraper
  const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (appUrl && serviceRoleKey) {
    await fetch(`${appUrl}/api/monitoring/top-picks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }).catch(() => {});
  }
```

The final handler should look like:

```ts
serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: jobs } = await supabase
    .from("monitoring_jobs")
    .select("*")
    .eq("enabled", true);

  if (!jobs || jobs.length === 0) {
    return new Response(JSON.stringify({ status: "no jobs" }), { status: 200 });
  }

  const results: Array<{ job: string; new_count: number }> = [];

  for (const job of jobs as MonitoringJob[]) {
    // ... existing scraping logic unchanged ...
    results.push({ job: job.name, new_count: newCount });
  }

  // AI top picks — fire-and-forget, never crashes the scraper
  const appUrl = Deno.env.get("NEXT_PUBLIC_APP_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (appUrl && serviceRoleKey) {
    await fetch(`${appUrl}/api/monitoring/top-picks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }).catch(() => {});
  }

  return new Response(JSON.stringify({ status: "ok", results }), { status: 200 });
});
```

- [ ] **Step 3: Verify build still passes**

```bash
cd /Users/juliuspetrik/Documents/Github/back-office-operation-agent && pnpm run build 2>&1 | tail -10
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/market-monitor/index.ts
git commit -m "feat: call top-picks endpoint after market-monitor scrape"
```

---

## Task 3: Deploy Edge Function to Supabase

**Files:** none (deployment only)

- [ ] **Step 1: Deploy the updated Edge Function**

```bash
cd /Users/juliuspetrik/Documents/Github/back-office-operation-agent && supabase functions deploy market-monitor 2>&1
```

Expected: `Deployed Functions market-monitor` with no errors.

- [ ] **Step 2: Push to remote**

```bash
git push 2>&1
```

Expected: `main -> main` pushed.

---

## Task 4: Smoke test on production

- [ ] **Step 1: Trigger the scraper manually**

Navigate to `/monitoring` in the production app and click **"Spustit nyní"** (Trigger Now button).

- [ ] **Step 2: Wait ~30 seconds and check Telegram**

You should receive two messages in your Telegram:
1. The existing new listings notification (if any new listings were found)
2. The new 🏆 *Top 5 nemovitostí dnes* message

- [ ] **Step 3: Check Edge Function logs if no message arrives**

```bash
supabase functions logs market-monitor --limit 50 2>&1
```

Look for any errors related to the `/api/monitoring/top-picks` call.

- [ ] **Step 4: Check Next.js logs on Vercel**

In the Vercel dashboard → Functions → `/api/monitoring/top-picks` → Logs. Look for `{ success: true }` or a `skipped` reason.
