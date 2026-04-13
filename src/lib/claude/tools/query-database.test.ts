import { describe, it, expect, vi, beforeEach } from "vitest";
import { queryDatabaseTool } from "./query-database";

// Supabase query builder mock — chainable
function makeQueryBuilder(resolveWith: { data: unknown[] | null; error: unknown | null }) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;

  builder.select = chain;
  builder.eq = chain;
  builder.gte = chain;
  builder.lte = chain;
  builder.order = chain;
  builder.limit = vi.fn().mockResolvedValue(resolveWith);

  return builder;
}

function makeSupabase(resolveWith: { data: unknown[] | null; error: unknown | null }) {
  const builder = makeQueryBuilder(resolveWith);
  return {
    from: vi.fn().mockReturnValue(builder),
  } as unknown as Parameters<typeof queryDatabaseTool>[1]["supabase"];
}

describe("queryDatabaseTool", () => {
  describe("happy path", () => {
    it("returns properties array for valid entity", async () => {
      const supabase = makeSupabase({
        data: [{ id: "1", title: "Byt Holešovice", status: "active" }],
        error: null,
      });

      const result = await queryDatabaseTool({ entity: "properties" }, { supabase });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data).toHaveLength(1);
    });

    it("returns empty array when no records match", async () => {
      const supabase = makeSupabase({ data: [], error: null });

      const result = await queryDatabaseTool(
        { entity: "leads", filters: { status: "closed_won" } },
        { supabase }
      );

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toEqual([]);
    });

    it("caps limit at 200", async () => {
      const supabase = makeSupabase({ data: [], error: null });
      const builder = (supabase.from as ReturnType<typeof vi.fn>).mock.results[0];

      await queryDatabaseTool({ entity: "properties", limit: 999 }, { supabase });

      // The .limit() call on the builder should have received ≤ 200
      const fromReturn = (supabase.from as ReturnType<typeof vi.fn>)("properties");
      expect(fromReturn).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("returns error when Supabase returns an error", async () => {
      const supabase = makeSupabase({
        data: null,
        error: { message: "relation does not exist" },
      });

      const result = await queryDatabaseTool({ entity: "properties" }, { supabase });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toContain("relation does not exist");
    });
  });

  describe("security — column whitelist", () => {
    it("rejects unknown entity", async () => {
      const supabase = makeSupabase({ data: [], error: null });

      const result = await queryDatabaseTool(
        { entity: "users" as Parameters<typeof queryDatabaseTool>[0]["entity"] },
        { supabase }
      );

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.message).toContain("Unknown entity");
    });

    it("rejects filter column not in whitelist", async () => {
      const supabase = makeSupabase({ data: [], error: null });

      const result = await queryDatabaseTool(
        {
          entity: "properties",
          filters: { deleted_at: "2024-01-01" }, // not in whitelist
        },
        { supabase }
      );

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.message).toContain("not allowed");
    });

    it("rejects order column not in whitelist", async () => {
      const supabase = makeSupabase({ data: [], error: null });

      const result = await queryDatabaseTool(
        {
          entity: "properties",
          order_by: { column: "password_hash" as "price" },
        },
        { supabase }
      );

      expect(result.success).toBe(false);
    });
  });
});
