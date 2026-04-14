// src/lib/reports/agent-report-pdf.test.ts
import { describe, it, expect } from "vitest";
import { buildAgentReportPdfBuffer } from "./agent-report-pdf";
import type { ReportData } from "@/lib/claude/tools/generate-report";
import type { AgentPresentationNarrative } from "./agent-presentation-narrative";

function makeMinimalReport(overrides: Partial<ReportData> = {}): ReportData {
  return {
    period: {
      label: "W14 (7. dubna 2025 – 13. dubna 2025)",
      from: "2025-04-07T00:00:00.000Z",
      to: "2025-04-13T23:59:59.999Z",
    },
    metrics: {
      newLeads: 5,
      closedWon: 2,
      closedLost: 1,
      conversionRate: 67,
      newClients: 3,
      newProperties: 4,
      soldProperties: 2,
      revenueEstimate: 15_000_000,
      totalActivities: 12,
      avgDaysToClose: 14,
      topAgent: { name: "Jan Novák", deals: 2 },
    },
    generatedAt: "2025-04-14T08:00:00.000Z",
    leadsBySource: [{ label: "Doporučení", count: 3 }],
    leadsByStatus: [{ label: "Nový", count: 2 }],
    propertiesByDistrict: [],
    activitiesByType: [{ label: "Hovor", count: 5 }],
    weeklyBreakdown: [],
    ...overrides,
  };
}

function makeNarrative(): AgentPresentationNarrative {
  return {
    intro: ["Toto je testovací zpráva za sledované období."],
    keyInsights: ["Leady rostou.", "Konverze je dobrá."],
    improvements: ["Zlepšit follow-up.", "Více prohlídek."],
    closingLine: "Celkově solidní výsledky.",
  };
}

describe("buildAgentReportPdfBuffer", () => {
  it("returns a non-empty Buffer for minimal report data", async () => {
    const buf = await buildAgentReportPdfBuffer(
      "Týdenní přehled",
      "W14 2025",
      makeMinimalReport(),
      makeNarrative()
    );
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("does not throw when topProperties is populated", async () => {
    const report = makeMinimalReport({
      topProperties: [
        { title: "Byt 2+kk Holešovice", district: "Holešovice", price: 8_500_000, agentName: "Jan Novák" },
        { title: "Byt 3+kk Vinohrady", district: "Vinohrady", price: 12_000_000, agentName: "Eva Nováková" },
      ],
    });
    await expect(
      buildAgentReportPdfBuffer("Test", "W14", report, makeNarrative())
    ).resolves.toBeInstanceOf(Buffer);
  });

  it("does not throw when pipelineFunnel is populated", async () => {
    const report = makeMinimalReport({
      pipelineFunnel: [
        { status: "new", label: "Nový", count: 5 },
        { status: "contacted", label: "Kontaktován", count: 3 },
        { status: "viewing_scheduled", label: "Prohlídka", count: 2 },
        { status: "offer_made", label: "Nabídka", count: 1 },
      ],
    });
    await expect(
      buildAgentReportPdfBuffer("Test", "W14", report, makeNarrative())
    ).resolves.toBeInstanceOf(Buffer);
  });

  it("does not throw when topProperties and pipelineFunnel are empty", async () => {
    const report = makeMinimalReport({
      topProperties: [],
      pipelineFunnel: [],
    });
    await expect(
      buildAgentReportPdfBuffer("Test", "W14", report, makeNarrative())
    ).resolves.toBeInstanceOf(Buffer);
  });

  it("does not throw when topProperties are undefined", async () => {
    const report = makeMinimalReport({
      topProperties: undefined,
      pipelineFunnel: undefined,
    });
    await expect(
      buildAgentReportPdfBuffer("Test", "W14", report, makeNarrative())
    ).resolves.toBeInstanceOf(Buffer);
  });

  it("handles empty property title without throwing (empty-title guard)", async () => {
    const report = makeMinimalReport({
      topProperties: [
        { title: "", district: "Praha 1", price: 5_000_000, agentName: "—" },
      ],
    });
    await expect(
      buildAgentReportPdfBuffer("Test", "W14", report, makeNarrative())
    ).resolves.toBeInstanceOf(Buffer);
  });
});
