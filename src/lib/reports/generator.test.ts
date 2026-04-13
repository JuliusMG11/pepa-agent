import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildWeeklyPeriod, buildCustomPeriod, generateReport } from "./generator";

describe("buildWeeklyPeriod", () => {
  it("returns period with from on Monday at midnight", () => {
    const period = buildWeeklyPeriod();
    // from should be a Monday (getDay() === 1)
    expect(period.from.getDay()).toBe(1);
    expect(period.from.getHours()).toBe(0);
    expect(period.from.getMinutes()).toBe(0);
  });

  it("returns period with to on Sunday at 23:59:59", () => {
    const period = buildWeeklyPeriod();
    expect(period.to.getDay()).toBe(0); // Sunday
    expect(period.to.getHours()).toBe(23);
    expect(period.to.getMinutes()).toBe(59);
  });

  it("label contains ISO week identifier", () => {
    const period = buildWeeklyPeriod();
    expect(period.label).toMatch(/W\d+/);
  });

  it("period spans exactly 7 days", () => {
    const period = buildWeeklyPeriod();
    const diffDays =
      (period.to.getTime() - period.from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(7, 0);
  });
});

describe("buildCustomPeriod", () => {
  it("returns period with the provided from and to dates", () => {
    const from = new Date("2025-01-06T00:00:00Z");
    const to = new Date("2025-01-12T23:59:59Z");

    const period = buildCustomPeriod(from, to);

    expect(period.from).toBe(from);
    expect(period.to).toBe(to);
  });

  it("label contains formatted date range", () => {
    const from = new Date(2025, 0, 6); // 6 Jan 2025
    const to = new Date(2025, 0, 12); // 12 Jan 2025

    const period = buildCustomPeriod(from, to);

    expect(period.label).toContain("2025");
  });
});

// Minimal Supabase mock factory for generateReport
function makeEmptySupabase() {
  const emptyResult = { data: [], error: null, count: 0 };
  const headResult = { data: null, error: null, count: 0 };

  function makeBuilder(result: typeof emptyResult | typeof headResult) {
    const b: Record<string, unknown> = {};
    const chain = () => b;
    b.select = chain;
    b.gte = chain;
    b.lte = chain;
    b.eq = chain;
    b.in = chain;
    b.is = chain;
    b.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(result));
    return b;
  }

  let callCount = 0;
  return {
    from: vi.fn().mockImplementation((table: string) => {
      callCount++;
      if (table === "clients" || table === "properties") {
        return makeBuilder(headResult);
      }
      return makeBuilder(emptyResult);
    }),
  } as unknown as Parameters<typeof generateReport>[0];
}

describe("generateReport", () => {
  it("returns zero metrics when no data exists in period", async () => {
    const supabase = makeEmptySupabase();
    const period = buildCustomPeriod(
      new Date("2025-01-01T00:00:00Z"),
      new Date("2025-01-07T23:59:59Z")
    );

    const report = await generateReport(supabase, period);

    expect(report.period).toBe(period);
    expect(report.metrics.newLeads).toBe(0);
    expect(report.metrics.closedWon).toBe(0);
    expect(report.metrics.closedLost).toBe(0);
    expect(report.metrics.conversionRate).toBe(0);
    expect(report.metrics.soldProperties).toBe(0);
    expect(report.metrics.totalRevenue).toBe(0);
    expect(report.metrics.topAgent).toBeNull();
  });

  it("returns empty arrays for breakdown sections", async () => {
    const supabase = makeEmptySupabase();
    const period = buildCustomPeriod(
      new Date("2025-01-01T00:00:00Z"),
      new Date("2025-01-07T23:59:59Z")
    );

    const report = await generateReport(supabase, period);

    expect(report.leadsBySource).toEqual([]);
    expect(report.leadsByStatus).toEqual([]);
    expect(report.propertiesByDistrict).toEqual([]);
    expect(report.activitiesByType).toEqual([]);
  });

  it("conversionRate is 0 when no closed leads exist (no division by zero)", async () => {
    const supabase = makeEmptySupabase();
    const period = buildCustomPeriod(
      new Date("2025-06-01T00:00:00Z"),
      new Date("2025-06-07T23:59:59Z")
    );

    const report = await generateReport(supabase, period);

    expect(report.metrics.conversionRate).toBe(0);
  });
});
