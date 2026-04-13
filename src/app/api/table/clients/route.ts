import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClients } from "@/lib/data/clients";
import type { LeadSource } from "@/lib/data/clients";

export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášený uživatel." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)));

  const source = (searchParams.get("source") ?? "all") as LeadSource | "all";
  const search = searchParams.get("search") ?? undefined;

  const result = await getClients(supabase, {
    search,
    source,
    offset,
    limit,
  });

  return NextResponse.json(result);
}
