# Monitoring Schedule Hour — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users set the daily scraper run hour (00:00–23:00) when creating or editing a monitoring job.

**Architecture:** Add a `run_hour` column to the DB, thread it through `insert-job.ts` and a new PATCH handler, then add a time dropdown to the create dialog and a pencil-icon edit sheet on each job card — all within the existing `MonitoringClient` component and `DialogSheetPanel` pattern.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + RLS), TypeScript strict, Zod, Tailwind CSS v4 / shadcn design tokens.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/20260415120000_monitoring_run_hour.sql` | Create | Add `run_hour` column |
| `src/types/database.ts` | Modify | Add `run_hour` to `monitoring_jobs` Row/Insert/Update |
| `src/lib/monitoring/insert-job.ts` | Modify | Accept `runHour`, store it + compute `next_run_at` |
| `src/app/api/monitoring/jobs/route.ts` | Modify | Add `PATCH` handler |
| `src/components/features/monitoring/MonitoringClient.tsx` | Modify | Hour dropdown in create dialog; pencil icon + edit sheet |

---

## Task 1: DB migration — add `run_hour` column

**Files:**
- Create: `supabase/migrations/20260415120000_monitoring_run_hour.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- migrate:up
ALTER TABLE monitoring_jobs
  ADD COLUMN run_hour smallint NOT NULL DEFAULT 8
    CHECK (run_hour >= 0 AND run_hour <= 23);
```

Save to `supabase/migrations/20260415120000_monitoring_run_hour.sql`.

- [ ] **Step 2: Apply to local Supabase**

```bash
supabase db reset
```

Expected: migration applies without errors, `monitoring_jobs` table now has `run_hour` column.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260415120000_monitoring_run_hour.sql
git commit -m "feat: add run_hour column to monitoring_jobs"
```

---

## Task 2: Update generated TypeScript types

**Files:**
- Modify: `src/types/database.ts` (lines ~340–394, `monitoring_jobs` block)

- [ ] **Step 1: Add `run_hour` to the `Row` type**

In the `monitoring_jobs.Row` block, add after `query: string`:

```ts
run_hour: number
```

Full updated `Row` block:
```ts
Row: {
  created_at: string
  created_by: string | null
  enabled: boolean
  filters: Json
  id: string
  last_run_at: string | null
  locations: string[]
  name: string
  next_run_at: string | null
  notify_email: boolean
  notify_telegram: boolean
  query: string
  run_hour: number
  telegram_chat_id: number | null
}
```

- [ ] **Step 2: Add `run_hour` to the `Insert` type**

```ts
Insert: {
  created_at?: string
  created_by?: string | null
  enabled?: boolean
  filters?: Json
  id?: string
  last_run_at?: string | null
  locations?: string[]
  name: string
  next_run_at?: string | null
  notify_email?: boolean
  notify_telegram?: boolean
  query: string
  run_hour?: number
  telegram_chat_id?: number | null
}
```

- [ ] **Step 3: Add `run_hour` to the `Update` type**

```ts
Update: {
  created_at?: string
  created_by?: string | null
  enabled?: boolean
  filters?: Json
  id?: string
  last_run_at?: string | null
  locations?: string[]
  name?: string
  next_run_at?: string | null
  notify_email?: boolean
  notify_telegram?: boolean
  query?: string
  run_hour?: number
  telegram_chat_id?: number | null
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add run_hour to monitoring_jobs TypeScript types"
```

---

## Task 3: Update `insert-job.ts` to store `run_hour`

**Files:**
- Modify: `src/lib/monitoring/insert-job.ts`

- [ ] **Step 1: Add `runHour` param and `computeNextRunAt` helper**

Replace the full file content with:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Result } from "@/types/app";
import { MONITORING_ALLOWED_DISTRICTS } from "./allowed-districts";

export type MonitoringSchedule = "hourly" | "daily" | "twice_daily";

const ALLOWED_SET = new Set<string>(MONITORING_ALLOWED_DISTRICTS);

