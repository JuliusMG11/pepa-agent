import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Result } from "@/types/app";
import { getFreeSlots } from "@/lib/google/calendar";

export interface GetCalendarAvailabilityInput {
  days_ahead?: number;
  slot_duration_minutes?: number;
  working_hours_start?: string;
  working_hours_end?: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  formatted: string;
}

export interface CalendarAvailabilityResult {
  slots: TimeSlot[];
  connected: boolean;
  message?: string;
}

export async function getCalendarAvailabilityTool(
  input: GetCalendarAvailabilityInput,
  context: { userId: string; supabase: SupabaseClient<Database> }
): Promise<Result<CalendarAvailabilityResult>> {
  const {
    days_ahead = 7,
    slot_duration_minutes = 60,
    working_hours_start = "09:00",
    working_hours_end = "18:00",
  } = input;

  try {
    // Load Google OAuth tokens from profile
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("google_access_token, google_refresh_token, google_token_expiry")
      .eq("id", context.userId)
      .single();

    if (profileError || !profile) {
      return {
        success: true,
        data: {
          slots: [],
          connected: false,
          message:
            "Google Kalendář není propojen. Propoj ho v Nastavení → Integrace.",
        },
      };
    }

    const { google_access_token, google_refresh_token, google_token_expiry } =
      profile;

    if (!google_access_token || !google_refresh_token) {
      return {
        success: true,
        data: {
          slots: [],
          connected: false,
          message:
            "Google Kalendář není propojen. Propoj ho v Nastavení → Integrace.",
        },
      };
    }

    const slots = await getFreeSlots({
      accessToken: google_access_token,
      refreshToken: google_refresh_token,
      tokenExpiresAt: google_token_expiry
        ? new Date(google_token_expiry)
        : new Date(0),
      daysAhead: Math.min(days_ahead, 30),
      slotDurationMinutes: slot_duration_minutes,
      workStart: working_hours_start,
      workEnd: working_hours_end,
    });

    return {
      success: true,
      data: { slots, connected: true },
    };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}
