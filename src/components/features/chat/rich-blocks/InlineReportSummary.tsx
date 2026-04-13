"use client";

import type { ReportData } from "@/lib/claude/tools/generate-report";

interface InlineReportSummaryProps {
  report: ReportData;
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(n);
}

export function InlineReportSummary({ report }: InlineReportSummaryProps) {
  const { period, metrics } = report;

  const cells: { label: string; value: string }[] = [
    { label: "Nové leady", value: String(metrics.newLeads) },
    { label: "Uzavřené (výhra)", value: String(metrics.closedWon) },
    { label: "Uzavřené (ztráta)", value: String(metrics.closedLost) },
    {
      label: "Konverze",
      value: `${Math.round(metrics.conversionRate * 100)} %`,
    },
    { label: "Noví klienti", value: String(metrics.newClients) },
    { label: "Nové nemovitosti", value: String(metrics.newProperties) },
    { label: "Prodané", value: String(metrics.soldProperties) },
    {
      label: "Odhad tržeb (prodáno)",
      value: formatMoney(metrics.revenueEstimate),
    },
    { label: "Aktivity celkem", value: String(metrics.totalActivities) },
    {
      label: "Top agent",
      value:
        metrics.topAgent.deals > 0
          ? `${metrics.topAgent.name} (${metrics.topAgent.deals} obch.)`
          : "—",
    },
  ];

  return (
    <div
      className="mt-3 rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: "1px solid rgba(199,196,215,0.35)",
        boxShadow: "0 4px 20px rgba(70,72,212,0.06)",
      }}
    >
      <div
        className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
        style={{
          backgroundColor: "rgba(70,72,212,0.06)",
          borderBottom: "1px solid rgba(199,196,215,0.25)",
        }}
      >
        <p
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--color-brand)" }}
        >
          Přehled reportu
        </p>
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {period.label}
        </p>
      </div>

      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-lg px-3 py-2.5"
            style={{ backgroundColor: "var(--color-bg-sidebar)" }}
          >
            <p className="text-[10px] font-medium uppercase" style={{ color: "var(--color-text-muted)" }}>
              {c.label}
            </p>
            <p className="text-sm font-bold mt-0.5 break-words" style={{ color: "var(--color-text-primary)" }}>
              {c.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
