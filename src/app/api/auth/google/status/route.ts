import { createClient } from "@/lib/supabase/server";

/** Debug endpoint — returns what Google tokens are stored for the current user. */
export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("google_access_token, google_refresh_token, google_token_expiry, google_email")
    .eq("id", user.id)
    .single();

  return Response.json({
    has_access_token: !!profile?.google_access_token,
    has_refresh_token: !!profile?.google_refresh_token,
    token_expiry: profile?.google_token_expiry ?? null,
    token_expired: profile?.google_token_expiry
      ? new Date(profile.google_token_expiry) < new Date()
      : null,
    google_email: profile?.google_email ?? null,
  });
}
