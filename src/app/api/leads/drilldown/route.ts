import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getLeadPipelineByCreatedRange,
  getLeadPipelineByIds,
} from "@/lib/data/clients";
import { normalizeUuid } from "@/lib/validation/uuid";

const BodySchema = z.object({
  /** Model často doplní neplatné řetězce — filtrujeme přes normalizeUuid. */
  lead_ids: z.array(z.string()).max(500).optional(),
  period_from: z.string().optional(),
  period_to: z.string().optional(),
});

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

  const { lead_ids: rawLeadIds, period_from, period_to } = parsed.data;

  const normalizedLeadIds = [...new Set((rawLeadIds ?? []).map(normalizeUuid))]
    .filter((id): id is string => id !== null)
    .slice(0, 500);

  try {
    let leads;
    if (normalizedLeadIds.length > 0) {
      leads = await getLeadPipelineByIds(supabase, normalizedLeadIds);
    } else if (period_from && period_to) {
      leads = await getLeadPipelineByCreatedRange(
        supabase,
        period_from,
        period_to
      );
    } else {
      return NextResponse.json(
        {
          error:
            "Chybí platné UUID leadů nebo rozmezí period_from a period_to. Zeptejte se znovu; graf by měl obsahovat buď skutečná ID z databáze, nebo období měsíce.",
        },
        { status: 400 }
      );
    }

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
