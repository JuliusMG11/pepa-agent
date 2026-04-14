/**
 * Demo presentation generator — Pepa Back Office brand
 * Run: node scripts/generate-presentation.mjs
 *
 * Brand palette (Pepa Midnight Indigo):
 *   DARK    #1b1b20  — dark slide backgrounds (intro / outro)
 *   BRAND   #4648d4  — primary indigo
 *   LIGHT   #e1e0ff  — ice indigo accent
 *   SHEET   #faf8fc  — content slide background
 *   CARD    #f3f0fb  — card fills
 *   WHITE   ffffff
 *   MUTED   #767586
 *   TEXT    #1b1b20
 */

import PptxGenJS from "pptxgenjs";
import { createWriteStream } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dir, "..", "presentation.pptx");

// ── Palette (no # — pptxgenjs requirement) ───────────────────────────────────
const C = {
  dark:    "1b1b20",
  brand:   "4648d4",
  light:   "e1e0ff",
  sheet:   "faf8fc",
  card:    "f3f0fb",
  white:   "ffffff",
  muted:   "a09db8",
  text:    "1b1b20",
  green:   "22c55e",
  orange:  "f97316",
  teal:    "0d9488",
};

const makeShadow = () => ({
  type: "outer",
  angle: 315,
  blur: 12,
  color: "1b1b2033",
  offset: 4,
  opacity: 0.18,
});

const prs = new PptxGenJS();
prs.layout = "LAYOUT_WIDE"; // 13.3" × 7.5"

const W = 13.3;
const H = 7.5;

// Typography helpers
const GEORGIA = "Georgia";
const CALIBRI = "Calibri";

// ── Slide 1: Intro ────────────────────────────────────────────────────────────
{
  const s = prs.addSlide();
  s.background = { color: C.dark };

  // Big decorative circle (top-right)
  s.addShape(prs.ShapeType.ellipse, {
    x: 9.6, y: -1.2, w: 4.8, h: 4.8,
    fill: { color: C.brand, transparency: 75 },
    line: { color: C.brand, transparency: 60, width: 0 },
  });

  // Small accent dot
  s.addShape(prs.ShapeType.ellipse, {
    x: 0.45, y: 5.9, w: 0.85, h: 0.85,
    fill: { color: C.brand },
    line: { width: 0 },
  });

  // Tag line
  s.addText("PEPA · BACK OFFICE", {
    x: 0.55, y: 1.4, w: 6, h: 0.4,
    fontSize: 11, fontFace: CALIBRI, color: C.light,
    bold: false, charSpacing: 3,
  });

  // Main title
  s.addText("Výkonnostní\nPřehled 2026", {
    x: 0.55, y: 1.95, w: 8.5, h: 2.4,
    fontSize: 52, fontFace: GEORGIA, color: C.white,
    bold: true,
  });

  // Subtitle
  s.addText("Realitní back office — klíčové metriky, pipeline a doporučení", {
    x: 0.55, y: 4.5, w: 8.2, h: 0.55,
    fontSize: 16, fontFace: CALIBRI, color: C.muted,
  });

  // Bottom line accent
  s.addShape(prs.ShapeType.rect, {
    x: 0.55, y: 5.3, w: 2.2, h: 0.07,
    fill: { color: C.brand },
    line: { width: 0 },
  });

  // Date
  s.addText("Duben 2026", {
    x: 0.55, y: 5.55, w: 3, h: 0.4,
    fontSize: 12, fontFace: CALIBRI, color: C.muted,
  });
}

