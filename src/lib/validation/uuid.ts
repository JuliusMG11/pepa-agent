/**
 * Normalizuje UUID z DB / server actions / formulára.
 * Zod 4 `z.uuid()` je přísné; tím sjednotíme formát (trim, lowercase, pomlčky).
 */
export function normalizeUuid(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  if (!raw || raw === "undefined" || raw === "null") return null;

  const lower = raw.toLowerCase();
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(lower)
  ) {
    return lower;
  }

  const compact = raw.replace(/-/g, "");
  if (compact.length === 32 && /^[0-9a-f]+$/i.test(compact)) {
    return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`.toLowerCase();
  }

  return null;
}
