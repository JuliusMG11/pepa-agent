import type { ReportData } from "@/lib/claude/tools/generate-report";
import type { AgentPresentationNarrative } from "@/lib/reports/agent-presentation-narrative";
import { drawHorizontalBarChart } from "@/lib/reports/pdf-bar-chart";
import { applyPdfFont, registerCzechFont } from "@/lib/reports/pdf-font";

const W = 210;
const BRAND = "#4648d4";
const BRAND_SOFT = "#ede9fe";
const ACCENT = "#7c3aed";
const DARK = "#1b1b20";
const MUTED = "#6b7280";
const SHEET = "#faf8fc";
const STRIPE = "#f3e8ff";

function formatCzk(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} mil. Kč`;
  }
  return `${value.toLocaleString("cs-CZ")} Kč`;
}

function convPct(metrics: ReportData["metrics"]): string {
  const r = metrics.conversionRate;
  if (r <= 1) return (r * 100).toFixed(1);
  return String(Math.round(r));
}

type PdfDoc = InstanceType<Awaited<typeof import("jspdf")>["jsPDF"]>;

function ensureSpace(doc: PdfDoc, y: number, needMm: number): number {
  if (y + needMm > 272) {
    doc.addPage();
    doc.setFillColor(SHEET);
    doc.rect(0, 0, W, 297, "F");
    return 24;
  }
  return y;
}

function sectionHeader(
  doc: PdfDoc,
  fontFam: string | null,
  y: number,
  title: string,
  subtitle?: string
): number {
  doc.setFillColor(BRAND_SOFT);
  doc.roundedRect(12, y, W - 24, subtitle ? 16 : 11, 1.5, 1.5, "F");
  applyPdfFont(doc, fontFam, false);
  doc.setTextColor(BRAND);
  doc.setFontSize(11);
  doc.text(title, 16, y + 7);
  if (subtitle) {
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(subtitle, 16, y + 13);
    return y + 20;
  }
  return y + 14;
}

function drawPropertyTable(
  doc: PdfDoc,
  fontFam: string | null,
  y: number,
  rows: { title: string; district: string; price: number; agentName: string }[]
): number {
  const cols = [86, 38, 44, 38]; // column widths: title, district, price, agent
  const headers = ["Nemovitost", "Čtvrť", "Cena", "Agent"];
  const rowH = 10;
  const startX = 14;
  const totalW = cols.reduce((a, b) => a + b, 0);

  // header row
  doc.setFillColor(BRAND);
  doc.rect(startX, y, totalW, rowH, "F");
  applyPdfFont(doc, fontFam, false);
  doc.setTextColor("#ffffff");
  doc.setFontSize(8);
  let cx = startX + 2;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], cx, y + 6.5);
    cx += cols[i];
  }
  y += rowH;

  // data rows
  rows.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? "#ffffff" : BRAND_SOFT;
    doc.setFillColor(bg);
    doc.rect(startX, y, totalW, rowH, "F");
    applyPdfFont(doc, fontFam, false);
    doc.setTextColor(DARK);
    doc.setFontSize(7.5);
    cx = startX + 2;
    const cells = [
      doc.splitTextToSize(row.title, cols[0] - 4)[0] as string,
      row.district,
      formatCzk(row.price),
      row.agentName,
    ];
    cells.forEach((cell, i) => {
      doc.text(cell, cx, y + 6.5);
      cx += cols[i];
    });
    y += rowH;
  });

  return y;
}

/**
 * PDF výstup z Ask Pepa / create_presentation — Noto (diakritika), barvy, grafy, AI texty.
 */
export async function buildAgentReportPdfBuffer(
  title: string,
  periodLabel: string,
  report: ReportData,
  narrative: AgentPresentationNarrative
): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fontFam = await registerCzechFont(doc);

  const { metrics } = report;
  const convStr = convPct(metrics);
  const generatedDate = new Date().toLocaleDateString("cs-CZ");

  function drawFooter(pageNum: number): void {
    const totalPages = doc.getNumberOfPages();
    doc.setPage(pageNum);
    applyPdfFont(doc, fontFam, false);
    doc.setFontSize(7);
    doc.setTextColor(MUTED);
    doc.text(
      `Pepa · Back Office Operations  ·  Strana ${pageNum} z ${totalPages}  ·  Vygenerováno ${generatedDate}`,
      14,
      290
    );
  }

  // ── Strana 1: hero + KPI ──
  doc.setFillColor(BRAND);
  doc.rect(0, 0, W, 36, "F");
  doc.setFillColor(STRIPE);
  doc.rect(0, 36, W, 6, "F");

  doc.setTextColor("#ffffff");
  applyPdfFont(doc, fontFam, false);
  doc.setFontSize(9);
  doc.text("Pepa · Back Office", 14, 12);

  doc.setFontSize(20);
  const titleLines = doc.splitTextToSize(title, W - 28);
  doc.text(titleLines, 14, 22);

  doc.setFontSize(10);
  doc.text(periodLabel, 14, 32);

  doc.setFillColor(SHEET);
  doc.rect(0, 42, W, 255, "F");

  let y = 46;
  applyPdfFont(doc, fontFam, false);
  doc.setTextColor(MUTED);
  doc.setFontSize(8);
  doc.text("Klíčové ukazatele", 14, y);
  y += 6;

  const kpis: { label: string; value: string; tint: string }[] = [
    { label: "Nové leady", value: String(metrics.newLeads), tint: "#f5f3ff" },
    { label: "Uzavřeno (výhra)", value: String(metrics.closedWon), tint: "#ecfdf5" },
    { label: "Uzavřeno (ztráta)", value: String(metrics.closedLost), tint: "#fff7ed" },
    { label: "Konverze (won / uzavřené)", value: `${convStr} %`, tint: "#eef2ff" },
    { label: "Noví klienti", value: String(metrics.newClients), tint: "#f5f3ff" },
    { label: "Nové nemovitosti", value: String(metrics.newProperties), tint: "#fefce8" },
    { label: "Prodané nemovitosti", value: String(metrics.soldProperties), tint: "#ecfdf5" },
    { label: "Aktivity celkem", value: String(metrics.totalActivities), tint: "#fdf4ff" },
    {
      label: "Odhad tržeb (prodáno)",
      value: formatCzk(metrics.revenueEstimate),
      tint: "#f0fdf4",
    },
  ];

  if (metrics.avgDaysToClose > 0) {
    kpis.push({
      label: "Prům. dny do uzavření",
      value: String(metrics.avgDaysToClose),
      tint: "#eff6ff",
    });
  }

  const cellW = (W - 28) / 2;
  const cellH = 20;
  kpis.forEach((kpi, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 14 + col * cellW;
    const yy = y + row * (cellH + 5);
    doc.setFillColor(kpi.tint);
    doc.roundedRect(x, yy, cellW - 4, cellH, 2, 2, "F");
    doc.setDrawColor("#e9d5ff");
    doc.roundedRect(x, yy, cellW - 4, cellH, 2, 2, "S");
    doc.setTextColor(BRAND);
    applyPdfFont(doc, fontFam, false);
    doc.setFontSize(15);
    doc.text(kpi.value, x + 4, yy + 12);
    doc.setTextColor(MUTED);
    doc.setFontSize(7);
    doc.text(kpi.label.toUpperCase(), x + 4, yy + 17);
  });

  const rowsUsed = Math.ceil(kpis.length / 2);
  y = y + rowsUsed * (cellH + 5) + 4;

  doc.setFillColor("#d1fae5");
  doc.setDrawColor("#6ee7b7");
  doc.roundedRect(14, y, W - 28, 14, 2, 2, "FD");
  applyPdfFont(doc, fontFam, false);
  doc.setTextColor("#065f46");
  doc.setFontSize(9);
  doc.text(
    metrics.topAgent.deals > 0
      ? `Nejvíc uzavřených prodejů nemovitostí: ${metrics.topAgent.name} (${metrics.topAgent.deals})`
      : "Prodeje nemovitostí v období bez přiřazeného agenta nebo bez záznamu.",
    18,
    y + 9
  );

  // ── Další stránky: text + grafy ──
  doc.addPage();
  doc.setFillColor(SHEET);
  doc.rect(0, 0, W, 297, "F");

  y = 18;
  y = sectionHeader(doc, fontFam, y, "Úvod a klíčové poznatky", "Stručný kontext a čtení čísel");
  y += 4;

  applyPdfFont(doc, fontFam, false);
  doc.setTextColor(DARK);
  doc.setFontSize(9);
  for (const para of narrative.intro) {
    y = ensureSpace(doc, y, 18);
    const wrapped = doc.splitTextToSize(para, W - 28);
    doc.text(wrapped, 14, y);
    y += wrapped.length * 4.2 + 3;
  }

  y += 2;
  applyPdfFont(doc, fontFam, false);
  doc.setTextColor("#92400e");
  doc.setFontSize(10);
  doc.text("Klíčové poznatky", 14, y);
  y += 6;
  doc.setFontSize(9);
  for (const line of narrative.keyInsights) {
    y = ensureSpace(doc, y, 16);
    const w = doc.splitTextToSize(`• ${line}`, W - 28);
    doc.text(w, 14, y);
    y += w.length * 4 + 2;
  }
  y += 6;

  // Grafy
  const chartW = (W - 28 - 6) / 2;
  y = ensureSpace(doc, y, 50);

  const srcRows = (report.leadsBySource ?? []).map((r) => ({
    label: r.label,
    value: r.count,
  }));
  const statusRows = (report.leadsByStatus ?? []).map((r) => ({
    label: r.label,
    value: r.count,
  }));
  const actRows = (report.activitiesByType ?? []).map((r) => ({
    label: r.label,
    value: r.count,
  }));

  applyPdfFont(doc, fontFam, false);
  doc.setTextColor(DARK);
  doc.setFontSize(10);
  doc.text("Leady podle zdroje", 14, y);
  y += 6;
  const yAfterSrc = drawHorizontalBarChart(doc, 14, y, chartW, srcRows, BRAND, fontFam);
  const yRight1 = drawHorizontalBarChart(doc, 14 + chartW + 6, y, chartW, statusRows, ACCENT, fontFam);
  y = Math.max(yAfterSrc, yRight1) + 10;

  y = ensureSpace(doc, y, 40);
  y = sectionHeader(doc, fontFam, y, "Aktivity podle typu");
  y += 6;
  y = drawHorizontalBarChart(doc, 14, y, W - 28, actRows, "#0d9488", fontFam);

  if ((report.propertiesByDistrict ?? []).length > 0) {
    y += 8;
    y = ensureSpace(doc, y, 50);
    y = sectionHeader(doc, fontFam, y, "Prodeje podle čtvrtě (tržby)");
    y += 6;
    const distRows = (report.propertiesByDistrict ?? []).slice(0, 10).map((d) => ({
      label: `${d.district} (${formatCzk(d.revenue)})`,
      value: d.count,
    }));
    y = drawHorizontalBarChart(doc, 14, y, W - 28, distRows, "#db2777", fontFam);
  }

  if ((report.weeklyBreakdown ?? []).length > 1) {
    y += 8;
    y = ensureSpace(doc, y, 36);
    y = sectionHeader(doc, fontFam, y, "Týdenní přehled (nové leady / prodáno)");
    y += 6;
    const wRows = (report.weeklyBreakdown ?? []).map((w) => ({
      label: `${w.week}: +${w.leads} leadů, ${w.sold} prodáno`,
      value: w.leads + w.sold,
    }));
    y = drawHorizontalBarChart(doc, 14, y, W - 28, wRows, "#6366f1", fontFam);
  }

  // Kam se zlepšit
  doc.addPage();
  doc.setFillColor(SHEET);
  doc.rect(0, 0, W, 297, "F");
  y = 18;
  y = sectionHeader(
    doc,
    fontFam,
    y,
    "Kam se můžeme zlepšit",
    "Konkrétní oblasti — podle dat a doporučení"
  );
  y += 6;

  applyPdfFont(doc, fontFam, false);
  doc.setTextColor("#78350f");
  doc.setFontSize(9);
  let iy2 = y;
  for (const line of narrative.improvements) {
    iy2 = ensureSpace(doc, iy2, 14);
    const wrapped = doc.splitTextToSize(`• ${line}`, W - 28);
    doc.text(wrapped, 14, iy2);
    iy2 += wrapped.length * 4.2 + 2;
  }
  y = iy2 + 10;

  y = ensureSpace(doc, y, 28);
  doc.setFillColor(BRAND_SOFT);
  const closeWrapped = doc.splitTextToSize(narrative.closingLine, W - 28);
  const closeBoxH = Math.min(8 + closeWrapped.length * 4.5, 40);
  doc.roundedRect(12, y, W - 24, closeBoxH, 2, 2, "F");
  applyPdfFont(doc, fontFam, false);
  doc.setTextColor(DARK);
  doc.setFontSize(9);
  doc.text(closeWrapped, 16, y + 7);

  if ((report.topProperties ?? []).length > 0) {
    y += 8;
    y = ensureSpace(doc, y, 20 + (report.topProperties!.length * 10) + 10);
    y = sectionHeader(doc, fontFam, y, "Top 5 prodaných nemovitostí", "Seřazeno podle ceny — v daném období");
    y += 4;
    y = drawPropertyTable(doc, fontFam, y, report.topProperties!);
  }

  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    drawFooter(p);
  }

  const out = doc.output("arraybuffer");
  return Buffer.from(out);
}