// ── Slide 2: Agenda ───────────────────────────────────────────────────────────
{
  const s = prs.addSlide();
  s.background = { color: C.sheet };

  // Header stripe
  s.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 1.35,
    fill: { color: C.brand },
    line: { width: 0 },
  });
  s.addText("Program prezentace", {
    x: 0.5, y: 0.22, w: 9, h: 0.8,
    fontSize: 34, fontFace: GEORGIA, color: C.white, bold: true,
  });

  const items = [
    { icon: "01", label: "Klíčové ukazatele výkonnosti (KPI)" },
    { icon: "02", label: "Pipeline a konverze leadů" },
    { icon: "03", label: "Vývoj prodejů — grafický přehled" },
    { icon: "04", label: "Aktivity a follow-up tým" },
    { icon: "05", label: "Doporučení a příští kroky" },
  ];

  items.forEach((item, i) => {
    const y = 1.7 + i * 0.98;

    // Number circle
    s.addShape(prs.ShapeType.ellipse, {
      x: 0.5, y: y, w: 0.72, h: 0.72,
      fill: { color: C.brand },
      line: { width: 0 },
      shadow: makeShadow(),
    });
    s.addText(item.icon, {
      x: 0.5, y: y, w: 0.72, h: 0.72,
      fontSize: 13, fontFace: CALIBRI, color: C.white,
      bold: true, align: "center", valign: "middle",
    });

    // Label
    s.addText(item.label, {
      x: 1.42, y: y + 0.13, w: 10, h: 0.46,
      fontSize: 16, fontFace: CALIBRI, color: C.text,
    });

    // Divider (not after last)
    if (i < items.length - 1) {
      s.addShape(prs.ShapeType.line, {
        x: 0.5, y: y + 0.78, w: 11.5, h: 0,
        line: { color: "d5d2e9", width: 0.6 },
      });
    }
  });
}

// ── Slide 3: Statistics ───────────────────────────────────────────────────────
{
  const s = prs.addSlide();
  s.background = { color: C.sheet };

  s.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 1.35,
    fill: { color: C.brand },
    line: { width: 0 },
  });
  s.addText("Klíčové metriky", {
    x: 0.5, y: 0.22, w: 9, h: 0.8,
    fontSize: 34, fontFace: GEORGIA, color: C.white, bold: true,
  });

  const stats = [
    { value: "142", label: "Nové leady", sub: "Q1 2026", color: C.brand },
    { value: "38", label: "Prodeje", sub: "uzavřených", color: C.teal },
    { value: "67%", label: "Konverze", sub: "won / uzavřené", color: C.green },
    { value: "84M", label: "Obrat (Kč)", sub: "z prodaných", color: C.orange },
  ];

  stats.forEach((stat, i) => {
    const x = 0.48 + i * 3.08;
    const y = 1.65;
    const bw = 2.92;
    const bh = 4.85;

    // Card
    s.addShape(prs.ShapeType.roundRect, {
      x, y, w: bw, h: bh,
      rectRadius: 0.18,
      fill: { color: C.white },
      line: { color: "e2dff5", width: 0.5 },
      shadow: makeShadow(),
    });

    // Top accent bar
    s.addShape(prs.ShapeType.rect, {
      x, y, w: bw, h: 0.2,
      fill: { color: stat.color },
      line: { width: 0 },
    });

    // Big number
    s.addText(stat.value, {
      x: x + 0.12, y: y + 0.55, w: bw - 0.24, h: 2.1,
      fontSize: 68, fontFace: GEORGIA, color: stat.color,
      bold: true, align: "center",
    });

    // Label
    s.addText(stat.label, {
      x: x + 0.12, y: y + 2.85, w: bw - 0.24, h: 0.65,
      fontSize: 16, fontFace: CALIBRI, color: C.text,
      bold: true, align: "center",
    });

    // Sub-label
    s.addText(stat.sub, {
      x: x + 0.12, y: y + 3.6, w: bw - 0.24, h: 0.5,
      fontSize: 12, fontFace: CALIBRI, color: C.muted,
      align: "center",
    });
  });
}

