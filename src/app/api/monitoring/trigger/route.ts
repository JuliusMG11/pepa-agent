import { createClient } from "@/lib/supabase/server";

export async function POST(): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const functionsUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(
    ".supabase.co",
    ".supabase.co/functions/v1"
  );

  if (!functionsUrl) {
    return Response.json({ error: "Supabase URL not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${functionsUrl}/market-monitor`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      let hint = "";
      try {
        const j = JSON.parse(text) as { code?: string };
        if (j.code === "NOT_FOUND" || res.status === 404) {
          hint =
            " Nasadťe Edge Function: v priečinku projektu spustite `supabase functions deploy market-monitor`. Monitoring scrapuje portály (Sreality, Bezrealitky) podľa úloh v DB — nie je to len „AI prehliadanie“ v reálnom čase.";
        }
      } catch {
        /* ignore */
      }
      return Response.json({ error: `Edge Function failed: ${text}.${hint}` }, { status: 502 });
    }

    const json = await res.json();
    return Response.json({ success: true, ...json });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
