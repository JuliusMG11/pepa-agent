/**
 * Bezrealitky — veřejné GraphQL /api/graphql vrací 404; data jsou v SSR (__NEXT_DATA__).
 * Parsujeme výpis https://www.bezrealitky.cz/vypis/nabidka-prodej/byt/praha
 * a filtrujeme podle klíčových slov čtvrtě (monitoring job).
 */

import type { RawListing } from "./sreality";
import { buildBezrealitkyListingUrl } from "./bezrealitky-url";

const VYPIS_PRAHA =
  "https://www.bezrealitky.cz/vypis/nabidka-prodej/byt/praha";

/** Klíčová slova v adrese / textu pro užší oblast (case-insensitive). */
const DISTRICT_KEYWORDS: Record<string, string[]> = {
  "Praha Holešovice": ["holešovice", "holesovice", "praha 7"],
  "Praha Vinohrady": ["vinohrad", "praha 2"],
  "Praha Žižkov": ["žižkov", "zizkov", "praha 3"],
  "Praha Smíchov": ["smíchov", "smichov", "praha 5"],
  "Praha Dejvice": ["dejvice", "praha 6"],
  "Praha 1": ["praha 1", "praha-1"],
  "Praha 2": ["praha 2", "praha-2"],
  "Praha 3": ["praha 3", "praha-3"],
  "Praha 4": ["praha 4", "praha-4"],
  "Praha 5": ["praha 5", "praha-5"],
  "Praha 6": ["praha 6", "praha-6"],
  "Praha 7": ["praha 7", "praha-7", "holešovice"],
  "Praha 8": ["praha 8", "praha-8", "libeň", "liben", "kobylisy", "karlín", "karlin"],
  "Praha 9": ["praha 9", "praha-9", "vysočany", "vysocany"],
  "Praha 10": ["praha 10", "praha-10", "strašnice", "strasnice"],
};

function addressKey(advert: Record<string, unknown>): string {
  const keys = Object.keys(advert);
  const k = keys.find((x) => x.startsWith("address("));
  const v = k ? advert[k] : null;
  return typeof v === "string" ? v : "";
}

function matchesDistrict(district: string, addressNorm: string): boolean {
  const keywords = DISTRICT_KEYWORDS[district];
  if (!keywords?.length) return true;
  return keywords.some((kw) => addressNorm.includes(kw));
}

export async function scrapeBezrealitkyVypis(options: {
  district: string;
  limit?: number;
  priceMax?: number;
}): Promise<RawListing[]> {
  const limit = options.limit ?? 24;
  const priceMax = options.priceMax;
  const district = options.district.trim();

  try {
    const res = await fetch(VYPIS_PRAHA, {
      headers: {
        Accept: "text/html",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return [];

    const html = await res.text();
    const m = html.match(
      /<script id="__NEXT_DATA__"[^>]*>(\{[\s\S]*?\})<\/script>/
    );
    if (!m) return [];

    const data = JSON.parse(m[1]) as {
      props?: { pageProps?: { apolloCache?: Record<string, unknown> } };
    };
    const cache = data.props?.pageProps?.apolloCache ?? {};

    const listKey = Object.keys(cache).find(
      (k) =>
        k.includes("listAdverts") &&
        k.includes("BYT") &&
        !k.includes("Similar") &&
        !k.includes("discountedOnly")
    );
    if (!listKey) return [];

    const listEntry = cache[listKey] as { list?: unknown } | undefined;
    const refs = Array.isArray(listEntry?.list) ? listEntry!.list : [];
    const out: RawListing[] = [];

    for (const ref of refs) {
      if (out.length >= limit) break;
      const refStr =
        typeof ref === "string"
          ? ref
          : ref &&
              typeof ref === "object" &&
              "__ref" in ref &&
              typeof (ref as { __ref: string }).__ref === "string"
            ? (ref as { __ref: string }).__ref
            : null;
      if (!refStr?.startsWith("Advert:")) continue;
      const id = refStr.replace("Advert:", "");
      const advert = cache[`Advert:${id}`] as Record<string, unknown> | undefined;
      if (!advert || typeof advert.uri !== "string") continue;

      const addr = addressKey(advert);
      const addrNorm = addr.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
      if (!matchesDistrict(district, addrNorm)) continue;

      const price = typeof advert.price === "number" ? advert.price : 0;
      if (priceMax != null && Number.isFinite(priceMax) && price > priceMax) {
        continue;
      }
      const surface =
        typeof advert.surface === "number" ? advert.surface : null;
      const title =
        typeof advert.imageAltText === "string"
          ? advert.imageAltText
          : `Byt — ${addr || district}`;

      out.push({
        source: "bezrealitky",
        external_id: id,
        title,
        address: addr || district,
        district,
        price,
        area_m2: surface,
        url: buildBezrealitkyListingUrl({
          uri: advert.uri,
          slug: typeof advert.uri === "string" ? advert.uri : undefined,
          id,
        }),
        property_type: "byt",
      });
    }

    return out;
  } catch (e) {
    console.error("[Bezrealitky vypis]", e);
    return [];
  }
}
