import type { Metadata } from "next";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Topbar } from "@/components/layouts/Topbar";
import { LeadTrendChart } from "@/components/features/dashboard/LeadTrendChart";
import { RecentActivity } from "@/components/features/dashboard/RecentActivity";
import { QuickActions } from "@/components/features/dashboard/QuickActions";
import { NewListingsBanner } from "@/components/features/dashboard/NewListingsBanner";
import { createClient } from "@/lib/supabase/server";
import {
  getDashboardKpis,
  getLeadTrend,
  getRecentActivities,
  getNewListingsBanner,
  getTopBuyListingsSnapshot,
  type DashboardKpis,
} from "@/lib/data/dashboard";
import { TopBuyListingsSection } from "@/components/features/dashboard/TopBuyListingsSection";
import { TodayCalendarSection } from "@/components/features/dashboard/TodayCalendarSection";
import { getTodayCalendarPipelineForUser } from "@/lib/data/calendar-pipeline";

export const metadata: Metadata = { title: "Dashboard" };

function KpiTrendBadge({
  trend,
  trendLabel,
  invertPositive = false,
}: {
  trend: number;
  trendLabel: string;
  invertPositive?: boolean;
}) {
  if (trend === 0) {
    return (
      <span className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
        {trendLabel}
      </span>
    );
  }

  // For avgDaysToClose, lower is better (invertPositive=true)
  const isPositive = invertPositive ? trend < 0 : trend > 0;

  if (isPositive) {
    return (
      <span
        className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: "#dcfce7", color: "#166534" }}
      >
        <TrendingUp size={10} strokeWidth={2.5} />
        {trendLabel}
      </span>
    );
  }

  return (
    <span
      className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: "#fce7e7", color: "#991b1b" }}
    >
      <TrendingDown size={10} strokeWidth={2.5} />
      {trendLabel}
    </span>
  );
}

function buildKpiCards(kpis: DashboardKpis) {
  return [
    {
      label: "Noví klienti Q1",
      value: String(kpis.newClientsQ1.value),
      trend: kpis.newClientsQ1.trend,
      trendLabel: kpis.newClientsQ1.trendLabel,
    },
    {
      label: "Aktivní nemovitosti",
      value: String(kpis.activeListings.value),
      trend: kpis.activeListings.trend,
      trendLabel: kpis.activeListings.trendLabel,
    },
    {
      label: "Leady tento měsíc",
      value: String(kpis.leadsThisMonth.value),
      trend: kpis.leadsThisMonth.trend,
      trendLabel: kpis.leadsThisMonth.trendLabel,
    },
    {
      label: "Prům. dní k uzavření",
      value: kpis.avgDaysToClose.value > 0 ? String(kpis.avgDaysToClose.value) : "—",
      trend: kpis.avgDaysToClose.trend,
      trendLabel: kpis.avgDaysToClose.trendLabel,
      invertPositive: true,
    },
  ];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [kpis, trendData, activities, listingsBanner, topBuySnapshot, calendarPipeline] =
    await Promise.all([
      getDashboardKpis(supabase),
      getLeadTrend(supabase),
      getRecentActivities(supabase),
      getNewListingsBanner(supabase),
      getTopBuyListingsSnapshot(supabase),
      user
        ? getTodayCalendarPipelineForUser(supabase, user.id)
        : Promise.resolve({ connected: false as const, reason: "no_tokens" as const, events: [] }),
    ]);

  const kpiCards = buildKpiCards(kpis);

  return (
    <>
      <Topbar />
      <section className="px-4 sm:px-6 lg:px-8 pb-12 max-w-[1280px] mx-auto w-full space-y-6 mt-2">

        {/* New listings banner */}
        {listingsBanner && <NewListingsBanner data={listingsBanner} />}

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className="p-6 rounded-xl"
              style={{
                backgroundColor: "var(--color-bg-card)",
                boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
                border: "1px solid rgba(199,196,215,0.12)",
              }}
            >
              <p
                className="text-[10px] font-bold tracking-widest uppercase mb-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                {card.label}
              </p>
              <div className="flex items-end justify-between mt-2">
                <span
                  className="text-3xl font-bold"
                  style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
                >
                  {card.value}
                </span>
                <KpiTrendBadge
                  trend={card.trend}
                  trendLabel={card.trendLabel}
                  invertPositive={card.invertPositive}
                />
              </div>
            </div>
          ))}
        </div>

        <TodayCalendarSection
          connected={calendarPipeline.connected}
          message={
            !calendarPipeline.connected && "message" in calendarPipeline
              ? calendarPipeline.message
              : undefined
          }
          events={calendarPipeline.connected ? calendarPipeline.events : []}
        />

        {/* 55/45 Split: Trend chart + Top 10 + Activity */}
        <div className="grid grid-cols-12 gap-7">
          {/* Left column: trend + Top 10 koupě (stejná šířka jako graf) */}
          <div className="col-span-12 lg:col-span-7 flex flex-col gap-5 min-w-0">
            <div
              className="p-6 rounded-xl shrink-0"
              style={{
                backgroundColor: "var(--color-bg-card)",
                boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
                border: "1px solid rgba(199,196,215,0.12)",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>
                    Trend leadů a prodejů
                  </h3>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    Posledních 6 měsíců
                  </p>
                </div>
              </div>
              <LeadTrendChart data={trendData} />
            </div>

            <TopBuyListingsSection initial={topBuySnapshot} />
          </div>

          {/* Right column: Quick actions + Recent activity (45%) */}
          <div className="col-span-12 lg:col-span-5 space-y-5">
            {/* Quick actions */}
            <div
              className="p-5 rounded-xl"
              style={{
                backgroundColor: "var(--color-bg-card)",
                boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
                border: "1px solid rgba(199,196,215,0.12)",
              }}
            >
              <h3
                className="font-bold text-sm mb-4"
                style={{ color: "var(--color-text-primary)" }}
              >
                Rychlé akce
              </h3>
              <QuickActions />
            </div>

            {/* Recent activity */}
            <div
              className="p-5 rounded-xl"
              style={{
                backgroundColor: "var(--color-bg-card)",
                boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
                border: "1px solid rgba(199,196,215,0.12)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="font-bold text-sm"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Nedávné aktivity
                </h3>
              </div>
              <RecentActivity activities={activities} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
