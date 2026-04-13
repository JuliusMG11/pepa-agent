import { describe, it, expect, vi } from "vitest";
import { findDataGapsTool } from "./find-data-gaps";

function makeProperty(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    title: "Byt 2+kk Holešovice",
    address: "Osadní 35, Praha 7",
    district: "Holešovice",
    reconstruction_notes: "Kompletní rekonstrukce 2022",
    permit_data: "Povolení č. 456",
    area_m2: 58,
    floor: 3,
    ...overrides,
  };
}

function makeSupabase(rows: unknown[]) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = chain;
  builder.is = chain;
  builder.eq = chain;
  builder.limit = vi.fn().mockResolvedValue({ data: rows, error: null });
  return { from: vi.fn().mockReturnValue(builder) } as unknown as Parameters<typeof findDataGapsTool>[1]["supabase"];
}

function makeSupabaseError() {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = chain;
  builder.is = chain;
  builder.eq = chain;
  builder.limit = vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } });
  return { from: vi.fn().mockReturnValue(builder) } as unknown as Parameters<typeof findDataGapsTool>[1]["supabase"];
}

describe("findDataGapsTool", () => {
  it("returns empty result when all properties are complete", async () => {
    const supabase = makeSupabase([makeProperty()]);

    const result = await findDataGapsTool({}, { supabase });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.total).toBe(0);
    expect(result.data.properties).toHaveLength(0);
  });

  it("detects missing reconstruction_notes and area_m2", async () => {
    const supabase = makeSupabase([
      makeProperty({ reconstruction_notes: null, area_m2: null }),
    ]);

    const result = await findDataGapsTool(
      { fields: ["reconstruction_notes", "area_m2"] },
      { supabase }
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.total).toBe(1);
    expect(result.data.properties[0].missing_fields).toContain("reconstruction_notes");
    expect(result.data.properties[0].missing_fields).toContain("area_m2");
    expect(result.data.summary["reconstruction_notes"]).toBe(1);
    expect(result.data.summary["area_m2"]).toBe(1);
  });

  it("returns error when no valid fields are specified", async () => {
    const supabase = makeSupabase([]);

    const result = await findDataGapsTool(
      { fields: ["secret_column", "injected_field"] },
      { supabase }
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.message).toContain("No valid fields");
  });

  it("returns error on DB failure", async () => {
    const supabase = makeSupabaseError();

    const result = await findDataGapsTool({}, { supabase });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.message).toContain("DB error");
  });

  it("filters out fields not in whitelist (security)", async () => {
    const supabase = makeSupabase([makeProperty({ permit_data: null })]);

    // Mix of valid + invalid fields — only valid ones should be checked
    const result = await findDataGapsTool(
      { fields: ["permit_data", "service_role_key" as "permit_data"] },
      { supabase }
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    // "service_role_key" should be silently dropped, "permit_data" detected
    expect(result.data.total).toBe(1);
    expect(result.data.properties[0].missing_fields).toContain("permit_data");
    expect(result.data.properties[0].missing_fields).not.toContain("service_role_key");
  });

  it("counts summary correctly for multiple properties", async () => {
    const supabase = makeSupabase([
      makeProperty({ area_m2: null }),
      makeProperty({ area_m2: null, floor: null }),
      makeProperty(), // complete
    ]);

    const result = await findDataGapsTool(
      { fields: ["area_m2", "floor"] },
      { supabase }
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.total).toBe(2);
    expect(result.data.summary["area_m2"]).toBe(2);
    expect(result.data.summary["floor"]).toBe(1);
  });
});
