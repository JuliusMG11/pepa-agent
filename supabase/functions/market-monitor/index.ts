// Supabase Edge Function — market-monitor
// Runs daily at 06:45 via pg_cron
// Scrapes Sreality + Bezrealitky for each enabled monitoring job,
// persists new listings, and sends Telegram notifications.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

interface RawListing {
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

interface MonitoringJob {
  id: string;
  name: string;
  locations: string[];
  filters: Record<string, unknown>;
  notify_telegram: boolean;
  telegram_chat_id: number | null;
  enabled: boolean;
}

// ── Telegram ──────────────────────────────────────────────────────────────

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });
}

// ── Sreality ──────────────────────────────────────────────────────────────

/** Stejné lokace jako v UI monitoring_jobs — aliasy pro Sreality locality_district_id */
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
  "Praha Holešovice": 5007,
  Vinohrady: 5002,
  "Praha Vinohrady": 5002,
  Žižkov: 5003,
  "Praha Žižkov": 5003,
  Smíchov: 5005,
  "Praha Smíchov": 5005,
  Dejvice: 5006,
  "Praha Dejvice": 5006,
};

type Seo = { category_main_cb: number; category_sub_cb: number; locality: string };

function extractFlatDisposition(name: string): string {
  const n = name.replace(/\u00a0/g, " ").trim();
  const m = n.match(/Prodej bytu\s+([^\s,]+(?:\+[^\s,]+)?)/i);
  if (m?.[1]) return m[1].replace(/,$/, "").trim();
  const m2 = n.match(/byt\s+([0-9]+[+]?.+?)(?:\s|,|\d)/i);
  if (m2?.[1]) return m2[1].trim();
  return "byt";
}

function buildSrealityDetailUrl(e: { hash_id: number; name: string; seo?: Seo }): string {
  const hash = e.hash_id;
  const loc = (e.seo?.locality ?? "praha").replace(/^\/+|\/+$/g, "") || "praha";
  const main = e.seo?.category_main_cb ?? 1;
  if (main === 1) {
    const disp = extractFlatDisposition(e.name ?? "Prodej bytu");
    return `https://www.sreality.cz/detail/prodej/byt/${disp}/${loc}/${hash}`;
  }
  if (main === 2) {
    const n = e.name.toLowerCase();
    let sub = "rodinny";
    if (/vila\b/.test(n)) sub = "vila";
    else if (/chata|chalup/.test(n)) sub = "chata";
    else if (e.seo?.category_sub_cb === 37) sub = "rodinny";
    return `https://www.sreality.cz/detail/prodej/dum/${sub}/${loc}/${hash}`;
  }
  const disp = extractFlatDisposition(e.name ?? "Prodej bytu");
  return `https://www.sreality.cz/detail/prodej/byt/${disp}/${loc}/${hash}`;
}

function srealityDetailUrlLooksIncomplete(url: string, hashId: number): boolean {
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
    if (after.length === 3 && /^\d+$/.test(after[0]) && after[0] === String(hashId)) return true;
    return false;
  } catch {
    return true;
  }
}

