import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  id: z.string().uuid(),
  enabled: z.boolean(),
});

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  const { id, enabled } = parsed.data;

  // Verify ownership
  const { data: job } = await supabase
    .from("monitoring_jobs")
    .select("created_by")
    .eq("id", id)
    .single();

  if (!job || job.created_by !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("monitoring_jobs")
    .update({ enabled })
    .eq("id", id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
}