// ── Slide 4: Chart ────────────────────────────────────────────────────────────
{
  const s = prs.addSlide();
  s.background = { color: C.sheet };

  s.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 1.35,
    fill: { color: C.brand },
    line: { width: 0 },
  });
  s.addText("Prodeje — měsíční přehled", {
    x: 0.5, y: 0.22, w: 10, h: 0.8,
    fontSize: 34, fontFace: GEORGIA, color: C.white, bold: true,
  });

  // Bar chart
  s.addChart(prs.ChartType.bar, [
    {
      name: "Prodeje (počet)",
      labels: ["Říjen", "Listopad", "Prosinec", "Leden", "Únor", "Březen"],
      values: [8, 12, 7, 15, 11, 18],
    },
    {
      name: "Nové leady",
      labels: ["Říjen", "Listopad", "Prosinec", "Leden", "Únor", "Březen"],
      values: [22, 31, 19, 38, 27, 45],
    },
  ], {
    x: 0.55, y: 1.55, w: 12.2, h: 5.6,
    barDir: "col",
    barGrouping: "clustered",
    chartColors: [C.brand, C.light],
    showLegend: true,
    legendPos: "b",
    legendFontSize: 12,
    showGridLineMajorX: false,
    showGridLineMajorY: false,
    dataLabelFontSize: 10,
    axisLineColor: "e2dff5",
    valAxisLineColor: "e2dff5",
    catAxisLineColor: "e2dff5",
    valAxisLabelFontSize: 11,
    catAxisLabelFontSize: 11,
    valAxisNumFmt: "0",
    chartArea: { fill: { color: C.sheet } },
    plotArea: { fill: { color: C.sheet } },
  });
}

// ── Slide 5: Content (two-column) ─────────────────────────────────────────────
{
  const s = prs.addSlide();
  s.background = { color: C.sheet };

  s.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 1.35,
    fill: { color: C.brand },
    line: { width: 0 },
  });
  s.addText("Doporučení pro Q2", {
    x: 0.5, y: 0.22, w: 9, h: 0.8,
    fontSize: 34, fontFace: GEORGIA, color: C.white, bold: true,
  });

  // Left column — text
  s.addText("Strategické priority", {
    x: 0.5, y: 1.55, w: 5.8, h: 0.55,
    fontSize: 18, fontFace: GEORGIA, color: C.text, bold: true,
  });

  const bullets = [
    "Navýšit počet prohlídek u aktivních leadů o 20 %",
    "Zavést týdenní pipeline review každé pondělí ráno",
    "Posílit Bezrealitky kanál — konverze vyšší než Sreality",
    "Automatizovat follow-up reminder 48 h po prohlídce",
    "Cílovat na Praha 2 a Praha 7 — nejsilnější tržní aktivita",
  ];

  s.addText(
    bullets.map((b) => ({ text: b, options: { bullet: true, breakLine: true, paraSpaceBefore: 6 } })),
    {
      x: 0.5, y: 2.22, w: 5.8, h: 4.5,
      fontSize: 14, fontFace: CALIBRI, color: C.text,
      valign: "top",
    }
  );

  // Right column — visual blocks
  const panels = [
    { label: "Cíl: 60 prodejů Q2", color: C.brand, icon: "🎯" },
    { label: "Obrat: 120 mil. Kč", color: C.teal, icon: "💰" },
    { label: "NPS cíl: 4,8 / 5", color: C.green, icon: "⭐" },
  ];

  panels.forEach((p, i) => {
    const y = 1.55 + i * 1.8;
    s.addShape(prs.ShapeType.roundRect, {
      x: 7.1, y, w: 5.7, h: 1.55,
      rectRadius: 0.15,
      fill: { color: C.white },
      line: { color: "e2dff5", width: 0.5 },
      shadow: makeShadow(),
    });
    s.addShape(prs.ShapeType.rect, {
      x: 7.1, y, w: 0.28, h: 1.55,
      fill: { color: p.color },
      line: { width: 0 },
    });
    s.addText(p.icon, {
      x: 7.5, y: y + 0.18, w: 0.8, h: 0.8,
      fontSize: 28, align: "center",
    });
    s.addText(p.label, {
      x: 8.45, y: y + 0.38, w: 4.1, h: 0.65,
      fontSize: 15, fontFace: CALIBRI, color: C.text, bold: true,
    });
  });
}

