import { describe, it, expect } from "vitest";
import { dataQuality } from "./properties";
import type { PropertySummary } from "./properties";

// Minimal factory — only fields relevant to dataQuality
function makeRow(overrides: Partial<PropertySummary> = {}): PropertySummary {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    title: "Byt 2+kk Holešovice",
    address: "Osadní 35, Praha 7",
    district: "Holešovice",
    status: "active",
    type: "apartment",
    price: 8_500_000,
    area_m2: 58,
    floor: 3,
    year_built: 2005,
    last_renovation: 2020,
    reconstruction_notes: "Kompletní rekonstrukce",
    permit_data: "Povolení č. 123",
    agent_id: null,
    agent_name: null,
    cover_image_url: null,
    gallery_urls: null,
    document_urls: null,
    client_id: null,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    deleted_at: null,
    description: null,
    ...overrides,
  } as unknown as PropertySummary;
}

describe("dataQuality", () => {
  it("returns green when all key fields are present", () => {
    const result = dataQuality(makeRow());
    expect(result.level).toBe("green");
    expect(result.missing).toHaveLength(0);
  });

  it("returns amber when 1–3 fields are missing", () => {
    const result = dataQuality(
      makeRow({ area_m2: null, floor: null } as Partial<PropertySummary>)
    );
    expect(result.level).toBe("amber");
    expect(result.missing).toHaveLength(2);
    expect(result.missing).toContain("Plocha (m²)");
    expect(result.missing).toContain("Patro");
  });

  it("returns red when more than 3 fields are missing", () => {
    const result = dataQuality(
      makeRow({
        area_m2: null,
        floor: null,
        year_built: null,
        last_renovation: null,
      } as Partial<PropertySummary>)
    );
    expect(result.level).toBe("red");
    expect(result.missing.length).toBeGreaterThan(3);
  });

  it("includes all 6 key field labels when all are null", () => {
    const result = dataQuality(
      makeRow({
        area_m2: null,
        floor: null,
        year_built: null,
        last_renovation: null,
        reconstruction_notes: null,
        permit_data: null,
      } as Partial<PropertySummary>)
    );
    expect(result.missing).toHaveLength(6);
    expect(result.level).toBe("red");
  });

  it("treats undefined as missing (null coalescing)", () => {
    const result = dataQuality(
      makeRow({ reconstruction_notes: undefined } as Partial<PropertySummary>)
    );
    expect(result.missing).toContain("Poznámky k rekonstrukci");
  });
});
