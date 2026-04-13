import { createClient } from "@/lib/supabase/server";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface GoogleUserInfo {
  email: string;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (errorParam) {
    return Response.redirect(`${appUrl}/settings?google=error&reason=${errorParam}`);
  }

  if (!code || !state) {
    return Response.redirect(`${appUrl}/settings?google=error&reason=missing_params`);
  }

  // Decode user ID from state
  let userId: string;
  try {
    userId = Buffer.from(state, "base64url").toString("utf-8");
  } catch {
    return Response.redirect(`${appUrl}/settings?google=error&reason=invalid_state`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI!;

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return Response.redirect(`${appUrl}/settings?google=error&reason=token_exchange`);
  }

  const tokens: GoogleTokenResponse = await tokenRes.json();

  // Fetch user's Google email
  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  let googleEmail: string | null = null;
  if (userInfoRes.ok) {
    const userInfo: GoogleUserInfo = await userInfoRes.json();
    googleEmail = userInfo.email;
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  // Save tokens to profile
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token ?? null,
      google_token_expiry: expiresAt,
      google_email: googleEmail,
    })
    .eq("id", userId);

  if (error) {
    return Response.redirect(`${appUrl}/settings?google=error&reason=db_save`);
  }

  return Response.redirect(`${appUrl}/settings?google=connected&email=${encodeURIComponent(googleEmail ?? "")}`);
}
