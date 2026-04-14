import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Result } from "@/types/app";
import {
  ACTIVITY_TYPE_LABELS_CS,
  LEAD_SOURCE_LABELS_CS,
  LEAD_STATUS_LABELS_CS,
} from "@/lib/reports/czech-labels";

export interface GenerateReportInput {
  period: "weekly" | "monthly" | "quarterly" | "custom";
  date_from?: string;
  date_to?: string;
  include_sections?: string[];
}

export interface ReportMetrics {
  newLeads: number;
  closedWon: number;
  closedLost: number;
  /** Podíl výher vůči uzavřeným obchodům v období (0–1), stejně jako v UI přehledu. */
  conversionRate: number;
  newProperties: number;
  soldProperties: number;
  avgDaysToClose: number;
  newClients: number;
  totalActivities: number;
  topAgent: { name: string; deals: number };
  revenueEstimate: number;
}

export interface ReportData {
  period: { label: string; from: string; to: string };
  metrics: ReportMetrics;
  generatedAt: string;
  /** Agregace pro PDF; u starších uložených výstupů mohou chybět. */
  leadsBySource?: { label: string; count: number }[];
  leadsByStatus?: { label: string; count: number }[];
  activitiesByType?: { label: string; count: number }[];
  propertiesByDistrict?: { district: string; count: number; revenue: number }[];
  weeklyBreakdown?: { week: string; leads: number; sold: number }[];
  topProperties?: import("@/types/reports").TopProperty[];
  pipelineFunnel?: import("@/types/reports").PipelineStage[];
}

function isoWeek(d: Date): string {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const weekNum = Math.ceil(
    ((d.getTime() - jan4.getTime()) / 86_400_000 + jan4.getDay() + 1) / 7
  );
  return `W${weekNum}`;
}

function getPeriodDates(
  period: GenerateReportInput["period"],
  dateFrom?: string,
  dateTo?: string
): { from: Date; to: Date; label: string } {
  const now = new Date();
  const to = dateTo ? new Date(dateTo) : new Date(now);

  if (period === "custom" && dateFrom) {
    return {
      from: new Date(dateFrom),
      to,
      label: `${new Date(dateFrom).toLocaleDateString("cs-CZ")} – ${to.toLocaleDateString("cs-CZ")}`,
    };
  }

  const from = new Date(now);
  if (period === "weekly") {
    from.setDate(now.getDate() - 7);
    return { from, to, label: "Poslední týden" };
  }
  if (period === "monthly") {
    from.setMonth(now.getMonth() - 1);
    return {
      from,
      to,
      label: now.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" }),
    };
  }
  from.setMonth(now.getMonth() - 3);
  return { from, to, label: "Poslední kvartál" };
}

