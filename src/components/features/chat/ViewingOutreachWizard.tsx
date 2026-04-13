"use client";

import { useEffect, useState, useTransition } from "react";
import { Calendar, Loader2, X } from "lucide-react";
import {
  loadViewingOutreachOptions,
  fetchViewingOutreachSlots,
  buildViewingOutreachEmailDraft,
  createViewingOutreachCalendarEvent,
  type ViewingOutreachClientOpt,
  type ViewingOutreachPropertyOpt,
} from "@/app/(dashboard)/chat/viewing-outreach-actions";
import type { TimeSlot } from "@/lib/claude/tools/get-calendar-availability";
import {
  DialogSheetPanel,
  DialogSheetRoot,
  DialogSheetScrollBody,
} from "@/components/ui/dialog-sheet";
import { EmailDraft } from "@/components/features/chat/rich-blocks/EmailDraft";
import type { EmailDraft as EmailDraftType } from "@/lib/claude/tools/draft-email";
import { toast } from "@/components/ui/toaster";

interface ViewingOutreachWizardProps {
  open: boolean;
  onClose: () => void;
}

export function ViewingOutreachWizard({ open, onClose }: ViewingOutreachWizardProps) {
  const [loadingBoot, setLoadingBoot] = useState(true);
  const [clients, setClients] = useState<ViewingOutreachClientOpt[]>([]);
  const [properties, setProperties] = useState<ViewingOutreachPropertyOpt[]>([]);
  const [clientId, setClientId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsMessage, setSlotsMessage] = useState<string | undefined>();
  const [calendarConnected, setCalendarConnected] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [emailDraft, setEmailDraft] = useState<EmailDraftType | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setLoadingBoot(true);
    setEmailDraft(null);
    setSelectedSlot(null);
    setSlots([]);
    setSlotsMessage(undefined);
    void (async () => {
      const r = await loadViewingOutreachOptions();
      setLoadingBoot(false);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      setClients(r.data.clients);
      setProperties(r.data.properties);
      setClientId("");
      setPropertyId("");
    })();
  }, [open]);

  function handleLoadSlots() {
    startTransition(async () => {
      const r = await fetchViewingOutreachSlots({
        days_ahead: 14,
        slot_duration_minutes: 60,
      });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      setSlotsMessage(r.data.message);
      setCalendarConnected(r.data.connected);
      setSlots(r.data.slots);
      setSelectedSlot(null);
      if (!r.data.connected) {
        toast.error(r.data.message ?? "Kalendář není propojen.");
      } else if (r.data.slots.length === 0) {
        toast.error("Žádné volné sloty v zadaném horizontu — zkuste jinak nastavit kalendář.");
      }
    });
  }

  function handlePrepareEmail() {
    if (!clientId || !propertyId || !selectedSlot) {
      toast.error("Vyberte klienta, nemovitost a jeden termín.");
      return;
    }
    startTransition(async () => {
      const r = await buildViewingOutreachEmailDraft({
        clientId,
        propertyId,
        proposed_slots: [selectedSlot.formatted],
      });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      setEmailDraft(r.data);
      toast.success("Návrh e-mailu je připraven");
    });
  }

  function handleCreateCalendar() {
    if (!selectedSlot || !clientId || !propertyId) {
      toast.error("Chybí termín nebo údaje.");
      return;
    }
    const client = clients.find((c) => c.id === clientId);
    const prop = properties.find((p) => p.id === propertyId);
    const summary = `[Pepa] Prohlídka — ${prop?.title ?? "nemovitost"} (${client?.full_name ?? "klient"})`;
    const description = [
      emailDraft?.body,
      "",
      `Termín: ${selectedSlot.formatted}`,
    ]
      .filter(Boolean)
      .join("\n");

    startTransition(async () => {
      const r = await createViewingOutreachCalendarEvent({
        summary,
        description,
        startIso: selectedSlot.start,
        endIso: selectedSlot.end,
      });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success(
        r.htmlLink ? "Událost vytvořena v Google Kalendáři." : "Událost vytvořena."
      );
      if (r.htmlLink) {
        window.open(r.htmlLink, "_blank", "noopener,noreferrer");
      }
    });
  }

  if (!open) return null;

  return (
    <DialogSheetRoot onClose={onClose}>
      <DialogSheetPanel maxWidthClassName="max-w-lg">
        <div
          className="flex shrink-0 items-center justify-between border-b px-6 py-4"
          style={{ borderColor: "rgba(199,196,215,0.2)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Calendar size={18} className="shrink-0" style={{ color: "var(--color-brand)" }} />
            <h2
              className="text-sm font-bold truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              E-mail zájemci a termín prohlídky
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 hover:opacity-70"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Zavřít"
          >
            <X size={18} />
          </button>
        </div>

        <DialogSheetScrollBody className="space-y-5 !py-5">
          {loadingBoot ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin" style={{ color: "var(--color-brand)" }} />
            </div>
          ) : (
            <>
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Vyberte klienta a nemovitost z databáze, načtěte volné termíny z vašeho Google Kalendáře,
                vyberte jeden slot a připravte e-mail. Poté můžete odeslat přes mailto a přidat událost do
                kalendáře.
              </p>

              <div>
                <label
                  className="mb-1 block text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Klient
                </label>
                <select
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    setEmailDraft(null);
                  }}
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{
                    backgroundColor: "var(--color-bg-subtle)",
                    border: "1px solid rgba(199,196,215,0.3)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <option value="">— vyberte klienta —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                      {c.email ? ` (${c.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="mb-1 block text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Nemovitost
                </label>
                <select
                  value={propertyId}
                  onChange={(e) => {
                    setPropertyId(e.target.value);
                    setEmailDraft(null);
                  }}
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{
                    backgroundColor: "var(--color-bg-subtle)",
                    border: "1px solid rgba(199,196,215,0.3)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <option value="">— vyberte nemovitost —</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — {p.address}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={handleLoadSlots}
                  className="rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-brand)" }}
                >
                  {pending ? "Načítám…" : "Načíst volné termíny"}
                </button>
                {!calendarConnected && slotsMessage && (
                  <span className="text-[11px]" style={{ color: "#92400e" }}>
                    {slotsMessage}
                  </span>
                )}
              </div>

              {slots.length > 0 && (
                <div>
                  <p
                    className="mb-2 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Volné termíny (vyberte jeden)
                  </p>
                  <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border p-2" style={{ borderColor: "rgba(199,196,215,0.25)" }}>
                    {slots.map((s) => (
                      <li key={s.start}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-[rgba(70,72,212,0.06)]">
                          <input
                            type="radio"
                            name="slot"
                            checked={selectedSlot?.start === s.start}
                            onChange={() => {
                              setSelectedSlot(s);
                              setEmailDraft(null);
                            }}
                          />
                          <span style={{ color: "var(--color-text-primary)" }}>{s.formatted}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending || !selectedSlot || !clientId || !propertyId}
                  onClick={handlePrepareEmail}
                  className="rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-50"
                  style={{ backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" }}
                >
                  Připravit text e-mailu
                </button>
                <button
                  type="button"
                  disabled={pending || !selectedSlot || !calendarConnected}
                  onClick={handleCreateCalendar}
                  className="rounded-lg px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#166534" }}
                >
                  Vytvořit událost v kalendáři
                </button>
              </div>

              {emailDraft && (
                <div>
                  <p
                    className="mb-2 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Návrh e-mailu — zkopírujte nebo otevřete v poštovním klientovi
                  </p>
                  <EmailDraft email={emailDraft} />
                </div>
              )}
            </>
          )}
        </DialogSheetScrollBody>
      </DialogSheetPanel>
    </DialogSheetRoot>
  );
}
