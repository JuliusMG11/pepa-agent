"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toaster";
import { X } from "lucide-react";
import { createLead, updateLead } from "@/app/(dashboard)/leads/actions";
import {
  DialogSheetPanel,
  DialogSheetRoot,
  DialogSheetScrollBody,
} from "@/components/ui/dialog-sheet";
import type { LeadPipelineRow } from "@/lib/data/clients";

interface Client {
  id: string;
  full_name: string;
}

interface Property {
  id: string;
  title: string;
  address: string;
}

interface NewLeadDialogProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  properties: Property[];
  defaultClientId?: string;
  defaultPropertyId?: string;
  /** Úprava existujícího leadu */
  editLead?: LeadPipelineRow | null;
}

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--color-bg-subtle)",
  border: "1px solid rgba(199,196,215,0.3)",
  color: "var(--color-text-primary)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 13,
  width: "100%",
  outline: "none",
};

export function NewLeadDialog({
  open,
  onClose,
  clients,
  properties,
  defaultClientId,
  defaultPropertyId,
  editLead,
}: NewLeadDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const isEdit = Boolean(editLead);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setClientId(
      (editLead?.client_id ?? defaultClientId ?? "").trim()
    );
    setPropertyId(
      (editLead?.property_id ?? defaultPropertyId ?? "").trim()
    );
    setError(null);
  }, [open, editLead, defaultClientId, defaultPropertyId]);

  const clientsForSelect = useMemo(() => {
    if (!editLead?.client_id) return clients;
    if (clients.some((c) => c.id === editLead.client_id)) return clients;
    return [
      {
        id: editLead.client_id,
        full_name: editLead.client_name?.trim() || "Klient (propojený lead)",
      },
      ...clients,
    ];
  }, [clients, editLead]);

  const propertiesForSelect = useMemo(() => {
    if (!editLead?.property_id) return properties;
    if (properties.some((p) => p.id === editLead.property_id)) return properties;
    const label =
      [editLead.property_title, editLead.property_address].filter(Boolean).join(" — ") ||
      "Nemovitost (propojená)";
    return [{ id: editLead.property_id, title: label, address: "" }, ...properties];
  }, [properties, editLead]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = isEdit && editLead
        ? await updateLead(editLead.id, formData)
        : await createLead(formData);
      if (result.success) {
        toast.success(isEdit ? "Lead uložen" : "Lead vytvořen");
        onClose();
        router.refresh();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <DialogSheetRoot onClose={onClose}>
      <DialogSheetPanel maxWidthClassName="max-w-md">
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(199,196,215,0.2)" }}
        >
          <h2 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
            {isEdit ? "Upravit lead" : "Nový lead"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <DialogSheetScrollBody className="space-y-4 !py-6">
          {/* Client */}
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              Klient <span style={{ color: "#991b1b" }}>*</span>
            </label>
            <select
              name="client_id"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              style={inputStyle}
            >
              <option value="">Vybrat klienta…</option>
              {clientsForSelect.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Property */}
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              Nemovitost
            </label>
            <select
              name="property_id"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              style={inputStyle}
            >
              <option value="">Bez nemovitosti</option>
              {propertiesForSelect.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.address ? ` — ${p.address}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              Status
            </label>
            <select
              name="status"
              defaultValue={editLead?.status ?? "new"}
              style={inputStyle}
            >
              <option value="new">Nový</option>
              <option value="contacted">Kontaktován</option>
              <option value="viewing_scheduled">Prohlídka naplánována</option>
              <option value="offer_made">Nabídka podána</option>
              <option value="closed_won">Uzavřen ✓</option>
              <option value="closed_lost">Uzavřen ✗</option>
            </select>
          </div>

          {/* Source */}
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              Zdroj
            </label>
            <select
              name="source"
              defaultValue={editLead?.source ?? ""}
              style={inputStyle}
            >
              <option value="">Nespecifikováno</option>
              <option value="referral">Doporučení</option>
              <option value="sreality">Sreality</option>
              <option value="bezrealitky">Bezrealitky</option>
              <option value="reality_cz">Reality.cz</option>
              <option value="direct">Přímý kontakt</option>
              <option value="social">Sociální sítě</option>
              <option value="event">Akce</option>
              <option value="other">Jiné</option>
            </select>
          </div>

          {error && (
            <p className="text-xs font-medium" style={{ color: "#991b1b" }}>
              {error}
            </p>
          )}
          </DialogSheetScrollBody>

          <div
            className="flex shrink-0 justify-end gap-3 border-t px-6 py-4"
            style={{ borderColor: "rgba(199,196,215,0.2)" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-bold rounded-lg transition-opacity hover:opacity-70"
              style={{ backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" }}
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 text-sm font-bold rounded-lg text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-brand)" }}
            >
              {isPending ? "Ukládám…" : isEdit ? "Uložit změny" : "Vytvořit lead"}
            </button>
          </div>
        </form>
      </DialogSheetPanel>
    </DialogSheetRoot>
  );
}
