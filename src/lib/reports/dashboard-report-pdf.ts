import type { ReportPdfNarrative } from "@/lib/reports/report-ai-narrative";
import { ACTIVITY_TYPE_LABELS_CS } from "@/lib/reports/czech-labels";
import { drawHorizontalBarChart } from "@/lib/reports/pdf-bar-chart";
import { applyPdfFont, registerCzechFont } from "@/lib/reports/pdf-font";
import type { ReportData } from "@/types/reports";

function formatCzk(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} mil. Kč`;
  }
  return `${value.toLocaleString("cs-CZ")} Kč`;
}

type JsPDFDoc = InstanceType<Awaited<typeof import("jspdf")>["jsPDF"]>;

const W = 210;
const BRAND = "#4648d4";
const DARK = "#1b1b20";
const MUTED = "#767586";
const BOTTOM_SAFE = 278;

function writeFlowText(
  doc: JsPDFDoc,
  fontFam: string | null,
  lines: string[],
  startY: number,
  x: number,
  lineMm: number,
  maxY: number
): number {
  let y = startY;
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line, W - 28);
    const blockH = wrapped.length * lineMm;
    if (y + blockH > maxY && y > 40) {
      doc.addPage();
      y = 26;
    }
    doc.text(wrapped, x, y);
    y += blockH + 3;
  }
  return y;
}

/**
 * PDF report — UTF-8 (Noto Sans přes CDN), grafy, AI texty.
 */
export async function buildDashboardReportPdfUint8Array(
  title: string,
  report: ReportData,
  options?: {
    authorName?: string;
    companyLine?: string;
    narrative?: ReportPdfNarrative | null;
  }
): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const fontFam = await registerCzechFont(doc);
  const author = options?.authorName?.trim() || "Tým Pepa";
  const company = options?.companyLine ?? "Pepa · Back Office";
  const narrative = options?.narrative;
  const generatedAt = new Date().toLocaleString("cs-CZ");

  const leadsByStatus = report.leadsByStatus ?? [];

  // ── Strana 1: titul ──
  doc.setFillColor(BRAND);
  doc.rect(0, 0, W, 52, "F");
  doc.setTextColor("#ffffff");
  applyPdfFont(doc, fontFam, false);
  doc.setFontSize(10);
  doc.text(company, 14, 16);
  applyPdfFont(doc, fontFam, true);
  doc.setFontSize(22);
  const titleLines = doc.splitTextToSize(title, W - 28);
  doc.text(titleLines, 14, 30);
  applyPdfFont(doc, fontFam, false);
  doc.setFontSize(10);
  doc.text(report.period.label, 14, 42);
  doc.setFontSize(9);
  const sub =
    narrative?.titleSubtitle ??
    "Interní přehled pipeline, aktivit a obratu pro rozhodování i schůzku s klientem.";
  doc.text(doc.splitTextToSize(sub, W - 28), 14, 48);

  doc.setTextColor(DARK);
  applyPdfFont(doc, fontFam, true);
  doc.setFontSize(11);
  doc.text("Vypracoval(a)", 14, 68);
  applyPdfFont(doc, fontFam, false);
  doc.setFontSize(10);
  doc.text(author, 14, 75);
  doc.setTextColor(MUTED);
  doc.setFontSize(8);
  doc.text(`Datum vygenerování: ${generatedAt}`, 14, 82);
  doc.text("Důvěrný dokument — nešířit bez souhlasu.", 14, 88);

  // ── Strana 2: KPI ──
  doc.addPage();
  doc.setFillColor("#f6f2fa");
  doc.rect(0, 0, W, 18, "F");
  doc.setTextColor(BRAND);
  applyPdfFont(doc, fontFam, true);
  doc.setFontSize(14);
  doc.text("Klíčové ukazatele", 14, 12);

  const metrics = [
    { label: "Nové leady", value: String(report.metrics.newLeads) },
    { label: "Uzavřeno", value: String(report.metrics.closedWon) },
    { label: "Konverze", value: `${report.metrics.conversionRate} %` },
    { label: "Noví klienti", value: String(report.metrics.newClients) },
    { label: "Obrat (prodáno)", value: formatCzk(report.metrics.totalRevenue) },
    {
      label: "Prům. dní k uzavření",
      value:
        report.metrics.avgDaysToClose > 0
          ? `${report.metrics.avgDaysToClose} dní`
          : "—",
    },
  ];

  const cellW = (W - 28) / 3;
  const cellH = 24;
  const startY = 26;

  metrics.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 14 + col * cellW;
    const y = startY + row * (cellH + 4);

    doc.setFillColor("#f6f2fa");
    doc.roundedRect(x, y, cellW - 3, cellH, 3, 3, "F");
    doc.setDrawColor("#e4e1e9");
    doc.roundedRect(x, y, cellW - 3, cellH, 3, 3, "S");

    doc.setTextColor(BRAND);
    applyPdfFont(doc, fontFam, true);
    doc.setFontSize(16);
    doc.text(m.value, x + 4, y + 12);

    doc.setTextColor(MUTED);
    applyPdfFont(doc, fontFam, false);
    doc.setFontSize(7);
    doc.text(m.label.toUpperCase(), x + 4, y + 19);
  });

  if (report.metrics.topAgent) {
    const y = startY + 2 * (cellH + 4) + 6;
    doc.setFillColor("#dcfce7");
    doc.roundedRect(14, y, W - 28, 14, 3, 3, "F");
    doc.setTextColor("#166534");
    applyPdfFont(doc, fontFam, true);
    doc.setFontSize(9);
    doc.text(
      `Nejúspěšnější obchodník: ${report.metrics.topAgent.name} — ${report.metrics.topAgent.deals} obchodů`,
      18,
      y + 9
    );
  }

  let bulletY = startY + 2 * (cellH + 4) + (report.metrics.topAgent ? 28 : 8);
  if (narrative?.executiveBullets?.length) {
    doc.setTextColor(BRAND);
    applyPdfFont(doc, fontFam, true);
    doc.setFontSize(11);
    doc.text("Shrnutí", 14, bulletY);
    bulletY += 8;
    doc.setTextColor(DARK);
    applyPdfFont(doc, fontFam, false);
    doc.setFontSize(9);
    for (const b of narrative.executiveBullets) {
      const lines = doc.splitTextToSize(`• ${b}`, W - 28);
      if (bulletY + lines.length * 4.5 > BOTTOM_SAFE) {
        doc.addPage();
        bulletY = 26;
      }
      doc.text(lines, 16, bulletY);
      bulletY += lines.length * 4.5 + 2;
    }
  }

  // ── Strana 3: Leady podle zdroje ──
  doc.addPage();
  doc.setFillColor("#f6f2fa");
  doc.rect(0, 0, W, 18, "F");
  doc.setTextColor(BRAND);
  applyPdfFont(doc, fontFam, true);
  doc.setFontSize(13);
  doc.text("Leady podle zdroje", 14, 12);
  if (narrative?.chartNotes?.leads) {
    applyPdfFont(doc, fontFam, false);
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(doc.splitTextToSize(narrative.chartNotes.leads, W - 28), 14, 20);
  }

  const leadRows = report.leadsBySource.map((r) => ({
    label: r.source || "—",
    value: r.count,
  }));
  let chartEnd =
    leadRows.length > 0
      ? drawHorizontalBarChart(doc, 14, 28, W - 28, leadRows, BRAND, fontFam)
      : 28;
  if (leadRows.length === 0) {
    doc.setTextColor(MUTED);
    applyPdfFont(doc, fontFam, false);
    doc.setFontSize(9);
    doc.text("Žádné záznamy podle zdroje v tomto období.", 14, 36);
  }

  // Pipeline
  doc.setTextColor(BRAND);
  applyPdfFont(doc, fontFam, true);
  doc.setFontSize(13);
  doc.text("Nové leady podle fáze (pipeline)", 14, chartEnd + 14);
  if (narrative?.chartNotes?.pipeline) {
    applyPdfFont(doc, fontFam, false);
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(doc.splitTextToSize(narrative.chartNotes.pipeline, W - 28), 14, chartEnd + 22);
  }
  const pipeRows = leadsByStatus.map((r) => ({ label: r.label, value: r.count }));
  if (pipeRows.length > 0) {
    chartEnd = drawHorizontalBarChart(
      doc,
      14,
      chartEnd + (narrative?.chartNotes?.pipeline ? 32 : 28),
      W - 28,
      pipeRows,
      "#0d9488",
      fontFam
    );
  } else {
    doc.setTextColor(MUTED);
    applyPdfFont(doc, fontFam, false);
    doc.setFontSize(9);
    doc.text("Žádné leady v období.", 14, chartEnd + 32);
    chartEnd += 20;
  }

  // ── Strana 4: Aktivity + čtvrti ──
  doc.addPage();
  doc.setFillColor("#f6f2fa");
  doc.rect(0, 0, W, 18, "F");
  doc.setTextColor(BRAND);
  applyPdfFont(doc, fontFam, true);
  doc.setFontSize(13);
  doc.text("Aktivity podle typu", 14, 12);
  if (narrative?.chartNotes?.activities) {
    applyPdfFont(doc, fontFam, false);
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(doc.splitTextToSize(narrative.chartNotes.activities, W - 28), 14, 20);
  }
  const actRows = report.activitiesByType.map((r) => ({
    label: ACTIVITY_TYPE_LABELS_CS[r.type] ?? r.type,
    value: r.count,
  }));
  let yAfter = 28;
  if (actRows.length > 0) {
    yAfter = drawHorizontalBarChart(doc, 14, 28, W - 28, actRows, "#7c3aed", fontFam);
  } else {
    doc.setTextColor(MUTED);
    applyPdfFont(doc, fontFam, false);
    doc.setFontSize(9);
    doc.text("Žádné aktivity v období.", 14, 34);
  }

  doc.setTextColor(BRAND);
  applyPdfFont(doc, fontFam, true);
  doc.setFontSize(13);
  doc.text("Obrat podle čtvrtí (prodané)", 14, yAfter + 14);
  if (narrative?.chartNotes?.districts) {
    applyPdfFont(doc, fontFam, false);
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(doc.splitTextToSize(narrative.chartNotes.districts, W - 28), 14, yAfter + 22);
  }
  let rowY = yAfter + (narrative?.chartNotes?.districts ? 32 : 28);
  if (report.propertiesByDistrict.length > 0) {
    for (const row of report.propertiesByDistrict.slice(0, 10)) {
      applyPdfFont(doc, fontFam, false);
      doc.setFontSize(9);
      doc.setTextColor(DARK);
      doc.text(`${row.district} (${row.count}×)`, 18, rowY);
      doc.setTextColor(BRAND);
      applyPdfFont(doc, fontFam, true);
      doc.text(formatCzk(row.revenue), W - 30, rowY, { align: "right" });
      rowY += 7;
    }
  } else {
    doc.setTextColor(MUTED);
    applyPdfFont(doc, fontFam, false);
    doc.setFontSize(9);
    doc.text("Žádné prodané nemovitosti v období.", 14, rowY);
  }

  // ── Strana 5: Týdenní přehled + analýza ──
  doc.addPage();
  doc.setFillColor("#f6f2fa");
  doc.rect(0, 0, W, 18, "F");
  doc.setTextColor(BRAND);
  applyPdfFont(doc, fontFam, true);
  doc.setFontSize(13);
  doc.text("Týdenní přehled", 14, 12);
  if (narrative?.chartNotes?.weekly) {
    applyPdfFont(doc, fontFam, false);
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(doc.splitTextToSize(narrative.chartNotes.weekly, W - 28), 14, 20);
  }
  applyPdfFont(doc, fontFam, false);
  doc.setFontSize(8);
  doc.setTextColor(DARK);
  let wy = 30;
  for (const w of report.weeklyBreakdown.slice(0, 12)) {
    doc.text(`${w.week}: ${w.leads} leadů, ${w.sold} uzavření`, 18, wy);
    wy += 6;
  }

  doc.setTextColor(BRAND);
  applyPdfFont(doc, fontFam, true);
  doc.setFontSize(14);
  doc.text("Analýza a doporučení", 14, Math.max(wy + 10, 110));

  let py = Math.max(wy + 18, 118);
  doc.setTextColor(DARK);
  applyPdfFont(doc, fontFam, false);
  doc.setFontSize(10);

  if (narrative?.analysisParagraphs?.length) {
    for (const para of narrative.analysisParagraphs) {
      const wrapped = doc.splitTextToSize(para, W - 28);
      const h = wrapped.length * 4.8 + 6;
      if (py + h > BOTTOM_SAFE) {
        doc.addPage();
        py = 26;
      }
      doc.text(wrapped, 14, py);
      py += h;
    }
  } else {
    const conv = report.metrics.conversionRate;
    const fallback = [
      `V sledovaném období tým zaznamenal ${report.metrics.newLeads} nových leadů a ${report.metrics.closedWon} úspěšně uzavřených obchodů.`,
      `Konverzní poměr uzavřených leadů činí ${conv} %.`,
      report.metrics.totalRevenue > 0
        ? `Celkový obrat z prodaných nemovitostí dosáhl ${formatCzk(report.metrics.totalRevenue)}.`
        : "V tomto období nebyly evidovány prodeje v tomto výběru.",
    ];
    py = writeFlowText(doc, fontFam, fallback, py, 14, 4.8, BOTTOM_SAFE);
  }

  py += 4;
  doc.setTextColor(BRAND);
  applyPdfFont(doc, fontFam, true);
  doc.setFontSize(11);
  if (py > BOTTOM_SAFE - 40) {
    doc.addPage();
    py = 26;
  }
  doc.text("Doporučení", 14, py);
  py += 8;
  doc.setTextColor(DARK);
  applyPdfFont(doc, fontFam, false);
  doc.setFontSize(10);

  const recs =
    (narrative?.recommendations?.length ?? 0) > 0
      ? narrative!.recommendations
      : [
          "Pravidelně aktualizovat stav leadů v kanbanu.",
          "Sjednotit follow-up po prohlídce do 24 hodin.",
        ];
  for (const r of recs) {
    const wrapped = doc.splitTextToSize(`• ${r}`, W - 28);
    const h = wrapped.length * 4.8 + 3;
    if (py + h > BOTTOM_SAFE) {
      doc.addPage();
      py = 26;
    }
    doc.text(wrapped, 16, py);
    py += h;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    applyPdfFont(doc, fontFam, false);
    doc.setTextColor(MUTED);
    doc.text(`Pepa · strana ${i}/${pageCount} · ${generatedAt} · ${author}`, 14, 288);
  }

  const out = doc.output("arraybuffer");
  return new Uint8Array(out);
}

export async function buildDashboardReportPdfBuffer(
  title: string,
  report: ReportData,
  options?: {
    authorName?: string;
    companyLine?: string;
    narrative?: ReportPdfNarrative | null;
  }
): Promise<Buffer> {
  const u8 = await buildDashboardReportPdfUint8Array(title, report, options);
  return Buffer.from(u8);
}