export interface InsertMonitoringJobParams {
  userId: string;
  location: string;
  name?: string;
  propertyTypes?: string[];
  priceMax?: number;
  notifyTelegram?: boolean;
  notifyEmail?: boolean;
  runHour?: number;
}

function computeNextRunAt(runHour: number): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(runHour, 0, 0, 0);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
  return candidate;
}

export async function insertMonitoringJob(
  supabase: SupabaseClient<Database>,
  params: InsertMonitoringJobParams
): Promise<Result<{ id: string; name: string }>> {
  const location = params.location.trim();
  if (!ALLOWED_SET.has(location)) {
    return {
      success: false,
      error: new Error(
        `Lokalita není podporována. Vyberte jednu z nabízených čtvrtí (Praha …).`
      ),
    };
  }

  const runHour = params.runHour ?? 8;
  const name = params.name?.trim() || `Monitoring: ${location}`;
  const property_types = params.propertyTypes ?? ["byt"];
  const notify_telegram = params.notifyTelegram ?? true;
  const notify_email = params.notifyEmail ?? false;

  const queryData = {
    location,
    property_types,
    ...(params.priceMax !== undefined && { price_max: params.priceMax }),
    notify_telegram,
    notify_email,
  };

  const { data, error } = await supabase
    .from("monitoring_jobs")
    .insert({
      name,
      query: JSON.stringify(queryData),
      locations: [location],
      enabled: true,
      created_by: params.userId,
      notify_telegram,
      notify_email,
      run_hour: runHour,
      next_run_at: computeNextRunAt(runHour).toISOString(),
    })
    .select("id, name")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: new Error(error?.message ?? "Nepodařilo se vytvořit úlohu."),
    };
  }

  return { success: true, data: { id: data.id, name: data.name } };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/monitoring/insert-job.ts
git commit -m "feat: store run_hour and next_run_at in monitoring job insert"
```

---

## Task 4: Add PATCH handler to `/api/monitoring/jobs`

**Files:**
- Modify: `src/app/api/monitoring/jobs/route.ts`

- [ ] **Step 1: Add the PATCH handler**

Add the following `computeNextRunAt` helper and `PATCH` export at the **end** of `src/app/api/monitoring/jobs/route.ts` (after the existing `DELETE` export):

```ts
function computeNextRunAt(runHour: number): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(runHour, 0, 0, 0);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
  return candidate;
}

const PatchBodySchema = z.object({
  id: z.string().uuid("Neplatné ID úlohy."),
  run_hour: z
    .number()
    .int()
    .min(0, "Neplatný čas spuštění.")
    .max(23, "Neplatný čas spuštění."),
});

