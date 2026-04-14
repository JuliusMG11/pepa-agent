import { describe, it, expect, vi } from "vitest";
import {
  generateReportTool,
  type GenerateReportInput,
} from "./generate-report";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// ---------------------------------------------------------------------------
// Mock builder factory
// ---------------------------------------------------------------------------

function makeQueryBuilder(result: { data: unknown; error: null; count: number }) {
  const b: Record<string, unknown> = {};
  const chain = () => b;

  b.select = chain;
  b.eq = chain;
  b.gte = chain;
  b.lte = chain;
  b.is = chain;
  b.not = chain;
  b.in = chain;
  b.order = chain;
  b.limit = chain;
  b.single = () => Promise.resolve(result);
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve(result));

  return b;
}

/**
 * Returns a Supabase mock where every table query resolves with empty data.
 * The `single()` variant (used for profile look-ups) also resolves with null data.
 */
function makeEmptySupabase(): { supabase: SupabaseClient<Database> } {
  const emptyResult = { data: [], error: null, count: 0 };
  const nullResult = { data: null, error: null, count: 0 };

  const supabase = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "clients" || table === "properties") {
        // head queries return count in nullResult shape
        return makeQueryBuilder(nullResult);
      }
      return makeQueryBuilder(emptyResult);
    }),
  } as unknown as SupabaseClient<Database>;

  return { supabase };
}

/**
 * Returns a Supabase mock where every call rejects with an error — used to
 * verify the tool returns `{ success: false }` on unexpected DB failures.
 */
function makeErrorSupabase(): { supabase: SupabaseClient<Database> } {
  const errorBuilder: Record<string, unknown> = {};
  const chain = () => errorBuilder;

  errorBuilder.select = chain;
  errorBuilder.eq = chain;
  errorBuilder.gte = chain;
  errorBuilder.lte = chain;
  errorBuilder.is = chain;
  errorBuilder.not = chain;
  errorBuilder.in = chain;
  errorBuilder.order = chain;
  errorBuilder.limit = chain;
  errorBuilder.single = () => Promise.reject(new Error("DB failure"));
  errorBuilder.then = (_resolve: unknown, reject: (e: Error) => unknown) =>
    Promise.reject(new Error("DB failure")).catch(reject);

  const supabase = {
    from: vi.fn().mockReturnValue(errorBuilder),
  } as unknown as SupabaseClient<Database>;

  return { supabase };
}

// ---------------------------------------------------------------------------
// Shared test input
// ---------------------------------------------------------------------------

const input: GenerateReportInput = {
  period: "custom",
  date_from: "2025-01-01T00:00:00Z",
  date_to: "2025-01-07T23:59:59Z",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateReportTool — topProperties and pipelineFunnel", () => {
  it("returns topProperties as empty array when no sold properties", async () => {
    const context = makeEmptySupabase();
    const result = await generateReportTool(input, context);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.topProperties).toEqual([]);
    }
  });

  it("returns pipelineFunnel with 4 open stages when no leads", async () => {
    const context = makeEmptySupabase();
    const result = await generateReportTool(input, context);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pipelineFunnel).toHaveLength(4);
      const statuses = result.data.pipelineFunnel!.map((s) => s.status);
      expect(statuses).not.toContain("closed_won");
      expect(statuses).not.toContain("closed_lost");
    }
  });

  it("pipelineFunnel includes all expected open stage statuses", async () => {
    const context = makeEmptySupabase();
    const result = await generateReportTool(input, context);

    expect(result.success).toBe(true);
    if (result.success) {
      const statuses = result.data.pipelineFunnel!.map((s) => s.status);
      expect(statuses).toContain("new");
      expect(statuses).toContain("contacted");
      expect(statuses).toContain("viewing_scheduled");
      expect(statuses).toContain("offer_made");
    }
  });

  it("pipelineFunnel stage counts are all 0 when no open leads exist", async () => {
    const context = makeEmptySupabase();
    const result = await generateReportTool(input, context);

    expect(result.success).toBe(true);
    if (result.success) {
      result.data.pipelineFunnel!.forEach((stage) => {
        expect(stage.count).toBe(0);
      });
    }
  });

  it("pipelineFunnel stages each carry a Czech label", async () => {
    const context = makeEmptySupabase();
    const result = await generateReportTool(input, context);

    expect(result.success).toBe(true);
    if (result.success) {
      const expectedLabels = ["Nový", "Kontaktován", "Prohlídka", "Nabídka"];
      result.data.pipelineFunnel!.forEach((stage) => {
        expect(expectedLabels).toContain(stage.label);
      });
    }
  });

  it("returns success: false when supabase throws", async () => {
    const errorContext = makeErrorSupabase();
    const result = await generateReportTool(input, errorContext);

    expect(result.success).toBe(false);
  });
});
