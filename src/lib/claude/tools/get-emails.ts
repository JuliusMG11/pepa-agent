import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Result } from "@/types/app";
import { listGmailMessages, type GmailMessage } from "@/lib/google/gmail";

export interface GetEmailsInput {
  max_results?: number;
  unread_only?: boolean;
  query?: string;
}

export interface EmailListResult {
  messages: GmailMessage[];
  totalShown: number;
  hasMore: boolean;
}

export async function getEmailsTool(
  input: GetEmailsInput,
  context: { userId: string; supabase: SupabaseClient<Database> }
): Promise<Result<EmailListResult>> {
  const { supabase, userId } = context;

  const { data: profile } = await supabase
    .from("profiles")
    .select("google_access_token, google_refresh_token, google_token_expiry")
    .eq("id", userId)
    .single();

  if (!profile?.google_access_token && !profile?.google_refresh_token) {
    return {
      success: false,
      error: new Error(
        "Google účet není propojen vůbec. Jdi do Nastavení → Propojit s Google."
      ),
    };
  }

  if (!profile?.google_refresh_token) {
    return {
      success: false,
      error: new Error(
        "Chybí refresh token — znovu propoj Google účet v Nastavení (klikni Znovu propojit a potvrď všechna oprávnění)."
      ),
    };
  }

  if (!profile?.google_access_token) {
    return {
      success: false,
      error: new Error(
        "Chybí access token — znovu propoj Google účet v Nastavení."
      ),
    };
  }

  const tokenExpiresAt = profile.google_token_expiry
    ? new Date(profile.google_token_expiry)
    : new Date(0);

  const labelIds = input.unread_only ? ["INBOX", "UNREAD"] : ["INBOX"];
  const maxResults = Math.min(input.max_results ?? 10, 20);

  try {
    const messages = await listGmailMessages({
      accessToken: profile.google_access_token,
      refreshToken: profile.google_refresh_token,
      tokenExpiresAt,
      maxResults,
      labelIds,
      query: input.query,
    });

    return {
      success: true,
      data: {
        messages,
        totalShown: messages.length,
        hasMore: messages.length === maxResults,
      },
    };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}
