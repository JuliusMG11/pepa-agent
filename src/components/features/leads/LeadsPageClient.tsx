"use client";

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Kanban, LayoutGrid, List, Plus } from "lucide-react";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import { CsvImportToolbarButton } from "@/components/features/data-import/CsvImportToolbarButton";
import { LeadKanban } from "./LeadKanban";
import { LeadDrawer } from "./LeadDrawer";
import { NewLeadDialog } from "./NewLeadDialog";
import type { LeadPipelineRow } from "@/lib/data/clients";

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Nový",
  contacted: "Kontaktován",
  viewing_scheduled: "Prohlídka",
  offer_made: "Nabídka",
  closed_won: "Uzavřen ✓",
  closed_lost: "Uzavřen ✗",
};

const LEAD_STATUS_STYLES: Record<string, { backgroundColor: string; color: string }> = {
  new: { backgroundColor: "rgba(70,72,212,0.08)", color: "var(--color-brand)" },
  contacted: { backgroundColor: "#fef3c7", color: "#92400e" },
  viewing_scheduled: { backgroundColor: "#e0f2fe", color: "#0369a1" },
  offer_made: { backgroundColor: "#f3e8ff", color: "#7e22ce" },
  closed_won: { backgroundColor: "#dcfce7", color: "#166534" },
  closed_lost: { backgroundColor: "#fee2e2", color: "#991b1b" },
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Client {
  id: string;
  full_name: string;
}

interface Property {
  id: string;
  title: string;
  address: string;
}

interface LeadsPageClientProps {
  leads: LeadPipelineRow[];
  clients: Client[];
  properties: Property[];
}

export function LeadsPageClient({ leads, clients, properties }: LeadsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [selectedLead, setSelectedLead] = useState<LeadPipelineRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const closeLeadDialog = useCallback(() => {
    setDialogOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new");
    const qs = params.toString();
    router.replace(qs ? `/leads?${qs}` : "/leads");
  }, [router, searchParams]);

  // Open dialog if ?new=1 in URL; otherwise keep closed (after úspěšné uložení musí zmizet ?new=1)
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setDialogOpen(true);
    } else {
      setDialogOpen(false);
    }
  }, [searchParams]);

  const handleSelectLead = useCallback((lead: LeadPipelineRow) => {
    setSelectedLead(lead);
  }, []);

  const closeLeadDrawer = useCallback(() => {
    setSelectedLead(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("lead");
    const qs = params.toString();
    router.replace(qs ? `/leads?${qs}` : "/leads");
  }, [router, searchParams]);

  useEffect(() => {
    const id = searchParams.get("lead");
    if (!id || leads.length === 0) return;
    const found = leads.find((l) => l.id === id);
    if (found) setSelectedLead(found);
  }, [searchParams, leads]);

  const viewShellClass =
    "flex min-h-[280px] max-h-[min(85vh,calc(100dvh-12rem))] h-[min(85vh,calc(100dvh-12rem))] flex-col overflow-hidden rounded-2xl";

  const viewShellStyle: CSSProperties = {
    backgroundColor: "var(--color-bg-card)",
    boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
    border: "1px solid rgba(199,196,215,0.12)",
  };

  return (
    <div className="flex min-h-0 flex-col gap-5">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-between">
        <div
          className="flex rounded-lg p-0.5"
          style={{ backgroundColor: "#f0ecf4" }}
        >
          <button
            onClick={() => setView("kanban")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all"
            style={
              view === "kanban"
                ? { backgroundColor: "var(--color-bg-card)", color: "var(--color-brand)", boxShadow: "0 1px 4px rgba(70,72,212,0.12)" }
                : { color: "var(--color-text-muted)" }
            }
          >
            <LayoutGrid size={13} strokeWidth={1.5} />
            Kanban
          </button>
          <button
            onClick={() => setView("table")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all"
            style={
              view === "table"
                ? { backgroundColor: "var(--color-bg-card)", color: "var(--color-brand)", boxShadow: "0 1px 4px rgba(70,72,212,0.12)" }
                : { color: "var(--color-text-muted)" }
            }
          >
            <List size={13} strokeWidth={1.5} />
            Tabulka
          </button>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          <CsvImportToolbarButton entity="leads" />
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg text-white transition-opacity hover:opacity-80 cursor-pointer"
            style={{ backgroundColor: "var(--color-brand)" }}
          >
            <Plus size={13} strokeWidth={2} />
            Nový lead
          </button>
        </div>
      </div>

      {/* Views */}
      {leads.length === 0 ? (
        <ListEmptyState
          icon={<Kanban size={28} style={{ color: "#c7c4d7" }} />}
          title="Žádné leady v tomto období."
          description="Vytvořte první lead tlačítkem výše nebo naplánujte prohlídky z detailu klienta."
        />
      ) : view === "kanban" ? (
        <div className={`${viewShellClass} min-h-0`} style={viewShellStyle}>
          <div className="min-h-0 flex-1 overflow-hidden p-1 sm:p-2">
            <LeadKanban leads={leads} onSelectLead={handleSelectLead} />
          </div>
        </div>
      ) : (
        <div className={`${viewShellClass} min-h-0`} style={viewShellStyle}>
          <div className="min-h-0 flex-1 overflow-auto overscroll-contain [scrollbar-gutter:stable]">
            <div className="overflow-x-auto min-w-0">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr style={{ backgroundColor: "rgba(246,242,250,0.5)" }}>
                  {["Klient", "Nemovitost", "Status", "Zdroj", "Agent", "Poslední kontakt", "Vytvořen"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-[10px] font-bold tracking-widest uppercase"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const statusStyle = LEAD_STATUS_STYLES[lead.status] ?? LEAD_STATUS_STYLES.new;
                  return (
                    <tr
                      key={lead.id}
                      className="cursor-pointer transition-colors"
                      style={{ borderTop: "1px solid rgba(199,196,215,0.12)" }}
                      onClick={() => handleSelectLead(lead)}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                          "rgba(246,242,250,0.4)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                          "transparent";
                      }}
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                          {lead.client_name}
                        </p>
                        {lead.client_email && (
                          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                            {lead.client_email}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        {lead.property_title ?? "—"}
                        {lead.property_address && (
                          <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                            {lead.property_address}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2.5 py-1 text-[10px] font-bold rounded-full"
                          style={statusStyle}
                        >
                          {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
                        {lead.source ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
                        {lead.agent_name ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
                        {formatDate(lead.last_contact_at)}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
                        {formatDate(lead.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Lead detail drawer */}
      <LeadDrawer
        lead={selectedLead}
        onClose={closeLeadDrawer}
        clients={clients}
        properties={properties}
      />

      <NewLeadDialog
        open={dialogOpen}
        onClose={closeLeadDialog}
        clients={clients}
        properties={properties}
      />
    </div>
  );
}
