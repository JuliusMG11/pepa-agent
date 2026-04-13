import type { RawListing, ScraperOptions } from "./sreality";
import { scrapeBezrealitkyVypis } from "./bezrealitky-vypis";

/**
 * Veřejné GraphQL na Bezrealitky často vrací 404 — používáme SSR výpis (__NEXT_DATA__).
 * Podporujeme byty v Praze s filtrem čtvrtě; domy z tohoto výpisu zatím nečteme.
 */
export async function scrapeBezrealitky(
  options: ScraperOptions
): Promise<RawListing[]> {
  const { district, propertyTypes = ["byt", "dum"], priceMax, limit = 20 } =
    options;

  const wantsByt = propertyTypes.includes("byt");

  if (!wantsByt) {
    return [];
  }

  return scrapeBezrealitkyVypis({
    district,
    limit,
    priceMax,
  });
}
