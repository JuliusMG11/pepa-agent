"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { LeadTrendPoint } from "@/lib/data/dashboard";

interface LeadTrendChartProps {
  data: LeadTrendPoint[];
}

export function LeadTrendChart({ data }: LeadTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart
        data={data}
        margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradSold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-chart-sold)" stopOpacity={0.12} />
            <stop offset="95%" stopColor="var(--color-chart-sold)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-chart-grid)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-chart-tooltip-bg)",
            border: "1px solid var(--color-chart-tooltip-border)",
            borderRadius: 10,
            fontSize: 12,
            boxShadow: "var(--shadow-card)",
            color: "var(--color-text-primary)",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8, color: "var(--color-text-muted)" }} />
        <Area
          type="monotone"
          dataKey="leady"
          name="Leady"
          stroke="var(--color-brand)"
          strokeWidth={2}
          fill="url(#gradLeads)"
          dot={false}
          activeDot={{ r: 4, fill: "var(--color-brand)" }}
        />
        <Area
          type="monotone"
          dataKey="prodané"
          name="Prodané"
          stroke="var(--color-chart-sold)"
          strokeWidth={2}
          strokeDasharray="5 3"
          fill="url(#gradSold)"
          dot={false}
          activeDot={{ r: 4, fill: "var(--color-chart-sold)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
