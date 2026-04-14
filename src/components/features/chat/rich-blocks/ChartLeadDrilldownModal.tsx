"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, X } from "lucide-react";
import { uniqueNormalizedLeadIdsFromChartRow } from "@/lib/utils/chart-lead-drilldown";

const STATUS_CS: Record<string, string> = {
  new: "Nový",
  contacted: "Kontaktován",
  viewing_scheduled: "Prohlídka",
  offer_made: "Nabídka",
  closed_won: "Uzavřen ✓",
  closed_lost: "Uzavřen ✗",
};

export interface DrilldownLeadRow {
  id: string;
  client_name: string;
  status: string;
  source: string | null;
  property_title: string | null;
  property_address: string | null;
  created_at: string;
  agent_name: string | null;
}

interface ChartLeadDrilldownModalProps {
  open: boolean;
  bucketLabel: string;
  rowPayload: Record<string, unknown> | null;
  onClose: () => void;
}

export function ChartLeadDrilldownModal({
  open,
  bucketLabel,
  rowPayload,
  onClose,
}: ChartLeadDrilldownModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leads, setLeads] = useState<DrilldownLeadRow[]>([]);

  useEffect(() => {
    if (!open || !rowPayload) {
      setLeads([]);
      setError(null);
      return;
    }

    const leadIds = uniqueNormalizedLeadIdsFromChartRow(rowPayload);
    const periodFrom =
      typeof rowPayload.period_from === "string"
        ? rowPayload.period_from
        : null;
    const periodTo =
      typeof rowPayload.period_to === "string" ? rowPayload.period_to : null;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setLeads([]);

    async function run() {
      try {
        const body =
          leadIds.length > 0
            ? { lead_ids: leadIds }
            : periodFrom && periodTo
              ? { period_from: periodFrom, period_to: periodTo }
              : null;

        if (!body) {
          if (!cancelled) {
            setError(
              "Pro tento sloupec nejsou v datech grafu uložené odkazy na leady. Zeptejte se Pepy znovu a požádejte ho, aby do grafu doplnil u každého měsíce pole lead_ids."
            );
          }
          return;
        }

        const res = await fetch("/api/leads/drilldown", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as {
          error?: string;
          leads?: DrilldownLeadRow[];
        };
        if (!res.ok) {
          if (!cancelled) setError(json.error ?? "Načtení selhalo.");
          return;
        }
        if (!cancelled) setLeads(json.leads ?? []);
      } catch {
        if (!cancelled) setError("Neočekávaná chyba.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, rowPayload]);

  if (!open || !rowPayload) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center p-0 md:items-center md:p-4"
      style={{ backgroundColor: "rgba(15, 12, 25, 0.45)" }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex h-[100dvh] max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl shadow-2xl md:h-auto md:max-h-[min(85dvh,900px)] md:rounded-2xl"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid rgba(199,196,215,0.25)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chart-drilldown-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-3 px-5 py-4 border-b"
          style={{ borderColor: "rgba(199,196,215,0.2)" }}
        >
          <div className="min-w-0">
            <p
              className="text-[10px] font-black uppercase tracking-wider"
              style={{ color: "var(--color-brand)" }}
            >
              Leady v období
            </p>
            <h2
              id="chart-drilldown-title"
              className="text-base font-bold mt-1"
              style={{ color: "var(--color-text-primary)" }}
            >
              {bucketLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 rounded-lg hover:opacity-70 cursor-pointer"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Zavřít"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm" style={{ color: "var(--color-text-muted)" }}>
              <Loader2 size={18} className="animate-spin" />
              Načítám leady…
            </div>
          )}
          {!loading && error && (
            <p className="text-sm leading-relaxed" style={{ color: "#991b1b" }}>
              {error}
            </p>
          )}
          {!loading && !error && leads.length === 0 && (
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              V tomto období nejsou žádné leady.
            </p>
          )}
          {!loading && !error && leads.length > 0 && (
            <ul className="space-y-3">
              {leads.map((lead) => (
                <li
                  key={lead.id}
                  className="rounded-xl p-3"
                  style={{
                    backgroundColor: "rgba(246,242,250,0.6)",
                    border: "1px solid rgba(199,196,215,0.2)",
                  }}
                >
                  <p className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                    {lead.client_name}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {STATUS_CS[lead.status] ?? lead.status}
                    {lead.source ? ` · ${lead.source}` : ""}
                  </p>
                  {(lead.property_title || lead.property_address) && (
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                      {lead.property_title ?? lead.property_address}
                    </p>
                  )}
                  <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                    Vytvořeno{" "}
                    {new Date(lead.created_at).toLocaleDateString("cs-CZ", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <Link
                    href={`/leads?lead=${lead.id}`}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "var(--color-brand)" }}
                    onClick={onClose}
                  >
                    Zobrazit detail leadu
                    <ExternalLink size={12} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
