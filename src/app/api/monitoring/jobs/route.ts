import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { insertMonitoringJob } from "@/lib/monitoring/insert-job";
import { normalizeUuid } from "@/lib/validation/uuid";

const BodySchema = z.object({
  location: z.string().min(1, "Vyberte lokalitu."),
  name: z.string().max(200).optional(),
  price_max: z.number().positive().optional(),
  notify_telegram: z.boolean().optional(),
  notify_email: z.boolean().optional(),
  run_hour: z.number().int().min(0).max(23).optional(),
});

export async function POST(request: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Neplatný JSON." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášený uživatel." }, { status: 401 });
  }

  const result = await insertMonitoringJob(supabase, {
    userId: user.id,
    location: parsed.data.location,
    name: parsed.data.name,
    priceMax: parsed.data.price_max,
    notifyTelegram: parsed.data.notify_telegram,
    notifyEmail: parsed.data.notify_email,
    runHour: parsed.data.run_hour,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({
    id: result.data.id,
    name: result.data.name,
  });
}

const DeleteBodySchema = z.object({
  id: z.string().uuid("Neplatné ID úlohy."),
});

export async function DELETE(request: Request): Promise<Response> {
  let jobId: string;

  const fromQuery = new URL(request.url).searchParams.get("id");
  if (fromQuery) {
    const n = normalizeUuid(fromQuery);
    if (!n) {
      return NextResponse.json({ error: "Neplatné ID úlohy." }, { status: 400 });
    }
    jobId = n;
  } else {
    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Chybí ID úlohy. Použijte ?id=… nebo JSON tělo." },
        { status: 400 }
      );
    }
    const parsed = DeleteBodySchema.safeParse(json);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(", ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const n = normalizeUuid(parsed.data.id);
    if (!n) {
      return NextResponse.json({ error: "Neplatné ID úlohy." }, { status: 400 });
    }
    jobId = n;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášený uživatel." }, { status: 401 });
  }

  const { data: job } = await supabase
    .from("monitoring_jobs")
    .select("id, created_by")
    .eq("id", jobId)
    .single();

  if (!job || job.created_by !== user.id) {
    return NextResponse.json({ error: "Úloha nenalezena." }, { status: 404 });
  }

  const { error } = await supabase.from("monitoring_jobs").delete().eq("id", jobId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

function computeNextRunAt(runHour: number): Date {
  const now = new Date();
  const candidate = new Date(now);
  candidate.setHours(runHour, 0, 0, 0);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
  return candidate;
}

const PatchBodySchema = z.object({
  id: z.string().uuid("Neplatné ID úlohy."),
  run_hour: z
    .number()
    .int()
    .min(0, "Neplatný čas spuštění.")
    .max(23, "Neplatný čas spuštění."),
});

export async function PATCH(request: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Neplatný JSON." }, { status: 400 });
  }

  const parsed = PatchBodySchema.safeParse(json);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nepřihlášený uživatel." }, { status: 401 });
  }

  const { data: job } = await supabase
    .from("monitoring_jobs")
    .select("id, created_by")
    .eq("id", parsed.data.id)
    .single();

  if (!job || job.created_by !== user.id) {
    return NextResponse.json({ error: "Úloha nenalezena." }, { status: 404 });
  }

  const nextRunAt = computeNextRunAt(parsed.data.run_hour);

  const { error } = await supabase
    .from("monitoring_jobs")
    .update({
      run_hour: parsed.data.run_hour,
      next_run_at: nextRunAt.toISOString(),
    })
    .eq("id", parsed.data.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    next_run_at: nextRunAt.toISOString(),
  });
}
