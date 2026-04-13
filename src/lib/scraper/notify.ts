import type { RawListing } from "./sreality";

function formatCzk(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mil. Kč`;
  return `${n.toLocaleString("cs-CZ")} Kč`;
}

export function formatNotification(district: string, newListings: RawListing[]): string {
  if (newListings.length === 0) return "";

  const header = `🏠 *Nové nabídky v ${district} (${newListings.length})*\n`;

  const items = newListings.slice(0, 8).map((l, i) => {
    const area = l.area_m2 ? `, ${l.area_m2} m²` : "";
    const price = l.price ? ` — ${formatCzk(l.price)}` : "";
    return `${i + 1}. ${l.title}${area}${price}\n   ${l.address}\n   → ${l.url}`;
  });

  const footer =
    newListings.length > 8
      ? `\n_...a ${newListings.length - 8} dalších nabídek_`
      : "";

  const sources = [...new Set(newListings.map((l) => l.source === "sreality" ? "Sreality" : "Bezrealitky"))];

  return `${header}\n${items.join("\n\n")}${footer}\n\n_Sledováno: ${sources.join(" + ")}_`;
}
