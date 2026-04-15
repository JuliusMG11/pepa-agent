# Monitoring — Scraper Run Hour (Create & Edit)

**Date:** 2026-04-15  
**Status:** Approved

## Summary

Users can configure what hour of the day (00:00–23:00) a monitoring job's daily scraper runs — both when creating a new locality and when editing an existing one.

## Scope

- Add `run_hour` (0–23) to `monitoring_jobs` DB table.
- Extend the create dialog with a time dropdown.
- Add an edit sheet (pencil icon on each job card) to change the run hour of an existing job.
- New PATCH API route to update `run_hour` and recalculate `next_run_at`.

## Out of scope

- Changing a job's locality on edit (delete + re-add for that).
- Multiple run times per day or hourly/twice-daily schedules.
- Notification preferences (separate concern).

---

## 1. Data layer

### Migration

```sql
ALTER TABLE monitoring_jobs
  ADD COLUMN run_hour smallint NOT NULL DEFAULT 8
    CHECK (run_hour >= 0 AND run_hour <= 23);
```

File: `supabase/migrations/YYYYMMDDHHMMSS_monitoring_run_hour.sql`

### `next_run_at` calculation

Helper used in both insert and update:

```ts
function computeNextRunAt(runHour: number): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(runHour, 0, 0, 0);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
  return candidate;
}
```

### `insert-job.ts` changes

- Add optional `runHour?: number` (default `8`) to `InsertMonitoringJobParams`.
- Store `run_hour` and `next_run_at` (computed) in the insert payload.

### PATCH `/api/monitoring/jobs`

- Body schema: `{ id: uuid, run_hour: integer 0–23 }`
- Auth: verify `created_by === user.id`
- Update: `run_hour` + recalculated `next_run_at`
- Response: `{ success: true, next_run_at: string }`

---

## 2. Create dialog

File: `src/components/features/monitoring/MonitoringClient.tsx`

Add to state: `newRunHour: number` (default `8`).

Add below the locality `<select>`:

```tsx
<label className="mt-4 block">
  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider"
        style={{ color: "var(--color-text-muted)" }}>
    Čas spuštění
  </span>
  <select value={newRunHour} onChange={(e) => setNewRunHour(Number(e.target.value))}
          className="w-full rounded-lg px-3 py-2.5 text-sm"
          style={{ backgroundColor: "var(--color-bg-subtle)",
                   border: "1px solid rgba(199,196,215,0.3)",
                   color: "var(--color-text-primary)" }}>
    {Array.from({ length: 24 }, (_, h) => (
      <option key={h} value={h}>
        {String(h).padStart(2, "0")}:00
      </option>
    ))}
  </select>
</label>
```

`handleCreateJob` passes `run_hour: newRunHour` in the POST body.

---

## 3. Edit sheet

### New state in `MonitoringClient`

```ts
const [editJob, setEditJob] = useState<MonitoringJob | null>(null);
const [editRunHour, setEditRunHour] = useState<number>(8);
const [saving, setSaving] = useState(false);
```

Opening edit: `setEditJob(job); setEditRunHour(job.run_hour ?? 8)`.

### Pencil icon on job card

Added as a third button in the icon column (above bell, above trash):

```tsx
<button type="button" onClick={() => { setEditJob(job); setEditRunHour(job.run_hour ?? 8); }}
        disabled={busy} className="p-1.5 rounded-lg transition-opacity disabled:opacity-50"
        aria-label="Upravit čas spuštění">
  <Pencil size={14} style={{ color: "var(--color-text-muted)" }} />
</button>
```

### Edit `DialogSheetPanel`

Shown when `editJob !== null`. Contains:

- Read-only locality name (text, not a select)
- `Čas spuštění` dropdown (same style as create), pre-filled with `editRunHour`
- "Zrušit" / "Uložit" buttons

### `handleSaveEdit`

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
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(typeof json.error === "string" ? json.error : "Uložení selhalo.");
      return;
    }
    setJobs((prev) =>
      prev.map((j) => j.id === editJob.id ? { ...j, run_hour: editRunHour } : j)
    );
    toast.success("Čas spuštění upraven.");
    setEditJob(null);
  } finally {
    setSaving(false);
  }
}
```

---

## 4. Files changed

| File | Change |
|------|--------|
| `supabase/migrations/*_monitoring_run_hour.sql` | New — add `run_hour` column |
| `src/lib/monitoring/insert-job.ts` | Add `runHour` param + store in insert |
| `src/app/api/monitoring/jobs/route.ts` | Add `PATCH` handler |
| `src/components/features/monitoring/MonitoringClient.tsx` | Hour dropdown in create; pencil icon + edit sheet |
| `src/types/app.ts` | Add `run_hour?: number` to `MonitoringJob` type |

---

## 5. Error handling

- Invalid `run_hour` (not 0–23) → 400 with Czech message `"Neplatný čas spuštění."`
- Ownership mismatch on PATCH → 404 `"Úloha nenalezena."`
- Supabase error → 500 with raw message
