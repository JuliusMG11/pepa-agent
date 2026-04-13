import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  listTodaysPrimaryCalendarEvents,
  type GoogleCalendarEventBrief,
} from "@/lib/google/calendar";
import {
  matchClientFromTitle,
  matchPropertyFromTitle,
} from "@/lib/calendar/match-entities";

export interface PipelineCalendarEvent extends GoogleCalendarEventBrief {
  matchedClientId: string | null;
  matchedClientName: string | null;
  matchedClientEmail: string | null;
  matchedClientPhone: string | null;
  matchedPropertyId: string | null;
  matchedPropertyTitle: string | null;
}

export async function getTodayCalendarPipelineForUser(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<
  | {
      connected: false;
      reason: "no_tokens" | "error";
      message?: string;
      events: never[];
    }
  | { connected: true; events: PipelineCalendarEvent[] }
> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "google_access_token, google_refresh_token, google_token_expiry, google_email"
    )
    .eq("id", userId)
    .single();

  if (profileError || !profile?.google_access_token || !profile.google_refresh_token) {
    return { connected: false, reason: "no_tokens", events: [] };
  }

  const tokenExpiresAt = profile.google_token_expiry
    ? new Date(profile.google_token_expiry)
    : new Date(0);

  let briefs: GoogleCalendarEventBrief[];
  try {
    briefs = await listTodaysPrimaryCalendarEvents({
      accessToken: profile.google_access_token,
      refreshToken: profile.google_refresh_token,
      tokenExpiresAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Kalendář se nepodařilo načíst.";
    return { connected: false, reason: "error", message, events: [] };
  }

  const [{ data: clientRows }, { data: propertyRows }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, full_name, email, phone")
      .is("deleted_at", null)
      .eq("assigned_agent_id", userId),
    supabase
      .from("properties")
      .select("id, title, address")
      .is("deleted_at", null)
      .eq("agent_id", userId),
  ]);

  const clients = (clientRows ?? []) as {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  }[];
  const properties = (propertyRows ?? []) as {
    id: string;
    title: string;
    address: string;
  }[];

  const events: PipelineCalendarEvent[] = briefs.map((ev) => {
    const clientMatch = matchClientFromTitle(
      ev.summary,
      clients.map((c) => ({ id: c.id, full_name: c.full_name }))
    );
    const propertyMatch = matchPropertyFromTitle(ev.summary, properties);
    const clientRow = clientMatch
      ? clients.find((c) => c.id === clientMatch.id)
      : undefined;

    return {
      ...ev,
      matchedClientId: clientMatch?.id ?? null,
      matchedClientName: clientMatch?.full_name ?? null,
      matchedClientEmail: clientRow?.email ?? null,
      matchedClientPhone: clientRow?.phone ?? null,
      matchedPropertyId: propertyMatch?.id ?? null,
      matchedPropertyTitle: propertyMatch?.title ?? null,
    };
  });

  return { connected: true, events };
}
