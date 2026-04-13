import type { jsPDF } from "jspdf";
import { applyPdfFont } from "@/lib/reports/pdf-font";

type PdfDoc = InstanceType<typeof jsPDF>;

/**
 * Horizontální pruhový graf (štítky vlevo, šedé pozadí, barevný pruh).
 * Vrací Y pod poslední řádkou.
 */
export function drawHorizontalBarChart(
  doc: PdfDoc,
  x: number,
  y: number,
  chartW: number,
  rows: { label: string; value: number }[],
  color: string,
  fontFam: string | null
): number {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const rowH = 8;
  let yy = y;
  applyPdfFont(doc, fontFam, false);
  for (const row of rows.slice(0, 12)) {
    const label = row.label.length > 36 ? `${row.label.slice(0, 34)}…` : row.label;
    doc.setTextColor("#2b2b33");
    doc.setFontSize(8);
    doc.text(label, x, yy + 5);
    const innerW = chartW - 42;
    const barW = (row.value / max) * innerW;
    doc.setFillColor("#ece9f2");
    doc.rect(x + 36, yy, innerW, 5, "F");
    doc.setFillColor(color);
    doc.rect(x + 36, yy, barW, 5, "F");
    doc.setTextColor(color);
    applyPdfFont(doc, fontFam, false);
    doc.setFontSize(8);
    doc.text(String(row.value), x + chartW - 1, yy + 4, { align: "right" });
    yy += rowH;
  }
  return yy;
}
