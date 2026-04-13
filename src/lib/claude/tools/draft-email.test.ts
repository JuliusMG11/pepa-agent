import { describe, it, expect, vi } from "vitest";
import { draftEmailTool } from "./draft-email";

function makeSupabase(propertyData: Record<string, unknown> | null = null) {
  const singleResult = { data: propertyData, error: null };
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = chain;
  builder.eq = chain;
  builder.single = vi.fn().mockResolvedValue(singleResult);
  return { from: vi.fn().mockReturnValue(builder) } as unknown as Parameters<typeof draftEmailTool>[1]["supabase"];
}

describe("draftEmailTool", () => {
  it("generates email with correct subject for viewing_proposal", async () => {
    const supabase = makeSupabase();

    const result = await draftEmailTool(
      {
        recipient_name: "Jan Novák",
        recipient_email: "jan@example.com",
        purpose: "viewing_proposal",
        proposed_slots: ["Pondělí 14.4. v 10:00", "Úterý 15.4. v 14:00"],
      },
      { supabase }
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.subject).toBe("Návrh termínu prohlídky");
    expect(result.data.to).toBe("jan@example.com");
    expect(result.data.recipient_name).toBe("Jan Novák");
    expect(result.data.body).toContain("Jan Novák");
    expect(result.data.body).toContain("Pondělí 14.4. v 10:00");
    expect(result.data.body).toContain("Úterý 15.4. v 14:00");
  });

  it("includes property info in body when property_id provided and property exists", async () => {
    const supabase = makeSupabase({
      title: "Byt 3+kk Vinohrady",
      address: "Mánesova 12, Praha 2",
      price: 12_000_000,
      area_m2: 85,
      type: "apartment",
    });

    const result = await draftEmailTool(
      {
        recipient_name: "Marie Dvořák",
        purpose: "follow_up",
        property_id: "00000000-0000-0000-0000-000000000001",
      },
      { supabase }
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.body).toContain("Byt 3+kk Vinohrady");
    expect(result.data.body).toContain("Mánesova 12");
    // Czech locale uses narrow no-break space as thousands separator
    expect(result.data.body).toMatch(/12[\s\u202f]000[\s\u202f]000 Kč/);
  });

  it("uses fallback subject for unknown purpose", async () => {
    const supabase = makeSupabase();

    const result = await draftEmailTool(
      { recipient_name: "Petr Svoboda", purpose: "unknown_purpose" },
      { supabase }
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.subject).toBe("Zpráva od vašeho realitního makléře");
  });

  it("sets to to empty string when recipient_email is omitted", async () => {
    const supabase = makeSupabase();

    const result = await draftEmailTool(
      { recipient_name: "Eva Procházka", purpose: "general" },
      { supabase }
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.to).toBe("");
  });

  it("body includes Czech greeting and signature", async () => {
    const supabase = makeSupabase();

    const result = await draftEmailTool(
      { recipient_name: "Tomáš Kratochvíl", purpose: "general" },
      { supabase }
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.body).toContain("Dobrý den");
    expect(result.data.body).toContain("S pozdravem");
    expect(result.data.body).toContain("Pepa AI Back Office");
  });
});
