/**
 * Branded landscape PDF presentation built from real ReportData.
 * A4 landscape (297 × 210 mm), 7 slides, Noto Sans for Czech diacritics.
 *
 * Palette — Pepa Midnight Indigo:
 *   DARK   #1b1b20   dark slides (1 & 7)
 *   BRAND  #4648d4   header stripes, accents
 *   LIGHT  #e1e0ff   ice tint
 *   SHEET  #faf8fc   content slide bg
 *   WHITE  #ffffff
 *   MUTED  #a09db8
 */

import { applyPdfFont, registerCzechFont } from "@/lib/reports/pdf-font";
import { drawHorizontalBarChart } from "@/lib/reports/pdf-bar-chart";
import type { ReportData } from "@/types/reports";

const W = 297;          // A4 landscape width  (mm)
const H = 210;          // A4 landscape height (mm)
const MARG = 10;        // left/right margin
const CW   = W - MARG * 2; // usable content width

// Palette
const DARK   = "#1b1b20";
const BRAND  = "#4648d4";
const LIGHT  = "#e1e0ff";
const SHEET  = "#faf8fc";
const MUTED  = "#a09db8";
const TEXT   = "#1b1b20";
const WHITE  = "#ffffff";
const GREEN  = "#16a34a";
const ORANGE = "#ea580c";
const TEAL   = "#0d9488";

type Doc = InstanceType<Awaited<typeof import("jspdf")>["jsPDF"]>;

