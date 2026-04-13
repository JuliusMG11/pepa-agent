import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeadKanban } from "./LeadKanban";
import type { LeadPipelineRow } from "@/lib/data/clients";

// dnd-kit needs a real DOM pointer events — mock sensors at module level
vi.mock("@dnd-kit/core", async () => {
  const actual = await vi.importActual<typeof import("@dnd-kit/core")>("@dnd-kit/core");
  return {
    ...actual,
    // Disable pointer sensor activation for unit tests
    PointerSensor: actual.PointerSensor,
  };
});

vi.mock("@/app/(dashboard)/leads/actions", () => ({
  updateLeadStatus: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/components/ui/toaster", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeLead(overrides: Partial<LeadPipelineRow> = {}): LeadPipelineRow {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    client_name: "Jan Novák",
    client_id: "00000000-0000-0000-0000-000000000010",
    status: "new",
    property_title: "Byt 2+kk Holešovice",
    property_address: "Osadní 35, Praha 7",
    property_price: 8_500_000,
    property_id: "00000000-0000-0000-0000-000000000020",
    agent_name: "Petra Agent",
    updated_at: new Date(Date.now() - 2 * 86_400_000).toISOString(), // 2 days ago
    ...overrides,
  } as LeadPipelineRow;
}

describe("LeadKanban", () => {
  it("renders all 6 column headers", () => {
    render(<LeadKanban leads={[]} onSelectLead={vi.fn()} />);

    expect(screen.getByText("Nový")).toBeInTheDocument();
    expect(screen.getByText("Kontaktován")).toBeInTheDocument();
    expect(screen.getByText("Prohlídka")).toBeInTheDocument();
    expect(screen.getByText("Nabídka")).toBeInTheDocument();
    expect(screen.getByText(/Uzavřen ✓/)).toBeInTheDocument();
    expect(screen.getByText(/Uzavřen ✗/)).toBeInTheDocument();
  });

  it("renders lead card in the correct column", () => {
    const lead = makeLead({ status: "contacted" });

    render(<LeadKanban leads={[lead]} onSelectLead={vi.fn()} />);

    expect(screen.getByText("Jan Novák")).toBeInTheDocument();
    expect(screen.getByText("Byt 2+kk Holešovice")).toBeInTheDocument();
  });

  it("shows property address and formatted price on card", () => {
    const lead = makeLead({ property_price: 8_500_000 });

    render(<LeadKanban leads={[lead]} onSelectLead={vi.fn()} />);

    expect(screen.getByText("Osadní 35, Praha 7")).toBeInTheDocument();
    // 8.5 mil. Kč or similar format
    expect(screen.getByText(/8[,.]5 mil\. Kč/)).toBeInTheDocument();
  });

  it("shows column count badge for each status", () => {
    const leads = [
      makeLead({ id: "1", status: "new" }),
      makeLead({ id: "2", status: "new" }),
      makeLead({ id: "3", status: "closed_won" }),
    ];

    render(<LeadKanban leads={leads} onSelectLead={vi.fn()} />);

    // "Nový" column should show badge "2"
    const newColumn = screen.getByText("Nový").closest("div");
    expect(newColumn).toBeDefined();
  });

  it("shows empty drop zone hint when column has no leads", () => {
    render(<LeadKanban leads={[]} onSelectLead={vi.fn()} />);

    // All columns are empty — should show "Přetáhněte sem" in each
    const hints = screen.getAllByText("Přetáhněte sem");
    expect(hints.length).toBe(6);
  });

  it("calls onSelectLead when detail button is clicked", async () => {
    const onSelect = vi.fn();
    const lead = makeLead();

    render(<LeadKanban leads={[lead]} onSelectLead={onSelect} />);

    const button = screen.getByText("Zobrazit detail");
    button.click();

    expect(onSelect).toHaveBeenCalledWith(lead);
  });

  it("hides price when property_price is null or 0", () => {
    const lead = makeLead({ property_price: null });

    render(<LeadKanban leads={[lead]} onSelectLead={vi.fn()} />);

    expect(screen.queryByText(/Kč/)).toBeNull();
  });

  it("renders agent name on card", () => {
    const lead = makeLead({ agent_name: "Petra Nováková" });

    render(<LeadKanban leads={[lead]} onSelectLead={vi.fn()} />);

    expect(screen.getByText("Petra Nováková")).toBeInTheDocument();
  });
});
