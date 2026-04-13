import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type {
  ListingCandidate,
  TopBuySnapshotPayload,
} from "@/lib/ai/top-buy-picks";

const TOP_BUY_SNAPSHOT_KEY = "top_buy_listings";

export interface KpiMetric {
  value: number;
  trend: number; // percent change vs previous period (negative = better for days-to-close)
  trendLabel: string;
}

export interface DashboardKpis {
  newClientsQ1: KpiMetric;
  activeListings: KpiMetric;
  leadsThisMonth: KpiMetric;
  avgDaysToClose: KpiMetric;
}

export interface LeadTrendPoint {
  month: string; // Czech month abbreviation
  leady: number;
  prodané: number;
}

export interface ActivityRow {
  id: string;
  activity_type: string;
  created_at: string;
  related_to_type: string | null;
  related_to_id: string | null;
  description: string | null;
}

export interface NewListingsBanner {
  count: number;
  districts: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const CZECH_MONTHS: Record<number, string> = {
  0: "Led",
  1: "Úno",
  2: "Bře",
  3: "Dub",
  4: "Kvě",
  5: "Čvn",
  6: "Čvc",
  7: "Srp",
  8: "Zář",
  9: "Říj",
  10: "Lis",
  11: "Pro",
};

function startOfQuarter(): Date {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), q * 3, 1);
}

function startOfMonth(monthsAgo = 0): Date {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - monthsAgo);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── KPI queries ────────────────────────────────────────────────────────────

async function getNewClientsCurrentQuarter(
  supabase: SupabaseClient<Database>
): Promise<KpiMetric> {
  const qStart = startOfQuarter().toISOString();
  const prevQStart = new Date(startOfQuarter());
  prevQStart.setMonth(prevQStart.getMonth() - 3);

  const [current, previous] = await Promise.all([
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .gte("created_at", qStart),
    supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .gte("created_at", prevQStart.toISOString())
      .lt("created_at", qStart),
  ]);

  const value = current.count ?? 0;
  const prev = previous.count ?? 0;
  const trend =
    prev > 0 ? Math.round(((value - prev) / prev) * 100) : 0;

  return {
    value,
    trend,
    trendLabel:
      trend >= 0 ? `+${trend}% vs minulý Q` : `${trend}% vs minulý Q`,
  };
}

async function getActiveListingsCount(
  supabase: SupabaseClient<Database>
): Promise<KpiMetric> {
  const { count } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("status", "active")
    .is("deleted_at", null);

  return {
    value: count ?? 0,
    trend: 0,
    trendLabel: "Aktivní portfolio",
  };
}

async function getLeadsThisMonth(
  supabase: SupabaseClient<Database>
): Promise<KpiMetric> {
  const thisMonthStart = startOfMonth(0).toISOString();
  const lastMonthStart = startOfMonth(1).toISOString();

  const [current, previous] = await Promise.all([
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thisMonthStart),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .gte("created_at", lastMonthStart)
      .lt("created_at", thisMonthStart),
  ]);

  const value = current.count ?? 0;
  const prev = previous.count ?? 0;
  const trend =
    prev > 0 ? Math.round(((value - prev) / prev) * 100) : 0;

  return {
    value,
    trend,
    trendLabel:
      trend >= 0 ? `+${trend}% vs minulý měsíc` : `${trend}% vs minulý měsíc`,
  };
}

async function getAvgDaysToClose(
  supabase: SupabaseClient<Database>
): Promise<KpiMetric> {
  // Approximate: count closed_won leads in last 90 days
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const { data } = await supabase
    .from("leads")
    .select("created_at, closed_at")
    .eq("status", "closed_won")
    .gte("created_at", since.toISOString())
    .not("closed_at", "is", null);

  const durations = (data ?? [])
    .filter((l) => l.closed_at)
    .map((l) => {
      const diffMs =
        new Date(l.closed_at!).getTime() - new Date(l.created_at).getTime();
      return diffMs / (1000 * 60 * 60 * 24); // days
    })
    .filter((d) => d > 0 && d < 365);

  const avg =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

  return {
    value: avg,
    trend: 0,
    trendLabel: avg > 0 ? `Za posl. 90 dní` : "Nedostatek dat",
  };
}

// ── Main KPI aggregator ────────────────────────────────────────────────────

