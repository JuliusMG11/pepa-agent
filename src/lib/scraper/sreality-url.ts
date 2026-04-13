/**
 * Kanonická veřejná URL detailu na Sreality.
 * Špatný tvar (např. jen /byt/{hash}) vede na 404 — potřebujeme dispozici + seo.locality + hash.
 */

export interface SrealityUrlParts {
  hash_id: number;
  name: string;
  seo?: {
    category_main_cb: number;
    category_sub_cb: number;
    locality: string;
  };
}

const DUM_SUB_BY_CODE: Record<number, string> = {
  37: "rodinny",
};

function inferDumSubtype(name: string, categorySub?: number): string {
  const n = name.toLowerCase();
  if (/vila\b/.test(n)) return "vila";
  if (/chata|chalup/.test(n)) return "chata";
  if (categorySub != null && DUM_SUB_BY_CODE[categorySub]) {
    return DUM_SUB_BY_CODE[categorySub];
  }
  if (/rodinn|řadov|novostavba/.test(n)) return "rodinny";
  return "rodinny";
}

/** Normalizace mezer (NBSP) a vytažení dispozice z názvu výpisu. */
export function extractFlatDisposition(name: string): string {
  const n = name.replace(/\u00a0/g, " ").trim();
  const m = n.match(/Prodej bytu\s+([^\s,]+(?:\+[^\s,]+)?)/i);
  if (m?.[1]) return m[1].replace(/,$/, "").trim();
  const m2 = n.match(/byt\s+([0-9]+[+]?.+?)(?:\s|,|\d)/i);
  if (m2?.[1]) return m2[1].trim();
  return "byt";
}

function localitySegment(seo?: SrealityUrlParts["seo"]): string {
  const loc = (seo?.locality ?? "praha").replace(/^\/+|\/+$/g, "").trim();
  return loc || "praha";
}

/** Sestaví URL z dat výpisu / detailu API `/cs/v2/estates`. */
export function buildSrealityDetailUrl(e: SrealityUrlParts): string {
  const hash = e.hash_id;
  const loc = localitySegment(e.seo);
  const main = e.seo?.category_main_cb ?? 1;

  if (main === 1) {
    const disp = extractFlatDisposition(e.name ?? "Prodej bytu");
    return `https://www.sreality.cz/detail/prodej/byt/${disp}/${loc}/${hash}`;
  }

  if (main === 2) {
    const sub = inferDumSubtype(e.name ?? "", e.seo?.category_sub_cb);
    return `https://www.sreality.cz/detail/prodej/dum/${sub}/${loc}/${hash}`;
  }

  const disp = extractFlatDisposition(e.name ?? "Prodej bytu");
  return `https://www.sreality.cz/detail/prodej/byt/${disp}/${loc}/${hash}`;
}

/** Po /byt/ musí následovat dispozice, SEO lokalita a číselné hash_id. */
export function srealityDetailUrlLooksIncomplete(url: string, hashId: number): boolean {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const hi = parts.indexOf("byt");
    if (hi === -1) return false;
    const after = parts.slice(hi + 1);
    if (after.length < 3) return true;
    const last = after[after.length - 1];
    if (!/^\d+$/.test(last)) return true;
    if (Number(last) !== hashId) return true;
    if (after.length === 3 && /^\d+$/.test(after[0]) && after[0] === String(hashId)) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export async function resolveSrealityDetailUrl(
  preview: SrealityUrlParts
): Promise<string> {
  const quick = buildSrealityDetailUrl(preview);
  if (!srealityDetailUrlLooksIncomplete(quick, preview.hash_id)) {
    return quick;
  }

  try {
    const res = await fetch(
      `https://www.sreality.cz/api/cs/v2/estates/${preview.hash_id}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; PepaBot/1.0; +https://pepa.app)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(12_000),
      }
    );
    if (!res.ok) return quick;

    const detail = (await res.json()) as {
      hash_id?: number;
      name?: string;
      seo?: SrealityUrlParts["seo"];
    };
    const hash = detail.hash_id ?? preview.hash_id;
    return buildSrealityDetailUrl({
      hash_id: hash,
      name: detail.name ?? preview.name,
      seo: detail.seo ?? preview.seo,
    });
  } catch {
    return quick;
  }
}
