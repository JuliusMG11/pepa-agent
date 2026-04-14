/**
 * Builds a branded PPTX presentation from real ReportData.
 * Returns a Node.js Buffer — safe to upload to Supabase Storage.
 *
 * Palette (Pepa Midnight Indigo):
 *   DARK   1b1b20  dark slides (intro / outro)
 *   BRAND  4648d4  primary
 *   LIGHT  e1e0ff  ice accent
 *   SHEET  faf8fc  content bg
 *   WHITE  ffffff
 *   MUTED  a09db8
 */

import PptxGenJS from "pptxgenjs";
import type { ReportData } from "@/types/reports";

// ── Palette (no # — pptxgenjs requirement) ────────────────────────────────────
const C = {
  dark:   "1b1b20",
  brand:  "4648d4",
  light:  "e1e0ff",
  sheet:  "faf8fc",
  white:  "ffffff",
  muted:  "a09db8",
  text:   "1b1b20",
  green:  "16a34a",
  orange: "ea580c",
  teal:   "0d9488",
};

const W = 13.3;

const GEORGIA  = "Georgia";
const CALIBRI  = "Calibri";

const makeShadow = () => ({
  type:    "outer" as const,
  angle:   315,
  blur:    10,
  color:   "1b1b2026",
  offset:  3,
  opacity: 0.15,
});

