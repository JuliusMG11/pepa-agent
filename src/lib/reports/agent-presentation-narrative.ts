import { z } from "zod";
import { anthropic, CLAUDE_MODEL } from "@/lib/claude/client";
import type { ReportData } from "@/lib/claude/tools/generate-report";

const NarrativeSchema = z.object({
  intro: z.array(z.string()).max(6),
  keyInsights: z.array(z.string()).max(10),
  improvements: z.array(z.string()).max(12),
  closingLine: z.string(),
});

export type AgentPresentationNarrative = z.infer<typeof NarrativeSchema>;

function convPercent(m: ReportData["metrics"]): number {
  const r = m.conversionRate;
  return r <= 1 ? Math.round(r * 100) : Math.round(r);
}

/**
 * Krátké texty pro PDF „prezentaci“ z Ask Pepa — čeština, konkrétní čísla.
 */
export async function generateAgentPresentationNarrative(
  report: ReportData
): Promise<AgentPresentationNarrative | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const payload = {
    period: report.period,
    metrics: report.metrics,
    leadsBySource: report.leadsBySource ?? [],
    leadsByStatus: report.leadsByStatus ?? [],
    activitiesByType: report.activitiesByType ?? [],
    propertiesByDistrict: report.propertiesByDistrict ?? [],
    weeklyBreakdown: report.weeklyBreakdown ?? [],
  };

  const userPrompt = `Jsi senior analytik realitního back office v České republice. Dostaneš strukturovaná data za období.

Úkol: připrav texty do jednostránkového až třístránkového PDF shrnutí — profesionální čeština (vykání), konkrétní čísla, žádné prázdné fráze.

Vrať POUZE platný JSON (žádný markdown):
{
  "intro": ["2–4 krátké věty: kontext období a hlavní obraz z čísel"],
  "keyInsights": ["5–8 bodů: zdroje leadů, pipeline, aktivity vs. prodeje, čtvrtě, týdenní trend pokud dává smysl"],
  "improvements": ["6–10 bodů: kde se tým může zlepšit — follow-up, zdroje, prohlídky, konverze; formuluj konstruktivně"],
  "closingLine": "jedna věta závěru (motivace / další krok)"
}

Data:\n${JSON.stringify(payload)}`;

  try {
    const res = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
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
    console.error("[agent-presentation-narrative]", e);
    return null;
  }
}

export function buildFallbackAgentPresentationNarrative(
  report: ReportData
): AgentPresentationNarrative {
  const m = report.metrics;
  const conv = convPercent(m);
  const topSrc = report.leadsBySource?.[0];
  const topStatus = report.leadsByStatus?.[0];
  const topAct = report.activitiesByType?.[0];

  const intro: string[] = [
    `Období „${report.period.label}“: ${m.newLeads} nových leadů, ${m.closedWon} výher a ${m.closedLost} proher při uzavřených obchodech.`,
    m.totalActivities > 0
      ? `Tým zaznamenal ${m.totalActivities} aktivit — ${topAct ? `nejvíc „${topAct.label}“ (${topAct.count}).` : "rozložení viz graf níže."}`
      : "V období nejsou evidované aktivity — zvažte navýšení kontaktu s leady.",
  ];

  const keyInsights: string[] = [
    `Konverze (podíl výher mezi uzavřenými): ${conv} %.`,
    topSrc
      ? `Nejsilnější zdroj leadů: ${topSrc.label} (${topSrc.count}).`
      : "Zdroje leadů nejsou k dispozici.",
    topStatus
      ? `Nejčastější fáze nových leadů: ${topStatus.label} (${topStatus.count}).`
      : "",
    m.soldProperties > 0
      ? `Prodáno ${m.soldProperties} nemovitostí, odhad tržeb z prodejů ${m.revenueEstimate.toLocaleString("cs-CZ")} Kč.`
      : "V období nebyl zaznamenán prodej nemovitosti — zkontrolujte nabídky a pipeline.",
    m.topAgent.deals > 0
      ? `Nejvíc uzavřených prodejů nemovitostí: ${m.topAgent.name} (${m.topAgent.deals}).`
      : "Prodeje nemovitostí bez přiřazeného agenta nebo bez uzavření v období.",
  ].filter(Boolean);

  const improvements: string[] = [];
  if (conv < 35 && m.closedWon + m.closedLost > 0) {
    improvements.push(
      "Konverze pod 35 % u uzavřených obchodů — zrevidujte kvalifikaci leadů a důvody proher."
    );
  }
  if (m.totalActivities < m.newLeads * 2 && m.newLeads > 0) {
    improvements.push(
      "Poměr aktivit k novým leadům je nízký — naplánujte systematický follow-up (hovory, prohlídky)."
    );
  }
  if (m.soldProperties === 0 && m.newLeads > 3) {
    improvements.push(
      "Hodně nových leadů, ale žádný prodej v období — ověřte rychlost reakce a termíny prohlídek."
    );
  }
  if (
    (report.activitiesByType ?? []).some(
      (a) => a.label.includes("Prohlídky") && a.count < 2
    ) &&
    m.newLeads > 5
  ) {
    improvements.push("Posilte počet prohlídek u aktivních leadů.");
  }
  improvements.push(
    "Srovnejte podíl zdrojů leadů s náklady — investujte do kanálů s nejlepší návratností.",
    "Týdně vyhodnocujte pipeline podle fází a posouvejte stagnující leady.",
    "Po každé prohře zapište důvod — data pomohou příští kvalifikaci."
  );

  return {
    intro,
    keyInsights,
    improvements: improvements.slice(0, 12),
    closingLine:
      "Shrnutí odpovídá datům v Pepa; další krok je prioritizovat oblasti výše a sledovat stejné metriky příští období.",
  };
}
