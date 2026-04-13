import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Result } from "@/types/app";

export interface DraftEmailInput {
  recipient_name: string;
  recipient_email?: string;
  purpose: string;
  property_id?: string;
  proposed_slots?: string[];
  custom_notes?: string;
}

export interface EmailDraft {
  subject: string;
  body: string;
  to: string;
  recipient_name: string;
}

const PURPOSE_SUBJECTS: Record<string, string> = {
  viewing_proposal: "Návrh termínu prohlídky",
  follow_up: "Navazující zpráva",
  contract_send: "Zaslání smlouvy k podpisu",
  market_update: "Aktualizace trhu nemovitostí",
  general: "Zpráva od vašeho realitního makléře",
};

export async function draftEmailTool(
  input: DraftEmailInput,
  context: { supabase: SupabaseClient<Database> }
): Promise<Result<EmailDraft>> {
  const {
    recipient_name,
    recipient_email,
    purpose,
    property_id,
    proposed_slots,
    custom_notes,
  } = input;

  try {
    // Load property details if provided
    let propertyInfo = "";
    if (property_id) {
      const { data: property } = await context.supabase
        .from("properties")
        .select("title, address, price, area_m2, type")
        .eq("id", property_id)
        .single();

      if (property) {
        const priceFormatted = property.price
          ? new Intl.NumberFormat("cs-CZ").format(property.price) + " Kč"
          : "dle dohody";
        propertyInfo = `\nNemovitost: ${property.title}\nAdresa: ${property.address}\nCena: ${priceFormatted}${property.area_m2 ? `\nPlocha: ${property.area_m2} m²` : ""}`;
      }
    }

    // Build slots block
    let slotsBlock = "";
    if (proposed_slots && proposed_slots.length > 0) {
      slotsBlock =
        "\n\nNabízím vám tyto termíny prohlídky:\n" +
        proposed_slots.map((s, i) => `${i + 1}. ${s}`).join("\n") +
        "\n\nProsím o potvrzení vyhovujícího termínu.";
    }

    // Build custom notes block
    const notesBlock = custom_notes ? `\n\n${custom_notes}` : "";

    const subject =
      PURPOSE_SUBJECTS[purpose] ?? PURPOSE_SUBJECTS["general"];

    const body = buildEmailBody({
      recipientName: recipient_name,
      purpose,
      propertyInfo,
      slotsBlock,
      notesBlock,
    });

    return {
      success: true,
      data: {
        subject,
        body,
        to: recipient_email ?? "",
        recipient_name,
      },
    };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

function buildEmailBody(params: {
  recipientName: string;
  purpose: string;
  propertyInfo: string;
  slotsBlock: string;
  notesBlock: string;
}): string {
  const { recipientName, purpose, propertyInfo, slotsBlock, notesBlock } =
    params;

  const openings: Record<string, string> = {
    viewing_proposal: `dovolte mi navrhnout termín prohlídky námi nabízené nemovitosti.${propertyInfo}${slotsBlock}`,
    follow_up: `rád/a bych navázal/a na naši předchozí komunikaci a zjistil/a, zda jste se již rozhodli ohledně dalšího postupu.${propertyInfo}${notesBlock}`,
    contract_send: `v příloze naleznete smlouvu k podpisu. Prosím o její pečlivé prostudování a případné dotazy mi neváhejte zaslat.${propertyInfo}${notesBlock}`,
    market_update: `přináším vám aktuální přehled trhu nemovitostí, který by vás mohl zajímat.${propertyInfo}${notesBlock}`,
    general: `obracím se na vás v záležitosti naší spolupráce.${propertyInfo}${notesBlock}`,
  };

  const opening = openings[purpose] ?? openings["general"];

  return `Dobrý den, ${recipientName},

${opening}

V případě jakýchkoli dotazů jsem vám plně k dispozici.

S pozdravem,
Váš realitní poradce
Pepa AI Back Office`.trim();
}