// ── Slide 6: Card Grid (2×2) ──────────────────────────────────────────────────
{
  const s = prs.addSlide();
  s.background = { color: C.sheet };

  s.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 1.35,
    fill: { color: C.brand },
    line: { width: 0 },
  });
  s.addText("Výhody platformy Pepa", {
    x: 0.5, y: 0.22, w: 9, h: 0.8,
    fontSize: 34, fontFace: GEORGIA, color: C.white, bold: true,
  });

  const cards = [
    {
      icon: "🤖",
      title: "AI asistent",
      body: "Pepa odpovídá na otázky o klientech, leadech a aktivitách v přirozené češtině.",
      color: C.brand,
    },
    {
      icon: "📊",
      title: "Real-time přehledy",
      body: "Automatické PDF reporty s grafy a AI komentářem — týdně i měsíčně.",
      color: C.teal,
    },
    {
      icon: "🔔",
      title: "Monitoring portálů",
      body: "Sreality a Bezrealitky se scrapují denně; nové nabídky chodí na Telegram.",
      color: C.orange,
    },
    {
      icon: "📅",
      title: "Správa pipeline",
      body: "Přehledná pipeline s historií aktivit, poznámkami a propojenými nemovitostmi.",
      color: C.green,
    },
  ];

  const positions = [
    { x: 0.48, y: 1.55 },
    { x: 7.0,  y: 1.55 },
    { x: 0.48, y: 4.28 },
    { x: 7.0,  y: 4.28 },
  ];

  cards.forEach((card, i) => {
    const { x, y } = positions[i];
    const cw = 5.9;
    const ch = 2.5;

    s.addShape(prs.ShapeType.roundRect, {
      x, y, w: cw, h: ch,
      rectRadius: 0.18,
      fill: { color: C.white },
      line: { color: "e2dff5", width: 0.5 },
      shadow: makeShadow(),
    });

    // Top accent bar
    s.addShape(prs.ShapeType.rect, {
      x, y, w: cw, h: 0.22,
      fill: { color: card.color },
      line: { width: 0 },
    });

    // Icon circle
    s.addShape(prs.ShapeType.ellipse, {
      x: x + 0.2, y: y + 0.4, w: 0.75, h: 0.75,
      fill: { color: card.color, transparency: 88 },
      line: { width: 0 },
    });
    s.addText(card.icon, {
      x: x + 0.2, y: y + 0.38, w: 0.75, h: 0.75,
      fontSize: 22, align: "center", valign: "middle",
    });

    // Title
    s.addText(card.title, {
      x: x + 1.1, y: y + 0.44, w: cw - 1.3, h: 0.55,
      fontSize: 16, fontFace: GEORGIA, color: C.text, bold: true,
    });

    // Body
    s.addText(card.body, {
      x: x + 0.2, y: y + 1.12, w: cw - 0.4, h: 1.2,
      fontSize: 13, fontFace: CALIBRI, color: C.muted,
      valign: "top",
    });
  });
}

// ── Slide 7: Thank You ────────────────────────────────────────────────────────
{
  const s = prs.addSlide();
  s.background = { color: C.dark };

  // Decorative circles
  s.addShape(prs.ShapeType.ellipse, {
    x: -1.5, y: 4.5, w: 5.5, h: 5.5,
    fill: { color: C.brand, transparency: 80 },
    line: { width: 0 },
  });
  s.addShape(prs.ShapeType.ellipse, {
    x: 10.5, y: -1.2, w: 4, h: 4,
    fill: { color: C.brand, transparency: 72 },
    line: { width: 0 },
  });

  // Main text
  s.addText("Děkujeme!", {
    x: 1, y: 1.5, w: 11.3, h: 1.8,
    fontSize: 72, fontFace: GEORGIA, color: C.white, bold: true, align: "center",
  });

  s.addText("Jste připraveni posunout váš back office na další úroveň?", {
    x: 1, y: 3.55, w: 11.3, h: 0.7,
    fontSize: 18, fontFace: CALIBRI, color: C.light, align: "center",
  });

  // Separator
  s.addShape(prs.ShapeType.rect, {
    x: 5.4, y: 4.45, w: 2.5, h: 0.06,
    fill: { color: C.brand },
    line: { width: 0 },
  });

  // CTA / contact
  s.addText([
    { text: "pepa.app", options: { color: C.light, bold: true } },
    { text: "  ·  ", options: { color: C.muted } },
    { text: "support@pepa.app", options: { color: C.muted } },
  ], {
    x: 1, y: 4.75, w: 11.3, h: 0.6,
    fontSize: 15, fontFace: CALIBRI, align: "center",
  });
}

// ── Write output ──────────────────────────────────────────────────────────────
await prs.writeFile({ fileName: OUT });
console.log(`✓ Presentation saved → ${OUT}`);
