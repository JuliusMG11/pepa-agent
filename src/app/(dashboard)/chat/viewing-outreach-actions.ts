"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeUuid } from "@/lib/validation/uuid";
import { getCalendarAvailabilityTool } from "@/lib/claude/tools/get-calendar-availability";
import { draftEmailTool } from "@/lib/claude/tools/draft-email";
import { createPrimaryCalendarEvent } from "@/lib/google/calendar";
import type { EmailDraft } from "@/lib/claude/tools/draft-email";
import type { CalendarAvailabilityResult } from "@/lib/claude/tools/get-calendar-availability";

export type ViewingOutreachClientOpt = {
  id: string;
  full_name: string;
  email: string | null;
};

export type ViewingOutreachPropertyOpt = {
  id: string;
  title: string;
  address: string;
};

export async function loadViewingOutreachOptions(): Promise<
  | {
      success: true;
      data: {
        clients: ViewingOutreachClientOpt[];
        properties: ViewingOutreachPropertyOpt[];
      };
    }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nejste přihlášeni." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let clientsQuery = supabase
    .from("clients")
    .select("id, full_name, email")
    .is("deleted_at", null)
    .order("full_name")
    .limit(500);
  if (profile?.role !== "admin") {
    clientsQuery = clientsQuery.eq("assigned_agent_id", user.id);
  }
  const { data: clients } = await clientsQuery;

  const { data: properties } = await supabase
    .from("v_property_summary")
    .select("id, title, address")
    .eq("agent_id", user.id)
    .order("title")
    .limit(500);

  return {
    success: true,
    data: {
      clients: (clients ?? []) as ViewingOutreachClientOpt[],
      properties: (properties ?? []) as ViewingOutreachPropertyOpt[],
    },
  };
}

export async function fetchViewingOutreachSlots(input?: {
  days_ahead?: number;
  slot_duration_minutes?: number;
}): Promise<
  | { success: true; data: CalendarAvailabilityResult }
  | { success: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nejste přihlášeni." };

  const result = await getCalendarAvailabilityTool(
    {
      days_ahead: input?.days_ahead ?? 14,
      slot_duration_minutes: input?.slot_duration_minutes ?? 60,
    },
    { userId: user.id, supabase }
  );

  if (!result.success) {
    return {
      success: false,
      error:
        result.error instanceof Error
          ? result.error.message
          : "Nepodařilo se načíst kalendář.",
    };
  }
  return { success: true, data: result.data };
}

/** Zod 4 `z.uuid()` je přísné na variantu zápisu — z formuláře normalizujeme přes DB hodnoty. */
const formUuid = z
  .string()
  .trim()
  .min(1, "Vyberte položku ze seznamu")
  .transform((s) => normalizeUuid(s))
  .refine((id): id is string => id !== null, {
    message: "Neplatné ID — zkuste znovu vybrat klienta nebo nemovitost",
  });

const BuildDraftSchema = z.object({
  clientId: formUuid,
  propertyId: formUuid,
  proposed_slots: z.array(z.string()).min(1, "Vyberte aspoň jeden termín"),
});

export async function buildViewingOutreachEmailDraft(
  raw: z.infer<typeof BuildDraftSchema>
): Promise<
  | { success: true; data: EmailDraft }
  | { success: false; error: string }
> {
  const parsed = BuildDraftSchema.safeParse(raw);
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.role === "admin";

  const { data: client } = await supabase
    .from("clients")
    .select("full_name, email, assigned_agent_id")
    .eq("id", parsed.data.clientId)
    .maybeSingle();

  if (!client) return { success: false, error: "Klient nebyl nalezen." };
  if (!isAdmin && client.assigned_agent_id !== user.id) {
    return { success: false, error: "K tomuto klientovi nemáte přístup." };
  }

  const { data: prop } = await supabase
    .from("properties")
    .select("id, agent_id")
    .eq("id", parsed.data.propertyId)
    .maybeSingle();

  if (!prop || prop.agent_id !== user.id) {
    return { success: false, error: "Nemovitost nebyla nalezena nebo k ní nemáte přístup." };
  }

  const draft = await draftEmailTool(
    {
      recipient_name: client.full_name,
      recipient_email: client.email?.trim() || undefined,
      purpose: "viewing_proposal",
      property_id: parsed.data.propertyId,
      proposed_slots: parsed.data.proposed_slots,
    },
    { supabase }
  );

  if (!draft.success) {
    return {
      success: false,
      error:
        draft.error instanceof Error
          ? draft.error.message
          : "Nepodařilo se sestavit e-mail.",
    };
  }
  return { success: true, data: draft.data };
}

const CreateCalSchema = z.object({
  summary: z.string().min(1),
  description: z.string().optional(),
  startIso: z.string().min(1),
  endIso: z.string().min(1),
});

export async function createViewingOutreachCalendarEvent(
  raw: z.infer<typeof CreateCalSchema>
): Promise<
  | { success: true; htmlLink: string | null }
  | { success: false; error: string }
> {
  const parsed = CreateCalSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const start = new Date(parsed.data.startIso);
  const end = new Date(parsed.data.endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { success: false, error: "Neplatný začátek nebo konec události." };
  }
  if (end <= start) {
    return { success: false, error: "Konec musí být po začátku." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nejste přihlášeni." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("google_access_token, google_refresh_token, google_token_expiry")
    .eq("id", user.id)
    .single();

  if (!profile?.google_access_token || !profile.google_refresh_token) {
    return {
      success: false,
      error:
        "Google Kalendář není propojen. Propojte účet v Nastavení → Integrace.",
    };
  }

  try {
    const cal = await createPrimaryCalendarEvent({
      accessToken: profile.google_access_token,
      refreshToken: profile.google_refresh_token,
      tokenExpiresAt: profile.google_token_expiry
        ? new Date(profile.google_token_expiry)
        : new Date(0),
      summary: parsed.data.summary,
      description: parsed.data.description,
      start,
      end,
    });
    return { success: true, htmlLink: cal.htmlLink };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Kalendář se nepodařilo aktualizovat.",
    };
  }
}

export type { TimeSlot, CalendarAvailabilityResult } from "@/lib/claude/tools/get-calendar-availability";
