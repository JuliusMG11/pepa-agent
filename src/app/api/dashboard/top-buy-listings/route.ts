import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchMarketListingCandidatesForTopPicks } from "@/lib/data/dashboard";
import { selectTopBuyListingsWithAI } from "@/lib/ai/top-buy-picks";
import type { Json } from "@/types/database";

const KEY = "top_buy_listings";

export async function POST(): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášený uživatel." }, { status: 401 });
  }

  const candidates = await fetchMarketListingCandidatesForTopPicks(supabase);
  const result = await selectTopBuyListingsWithAI(candidates);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { snapshot } = result;

  const { error } = await supabase.from("dashboard_snapshots").upsert(
    {
      key: KEY,
      payload: snapshot as unknown as Json,
      updated_at: snapshot.generated_at,
    },
    { onConflict: "key" }
  );

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Uložení selhalo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, snapshot });
}
