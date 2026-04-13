"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createPrimaryCalendarEvent } from "@/lib/google/calendar";
import { normalizeUuid } from "@/lib/validation/uuid";

export async function updateLeadStatus(
  leadId: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ status: status as never, updated_at: new Date().toISOString() })
    .eq("id", leadId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/leads");
  return { success: true };
}

const LEAD_STATUS = [
  "new",
  "contacted",
  "viewing_scheduled",
  "offer_made",
  "closed_won",
  "closed_lost",
] as const;

const LEAD_SOURCE = [
  "referral",
  "sreality",
  "bezrealitky",
  "reality_cz",
  "direct",
  "social",
  "event",
  "other",
] as const;

const LeadFormSchema = z.object({
  client_id: z
    .string()
    .transform((raw) => normalizeUuid(raw))
    .refine((v): v is string => v !== null, { message: "Vyberte klienta" }),
  property_id: z.preprocess((v) => {
    if (v === "" || v === null || v === undefined) return null;
    return normalizeUuid(v);
  }, z.union([z.null(), z.string().uuid({ error: "Neplatné ID nemovitosti" })])),
  status: z.enum(LEAD_STATUS).default("new"),
  source: z.enum(LEAD_SOURCE).nullable().optional(),
});

export type CreateLeadResult =
  | { success: true; id: string }
  | { success: false; error: string };

function parseLeadForm(formData: FormData) {
  const rawPid = formData.get("property_id");
  const property_id =
    rawPid === "" || rawPid === null || rawPid === undefined
      ? null
      : String(rawPid).trim();

  const rawCid = formData.get("client_id");
  const client_id =
    rawCid === null || rawCid === undefined ? "" : String(rawCid).trim();

  const rawSource = formData.get("source");
  const source =
    rawSource === "" || rawSource === null || rawSource === undefined
      ? null
      : String(rawSource);

  return LeadFormSchema.safeParse({
    client_id,
    property_id,
    status: (formData.get("status") as string) || "new",
    source,
  });
}

export async function createLead(formData: FormData): Promise<CreateLeadResult> {
  const parsed = parseLeadForm(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nejste přihlášeni." };

  const { data, error } = await supabase
    .from("leads")
    .insert({
      ...parsed.data,
      assigned_agent_id: user.id,
      first_contact_at: new Date().toISOString(),
      last_contact_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, error: error?.message ?? "Neznámá chyba" };
  }

  revalidatePath("/leads");
  return { success: true, id: data.id };
}

export async function updateLead(
  leadId: string,
  formData: FormData
): Promise<CreateLeadResult> {
  const parsed = parseLeadForm(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/leads");
  return { success: true, id: leadId };
}

export async function deleteLead(leadId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("id", leadId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/leads");
  return { success: true };
}

const SCHEDULE_KIND = z.enum([
  "viewing",
  "meeting",
  "call",
  "note",
  "task",
]);

const ScheduleActivitySchema = z.object({
  leadId: z
    .preprocess(
      (v) => (v === null || v === undefined ? "" : String(v).trim()),
      z
        .string()
        .transform((raw) => normalizeUuid(raw))
        .refine((v): v is string => v !== null, { message: "Neplatné ID leadu" })
    ),
  kind: SCHEDULE_KIND,
  title: z.string().trim().min(1, "Vyplňte název"),
  notes: z.preprocess(
    (v) =>
      v === "" || v === null || v === undefined ? undefined : String(v).trim() || undefined,
    z.string().optional()
  ),
  scheduledAt: z
    .string()
    .min(1, "Vyberte datum a čas")
    .refine((s) => !Number.isNaN(Date.parse(s)), {
      message: "Neplatné datum nebo čas",
    }),
  durationMinutes: z.coerce.number().int().min(15).max(720),
});

export type ScheduleActivityResult =
  | { success: true; activityId: string; calendarSynced: boolean; calendarMessage?: string }
  | { success: false; error: string };

/**
 * Vytvoří aktivitu u klienta z leadu a pokusí se ji zapsat do Google Kalendáře.
 */
export async function scheduleActivityForLead(
  input: z.infer<typeof ScheduleActivitySchema>
): Promise<ScheduleActivityResult> {
  const parsed = ScheduleActivitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nejste přihlášeni." };

  const { leadId, kind, title, notes, scheduledAt, durationMinutes } = parsed.data;
  const start = new Date(scheduledAt);
  if (Number.isNaN(start.getTime())) {
    return { success: false, error: "Neplatné datum." };
  }
  const end = new Date(start.getTime() + durationMinutes * 60_000);

  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id, client_id, assigned_agent_id")
    .eq("id", leadId)
    .single();

  if (leadErr || !lead) {
    return { success: false, error: "Lead nebyl nalezen." };
  }
  if (lead.assigned_agent_id !== user.id) {
    return { success: false, error: "K tomuto leadu nemáte přístup." };
  }

  const { data: client } = await supabase
    .from("clients")
    .select("full_name")
    .eq("id", lead.client_id)
    .single();

  const activityTitle =
    title.trim() ||
    `${kind === "viewing" ? "Prohlídka" : kind === "meeting" ? "Schůzka" : "Aktivita"} — ${client?.full_name ?? "klient"}`;

  const { data: inserted, error: insErr } = await supabase
    .from("activities")
    .insert({
      type: kind,
      title: activityTitle,
      description: notes?.trim() || null,
      related_to_type: "client",
      related_to_id: lead.client_id,
      performed_by: user.id,
      scheduled_at: start.toISOString(),
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    return { success: false, error: insErr?.message ?? "Aktivitu se nepodařilo uložit." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("google_access_token, google_refresh_token, google_token_expiry, full_name")
    .eq("id", user.id)
    .single();

  let calendarSynced = false;
  let calendarMessage: string | undefined;

  if (
    profile?.google_access_token &&
    profile.google_refresh_token
  ) {
    const tokenExpiresAt = profile.google_token_expiry
      ? new Date(profile.google_token_expiry)
      : new Date(0);

    try {
      const cal = await createPrimaryCalendarEvent({
        accessToken: profile.google_access_token,
        refreshToken: profile.google_refresh_token,
        tokenExpiresAt,
        summary: `[Pepa] ${activityTitle}`,
        description: [notes, client?.full_name ? `Klient: ${client.full_name}` : ""]
          .filter(Boolean)
          .join("\n\n"),
        start,
        end,
      });

      calendarSynced = true;
      await supabase
        .from("activities")
        .update({ google_calendar_event_id: cal.id })
        .eq("id", inserted.id);
    } catch (e) {
      calendarMessage =
        e instanceof Error ? e.message : "Kalendář se nepodařilo aktualizovat.";
    }
  } else {
    calendarMessage =
      "Google Kalendář není propojený — aktivita je jen v systému. Propojte účet v Nastavení.";
  }

  revalidatePath("/leads");
  revalidatePath(`/clients/${lead.client_id}`);

  return {
    success: true,
    activityId: inserted.id,
    calendarSynced,
    calendarMessage,
  };
}