function formatCzk(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mil. Kč`;
  return `${n.toLocaleString("cs-CZ")} Kč`;
}

// ── Dark background with decorative circles ───────────────────────────────────
function drawDarkSlide(doc: Doc) {
  doc.setFillColor(DARK);
  doc.rect(0, 0, W, H, "F");
  // Circle top-right
  doc.setFillColor("#4648d4");
  doc.setGState(doc.GState({ opacity: 0.22 }));
  doc.circle(W - 20, -10, 50, "F");
  // Circle bottom-left
  doc.circle(-15, H + 12, 42, "F");
  doc.setGState(doc.GState({ opacity: 1 }));
}

// ── Light background ──────────────────────────────────────────────────────────
function drawLightSlide(doc: Doc) {
  doc.setFillColor(SHEET);
  doc.rect(0, 0, W, H, "F");
}

// ── Brand header stripe ───────────────────────────────────────────────────────
function drawHeader(
  doc: Doc,
  fontFam: string | null,
  title: string,
  subtitle?: string
): number {
  const h = subtitle ? 24 : 20;
  doc.setFillColor(BRAND);
  doc.rect(0, 0, W, h, "F");

  applyPdfFont(doc, fontFam, false);
  doc.setTextColor(WHITE);
  doc.setFontSize(subtitle ? 18 : 20);
  doc.text(title, MARG, 14);

  if (subtitle) {
    doc.setFontSize(9);
    doc.setTextColor(LIGHT);
    doc.text(subtitle, MARG, 21);
  }

  return h + 4; // top of content area
}

// ── Small numbered circle ─────────────────────────────────────────────────────
function drawNumberCircle(doc: Doc, fontFam: string | null, x: number, y: number, num: number) {
  doc.setFillColor(BRAND);
  doc.circle(x, y, 4.5, "F");
  applyPdfFont(doc, fontFam, false);
  doc.setTextColor(WHITE);
  doc.setFontSize(8);
  doc.text(String(num).padStart(2, "0"), x, y + 1.2, { align: "center" });
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function drawKpiCard(
  doc: Doc,
  fontFam: string | null,
  x: number, y: number, w: number, h: number,
  value: string, label: string, sub: string, accentColor: string
) {
  // Card bg
  doc.setFillColor(WHITE);
  doc.roundedRect(x, y, w, h, 2, 2, "F");
  doc.setDrawColor("#e2dff5");
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 2, 2, "S");

  // Top accent line
  doc.setFillColor(accentColor);
  doc.rect(x, y, w, 2, "F");

  // Value (big number)
  const fs = value.length > 8 ? 22 : value.length > 5 ? 28 : 34;
  applyPdfFont(doc, fontFam, false);
  doc.setTextColor(accentColor);
  doc.setFontSize(fs);
  doc.text(value, x + w / 2, y + 22, { align: "center" });

  // Label
  doc.setFontSize(9);
  doc.setTextColor(TEXT);
  doc.text(label, x + w / 2, y + 30, { align: "center" });

  // Sub-label
  doc.setFontSize(7.5);
  doc.setTextColor(MUTED);
  doc.text(sub, x + w / 2, y + 36, { align: "center" });
}

// ── Stat panel (pipeline / secondary) ─────────────────────────────────────────
function drawStatPanel(
  doc: Doc,
  fontFam: string | null,
  x: number, y: number, w: number,
  value: string, label: string, accentColor: string
) {
  doc.setFillColor(WHITE);
  doc.roundedRect(x, y, w, 18, 1.5, 1.5, "F");
  doc.setDrawColor("#e2dff5");
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, 18, 1.5, 1.5, "S");

  // Left accent bar
  doc.setFillColor(accentColor);
  doc.rect(x, y, 2.5, 18, "F");

  applyPdfFont(doc, fontFam, false);
  doc.setTextColor(accentColor);
  doc.setFontSize(18);
  doc.text(value, x + 7, y + 11);

  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text(label, x + 7, y + 16);
}

// ── Funnel bar ────────────────────────────────────────────────────────────────
function drawFunnelBar(
  doc: Doc,
  fontFam: string | null,
  x: number, y: number, availableW: number,
  label: string, count: number, maxCount: number, accentColor: string
) {
  const trackW = availableW - 32;
  const fillW  = maxCount > 0 ? Math.max(2, (count / maxCount) * trackW) : 2;

  applyPdfFont(doc, fontFam, false);
  doc.setTextColor(TEXT);
  doc.setFontSize(8.5);
  doc.text(label, x, y + 4);

  // Count badge
  doc.setTextColor(accentColor);
  doc.text(String(count), x + availableW - 1, y + 4, { align: "right" });

  // Track
  doc.setFillColor("#ede9f9");
  doc.roundedRect(x, y + 6, trackW, 4, 1, 1, "F");

  // Fill
  doc.setFillColor(accentColor);
  doc.roundedRect(x, y + 6, fillW, 4, 1, 1, "F");
}

// ── Build PDF ─────────────────────────────────────────────────────────────────
export async function buildPresentationPdfBuffer(
  title: string,
  report: ReportData,
  closingLine?: string
): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const fontFam = await registerCzechFont(doc);

  const { metrics } = report;
  const conv = metrics.conversionRate <= 1
    ? `${Math.round(metrics.conversionRate * 100)} %`
    : `${Math.round(metrics.conversionRate)} %`;

  function newPage() {
    doc.addPage("a4", "landscape");
  }

  // ── Slide 1: Intro ─────────────────────────────────────────────────────────
  drawDarkSlide(doc);

  applyPdfFont(doc, fontFam, false);
  doc.setTextColor(LIGHT);
  doc.setFontSize(8.5);
  doc.setLetterSpacing(1.5);
  doc.text("PEPA · BACK OFFICE", MARG, 30);
  doc.setLetterSpacing(0);

  doc.setTextColor(WHITE);
  doc.setFontSize(34);
  const titleLines = doc.splitTextToSize(title, CW * 0.72);
  doc.text(titleLines, MARG, 55);

  doc.setFontSize(13);
  doc.setTextColor(MUTED);
  doc.text(report.period.label, MARG, 55 + titleLines.length * 12 + 6);

  // Accent line
  doc.setFillColor(BRAND);
  doc.rect(MARG, H - 30, 28, 1.2, "F");

  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(new Date().toLocaleDateString("cs-CZ"), MARG, H - 22);

  // ── Slide 2: Agenda ────────────────────────────────────────────────────────
  newPage();
  drawLightSlide(doc);
  const agendaTop = drawHeader(doc, fontFam, "Program prezentace");

  const agendaItems = [
    "Klíčové ukazatele výkonnosti (KPI)",
    "Vývoj leadů a zdrojů — grafický přehled",
    "Pipeline a konverzní míra",
    "Aktivity a follow-up tým",
    "Doporučení a příští kroky",
  ];

  agendaItems.forEach((item, i) => {
    const y = agendaTop + 14 + i * 28;
    drawNumberCircle(doc, fontFam, MARG + 4.5, y, i + 1);
    applyPdfFont(doc, fontFam, false);
    doc.setTextColor(TEXT);
    doc.setFontSize(13);
    doc.text(item, MARG + 13, y + 1.5);

    if (i < agendaItems.length - 1) {
      doc.setDrawColor("#d5d2e9");
      doc.setLineWidth(0.3);
      doc.line(MARG, y + 11, W - MARG, y + 11);
    }
  });

  // ── Slide 3: KPI ───────────────────────────────────────────────────────────
  newPage();
  drawLightSlide(doc);
  const kpiTop = drawHeader(doc, fontFam, "Klíčové metriky", report.period.label);

  const revenue = metrics.revenueEstimate ?? (metrics as Record<string, number>)["totalRevenue"] ?? 0;
  const kpis = [
    { value: String(metrics.newLeads),    label: "Nové leady",       sub: "v období",           color: BRAND  },
    { value: String(metrics.closedWon),   label: "Uzavřeno (výhra)", sub: "uzavřených obchodů", color: TEAL   },
    { value: conv,                         label: "Konverze",         sub: "won / uzavřené",     color: GREEN  },
    { value: formatCzk(revenue),           label: "Obrat",            sub: "prodáno v období",   color: ORANGE },
  ];

  const cardW = (CW - 6) / 4;
  kpis.forEach((kpi, i) => {
    drawKpiCard(
      doc, fontFam,
      MARG + i * (cardW + 2), kpiTop,
      cardW, H - kpiTop - MARG,
      kpi.value, kpi.label, kpi.sub, kpi.color
    );
  });

  // ── Slide 4: Chart (leads by source) ──────────────────────────────────────
  newPage();
  drawLightSlide(doc);
  const chartTop = drawHeader(doc, fontFam, "Leady podle zdroje", "Počet nových leadů v období podle kanálu");

  const srcRows = (report.leadsBySource ?? []).map((r) => ({
    label: (r as { source?: string; label?: string }).source ?? (r as { label?: string }).label ?? "—",
    value: r.count,
  }));

  if (srcRows.length > 0 && srcRows.some((r) => r.value > 0)) {
    applyPdfFont(doc, fontFam, false);
    doc.setTextColor(TEXT);
    doc.setFontSize(9);
    drawHorizontalBarChart(doc, MARG, chartTop + 4, CW, srcRows, BRAND, fontFam);
  } else {
    doc.setFillColor("#f0edfb");
    doc.roundedRect(MARG, chartTop + 10, CW, 50, 2, 2, "F");
    applyPdfFont(doc, fontFam, false);
    doc.setTextColor(MUTED);
    doc.setFontSize(11);
    doc.text("V tomto období nejsou data pro zobrazení.", W / 2, chartTop + 38, { align: "center" });
  }

  // ── Slide 5: Pipeline ──────────────────────────────────────────────────────
  newPage();
  drawLightSlide(doc);
  const pipeTop = drawHeader(doc, fontFam, "Pipeline — aktuální stav");

  const funnel = (report.pipelineFunnel ?? []).slice(0, 4);
  const maxCount = Math.max(1, ...funnel.map((s) => s.count));
  const funnelW = CW * 0.58;
  const stageColors = [BRAND, TEAL, GREEN, ORANGE];

  applyPdfFont(doc, fontFam, false);
  doc.setTextColor(BRAND);
  doc.setFontSize(10);
  doc.text("Otevřené leady podle fáze", MARG, pipeTop + 4);

  funnel.forEach((stage, i) => {
    drawFunnelBar(
      doc, fontFam,
      MARG, pipeTop + 12 + i * 22,
      funnelW,
      stage.label, stage.count, maxCount,
      stageColors[i % stageColors.length]!
    );
  });

  // Right side: secondary stats
  const rX = MARG + funnelW + 14;
  const rW = CW - funnelW - 14;

  applyPdfFont(doc, fontFam, false);
  doc.setTextColor(BRAND);
  doc.setFontSize(10);
  doc.text("Doplňkové metriky", rX, pipeTop + 4);

  const secStats = [
    { value: String(metrics.newClients),     label: "Noví klienti",          color: BRAND  },
    { value: String(metrics.newProperties),  label: "Nové nemovitosti",       color: TEAL   },
    {
      value: metrics.avgDaysToClose > 0 ? `${metrics.avgDaysToClose} dní` : "—",
      label: "Prům. dny k uzavření",  color: ORANGE
    },
  ];
  secStats.forEach((s, i) => {
    drawStatPanel(doc, fontFam, rX, pipeTop + 12 + i * 24, rW, s.value, s.label, s.color);
  });

  // ── Slide 6: Activities ────────────────────────────────────────────────────
  newPage();
  drawLightSlide(doc);
  const actTop = drawHeader(
    doc, fontFam,
    "Aktivity v období",
    `Celkem: ${metrics.totalActivities ?? 0} aktivit zaznamenáno v systému`
  );

  const actRows = (report.activitiesByType ?? []).map((r) => ({
    label: r.label ?? r.type,
    value: r.count,
  }));

  if (actRows.length > 0) {
    drawHorizontalBarChart(doc, MARG, actTop + 4, CW, actRows, TEAL, fontFam);
  } else {
    doc.setFillColor("#f0edfb");
    doc.roundedRect(MARG, actTop + 10, CW, 50, 2, 2, "F");
    applyPdfFont(doc, fontFam, false);
    doc.setTextColor(MUTED);
    doc.setFontSize(11);
    doc.text("Žádné aktivity v tomto období.", W / 2, actTop + 38, { align: "center" });
  }

  // ── Slide 7: Thank You ─────────────────────────────────────────────────────
  newPage();
  drawDarkSlide(doc);

  applyPdfFont(doc, fontFam, false);
  doc.setTextColor(WHITE);
  doc.setFontSize(40);
  doc.text("Díky za pozornost", W / 2, 80, { align: "center" });

  if (closingLine) {
    doc.setFontSize(13);
    doc.setTextColor(LIGHT);
    const cl = doc.splitTextToSize(closingLine, CW * 0.75);
    doc.text(cl, W / 2, 106, { align: "center" });
  }

  // Accent line
  doc.setFillColor(BRAND);
  doc.rect(W / 2 - 18, 124, 36, 1.2, "F");

  doc.setFontSize(10);
  doc.setTextColor(MUTED);
  doc.text(`Pepa · Back Office  ·  ${report.period.label}`, W / 2, 136, { align: "center" });

  // Page footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    applyPdfFont(doc, fontFam, false);
    doc.setFontSize(7);
    doc.setTextColor(MUTED);
    doc.text(`Pepa Back Office  ·  Strana ${p} z ${totalPages}`, W - MARG, H - 4, { align: "right" });
  }

  const out = doc.output("arraybuffer");
  return Buffer.from(out);
}
