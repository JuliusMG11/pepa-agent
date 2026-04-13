import type { ReportData } from "@/types/reports";
import { buildDashboardReportPdfUint8Array } from "@/lib/reports/dashboard-report-pdf";

/** Klient — stejné PDF jako na serveru (včetně Noto Sans a grafů). */
export async function generatePdf(report: ReportData): Promise<Blob> {
  const title = `Report ${report.period.label}`;
  const u8 = await buildDashboardReportPdfUint8Array(title, report, {});
  return new Blob([u8 as unknown as BlobPart], { type: "application/pdf" });
}