export async function PATCH(request: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Neplatný JSON." }, { status: 400 });
  }

  const parsed = PatchBodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášený uživatel." }, { status: 401 });
  }

  const { data: job } = await supabase
    .from("monitoring_jobs")
    .select("id, created_by")
    .eq("id", parsed.data.id)
    .single();

  if (!job || job.created_by !== user.id) {
    return NextResponse.json({ error: "Úloha nenalezena." }, { status: 404 });
  }

  const nextRunAt = computeNextRunAt(parsed.data.run_hour);

  const { error } = await supabase
    .from("monitoring_jobs")
    .update({
      run_hour: parsed.data.run_hour,
      next_run_at: nextRunAt.toISOString(),
    })
    .eq("id", parsed.data.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    next_run_at: nextRunAt.toISOString(),
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/monitoring/jobs/route.ts
git commit -m "feat: add PATCH /api/monitoring/jobs to update run_hour"
```

---

## Task 5: Update `MonitoringClient` — create dialog hour dropdown + edit sheet

**Files:**
- Modify: `src/components/features/monitoring/MonitoringClient.tsx`

### Step 1 — Add `Pencil` to lucide imports

- [ ] In the import line at the top, add `Pencil` to the lucide-react imports:

```ts
import {
  Bell,
  BellOff,
  ExternalLink,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
```

### Step 2 — Add new state variables

- [ ] Inside `MonitoringClient`, after the existing `deletingId` state, add:

```ts
const [newRunHour, setNewRunHour] = useState<number>(8);
const [editJob, setEditJob] = useState<MonitoringJob | null>(null);
const [editRunHour, setEditRunHour] = useState<number>(8);
const [saving, setSaving] = useState(false);
```

### Step 3 — Add hour options helper

- [ ] Add a constant just above the `MonitoringClient` function (near the `LISTINGS_PAGE` constant):

```ts
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: h,
  label: `${String(h).padStart(2, "0")}:00`,
}));
```

### Step 4 — Add `handleSaveEdit` function

- [ ] Inside `MonitoringClient`, after `handleCreateJob`, add:

```ts
async function handleSaveEdit() {
  if (!editJob) return;
  setSaving(true);
  try {
    const res = await fetch("/api/monitoring/jobs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editJob.id, run_hour: editRunHour }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast.error(
        typeof json.error === "string" ? json.error : "Uložení selhalo."
      );
      return;
    }
    setJobs((prev) =>
      prev.map((j) =>
        j.id === editJob.id ? { ...j, run_hour: editRunHour } : j
      )
    );
    toast.success("Čas spuštění upraven.");
    setEditJob(null);
  } finally {
    setSaving(false);
  }
}
```

### Step 5 — Update `handleCreateJob` to send `run_hour`

- [ ] In `handleCreateJob`, update the `fetch` body to include `run_hour`:

```ts
body: JSON.stringify({ location: newLocation, run_hour: newRunHour }),
```

Also reset `newRunHour` back to `8` when the dialog closes successfully — add after `setNewLocation("")`:

```ts
setNewRunHour(8);
```

### Step 6 — Add hour dropdown to the create dialog

- [ ] In the `addOpen` sheet, after the locality `<select>` label block, add:

```tsx
<label className="mt-4 block">
  <span
    className="mb-1 block text-[10px] font-bold uppercase tracking-wider"
    style={{ color: "var(--color-text-muted)" }}
  >
    Čas spuštění
  </span>
  <select
    value={newRunHour}
    onChange={(e) => setNewRunHour(Number(e.target.value))}
    className="w-full rounded-lg px-3 py-2.5 text-sm"
    style={{
      backgroundColor: "var(--color-bg-subtle)",
      border: "1px solid rgba(199,196,215,0.3)",
      color: "var(--color-text-primary)",
    }}
  >
    {HOUR_OPTIONS.map(({ value, label }) => (
      <option key={value} value={value}>
        {label}
      </option>
    ))}
  </select>
</label>
```

### Step 7 — Add pencil icon button on each job card

- [ ] In the job card's icon column (the `<div className="flex flex-col gap-1 shrink-0">` block), add the pencil button **before** the bell button:

```tsx
<button
  type="button"
  onClick={() => {
    setEditJob(job);
    setEditRunHour(job.run_hour ?? 8);
  }}
  disabled={busy}
  className="p-1.5 rounded-lg transition-opacity disabled:opacity-50"
  style={{ color: "var(--color-text-muted)" }}
  aria-label="Upravit čas spuštění"
>
  <Pencil size={14} />