export async function getDashboardKpis(
  supabase: SupabaseClient<Database>
): Promise<DashboardKpis> {
  const [newClientsQ1, activeListings, leadsThisMonth, avgDaysToClose] =
    await Promise.all([
      getNewClientsCurrentQuarter(supabase),
      getActiveListingsCount(supabase),
      getLeadsThisMonth(supabase),
      getAvgDaysToClose(supabase),
    ]);

  return { newClientsQ1, activeListings, leadsThisMonth, avgDaysToClose };
}

// ── Lead trend (last 6 months) ─────────────────────────────────────────────

export async function getLeadTrend(
  supabase: SupabaseClient<Database>,
  months = 6
): Promise<LeadTrendPoint[]> {
  const since = startOfMonth(months - 1).toISOString();

  const [leadsResult, soldResult] = await Promise.all([
    supabase
      .from("leads")
      .select("created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
    supabase
      .from("properties")
      .select("updated_at")
      .eq("status", "sold")
      .gte("updated_at", since)
      .order("updated_at", { ascending: true }),
  ]);

  // Build month buckets for last N months
  const buckets: Record<string, LeadTrendPoint> = {};
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets[key] = {
      month: CZECH_MONTHS[d.getMonth()] ?? "",
      leady: 0,
      prodané: 0,
    };
  }

  for (const row of leadsResult.data ?? []) {
    const d = new Date(row.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (buckets[key]) buckets[key].leady++;
  }

  for (const row of soldResult.data ?? []) {
    const d = new Date(row.updated_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (buckets[key]) buckets[key]["prodané"]++;
  }

  return Object.values(buckets);
}

// ── Recent activity ────────────────────────────────────────────────────────

export async function getRecentActivities(
  supabase: SupabaseClient<Database>,
  limit = 8
): Promise<ActivityRow[]> {
  const { data } = await supabase
    .from("activities")
    .select(
      "id, type, created_at, related_to_type, related_to_id, description"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    activity_type: row.type,
    created_at: row.created_at,
    related_to_type: row.related_to_type,
    related_to_id: row.related_to_id,
    description: row.description,
  }));
}

// ── New listings banner ────────────────────────────────────────────────────

export async function getNewListingsBanner(
  supabase: SupabaseClient<Database>
): Promise<NewListingsBanner | null> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("market_listings")
    .select("district")
    .eq("is_new", true)
    .gte("first_seen_at", todayStart.toISOString());

  if (!data || data.length === 0) return null;

  const districts = [...new Set(data.map((l) => l.district))].slice(0, 3);
  return { count: data.length, districts };
}

// ── Top buy picks (AI + monitoring listings) ───────────────────────────────

export async function fetchMarketListingCandidatesForTopPicks(
  supabase: SupabaseClient<Database>
): Promise<ListingCandidate[]> {
  const cols =
    "id, title, district, price, area_m2, source, url, property_type, last_seen_at";

  const [{ data: bezRows }, { data: srRows }] = await Promise.all([
    supabase.from("market_listings").select(cols).eq("source", "bezrealitky").order("last_seen_at", { ascending: false }).limit(45),
    supabase.from("market_listings").select(cols).eq("source", "sreality").order("last_seen_at", { ascending: false }).limit(45),
  ]);

  const merged = [...(bezRows ?? []), ...(srRows ?? [])];
  const seen = new Set<string>();
  const rows = merged.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
  rows.sort(
    (a, b) =>
      new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime()
  );

  return rows
    .filter((r) => {
      const pt = r.property_type?.toLowerCase();
      if (pt === "byt") return true;
      if (!pt && /byt/i.test(r.title)) return true;
      return false;
    })
    .map((r) => ({
      id: r.id,
      title: r.title,
      district: r.district,
      price: r.price,
      area_m2: r.area_m2,
      source: r.source,
      url: r.url,
      last_seen_at: r.last_seen_at,
    }));
}

export async function getTopBuyListingsSnapshot(
  supabase: SupabaseClient<Database>
): Promise<TopBuySnapshotPayload | null> {
  const { data } = await supabase
    .from("dashboard_snapshots")
    .select("payload")
    .eq("key", TOP_BUY_SNAPSHOT_KEY)
    .maybeSingle();

  const payload = data?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const rec = payload as Record<string, unknown>;
  if (rec.version !== 1 || !Array.isArray(rec.items)) return null;
  return payload as unknown as TopBuySnapshotPayload;
}
