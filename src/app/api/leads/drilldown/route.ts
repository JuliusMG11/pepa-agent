import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getLeadPipelineByCreatedRange,
  getLeadPipelineByIds,
} from "@/lib/data/clients";

const BodySchema = z
  .object({
    lead_ids: z.array(z.string().uuid()).max(500).optional(),
    period_from: z.string().optional(),
    period_to: z.string().optional(),
  })
  .refine(
    (b) =>
      (b.lead_ids && b.lead_ids.length > 0) ||
      (b.period_from && b.period_to),
    { message: "Zadejte lead_ids nebo period_from a period_to." }
  );

export async function POST(request: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Neplatný JSON." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášený uživatel." }, { status: 401 });
  }

  const { lead_ids, period_from, period_to } = parsed.data;

  try {
    const leads =
      lead_ids && lead_ids.length > 0
        ? await getLeadPipelineByIds(supabase, lead_ids)
        : await getLeadPipelineByCreatedRange(
            supabase,
            period_from!,
            period_to!
          );

    return NextResponse.json({
      leads: leads.map((l) => ({
        id: l.id,
        client_name: l.client_name,
        status: l.status,
        source: l.source,
        property_title: l.property_title,
        property_address: l.property_address,
        created_at: l.created_at,
        agent_name: l.agent_name,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Chyba dotazu.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
