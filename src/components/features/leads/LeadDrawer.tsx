"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Phone, Mail, MessageSquare, Pencil, Trash2, CalendarPlus } from "lucide-react";
import Link from "next/link";
import type { LeadPipelineRow } from "@/lib/data/clients";
import { NewLeadDialog } from "./NewLeadDialog";
import { deleteLead, scheduleActivityForLead } from "@/app/(dashboard)/leads/actions";
import { toast } from "@/components/ui/toaster";
import { normalizeUuid } from "@/lib/validation/uuid";

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Nový",
  contacted: "Kontaktován",
  viewing_scheduled: "Prohlídka naplánována",
  offer_made: "Nabídka podána",
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

const SOURCE_LABELS: Record<string, string> = {
  referral: "Doporučení",
  sreality: "Sreality",
  bezrealitky: "Bezrealitky",
  reality_cz: "Reality.cz",
  direct: "Přímý kontakt",
  social: "Sociální sítě",
  event: "Akce",
  other: "Jiné",
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface ClientOpt {
  id: string;
  full_name: string;
}

interface PropertyOpt {
  id: string;
  title: string;
  address: string;
}

interface LeadDrawerProps {
  lead: LeadPipelineRow | null;
  onClose: () => void;
  clients: ClientOpt[];
  properties: PropertyOpt[];
}

export function LeadDrawer({ lead, onClose, clients, properties }: LeadDrawerProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [scheduleBusy, setScheduleBusy] = useState(false);

  if (!lead) return null;

  const leadId = lead.id;

  const statusStyle = LEAD_STATUS_STYLES[lead.status] ?? LEAD_STATUS_STYLES.new;

  const askPepaUrl = `/chat?q=${encodeURIComponent(
    `Řekni mi vše o leadu klienta ${lead.client_name}${lead.property_address ? ` na nemovitost ${lead.property_address}` : ""}.`
  )}`;

  function handleDelete() {
    if (!confirm("Opravdu chcete tento lead trvale smazat?")) return;
    startTransition(async () => {
      const r = await deleteLead(leadId);
      if (r.success) {
        toast.success("Lead byl smazán");
        onClose();
        router.refresh();
      } else {
        toast.error(r.error ?? "Smazání se nepodařilo");
      }
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="fixed z-50 flex w-full max-w-sm flex-col overflow-hidden bg-[var(--color-bg-card)] shadow-[0_-8px_40px_rgba(70,72,212,0.10)] md:shadow-[-8px_0_40px_rgba(70,72,212,0.10)] inset-x-0 bottom-0 h-[100dvh] max-h-[100dvh] rounded-t-2xl border-t border-[rgba(199,196,215,0.2)] md:inset-y-0 md:bottom-0 md:left-auto md:right-0 md:top-0 md:h-full md:max-h-none md:rounded-none md:border-t-0 md:border-l md:border-[rgba(199,196,215,0.2)]"
        style={{
          backgroundColor: "var(--color-bg-card)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-drawer-title"
      >
        <div
          className="flex shrink-0 items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(199,196,215,0.2)" }}
        >
          <h2
            id="lead-drawer-title"
            className="text-sm font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Detail leadu
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <span
            className="inline-block px-3 py-1.5 text-xs font-bold rounded-full"
            style={statusStyle}
          >
            {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
          </span>

          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              Klient
            </p>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {lead.client_name}
            </p>
            <div className="flex flex-col gap-1 mt-1.5">
              {lead.client_email && (
                <a
                  href={`mailto:${lead.client_email}`}
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <Mail size={11} strokeWidth={1.5} />
                  {lead.client_email}
                </a>
              )}
              {lead.client_phone && (
                <a
                  href={`tel:${lead.client_phone}`}
                  className="flex items-center gap-1.5 text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <Phone size={11} strokeWidth={1.5} />
                  {lead.client_phone}
                </a>
              )}
            </div>
          </div>

          {lead.property_title && (
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                Nemovitost
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {lead.property_title}
              </p>
              {lead.property_address && (
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  {lead.property_address}
                </p>
              )}
              {lead.property_price != null && (
                <p className="text-xs font-bold mt-1" style={{ color: "var(--color-brand)" }}>
                  {lead.property_price.toLocaleString("cs-CZ")} Kč
                </p>
              )}
            </div>
          )}

          <div
            className="rounded-xl p-4 space-y-3"
            style={{
              border: "1px solid rgba(199,196,215,0.25)",
              backgroundColor: "rgba(70,72,212,0.04)",
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: "var(--color-brand)" }}
            >
              <CalendarPlus size={12} strokeWidth={2} />
              Aktivita s klientem
            </p>
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fd = new FormData(form);
                const kind = String(fd.get("activity_kind") ?? "meeting");
                const title = String(fd.get("activity_title") ?? "").trim();
                const at = String(fd.get("scheduled_at") ?? "");
                const duration = Number(fd.get("duration_minutes") ?? 60);
                const notes = String(fd.get("activity_notes") ?? "").trim();
                const start = new Date(at);
                if (Number.isNaN(start.getTime())) {
                  toast.error("Vyberte platné datum a čas.");
                  return;
                }
                const leadIdNorm = normalizeUuid(lead.id);
                if (!leadIdNorm) {
                  toast.error("Neplatné ID leadu. Obnovte stránku.");
                  return;
                }
                setScheduleBusy(true);
                const r = await scheduleActivityForLead({
                  leadId: leadIdNorm,
                  kind: kind as "viewing" | "meeting" | "call" | "note" | "task",
                  title: title || `Schůzka — ${lead.client_name}`,
                  notes: notes || undefined,
                  scheduledAt: start.toISOString(),
                  durationMinutes: duration,
                });
                setScheduleBusy(false);
                if (!r.success) {
                  toast.error(r.error);
                  return;
                }
                toast.success(
                  r.calendarSynced
                    ? "Aktivita uložena a odeslána do Google Kalendáře."
                    : `Aktivita uložena.${r.calendarMessage ? ` ${r.calendarMessage}` : ""}`
                );
                form.reset();
                router.refresh();
              }}
            >
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Typ
                </label>
                <select
                  name="activity_kind"
                  className="w-full rounded-lg px-3 py-2 text-xs font-medium"
                  style={{
                    backgroundColor: "var(--color-bg-card)",
                    border: "1px solid rgba(199,196,215,0.35)",
                    color: "var(--color-text-primary)",
                  }}
                  defaultValue="meeting"
                >
                  <option value="meeting">Schůzka</option>
                  <option value="viewing">Prohlídka</option>
                  <option value="call">Hovor</option>
                  <option value="note">Poznámka / úkol</option>
                  <option value="task">Úkol</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Název (volitelné)
                </label>
                <input
                  name="activity_title"
                  type="text"
                  placeholder={`např. Schůzka — ${lead.client_name}`}
                  className="w-full rounded-lg px-3 py-2 text-xs"
                  style={{
                    backgroundColor: "var(--color-bg-card)",
                    border: "1px solid rgba(199,196,215,0.35)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Začátek
                  </label>
                  <input
                    name="scheduled_at"
                    type="datetime-local"
                    required
                    className="w-full rounded-lg px-2 py-2 text-[11px]"
                    style={{
                      backgroundColor: "var(--color-bg-card)",
                      border: "1px solid rgba(199,196,215,0.35)",
                      color: "var(--color-text-primary)",
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Délka
                  </label>
                  <select
                    name="duration_minutes"
                    className="w-full rounded-lg px-2 py-2 text-xs"
                    style={{
                      backgroundColor: "var(--color-bg-card)",
                      border: "1px solid rgba(199,196,215,0.35)",
                      color: "var(--color-text-primary)",
                    }}
                    defaultValue="60"
                  >
                    <option value="30">30 min</option>
                    <option value="60">60 min</option>
                    <option value="90">90 min</option>
                    <option value="120">120 min</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Poznámka
                </label>
                <textarea
                  name="activity_notes"
                  rows={2}
                  className="w-full rounded-lg px-3 py-2 text-xs resize-none"
                  style={{
                    backgroundColor: "var(--color-bg-card)",
                    border: "1px solid rgba(199,196,215,0.35)",
                    color: "var(--color-text-primary)",
                  }}
                  placeholder="Interní poznámka…"
                />
              </div>
              <button
                type="submit"
                disabled={scheduleBusy}
                className="w-full py-2.5 text-xs font-bold rounded-lg text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)" }}
              >
                {scheduleBusy ? "Ukládám…" : "Uložit a přidat do kalendáře"}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "První kontakt", value: formatDate(lead.first_contact_at) },
              { label: "Poslední kontakt", value: formatDate(lead.last_contact_at) },
              { label: "Vytvořen", value: formatDate(lead.created_at) },
              {
                label: "Zdroj",
                value: lead.source ? (SOURCE_LABELS[lead.source] ?? lead.source) : "—",
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <p
                  className="text-[10px] font-bold uppercase tracking-wider mb-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {label}
                </p>
                <p className="text-xs font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {lead.agent_name && (
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: "var(--color-text-muted)" }}
              >
                Agent
              </p>
              <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                {lead.agent_name}
              </p>
            </div>
          )}
        </div>

        <div
          className="flex shrink-0 flex-col gap-2 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          style={{ borderTop: "1px solid rgba(199,196,215,0.2)" }}
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" }}
            >
              <Pencil size={13} strokeWidth={1.5} />
              Upravit
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}
            >
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          </div>
          <Link
            href={askPepaUrl}
            className="flex w-full items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--color-brand)" }}
          >
            <MessageSquare size={13} strokeWidth={1.5} />
            Ask Pepa
          </Link>
        </div>
        </div>
      </div>

      <NewLeadDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        clients={clients}
        properties={properties}
        editLead={lead}
      />
    </>
  );
}
