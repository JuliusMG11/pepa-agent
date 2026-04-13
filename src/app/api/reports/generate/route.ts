import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  generateReport,
  buildWeeklyPeriod,
  buildCustomPeriod,
} from "@/lib/reports/generator";
import { buildDashboardReportPdfBuffer } from "@/lib/reports/dashboard-report-pdf";
import { generateReportPdfNarrative } from "@/lib/reports/report-ai-narrative";
import type { ReportData, ReportPeriod } from "@/types/reports";

const RequestSchema = z.object({
  periodType: z.enum(["weekly", "monthly", "custom"]),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

function buildMonthlyPeriod(): ReportPeriod {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const label = from.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });
  return { from, to, label };
}

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { periodType, dateFrom, dateTo } = parsed.data;

  let period: ReportPeriod;
  if (periodType === "weekly") period = buildWeeklyPeriod();
  else if (periodType === "monthly") period = buildMonthlyPeriod();
  else {
    if (!dateFrom || !dateTo) {
      return Response.json({ error: "dateFrom and dateTo required for custom period" }, { status: 400 });
    }
    period = buildCustomPeriod(new Date(dateFrom), new Date(dateTo));
  }

  const reportData = await generateReport(supabase, period);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const authorName =
    (typeof profile?.full_name === "string" && profile.full_name.trim()) ||
    user.email ||
    "Uživatel";

  const title = `Report ${period.label}`;
  const narrative = await generateReportPdfNarrative(reportData, {
    authorName,
    companyLine: "Pepa · Back Office",
  });
  const pdfBuffer = await buildDashboardReportPdfBuffer(title, reportData, {
    authorName,
    companyLine: "Pepa · Back Office",
    narrative,
  });

  const reportId = crypto.randomUUID();
  const storagePath = `${user.id}/${reportId}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("reports")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    return Response.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
  }

  const { data: urlData } = await supabase.storage
    .from("reports")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  const { data: reportRow, error: dbError } = await supabase
    .from("reports")
    .insert({
      id: reportId,
      title,
      type: periodType === "custom" ? "custom" : periodType === "monthly" ? "monthly" : "weekly",
      period_start: period.from.toISOString(),
      period_end: period.to.toISOString(),
      generated_by: user.id,
      storage_path: storagePath,
      format: "pdf",
    })
    .select()
    .single();

  if (dbError) {
    return Response.json({ error: `DB insert failed: ${dbError.message}` }, { status: 500 });
  }

  return Response.json({
    report: reportRow,
    reportData,
    pdfUrl: urlData?.signedUrl ?? null,
  });
}