export async function generateReportTool(
  input: GenerateReportInput,
  context: { supabase: SupabaseClient<Database> }
): Promise<Result<ReportData>> {
  const { period, date_from, date_to } = input;
  const { from, to, label } = getPeriodDates(period, date_from, date_to);

  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  try {
    const [
      leadsResult,
      closedInPeriodResult,
      newPropertiesResult,
      soldPropertiesResult,
      clientsResult,
      activitiesResult,
    ] = await Promise.all([
      context.supabase
        .from("leads")
        .select("id, status, source, created_at, closed_at")
        .gte("created_at", fromIso)
        .lte("created_at", toIso),

      context.supabase
        .from("leads")
        .select("id, status")
        .in("status", ["closed_won", "closed_lost"])
        .gte("closed_at", fromIso)
        .lte("closed_at", toIso)
        .not("closed_at", "is", null),

      context.supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .gte("created_at", fromIso)
        .lte("created_at", toIso)
        .is("deleted_at", null),

      context.supabase
        .from("properties")
        .select("id, price, district, agent_id, updated_at")
        .eq("status", "sold")
        .gte("updated_at", fromIso)
        .lte("updated_at", toIso)
        .is("deleted_at", null),

      context.supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .gte("created_at", fromIso)
        .lte("created_at", toIso)
        .is("deleted_at", null),

      context.supabase
        .from("activities")
        .select("id, type")
        .gte("created_at", fromIso)
        .lte("created_at", toIso),
    ]);

    const leads = leadsResult.data ?? [];
    const closedInPeriod = closedInPeriodResult.data ?? [];
    const activities = activitiesResult.data ?? [];
    const soldProps = soldPropertiesResult.data ?? [];

    const newLeads = leads.length;
    const closedWon = closedInPeriod.filter((l) => l.status === "closed_won").length;
    const closedLost = closedInPeriod.filter((l) => l.status === "closed_lost").length;
    const totalClosed = closedWon + closedLost;
    const conversionRate =
      totalClosed > 0 ? Math.round((closedWon / totalClosed) * 1000) / 1000 : 0;

    const newProperties = newPropertiesResult.count ?? 0;
    const soldProperties = soldProps.length;

    const revenueEstimate = soldProps.reduce((sum, p) => sum + (p.price ?? 0), 0);

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

    const agentDealCounts: Record<string, number> = {};
    for (const p of soldProps) {
      if (p.agent_id) {
        agentDealCounts[p.agent_id] = (agentDealCounts[p.agent_id] ?? 0) + 1;
      }
    }

    const topAgentId = Object.entries(agentDealCounts).sort(
      ([, a], [, b]) => b - a
    )[0]?.[0];

    let topAgent: { name: string; deals: number } = { name: "—", deals: 0 };
    if (topAgentId) {
      const { data: agentProfile } = await context.supabase
        .from("profiles")
        .select("full_name")
        .eq("id", topAgentId)
        .single();

      topAgent = {
        name: agentProfile?.full_name ?? "—",
        deals: agentDealCounts[topAgentId] ?? 0,
      };
    }

    const sourceMap: Record<string, number> = {};
    for (const l of leads) {
      const src = (l.source as string | null) ?? "other";
      sourceMap[src] = (sourceMap[src] ?? 0) + 1;
    }
    const leadsBySource = Object.entries(sourceMap)
      .map(([source, count]) => ({
        label: LEAD_SOURCE_LABELS_CS[source] ?? source,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const statusMap: Record<string, number> = {};
    for (const l of leads) {
      const st = l.status as string;
      statusMap[st] = (statusMap[st] ?? 0) + 1;
    }
    const leadsByStatus = Object.entries(statusMap)
      .map(([status, count]) => ({
        label: LEAD_STATUS_LABELS_CS[status] ?? status,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const actMap: Record<string, number> = {};
    for (const a of activities) {
      actMap[a.type] = (actMap[a.type] ?? 0) + 1;
    }
    const activitiesByType = Object.entries(actMap)
      .map(([type, count]) => ({
        label: ACTIVITY_TYPE_LABELS_CS[type] ?? type,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const districtMap: Record<string, { count: number; revenue: number }> = {};
    for (const p of soldProps) {
      const d = p.district?.trim() || "Neuvedeno";
      if (!districtMap[d]) districtMap[d] = { count: 0, revenue: 0 };
      districtMap[d].count++;
      districtMap[d].revenue += p.price ?? 0;
    }
    const propertiesByDistrict = Object.entries(districtMap)
      .map(([district, { count, revenue }]) => ({ district, count, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    const weekMap: Record<string, { leads: number; sold: number }> = {};
    for (const l of leads) {
      const w = isoWeek(new Date(l.created_at));
      if (!weekMap[w]) weekMap[w] = { leads: 0, sold: 0 };
      weekMap[w].leads++;
    }
    for (const p of soldProps) {
      const w = isoWeek(new Date(p.updated_at));
      if (!weekMap[w]) weekMap[w] = { leads: 0, sold: 0 };
      weekMap[w].sold++;
    }
    const weeklyBreakdown = Object.entries(weekMap)
      .map(([week, { leads: wl, sold: ws }]) => ({ week, leads: wl, sold: ws }))
      .sort((a, b) => a.week.localeCompare(b.week));

    const reportData: ReportData = {
      period: {
        label,
        from: fromIso,
        to: toIso,
      },
      metrics: {
        newLeads,
        closedWon,
        closedLost,
        conversionRate,
        newProperties,
        soldProperties,
        avgDaysToClose,
        newClients: clientsResult.count ?? 0,
        totalActivities: activities.length,
        topAgent,
        revenueEstimate,
      },
      generatedAt: new Date().toISOString(),
      leadsBySource,
      leadsByStatus,
      activitiesByType,
      propertiesByDistrict,
      weeklyBreakdown,
    };

    return { success: true, data: reportData };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}