async function resolveSrealityDetailUrl(e: {
  hash_id: number;
  name: string;
  seo?: Seo;
}): Promise<string> {
  const quick = buildSrealityDetailUrl(e);
  if (!srealityDetailUrlLooksIncomplete(quick, e.hash_id)) return quick;
  try {
    const res = await fetch(`https://www.sreality.cz/api/cs/v2/estates/${e.hash_id}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PepaBot/1.0)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return quick;
    const detail = await res.json() as { hash_id?: number; name?: string; seo?: Seo };
    const hash = detail.hash_id ?? e.hash_id;
    return buildSrealityDetailUrl({
      hash_id: hash,
      name: detail.name ?? e.name,
      seo: detail.seo ?? e.seo,
    });
  } catch {
    return quick;
  }
}

async function scrapeSreality(district: string, filters: Record<string, unknown>): Promise<RawListing[]> {
  const districtId = DISTRICT_IDS[district];
  const params = new URLSearchParams({
    category_main_cb: "1",
    category_type_cb: "1",
    per_page: "20",
  });
  if (districtId) params.set("locality_district_id", String(districtId));
  if (filters.price_max) params.set("price_max", String(filters.price_max));

  try {
    const res = await fetch(`https://www.sreality.cz/api/cs/v2/estates?${params}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PepaBot/1.0)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];

    const data = await res.json() as {
      _embedded?: {
        estates?: Array<{
          hash_id: number;
          name: string;
          locality: string;
          price: number;
          price_czk?: { value_raw: number };
          seo?: Seo;
        }>;
      };
    };
    const estates = data?._embedded?.estates ?? [];

    return await Promise.all(
      estates.map(async (e) => {
        const price = e.price_czk?.value_raw ?? e.price ?? 0;
        const areaMatch = e.name?.match(/(\d+)\s*m²/);
        const url = await resolveSrealityDetailUrl({
          hash_id: e.hash_id,
          name: e.name ?? "Prodej bytu",
          seo: e.seo,
        });
        return {
          source: "sreality" as const,
          external_id: String(e.hash_id),
          title: e.name ?? "Byt na prodej",
          address: e.locality ?? district,
          district,
          price,
          area_m2: areaMatch ? parseInt(areaMatch[1]) : null,
          url,
          property_type: "byt",
        };
      }),
    );
  } catch {
    return [];
  }
}

// ── Bezrealitky (SSR __NEXT_DATA__, GraphQL často 404) ─────────────────────

const BEZ_VYPIS =
  "https://www.bezrealitky.cz/vypis/nabidka-prodej/byt/praha";

const BEZ_DISTRICT_KW: Record<string, string[]> = {
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

function bezDynamicKey(advert: Record<string, unknown>, prefix: string): string {
  const k = Object.keys(advert).find((x) => x.startsWith(prefix));
  const v = k ? advert[k] : null;
  return typeof v === "string" ? v : "";
}

function bezMatchesDistrict(district: string, addressNorm: string): boolean {
  const keywords = BEZ_DISTRICT_KW[district];
  if (!keywords?.length) return true;
  return keywords.some((kw) => addressNorm.includes(kw));
}

function buildBezrealitkyListingUrl(a: { slug?: string | null; uri?: string | null; id?: string | number }): string {
  const origin = "https://www.bezrealitky.cz";
  const uri = typeof a.uri === "string" ? a.uri.trim() : "";
  if (uri) {
    if (/^https?:\/\//i.test(uri)) return uri;
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

async function scrapeBezrealitky(district: string, filters: Record<string, unknown>): Promise<RawListing[]> {
  const priceMax = filters.price_max != null ? Number(filters.price_max) : undefined;
  const limit = 24;

  try {
    const res = await fetch(BEZ_VYPIS, {
      headers: {
        Accept: "text/html",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return [];

    const html = await res.text();
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>(\{[\s\S]*?\})<\/script>/);
    if (!m) return [];

    const data = JSON.parse(m[1]) as {
      props?: { pageProps?: { apolloCache?: Record<string, unknown> } };
    };
    const cache = data.props?.pageProps?.apolloCache ?? {};

    // listAdverts moved into ROOT_QUERY in newer SSR snapshots; fall back to top-level
    const rootQuery = (cache["ROOT_QUERY"] ?? {}) as Record<string, unknown>;
    const searchIn: Record<string, unknown> = Object.keys(rootQuery).length > 0 ? rootQuery : cache;

    const listKey = Object.keys(searchIn).find(
      (k) =>
        k.includes("listAdverts") &&
        k.includes("BYT") &&
        !k.includes("Similar") &&
        !k.includes("discountedOnly"),
    );
    if (!listKey) return [];

    const listEntry = searchIn[listKey] as { list?: unknown } | undefined;
    const refs = Array.isArray(listEntry?.list) ? listEntry!.list : [];
    const out: RawListing[] = [];

    for (const ref of refs) {
      if (out.length >= limit) break;
      const refStr =
        typeof ref === "string"
          ? ref
          : ref && typeof ref === "object" && "__ref" in ref && typeof (ref as { __ref: string }).__ref === "string"
          ? (ref as { __ref: string }).__ref
          : null;
      if (!refStr?.startsWith("Advert:")) continue;
      const id = refStr.replace("Advert:", "");
      const advert = cache[`Advert:${id}`] as Record<string, unknown> | undefined;
      if (!advert || typeof advert.uri !== "string") continue;

      const addr = bezDynamicKey(advert, "address(");
      const addrNorm = addr.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
      if (!bezMatchesDistrict(district, addrNorm)) continue;

      const price = typeof advert.price === "number" ? advert.price : 0;
      if (Number.isFinite(priceMax as number) && priceMax != null && price > priceMax) continue;

      const surface = typeof advert.surface === "number" ? advert.surface : null;
      const imageAltText = bezDynamicKey(advert, "imageAltText(");
      const title = imageAltText || `Byt — ${addr || district}`;

      out.push({
        source: "bezrealitky",
        external_id: id,
        title,
        address: addr || district,
        district,
        price,
        area_m2: surface,
        url: buildBezrealitkyListingUrl({ uri: advert.uri, slug: advert.uri, id }),
        property_type: "byt",
      });
    }

    return out;
  } catch {
    return [];
  }
}

// ── Persist ───────────────────────────────────────────────────────────────

async function upsertListings(
  supabase: ReturnType<typeof createClient>,
  listings: RawListing[],
): Promise<{ newCount: number; newListings: RawListing[] }> {
  let newCount = 0;
  const newListings: RawListing[] = [];
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  await supabase.from("market_listings").update({ is_new: false }).eq("is_new", true).lt("first_seen_at", cutoff);

  for (const l of listings) {
    const { data: existing } = await supabase
      .from("market_listings")
      .select("id")
      .eq("source", l.source)
      .eq("external_id", l.external_id)
      .single();

    if (existing) {
      await supabase
        .from("market_listings")
        .update({
          last_seen_at: new Date().toISOString(),
          is_new: false,
          price: l.price,
          url: l.url,
        })
        .eq("id", existing.id);
    } else {
      const now = new Date().toISOString();
      await supabase.from("market_listings").insert({ ...l, is_new: true, first_seen_at: now, last_seen_at: now });
      newCount++;
      newListings.push(l);
    }
  }

  return { newCount, newListings };
}

// ── Format notification ───────────────────────────────────────────────────

function formatNotification(district: string, newListings: RawListing[]): string {
  const formatCzk = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} mil. Kč` : `${n.toLocaleString("cs")} Kč`;

  const header = `🏠 *Nové nabídky v ${district} (${newListings.length})*\n`;
  const items = newListings.slice(0, 6).map((l, i) => {
    const area = l.area_m2 ? `, ${l.area_m2} m²` : "";
    return `${i + 1}. ${l.title}${area} — ${formatCzk(l.price)}\n   → ${l.url}`;
  });
  const more = newListings.length > 6 ? `\n_...a ${newListings.length - 6} dalších_` : "";
  return `${header}\n${items.join("\n\n")}${more}\n\n_Sreality + Bezrealitky_`;
}

function tomorrow7am(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(7, 0, 0, 0);
  return d.toISOString();
}

// ── Main handler ──────────────────────────────────────────────────────────

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: jobs } = await supabase
    .from("monitoring_jobs")
    .select("*")
    .eq("enabled", true);

  if (!jobs || jobs.length === 0) {
    return new Response(JSON.stringify({ status: "no jobs" }), { status: 200 });
  }

  const results: Array<{ job: string; new_count: number }> = [];

  for (const job of jobs as MonitoringJob[]) {
    const district = job.locations[0] ?? "Praha";
    const filters = job.filters ?? {};

    const [sreaListings, bezListings] = await Promise.all([
      scrapeSreality(district, filters),
      scrapeBezrealitky(district, filters),
    ]);

    const all = [...sreaListings, ...bezListings];
    const { newCount, newListings } = await upsertListings(supabase, all);

    if (newCount > 0 && job.notify_telegram && job.telegram_chat_id) {
      const msg = formatNotification(district, newListings);
      await sendTelegramMessage(job.telegram_chat_id, msg);
    }

    await supabase
      .from("monitoring_jobs")
      .update({ last_run_at: new Date().toISOString(), next_run_at: tomorrow7am() })
      .eq("id", job.id);

    results.push({ job: job.name, new_count: newCount });
  }

  return new Response(JSON.stringify({ status: "ok", results }), { status: 200 });
});
