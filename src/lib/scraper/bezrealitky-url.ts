/**
 * Veřejná URL detailu inzerátu na Bezrealitky.
 * API vrací `uri` jako cestu (např. /detail/...) nebo `slug`; nesmí se slepovat do /nemovitosti-byty-domy/ bez kontroly.
 */
export function buildBezrealitkyListingUrl(a: {
  slug?: string | null;
  uri?: string | null;
  id?: string | number;
}): string {
  const origin = "https://www.bezrealitky.cz";

  const uri = typeof a.uri === "string" ? a.uri.trim() : "";
  if (uri) {
    if (/^https?:\/\//i.test(uri)) return uri;
    /** Veřejná cesta detailu je vždy `/nemovitosti-byty-domy/{slug}` — API často vrací jen slug bez `/`. */
    if (uri.startsWith("/")) return `${origin}${uri}`;
    return `${origin}/nemovitosti-byty-domy/${uri}`;
  }

  const slug = typeof a.slug === "string" ? a.slug.trim() : "";
  if (slug) {
    if (/^https?:\/\//i.test(slug)) return slug;
    if (slug.startsWith("/")) return `${origin}${slug}`;
    return `${origin}/nemovitosti-byty-domy/${slug}`;
  }

  if (a.id != null && String(a.id).trim() !== "") {
    return `${origin}/hledat?q=${encodeURIComponent(String(a.id))}`;
  }

  return `${origin}/hledat`;
}
