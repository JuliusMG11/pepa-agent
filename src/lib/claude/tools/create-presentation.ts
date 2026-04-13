import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Result } from "@/types/app";
import type { ReportData } from "./generate-report";
import { buildAgentReportPdfBuffer } from "@/lib/reports/agent-report-pdf";
import {
  buildFallbackAgentPresentationNarrative,
  generateAgentPresentationNarrative,
} from "@/lib/reports/agent-presentation-narrative";

export interface CreatePresentationInput {
  title: string;
  period_label: string;
  report_data: ReportData;
}

export interface PresentationResult {
  /** Vždy PDF (dříve PPTX) */
  format: "pdf";
  download_url: string;
  expires_at: string;
  filename: string;
}

export async function createPresentationTool(
  input: CreatePresentationInput,
  context: { userId: string; supabase: SupabaseClient<Database> }
): Promise<Result<PresentationResult>> {
  const { title, period_label, report_data } = input;

  try {
    let narrative = await generateAgentPresentationNarrative(report_data);
    if (!narrative) {
      narrative = buildFallbackAgentPresentationNarrative(report_data);
    }

    const buffer = await buildAgentReportPdfBuffer(
      title,
      period_label,
      report_data,
      narrative
    );

    const reportId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const storagePath = `${context.userId}/${reportId}.pdf`;

    const { error: uploadError } = await context.supabase.storage
      .from("reports")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      return { success: false, error: new Error(uploadError.message) };
    }

    const { data: urlData } = await context.supabase.storage
      .from("reports")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

    if (!urlData?.signedUrl) {
      return {
        success: false,
        error: new Error("Failed to create signed download URL"),
      };
    }

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const safeTitle = title.replace(/\s+/g, "_");
    const safePeriod = period_label.replace(/\s+/g, "_");

    return {
      success: true,
      data: {
        format: "pdf",
        download_url: urlData.signedUrl,
        expires_at: expiresAt,
        filename: `${safeTitle}_${safePeriod}.pdf`,
      },
    };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}
