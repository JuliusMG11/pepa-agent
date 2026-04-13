import { z } from "zod";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude/client";

export interface ListingCandidate {
  id: string;
  title: string;
  district: string;
  price: number | null;
  area_m2: number | null;
  source: string;
  url: string;
  last_seen_at: string;
}

export interface TopBuyPickRow {
  rank: number;
  listing_id: string;
  title: string;
  district: string;
  price: number | null;
  area_m2: number | null;
  source: string;
  url: string;
  reason: string;
}

export interface TopBuySnapshotPayload {
  version: 1;
  generated_at: string;
  items: TopBuyPickRow[];
}

const AiItemSchema = z.object({
  listing_id: z.string().uuid(),
  rank: z.number().int().min(1).max(5),
  short_reason_cs: z.string().max(500),
});

const AiResponseSchema = z.object({
  items: z.array(AiItemSchema).min(1).max(5),
});

function extractJsonObject(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence?.[1]?.trim() ?? text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("V odpovědi modelu chybí JSON.");
  }
  return JSON.parse(raw.slice(start, end + 1)) as unknown;
}

export async function selectTopBuyListingsWithAI(
  candidates: ListingCandidate[]
): Promise<{ snapshot: TopBuySnapshotPayload } | { error: string }> {
  if (candidates.length < 3) {
    return {
      error:
        "V monitoringu je málo inzerátů (byty). Spusťte monitoring trhu a zkuste to znovu.",
    };
  }

  const byId = new Map(candidates.map((c) => [c.id, c]));
  const compact = candidates.slice(0, 60).map((c) => ({
    id: c.id,
    title: c.title,
    district: c.district,
    price_czk: c.price,
    area_m2: c.area_m2,
    source: c.source,
  }));

  const userPayload = JSON.stringify(compact, null, 0);

  const res = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Jsi analytik pražského realitního trhu. Z následujícího seznamu inzerátů z monitoringu (Sreality, Bezrealitky) vyber přesně 5 nejlepších nabídek na KOUPIT jako investici nebo bydlení — zohledni poměr cena/plocha, lokalitu v Praze a dostupná data.

Vrať POUZE platný JSON (žádný markdown kolem), přesně v tomto tvaru:
{"items":[{"listing_id":"<uuid z dat>","rank":1,"short_reason_cs":"1 věta česky proč"}]}

Pravidla:
- listing_id musí být přesně jedno z id v datech.
- rank 1 = nejlepší, až 5.
- Bez duplicitních listing_id.
- short_reason_cs max 200 znaků, česky.

DATA:
${userPayload}`,
      },
    ],
  });

  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { error: "Model nevrátil textovou odpověď." };
  }

  let parsed: unknown;
  try {
    parsed = extractJsonObject(textBlock.text);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Neplatný JSON.";
    return { error: msg };
  }

  const check = AiResponseSchema.safeParse(parsed);
  if (!check.success) {
    return { error: "Model vrátil neočekávaný formát. Zkuste obnovit znovu." };
  }

  const items: TopBuyPickRow[] = [];
  const seen = new Set<string>();

  const sorted = [...check.data.items].sort((a, b) => a.rank - b.rank);

  for (const row of sorted) {
    if (seen.has(row.listing_id)) continue;
    const listing = byId.get(row.listing_id);
    if (!listing) continue;
    seen.add(row.listing_id);
    items.push({
      rank: items.length + 1,
      listing_id: listing.id,
      title: listing.title,
      district: listing.district,
      price: listing.price,
      area_m2: listing.area_m2,
      source: listing.source,
      url: listing.url,
      reason: row.short_reason_cs.trim(),
    });
    if (items.length >= 5) break;
  }

  if (items.length === 0) {
    return { error: "Nepodařilo se sestavit žebříček — zkuste obnovit znovu." };
  }

  const snapshot: TopBuySnapshotPayload = {
    version: 1,
    generated_at: new Date().toISOString(),
    items,
  };

  return { snapshot };
}
