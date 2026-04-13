import { createClient } from "@/lib/supabase/server";

export async function POST(): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await supabase
    .from("profiles")
    .update({
      google_access_token: null,
      google_refresh_token: null,
      google_token_expiry: null,
    })
    .eq("id", user.id);

  return Response.json({ success: true });
}
