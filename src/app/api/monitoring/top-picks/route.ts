import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchMarketListingCandidatesForTopPicks } from "@/lib/data/dashboard";
import { selectTopBuyListingsWithAI } from "@/lib/ai/top-buy-picks";
import { sendMessage } from "@/lib/telegram/client";
import type { TopBuyPickRow } from "@/lib/ai/top-buy-picks";

function formatCzk(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mil. Kč`;
  return `${n.toLocaleString("cs-CZ")} Kč`;
}

function formatTopPicksMessage(items: TopBuyPickRow[]): string {
  const lines: string[] = ["🏆 *Top 5 nemovitostí dnes*\n"];
  for (const item of items) {
    const area = item.area_m2 ? `, ${item.area_m2} m²` : "";
    const source = item.source === "sreality" ? "Sreality" : "Bezrealitky";
    lines.push(
      `${item.rank}. *${item.title}*${area} — ${item.district}\n` +
      `   💰 ${formatCzk(item.price)} · ${source}\n` +
      `   ✨ ${item.reason}\n` +
      `   → ${item.url}`
    );
  }
  return lines.join("\n\n");
}

export async function POST(request: Request): Promise<Response> {
  // Auth: Bearer token must equal SUPABASE_SERVICE_ROLE_KEY
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token || token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Resolve owner chat ID from TELEGRAM_ALLOWED_USER_IDS
  const rawIds = process.env.TELEGRAM_ALLOWED_USER_IDS ?? "";
  const ownerChatId = Number(rawIds.split(",")[0]?.trim());
  if (!ownerChatId || !Number.isFinite(ownerChatId)) {
    return NextResponse.json(
      { success: false, skipped: true, reason: "No valid TELEGRAM_ALLOWED_USER_IDS." },
      { status: 200 }
    );
  }

  try {
    const supabase = await createServiceClient();
    const candidates = await fetchMarketListingCandidatesForTopPicks(supabase);
    const result = await selectTopBuyListingsWithAI(candidates);

    if ("error" in result) {
      return NextResponse.json(
        { success: false, skipped: true, reason: result.error },
        { status: 200 }
      );
    }

    const message = formatTopPicksMessage(result.snapshot.items);
    await sendMessage(ownerChatId, message, "Markdown");

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json(
      { success: false, skipped: true, reason: msg },
      { status: 200 }
    );
  }
}
