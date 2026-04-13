import { z } from "zod";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude/client";
import type { ReportData } from "@/types/reports";

const NarrativeSchema = z.object({
  titleSubtitle: z.string(),
  executiveBullets: z.array(z.string()).max(10),
  analysisParagraphs: z.array(z.string()).max(10),
  recommendations: z.array(z.string()).max(12),
  chartNotes: z
    .object({
      leads: z.string().optional(),
      activities: z.string().optional(),
      districts: z.string().optional(),
      pipeline: z.string().optional(),
      weekly: z.string().optional(),
    })
    .optional(),
});

export type ReportPdfNarrative = z.infer<typeof NarrativeSchema>;

/**
 * Claude připraví texty a poznámky k grafům pro vícestránkový PDF report.
 */
export async function generateReportPdfNarrative(
  report: ReportData,
  ctx: { authorName: string; companyLine?: string }
): Promise<ReportPdfNarrative | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const payload = {
    period: report.period,
    metrics: report.metrics,
    leadsBySource: report.leadsBySource,
    leadsByStatus: report.leadsByStatus,
    propertiesByDistrict: report.propertiesByDistrict,
    activitiesByType: report.activitiesByType,
    weeklyBreakdown: report.weeklyBreakdown,
  };

  const userPrompt = `Jsi senior analytik realitního back office v České republice. Dostaneš strukturovaná data za zvolené období (leady, nemovitosti, aktivity, týdenní přehled).

Úkol: připrav profesionální texty do PDF reportu v češtině (vykání), stručně a věcně — žádné obecné fráze typu „důležité je komunikovat“, raději konkrétní čísla a souvislosti z dat.

Vrať POUZE platný JSON (žádný markdown, žádný text před nebo za JSON) v tomto tvaru:
{
  "titleSubtitle": "jedna věta pod hlavním titulkem reportu",
  "executiveBullets": ["4–7 bodů: co čísla znamenají pro tým (leadové zdroje, pipeline, obrat, aktivity)"],
  "analysisParagraphs": ["3–5 odstavců: trendy, slabá místa, srovnání zdrojů leadů, čtvrtí, aktivity vs. uzavření"],
  "recommendations": ["5–9 konkrétních kroků pro obchodníky (prioritizace zdrojů, follow-up, prohlídky)"],
  "chartNotes": {
    "leads": "1–2 věty k významu grafu leadů podle zdroje",
    "pipeline": "1–2 věty k rozložení nových leadů podle fáze (status)",
    "activities": "1–2 věty k aktivitám",
    "districts": "1–2 věty k obratu podle čtvrtí",
    "weekly": "1–2 věty k týdennímu přehledu (pokud má smysl)"
  }
}

Vypracoval: ${ctx.authorName}${ctx.companyLine ? `, ${ctx.companyLine}` : ""}.

Data (JSON):\n${JSON.stringify(payload)}`;

  try {
    const res = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 6144,
      messages: [{ role: "user", content: userPrompt }],
    });

    const block = res.content[0];
    if (block.type !== "text") return null;

    const raw = block.text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as unknown;
    return NarrativeSchema.parse(parsed);
  } catch (e) {
    console.error("[report-ai-narrative]", e);
    return null;
  }
}
