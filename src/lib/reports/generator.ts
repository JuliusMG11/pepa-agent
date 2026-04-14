import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ReportData, ReportPeriod, TopProperty, PipelineStage } from "@/types/reports";
import {
  LEAD_SOURCE_LABELS_CS,
  LEAD_STATUS_LABELS_CS,
} from "@/lib/reports/czech-labels";

function isoWeek(d: Date): string {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    Math.ceil(
      ((d.getTime() - jan4.getTime()) / 86_400_000 + jan4.getDay() + 1) / 7
    );
  return `W${weekNum}`;
}

function formatCzechDate(d: Date): string {
  return d.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function buildWeeklyPeriod(): ReportPeriod {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) - 7); // last Monday
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const week = isoWeek(monday);
  const label = `${week} (${formatCzechDate(monday)} – ${formatCzechDate(sunday)})`;
  return { from: monday, to: sunday, label };
}

export function buildCustomPeriod(from: Date, to: Date): ReportPeriod {
  const label = `${formatCzechDate(from)} – ${formatCzechDate(to)}`;
  return { from, to, label };
}

export async function generateReport(
  supabase: SupabaseClient<Database>,
  period: ReportPeriod
): Promise<ReportData> {
  const fromIso = period.from.toISOString();
  const toIso = period.to.toISOString();

  const [
    leadsResult,
    newClientsResult,
    newPropertiesResult,
    soldPropertiesResult,
    activitiesResult,
    allLeadsForConv,
    topSoldResult,
  ] = await Promise.all([
    // Leads created in period
    supabase
      .from("leads")
      .select("id, status, source, created_at, closed_at, property_id, assigned_agent_id")
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    // New clients
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .is("deleted_at", null),
    // New properties listed
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .is("deleted_at", null),
    // Sold properties (updated_at in period, status=sold) with price
    supabase
      .from("properties")
      .select("id, price, district, agent_id")
      .eq("status", "sold")
      .gte("updated_at", fromIso)
      .lte("updated_at", toIso)
      .is("deleted_at", null),
    // Activities in period
    supabase
      .from("activities")
      .select("id, type")
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    // All closed_won leads (for conversion rate against total closed)
    supabase
      .from("leads")
      .select("id, status")
      .in("status", ["closed_won", "closed_lost"])
      .gte("closed_at", fromIso)
      .lte("closed_at", toIso),
    // Top 5 sold properties by price in period
    supabase
      .from("properties")
      .select("title, district, price, agent_id")
      .eq("status", "sold")
      .gte("updated_at", fromIso)
      .lte("updated_at", toIso)
      .is("deleted_at", null)
      .order("price", { ascending: false })
      .limit(5),
  ]);

  const leads = leadsResult.data ?? [];
  const soldProps = soldPropertiesResult.data ?? [];
  const activities = activitiesResult.data ?? [];
  const closedLeads = allLeadsForConv.data ?? [];

  // Metrics
  const closedWon = closedLeads.filter((l) => l.status === "closed_won").length;
  const closedLost = closedLeads.filter((l) => l.status === "closed_lost").length;
  const totalClosed = closedWon + closedLost;
  const conversionRate = totalClosed > 0 ? Math.round((closedWon / totalClosed) * 100) : 0;

  const totalRevenue = soldProps.reduce((sum, p) => sum + (p.price ?? 0), 0);

  // Avg days to close — use closed_won leads with closed_at in period
  const wonWithDates = leads
    .filter((l) => l.status === "closed_won" && l.closed_at)
    .map((l) => {
      const diffMs =
        new Date(l.closed_at!).getTime() - new Date(l.created_at).getTime();
      return diffMs / 86_400_000;
    })
    .filter((d) => d > 0 && d < 365);
  const avgDaysToClose =
    wonWithDates.length > 0
      ? Math.round(wonWithDates.reduce((a, b) => a + b, 0) / wonWithDates.length)
      : 0;

  // Top agent by sold properties
  const agentDeals: Record<string, number> = {};
  for (const p of soldProps) {
    if (p.agent_id) agentDeals[p.agent_id] = (agentDeals[p.agent_id] ?? 0) + 1;
  }
  let topAgentId: string | null = null;
  let topAgentDeals = 0;
  for (const [id, count] of Object.entries(agentDeals)) {
    if (count > topAgentDeals) {
      topAgentDeals = count;
      topAgentId = id;
    }
  }

  let topAgent: { name: string; deals: number } | null = null;
  if (topAgentId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", topAgentId)
      .single();
    if (profile) topAgent = { name: profile.full_name, deals: topAgentDeals };
  }

  // Top properties — resolve agent names
  const topProperties: TopProperty[] = [];
  for (const prop of topSoldResult.data ?? []) {
    let agentName = "Neznámý";
    if (prop.agent_id) {
      const { data: agentProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", prop.agent_id)
        .single();
      if (agentProfile) agentName = agentProfile.full_name;
    }
    topProperties.push({
      title: prop.title,
      district: prop.district,
      price: prop.price ?? 0,
      agentName,
    });
  }

  // Pipeline funnel — current snapshot of open leads by status
  const PIPELINE_STAGE_LABELS: Record<string, string> = {
    new: "Nový",
    contacted: "Kontaktován",
    viewing_scheduled: "Prohlídka",
    offer_made: "Nabídka",
    closed_won: "Výhra",
    closed_lost: "Ztráta",
  };

  const { data: allOpenLeads } = await supabase
    .from("leads")
    .select("status")
    .is("deleted_at", null);

  const funnelMap: Record<string, number> = {};
  for (const lead of allOpenLeads ?? []) {
    const st = lead.status;
    funnelMap[st] = (funnelMap[st] ?? 0) + 1;
  }

  const pipelineFunnel: PipelineStage[] = Object.entries(PIPELINE_STAGE_LABELS).map(
    ([status, label]) => ({
      status,
      label,
      count: funnelMap[status] ?? 0,
    })
  );

  // Leads by source (české popisky)
  const sourceMap: Record<string, number> = {};
  for (const l of leads) {
    const src = l.source ?? "other";
    sourceMap[src] = (sourceMap[src] ?? 0) + 1;
  }
  const leadsBySource = Object.entries(sourceMap)
    .map(([source, count]) => ({
      source: LEAD_SOURCE_LABELS_CS[source] ?? source,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Nové leady v období podle statusu (pipeline)
  const statusMap: Record<string, number> = {};
  for (const l of leads) {
    const st = l.status;
    statusMap[st] = (statusMap[st] ?? 0) + 1;
  }
  const leadsByStatus = Object.entries(statusMap)
    .map(([status, count]) => ({
      status,
      label: LEAD_STATUS_LABELS_CS[status] ?? status,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Properties by district (sold)
  const districtMap: Record<string, { count: number; revenue: number }> = {};
  for (const p of soldProps) {
    if (!districtMap[p.district]) districtMap[p.district] = { count: 0, revenue: 0 };
    districtMap[p.district].count++;
    districtMap[p.district].revenue += p.price ?? 0;
  }
  const propertiesByDistrict = Object.entries(districtMap)
    .map(([district, { count, revenue }]) => ({ district, count, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  // Activities by type
  const actMap: Record<string, number> = {};
  for (const a of activities) {
    actMap[a.type] = (actMap[a.type] ?? 0) + 1;
  }
  const activitiesByType = Object.entries(actMap)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Weekly breakdown (by ISO week within period)
  const weekMap: Record<string, { leads: number; sold: number }> = {};
  for (const l of leads) {
    const w = isoWeek(new Date(l.created_at));
    if (!weekMap[w]) weekMap[w] = { leads: 0, sold: 0 };
    weekMap[w].leads++;
  }
  for (const p of soldProps) {
    // use period label as single week if only one week
    const w = period.label.includes("W") ? period.label.split(" ")[0] : "Celkem";
    if (!weekMap[w]) weekMap[w] = { leads: 0, sold: 0 };
    weekMap[w].sold++;
  }
  const weeklyBreakdown = Object.entries(weekMap)
    .map(([week, { leads: l, sold: s }]) => ({ week, leads: l, sold: s }))
    .sort((a, b) => a.week.localeCompare(b.week));

  return {
    period,
    metrics: {
      newLeads: leads.length,
      closedWon,
      closedLost,
      conversionRate,
      newClients: newClientsResult.count ?? 0,
      newProperties: newPropertiesResult.count ?? 0,
      soldProperties: soldProps.length,
      totalRevenue,
      avgDaysToClose,
      topAgent,
    },
    leadsBySource,
    leadsByStatus,
    propertiesByDistrict,
    activitiesByType,
    weeklyBreakdown,
    topProperties,
    pipelineFunnel,
  };
}
