import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProperties } from "@/lib/data/properties";
import type { PropertyStatus, PropertyType } from "@/lib/data/properties";

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

  const status = (searchParams.get("status") ?? "all") as PropertyStatus | "all";
  const type = (searchParams.get("type") ?? "all") as PropertyType | "all";
  const district = searchParams.get("district") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const missing_data = searchParams.get("missing_data") === "1";

  const result = await getProperties(supabase, {
    status,
    type,
    district: district ?? undefined,
    search: search ?? undefined,
    missing_data,
    offset,
    limit,
  });

  return NextResponse.json(result);
}