</button>
```

### Step 8 — Add the edit sheet

- [ ] Add the edit `DialogSheetRoot` block right after the existing `addOpen` sheet block (before the closing `</div>` of the component):

```tsx
{editJob && (
  <DialogSheetRoot onClose={() => setEditJob(null)}>
    <DialogSheetPanel
      maxWidthClassName="max-w-md"
      className="border border-[rgba(199,196,215,0.2)]"
    >
      <div
        className="relative flex shrink-0 items-start justify-between gap-3 border-b px-6 py-5 pr-14"
        style={{ borderColor: "rgba(199,196,215,0.2)" }}
      >
        <h2
          className="text-base font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Upravit sledování
        </h2>
        <button
          type="button"
          onClick={() => setEditJob(null)}
          className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-70"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Zavřít"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>
      <DialogSheetScrollBody className="!py-6">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {editJob.locations[0] ?? editJob.name}
        </p>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          Nastavte čas, kdy má monitoring každý den spustit scraper.
        </p>
        <label className="mt-4 block">
          <span
            className="mb-1 block text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--color-text-muted)" }}
          >
            Čas spuštění
          </span>
          <select
            value={editRunHour}
            onChange={(e) => setEditRunHour(Number(e.target.value))}
            className="w-full rounded-lg px-3 py-2.5 text-sm"
            style={{
              backgroundColor: "var(--color-bg-subtle)",
              border: "1px solid rgba(199,196,215,0.3)",
              color: "var(--color-text-primary)",
            }}
          >
            {HOUR_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </DialogSheetScrollBody>
      <div
        className="flex shrink-0 justify-end gap-3 border-t px-6 py-4"
        style={{ borderColor: "rgba(199,196,215,0.2)" }}
      >
        <button
          type="button"
          onClick={() => setEditJob(null)}
          disabled={saving}
          className="cursor-pointer rounded-lg px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" }}
        >
          Zrušit
        </button>
        <button
          type="button"
          onClick={handleSaveEdit}
          disabled={saving}
          className="cursor-pointer rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--color-brand)" }}
        >
          {saving ? "Ukládám…" : "Uložit"}
        </button>
      </div>
    </DialogSheetPanel>
  </DialogSheetRoot>
)}
```

### Step 9 — Verify TypeScript and build

- [ ] Run:

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] Run:

```bash
pnpm run build
```

Expected: build succeeds, `/monitoring` route listed, no type errors.

### Step 10 — Commit

- [ ] Commit:

```bash
git add src/components/features/monitoring/MonitoringClient.tsx
git commit -m "feat: add run_hour picker to monitoring create and edit"
```

---

## Task 6: Update POST API route to accept `run_hour`

**Files:**
- Modify: `src/app/api/monitoring/jobs/route.ts`

- [ ] **Step 1: Add `run_hour` to `BodySchema`**

In the existing `BodySchema` definition (top of the file), add:

```ts
run_hour: z.number().int().min(0).max(23).optional(),
```

Full updated schema:

```ts
const BodySchema = z.object({
  location: z.string().min(1, "Vyberte lokalitu."),
  name: z.string().max(200).optional(),
  price_max: z.number().positive().optional(),
  notify_telegram: z.boolean().optional(),
  notify_email: z.boolean().optional(),
  run_hour: z.number().int().min(0).max(23).optional(),
});
```

- [ ] **Step 2: Pass `run_hour` into `insertMonitoringJob`**

In the `POST` handler, update the `insertMonitoringJob` call:

```ts
const result = await insertMonitoringJob(supabase, {
  userId: user.id,
  location: parsed.data.location,
  name: parsed.data.name,
  priceMax: parsed.data.price_max,
  notifyTelegram: parsed.data.notify_telegram,
  notifyEmail: parsed.data.notify_email,
  runHour: parsed.data.run_hour,
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/monitoring/jobs/route.ts
git commit -m "feat: accept run_hour in POST /api/monitoring/jobs"
```

---

## Task 7: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Test create with custom hour**
  - Navigate to `/monitoring`
  - Click "Přidat lokalitu"
  - Select a district
  - Change "Čas spuštění" to `14:00`
  - Click "Přidat"
  - Verify toast "Lokalita přidána do sledování." appears
  - Verify the new job card appears in the list

- [ ] **Step 3: Test edit**
  - Click the pencil icon on the new job card
  - Verify the sheet opens with the correct locality name and `14:00` pre-selected
  - Change to `20:00`
  - Click "Uložit"
  - Verify toast "Čas spuštění upraven." appears
  - Verify no console errors

- [ ] **Step 4: Verify DB via Supabase Studio**

```bash
# Open local Supabase Studio
open http://localhost:54323
```

Check `monitoring_jobs` table — row should have `run_hour = 20` and `next_run_at` pointing to tomorrow at 20:00.

- [ ] **Step 5: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore: monitoring run_hour smoke test cleanup"
```
