import type { Result } from "@/types/app";
import { nanoid } from "nanoid";

export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
}

export interface RenderChartInput {
  chart_type: "line" | "bar" | "area" | "pie" | "composed";
  title: string;
  data: Record<string, unknown>[];
  x_key: string;
  series: ChartSeries[];
}

export interface ChartPayload extends RenderChartInput {
  chart_id: string;
  /** When true, UI shows a placeholder instead of an empty Recharts render */
  is_empty?: boolean;
}

const DEFAULT_COLORS = [
  "#4648d4",
  "#6063ee",
  "#904900",
  "#575992",
  "#00897b",
  "#e53935",
];

export async function renderChartTool(
  input: RenderChartInput
): Promise<Result<ChartPayload>> {
  const { chart_type, title, data, x_key, series } = input;

  if (!series || series.length === 0) {
    return {
      success: false,
      error: new Error("At least one series is required"),
    };
  }

  // Assign default colors where missing
  const seriesWithColors: ChartSeries[] = series.map((s, i) => ({
    ...s,
    color: s.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  // Empty data: still return a valid payload so the agent can answer in prose (e.g. short history)
  if (!data || data.length === 0) {
    return {
      success: true,
      data: {
        chart_id: nanoid(8),
        chart_type,
        title,
        data: [],
        x_key,
        series: seriesWithColors,
        is_empty: true,
      },
    };
  }

  return {
    success: true,
    data: {
      chart_id: nanoid(8),
      chart_type,
      title,
      data,
      x_key,
      series: seriesWithColors,
    },
  };
}
