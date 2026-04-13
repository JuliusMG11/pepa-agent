"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const SOURCE_LABELS: Record<string, string> = {
  referral: "Doporučení",
  sreality: "Sreality",
  bezrealitky: "Bezrealitky",
  reality_cz: "Reality.cz",
  direct: "Přímý kontakt",
  social: "Sociální sítě",
  event: "Akce",
  other: "Jiné",
};

const SOURCE_COLORS: Record<string, string> = {
  referral: "#0f766e",
  sreality: "var(--color-brand)",
  bezrealitky: "#d97706",
  reality_cz: "#7e22ce",
  direct: "#166534",
  social: "#0369a1",
  event: "#991b1b",
  other: "#6b7280",
};

interface DataPoint {
  source: string;
  count: number;
}

interface SourceBreakdownChartProps {
  data: DataPoint[];
}

export function SourceBreakdownChart({ data }: SourceBreakdownChartProps) {
  const chartData = data.map((d) => ({
    name: SOURCE_LABELS[d.source] ?? d.source,
    value: d.count,
    color: SOURCE_COLORS[d.source] ?? "#6b7280",
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          label={(entry) => String(entry.name ?? "")}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-bg-card)",
            border: "1px solid rgba(199,196,215,0.3)",
            borderRadius: 10,
            fontSize: 12,
            boxShadow: "0 4px 16px rgba(70,72,212,0.08)",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