function formatCzk(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mil. Kč`;
  return `${n.toLocaleString("cs-CZ")} Kč`;
}

// ── Header stripe helper ───────────────────────────────────────────────────────
function addHeader(
  s: PptxGenJS.Slide,
  prs: PptxGenJS,
  title: string,
  subtitle?: string
) {
  const h = subtitle ? 1.6 : 1.35;
  s.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: W, h,
    fill: { color: C.brand },
    line: { width: 0 },
  });
  s.addText(title, {
    x: 0.5, y: 0.2, w: 11, h: subtitle ? 0.8 : 0.92,
    fontSize: 32, fontFace: GEORGIA, color: C.white, bold: true,
  });
  if (subtitle) {
    s.addText(subtitle, {
      x: 0.5, y: 1.06, w: 11, h: 0.42,
      fontSize: 12, fontFace: CALIBRI, color: C.light,
    });
  }
}

// ── Dark slide background helper ───────────────────────────────────────────────
function setDarkBg(s: PptxGenJS.Slide, prs: PptxGenJS) {
  s.background = { color: C.dark };
  // Decorative circle top-right
  s.addShape(prs.ShapeType.ellipse, {
    x: 9.8, y: -1.0, w: 5.0, h: 5.0,
    fill: { color: C.brand, transparency: 74 },
    line: { width: 0 },
  });
  // Decorative circle bottom-left
  s.addShape(prs.ShapeType.ellipse, {
    x: -1.8, y: 5.2, w: 4.5, h: 4.5,
    fill: { color: C.brand, transparency: 80 },
    line: { width: 0 },
  });
}

// ── Build ─────────────────────────────────────────────────────────────────────
export async function buildReportPptxBuffer(
  title: string,
  report: ReportData,
  closingLine?: string
): Promise<Buffer> {
  const prs = new PptxGenJS();
  prs.layout = "LAYOUT_WIDE";

  const { metrics } = report;

  // ── Slide 1: Intro ─────────────────────────────────────────────────────────
  {
    const s = prs.addSlide();
    setDarkBg(s, prs);

    s.addText("PEPA · BACK OFFICE", {
      x: 0.55, y: 1.35, w: 8, h: 0.4,
      fontSize: 11, fontFace: CALIBRI, color: C.light,
      charSpacing: 3,
    });
    s.addText(title, {
      x: 0.55, y: 1.9, w: 9, h: 2.4,
      fontSize: 48, fontFace: GEORGIA, color: C.white, bold: true,
    });
    s.addText(report.period.label, {
      x: 0.55, y: 4.45, w: 8, h: 0.55,
      fontSize: 16, fontFace: CALIBRI, color: C.muted,
    });
    s.addShape(prs.ShapeType.rect, {
      x: 0.55, y: 5.2, w: 2.0, h: 0.065,
      fill: { color: C.brand },
      line: { width: 0 },
    });
    s.addText(new Date().toLocaleDateString("cs-CZ"), {
      x: 0.55, y: 5.45, w: 3, h: 0.38,
      fontSize: 12, fontFace: CALIBRI, color: C.muted,
    });
  }

  // ── Slide 2: Agenda ────────────────────────────────────────────────────────
  {
    const s = prs.addSlide();
    s.background = { color: C.sheet };
    addHeader(s, prs, "Program prezentace");

    const items = [
      "Klíčové ukazatele výkonnosti (KPI)",
      "Vývoj leadů a zdrojů — grafický přehled",
      "Pipeline a konverzní míra",
      "Aktivity a follow-up tým",
      "Doporučení a příští kroky",
    ];

    items.forEach((label, i) => {
      const y = 1.62 + i * 1.0;
      const num = String(i + 1).padStart(2, "0");

      s.addShape(prs.ShapeType.ellipse, {
        x: 0.5, y, w: 0.7, h: 0.7,
        fill: { color: C.brand },
        line: { width: 0 },
        shadow: makeShadow(),
      });
      s.addText(num, {
        x: 0.5, y, w: 0.7, h: 0.7,
        fontSize: 13, fontFace: CALIBRI, color: C.white, bold: true,
        align: "center", valign: "middle",
      });
      s.addText(label, {
        x: 1.38, y: y + 0.12, w: 11, h: 0.46,
        fontSize: 16, fontFace: CALIBRI, color: C.text,
      });
      if (i < items.length - 1) {
        s.addShape(prs.ShapeType.line, {
          x: 0.5, y: y + 0.76, w: 11.5, h: 0,
          line: { color: "d5d2e9", width: 0.5 },
        });
      }
    });
  }

  // ── Slide 3: Stats (KPI) ───────────────────────────────────────────────────
  {
    const s = prs.addSlide();
    s.background = { color: C.sheet };
    addHeader(s, prs, "Klíčové metriky", report.period.label);

    const conv =
      metrics.conversionRate <= 1
        ? `${Math.round(metrics.conversionRate * 100)} %`
        : `${Math.round(metrics.conversionRate)} %`;

    const stats = [
      { value: String(metrics.newLeads),       label: "Nové leady",      sub: "v období",           color: C.brand  },
      { value: String(metrics.closedWon),       label: "Uzavřeno (výhra)", sub: "uzavřených obchodů", color: C.teal   },
      { value: conv,                            label: "Konverze",         sub: "won / uzavřené",     color: C.green  },
      { value: formatCzk(metrics.revenueEstimate ?? metrics.totalRevenue ?? 0),
                                                label: "Obrat",            sub: "prodáno v období",   color: C.orange },
    ];

    stats.forEach((stat, i) => {
      const x = 0.48 + i * 3.08;
      const y = 1.78;
      const bw = 2.92;
      const bh = 4.7;

      s.addShape(prs.ShapeType.roundRect, {
        x, y, w: bw, h: bh,
        rectRadius: 0.16,
        fill: { color: C.white },
        line: { color: "e2dff5", width: 0.5 },
        shadow: makeShadow(),
      });
      s.addShape(prs.ShapeType.rect, {
        x, y, w: bw, h: 0.18,
        fill: { color: stat.color },
        line: { width: 0 },
      });

      // Big number
      const fs = stat.value.length > 7 ? 36 : stat.value.length > 5 ? 48 : 64;
      s.addText(stat.value, {
        x: x + 0.1, y: y + 0.5, w: bw - 0.2, h: 2.1,
        fontSize: fs, fontFace: GEORGIA, color: stat.color, bold: true, align: "center",
      });
      s.addText(stat.label, {
        x: x + 0.1, y: y + 2.78, w: bw - 0.2, h: 0.62,
        fontSize: 15, fontFace: CALIBRI, color: C.text, bold: true, align: "center",
      });
      s.addText(stat.sub, {
        x: x + 0.1, y: y + 3.5, w: bw - 0.2, h: 0.45,
        fontSize: 11, fontFace: CALIBRI, color: C.muted, align: "center",
      });
    });
  }

  // ── Slide 4: Chart (leads by source) ──────────────────────────────────────
  {
    const s = prs.addSlide();
    s.background = { color: C.sheet };
    addHeader(s, prs, "Leady podle zdroje", "Počet nových leadů v období podle kanálu");

    const src = (report.leadsBySource ?? []).slice(0, 8);
    const hasData = src.length > 0 && src.some((r) => r.count > 0);

    if (hasData) {
      s.addChart(prs.ChartType.bar, [
        {
          name: "Počet leadů",
          labels: src.map((r) => r.source ?? r.label ?? "—"),
          values: src.map((r) => r.count),
        },
      ], {
        x: 0.5, y: 1.72, w: 12.3, h: 5.45,
        barDir: "col",
        barGrouping: "clustered",
        chartColors: [C.brand],
        showLegend: false,
        showGridLineMajorX: false,
        showGridLineMajorY: false,
        showValue: true,
        dataLabelFontSize: 11,
        dataLabelColor: C.text,
        axisLineColor: "e2dff5",
        valAxisLineColor: "e2dff5",
        catAxisLineColor: "e2dff5",
        valAxisLabelFontSize: 11,
        catAxisLabelFontSize: 12,
        valAxisNumFmt: "0",
        chartArea: { fill: { color: C.sheet } },
        plotArea: { fill: { color: C.sheet } },
      });
    } else {
      // No data placeholder
      s.addShape(prs.ShapeType.roundRect, {
        x: 2.5, y: 2.5, w: 8.3, h: 3.5,
        rectRadius: 0.2,
        fill: { color: "f0edfb" },
        line: { color: "e2dff5", width: 0.5 },
      });
      s.addText("V tomto období nejsou data pro zobrazení grafu.", {
        x: 2.5, y: 3.5, w: 8.3, h: 1.5,
        fontSize: 14, fontFace: CALIBRI, color: C.muted, align: "center",
      });
    }
  }

  // ── Slide 5: Content (pipeline + insights) ─────────────────────────────────
  {
    const s = prs.addSlide();
    s.background = { color: C.sheet };
    addHeader(s, prs, "Pipeline — aktuální stav");

    // Left: pipeline funnel list
    const funnel = (report.pipelineFunnel ?? []).slice(0, 4);
    const total = funnel.reduce((a, b) => a + b.count, 0) || 1;

    s.addText("Rozložení otevřených leadů", {
      x: 0.5, y: 1.72, w: 6, h: 0.5,
      fontSize: 16, fontFace: GEORGIA, color: C.text, bold: true,
    });

    const stageColors = [C.brand, C.teal, C.green, C.orange];
    funnel.forEach((stage, i) => {
      const y = 2.35 + i * 1.1;
      const barW = Math.max(0.3, ((stage.count / total) * 5.2));
      const col = stageColors[i % stageColors.length]!;

      // Label + count
      s.addText(stage.label, {
        x: 0.5, y, w: 3.5, h: 0.45,
        fontSize: 13, fontFace: CALIBRI, color: C.text, bold: true,
      });
      s.addText(String(stage.count), {
        x: 4.2, y, w: 1, h: 0.45,
        fontSize: 13, fontFace: CALIBRI, color: col, bold: true, align: "right",
      });
      // Bar track
      s.addShape(prs.ShapeType.rect, {
        x: 0.5, y: y + 0.5, w: 5.5, h: 0.28,
        fill: { color: col, transparency: 82 },
        line: { width: 0 },
      });
      // Bar fill
      s.addShape(prs.ShapeType.rect, {
        x: 0.5, y: y + 0.5, w: barW, h: 0.28,
        fill: { color: col },
        line: { width: 0 },
      });
    });

    // Right: quick stat panels
    const panels = [
      { label: "Noví klienti", value: String(metrics.newClients), color: C.brand },
      { label: "Nové nemovitosti", value: String(metrics.newProperties), color: C.teal },
      {
        label: "Prům. dní k uzavření",
        value: metrics.avgDaysToClose > 0 ? `${metrics.avgDaysToClose} dní` : "—",
        color: C.orange,
      },
    ];

    s.addText("Doplňkové metriky", {
      x: 7.1, y: 1.72, w: 5.7, h: 0.5,
      fontSize: 16, fontFace: GEORGIA, color: C.text, bold: true,
    });

    panels.forEach((p, i) => {
      const y = 2.35 + i * 1.52;
      s.addShape(prs.ShapeType.roundRect, {
        x: 7.1, y, w: 5.7, h: 1.32,
        rectRadius: 0.14,
        fill: { color: C.white },
        line: { color: "e2dff5", width: 0.5 },
        shadow: makeShadow(),
      });
      s.addShape(prs.ShapeType.rect, {
        x: 7.1, y, w: 0.24, h: 1.32,
        fill: { color: p.color },
        line: { width: 0 },
      });
      s.addText(p.value, {
        x: 7.48, y: y + 0.18, w: 4.9, h: 0.65,
        fontSize: 30, fontFace: GEORGIA, color: p.color, bold: true,
      });
      s.addText(p.label, {
        x: 7.48, y: y + 0.82, w: 4.9, h: 0.38,
        fontSize: 12, fontFace: CALIBRI, color: C.muted,
      });
    });
  }

  // ── Slide 6: Card grid (activities) ───────────────────────────────────────
  {
    const s = prs.addSlide();
    s.background = { color: C.sheet };
    addHeader(s, prs, "Aktivity v období", `Celkem: ${metrics.totalActivities ?? 0} aktivit`);

    const actData = (report.activitiesByType ?? []).slice(0, 4);
    const cardColors = [C.brand, C.teal, C.green, C.orange];

    const positions: [number, number][] = [
      [0.48, 1.72], [7.0, 1.72],
      [0.48, 4.45], [7.0, 4.45],
    ];

    // Fill missing slots
    while (actData.length < 4) {
      actData.push({ type: "—", label: "—", count: 0 });
    }

    actData.slice(0, 4).forEach((act, i) => {
      const [x, y] = positions[i]!;
      const col = cardColors[i % cardColors.length]!;
      const cw = 5.9;
      const ch = 2.35;

      s.addShape(prs.ShapeType.roundRect, {
        x, y, w: cw, h: ch,
        rectRadius: 0.16,
        fill: { color: C.white },
        line: { color: "e2dff5", width: 0.5 },
        shadow: makeShadow(),
      });
      s.addShape(prs.ShapeType.rect, {
        x, y, w: cw, h: 0.2,
        fill: { color: col },
        line: { width: 0 },
      });

      // Count
      s.addText(String(act.count), {
        x: x + 0.25, y: y + 0.38, w: cw - 0.5, h: 1.15,
        fontSize: 56, fontFace: GEORGIA, color: col, bold: true, align: "center",
      });
      // Type label
      s.addText(act.label ?? act.type, {
        x: x + 0.25, y: y + 1.55, w: cw - 0.5, h: 0.55,
        fontSize: 14, fontFace: CALIBRI, color: C.text, bold: true, align: "center",
      });
    });
  }

  // ── Slide 7: Thank You ─────────────────────────────────────────────────────
  {
    const s = prs.addSlide();
    setDarkBg(s, prs);

    s.addText("Díky za pozornost", {
      x: 0.6, y: 1.6, w: 12.1, h: 1.9,
      fontSize: 62, fontFace: GEORGIA, color: C.white, bold: true, align: "center",
    });

    if (closingLine) {
      s.addText(closingLine, {
        x: 1.2, y: 3.7, w: 10.9, h: 0.75,
        fontSize: 16, fontFace: CALIBRI, color: C.light, align: "center",
      });
    }

    s.addShape(prs.ShapeType.rect, {
      x: 5.5, y: 4.62, w: 2.3, h: 0.065,
      fill: { color: C.brand },
      line: { width: 0 },
    });

    s.addText([
      { text: "Pepa · Back Office", options: { color: C.light, bold: true } },
      { text: "  ·  ",              options: { color: C.muted } },
      { text: report.period.label,  options: { color: C.muted } },
    ], {
      x: 1, y: 4.86, w: 11.3, h: 0.55,
      fontSize: 14, fontFace: CALIBRI, align: "center",
    });
  }

  // ── Render to Buffer ───────────────────────────────────────────────────────
  const output = await prs.write({ outputType: "nodebuffer" });
  return output as Buffer;
}
