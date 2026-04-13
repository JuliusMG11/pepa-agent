import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (!path) return Response.json({ error: "Missing path" }, { status: 400 });

  // Ensure user can only access their own files
  if (!path.startsWith(user.id + "/")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase.storage
    .from("reports")
    .createSignedUrl(path, 60 * 60); // 1 hour

  if (error || !data?.signedUrl) {
    return Response.json({ error: error?.message ?? "Failed to create URL" }, { status: 500 });
  }

  return Response.json({ url: data.signedUrl });
}
