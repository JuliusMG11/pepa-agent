"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  Line,
  Bar,
  Area,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { ChartPayload } from "@/lib/claude/tools/render-chart";
import { chartRowHasLeadDrilldownMeta } from "@/lib/utils/chart-lead-drilldown";
import { ChartLeadDrilldownModal } from "./ChartLeadDrilldownModal";

interface InlineChartProps {
  chart: ChartPayload;
}

export function InlineChart({ chart }: InlineChartProps) {
  const { chart_type, title, data, x_key, series, is_empty } = chart;
  const safeData = Array.isArray(data) ? data : [];
  const safeSeries = Array.isArray(series) ? series : [];
  const xKey = x_key ?? "x";

  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [drilldownPayload, setDrilldownPayload] = useState<Record<string, unknown> | null>(null);
  const [drilldownLabel, setDrilldownLabel] = useState("");

  const barDrilldownEnabled =
    chart_type === "bar" && safeData.some((row) => chartRowHasLeadDrilldownMeta(row));

  const handleBarRectangleClick = (item: { payload?: Record<string, unknown> }) => {
    const payload = item.payload;
    if (!payload || !chartRowHasLeadDrilldownMeta(payload)) return;
    setDrilldownPayload(payload);
    setDrilldownLabel(String(payload[xKey] ?? ""));
    setDrilldownOpen(true);
  };

  if (is_empty || safeData.length === 0 || safeSeries.length === 0) {
    return (
      <div
        className="mt-3 rounded-xl p-4 text-sm"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid rgba(199,196,215,0.3)",
          color: "var(--color-text-muted)",
        }}
      >
        <p
          className="text-xs font-bold mb-2 uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          {title}
        </p>
        <p>Pro tento výběr nejsou k dispozici žádná data k vykreslení grafu.</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="mt-3 rounded-xl p-4"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid rgba(199,196,215,0.3)",
          boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
        }}
      >
        <p
          className="text-xs font-bold mb-3 uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          {title}
        </p>
        <ResponsiveContainer width="100%" height={220}>
          {renderChart(
            chart_type ?? "line",
            safeData,
            xKey,
            safeSeries,
            barDrilldownEnabled ? handleBarRectangleClick : undefined
          )}
        </ResponsiveContainer>
      </div>
      <ChartLeadDrilldownModal
        open={drilldownOpen}
        bucketLabel={drilldownLabel}
        rowPayload={drilldownPayload}
        onClose={() => {
          setDrilldownOpen(false);
          setDrilldownPayload(null);
        }}
      />
    </>
  );
}

function renderChart(
  type: ChartPayload["chart_type"],
  data: Record<string, unknown>[],
  xKey: string,
  series: ChartPayload["series"],
  onBarClick?: (item: { payload?: Record<string, unknown> }) => void
) {
  const commonProps = {
    data,
    margin: { top: 4, right: 8, left: -16, bottom: 0 },
  };

  const axisStyle = { fontSize: 11, fill: "var(--color-text-muted)" };

  switch (type) {
    case "bar":
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(199,196,215,0.3)" />
          <XAxis dataKey={xKey} tick={axisStyle} />
          <YAxis tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color ?? "var(--color-brand)"}
              radius={[3, 3, 0, 0]}
              style={onBarClick ? { cursor: "pointer" } : undefined}
              onClick={onBarClick}
            />
          ))}
        </BarChart>
      );

    case "area":
      return (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(199,196,215,0.3)" />
          <XAxis dataKey={xKey} tick={axisStyle} />
          <YAxis tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color ?? "var(--color-brand)"}
              fill={`${s.color ?? "var(--color-brand)"}18`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      );

    case "pie":
      return (
        <PieChart>
          <Pie
            data={data}
            dataKey={series[0]?.key ?? "value"}
            nameKey={xKey}
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={(entry) => String(entry.name ?? "")}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={series[i]?.color ?? PALETTE[i % PALETTE.length]}
              />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      );

    case "line":
    case "composed":
    default:
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(199,196,215,0.3)" />
          <XAxis dataKey={xKey} tick={axisStyle} />
          <YAxis tick={axisStyle} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color ?? "var(--color-brand)"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      );
  }
}

const tooltipStyle = {
  backgroundColor: "var(--color-bg-card)",
  border: "1px solid rgba(199,196,215,0.3)",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(70,72,212,0.08)",
};

const PALETTE = [
  "var(--color-brand)",
  "#6063ee",
  "#904900",
  "#575992",
  "#00897b",
  "#e53935",
];
