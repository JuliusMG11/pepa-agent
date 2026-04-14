import { normalizeUuid } from "@/lib/validation/uuid";

/** Raw strings from chart row `lead_ids` (array or JSON string from model output). */
export function parseLeadIdsFromChartRow(row: Record<string, unknown>): string[] {
  const v = row.lead_ids;
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === "string");
  }
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v) as unknown;
      if (Array.isArray(p)) {
        return p.filter((x): x is string => typeof x === "string");
      }
    } catch {
      return [];
    }
  }
  return [];
}

/** DB lead IDs suitable for `.in("id", …)` — drops hallucinated / non-UUID values. */
export function uniqueNormalizedLeadIdsFromChartRow(
  row: Record<string, unknown>
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parseLeadIdsFromChartRow(row)) {
    const id = normalizeUuid(raw);
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export function chartRowHasLeadDrilldownMeta(row: Record<string, unknown>): boolean {
  if (uniqueNormalizedLeadIdsFromChartRow(row).length > 0) return true;
  return (
    typeof row.period_from === "string" &&
    typeof row.period_to === "string" &&
    row.period_from.length > 0 &&
    row.period_to.length > 0
  );
}
