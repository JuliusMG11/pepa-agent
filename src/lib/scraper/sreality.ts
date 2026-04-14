import { resolveSrealityDetailUrl } from "./sreality-url";

export interface ScraperOptions {
  district: string;
  propertyTypes?: ("byt" | "dum")[];
  priceMax?: number;
  limit?: number;
}

export interface RawListing {
  source: "sreality" | "bezrealitky";
  external_id: string;
  title: string;
  address: string;
  district: string;
  price: number;
  area_m2: number | null;
  url: string;
  property_type: string;
}

// Sreality category codes: 1=byty, 2=domy
const CATEGORY_MAP: Record<string, number> = {
  byt: 1,
  dum: 2,
};

// Prague district → Sreality locality_district_id (approximate mapping)
const DISTRICT_IDS: Record<string, number> = {
  "Praha 1": 5001,
  "Praha 2": 5002,
  "Praha 3": 5003,
  "Praha 4": 5004,
  "Praha 5": 5005,
  "Praha 6": 5006,
  "Praha 7": 5007,
  "Praha 8": 5008,
  "Praha 9": 5009,
  "Praha 10": 5010,
  Holešovice: 5007,
  Vinohrady: 5002,
  Žižkov: 5003,
  Smíchov: 5005,
  Dejvice: 5006,
};

interface SrealityEstate {
  hash_id: number;
  name: string;
  locality: string;
  price: number;
  price_czk?: { value_raw: number };
  labelsAll?: Array<Array<{ name: string }>>;
  gps?: { lat: number; lon: number };
  seo?: {
    category_main_cb: number;
    category_sub_cb: number;
    category_type_cb: number;
    locality: string;
  };
}

export async function scrapeSreality(options: ScraperOptions): Promise<RawListing[]> {
  const { district, propertyTypes = ["byt", "dum"], priceMax, limit = 20 } = options;

  const districtId = DISTRICT_IDS[district];
  const results: RawListing[] = [];

  for (const pType of propertyTypes) {
    const category = CATEGORY_MAP[pType] ?? 1;

    const params = new URLSearchParams({
      category_main_cb: String(category),
      category_type_cb: "1", // prodej
      per_page: String(limit),
    });

    if (districtId) {
      params.set("locality_district_id", String(districtId));
    }

    if (priceMax) {
      params.set("price_max", String(priceMax));
    }

    try {
      const res = await fetch(
        `https://www.sreality.cz/api/cs/v2/estates?${params.toString()}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; PepaBot/1.0; +https://pepa.app)",
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(10_000),
        }
      );

      if (!res.ok) continue;

      const data = await res.json() as { estates?: SrealityEstate[] };
      const estates = data?.estates ?? [];

      const mapped = await Promise.all(
        estates.map(async (estate) => {
          const price = estate.price_czk?.value_raw ?? estate.price ?? 0;
          const areMatch = estate.name?.match(/(\d+)\s*m²/);
          const area = areMatch ? parseInt(areMatch[1]) : null;
          const url = await resolveSrealityDetailUrl({
            hash_id: estate.hash_id,
            name: estate.name ?? "Prodej bytu",
            seo: estate.seo,
          });
          return {
            source: "sreality" as const,
            external_id: String(estate.hash_id),
            title: estate.name ?? `${pType} na prodej`,
            address: estate.locality ?? district,
            district,
            price,
            area_m2: area,
            url,
            property_type: pType,
          };
        })
      );
      results.push(...mapped);
    } catch (err) {
      console.error(`[Sreality scraper] Failed for district=${district} type=${pType}:`, err);
    }
  }

  return results;
}
