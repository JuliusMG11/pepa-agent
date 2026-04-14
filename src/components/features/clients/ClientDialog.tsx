"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { upsertClient } from "@/app/(dashboard)/clients/actions";
import { toast } from "@/components/ui/toaster";
import {
  DialogSheetPanel,
  DialogSheetRoot,
  DialogSheetScrollBody,
} from "@/components/ui/dialog-sheet";
import type { ClientRow } from "@/lib/data/clients";

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "referral", label: "Doporučení" },
  { value: "sreality", label: "Sreality" },
  { value: "bezrealitky", label: "Bezrealitky" },
  { value: "reality_cz", label: "Reality.cz" },
  { value: "direct", label: "Přímý kontakt" },
  { value: "social", label: "Sociální sítě" },
  { value: "event", label: "Akce" },
  { value: "other", label: "Jiné" },
];

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

interface PropertyOpt {
  id: string;
  title: string;
  address: string;
}

interface ClientDialogProps {
  open: boolean;
  onClose: () => void;
  client?: ClientRow | null;
  availableProperties?: PropertyOpt[];
  linkedPropertyId?: string | null;
}

export function ClientDialog({ open, onClose, client, availableProperties = [], linkedPropertyId }: ClientDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(client);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await upsertClient(formData);
      if (result.success) {
        toast.success(isEdit ? "Klient uložen" : "Klient vytvořen");
        onClose();
        if (!isEdit) router.push(`/clients/${result.id}`);
        router.refresh();
      } else {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <DialogSheetRoot onClose={onClose}>
      <DialogSheetPanel maxWidthClassName="max-w-lg">
        <div
          className="flex shrink-0 items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(199,196,215,0.2)" }}
        >
          <h2 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
            {isEdit ? "Upravit klienta" : "Nový klient"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:opacity-70"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {client && <input type="hidden" name="id" value={client.id} />}
          <DialogSheetScrollBody className="space-y-4 !py-6">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Jméno <span style={{ color: "#991b1b" }}>*</span>
            </label>
            <input name="full_name" required defaultValue={client?.full_name ?? ""} style={inputStyle} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              E-mail
            </label>
            <input name="email" type="email" defaultValue={client?.email ?? ""} style={inputStyle} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Telefon
            </label>
            <input name="phone" defaultValue={client?.phone ?? ""} style={inputStyle} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Zdroj
            </label>
            <select name="source" defaultValue={client?.source ?? ""} style={inputStyle}>
              <option value="">—</option>
              {SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Poznámky
            </label>
            <textarea name="notes" rows={3} defaultValue={client?.notes ?? ""} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          {availableProperties.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
                Propojená nemovitost (volitelné)
              </label>
              <select
                name="property_id"
                defaultValue={linkedPropertyId ?? ""}
                style={inputStyle}
              >
                <option value="">Žádná — nepropojovat</option>
                {availableProperties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} — {p.address}
                  </option>
                ))}
              </select>
              <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                Přiřadí nemovitost tomuto klientovi. Existující propojení nemovitosti nejsou odstraněna.
              </p>
            </div>
          )}

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
              className="px-5 py-2.5 text-sm font-bold rounded-lg"
              style={{ backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" }}
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 text-sm font-bold rounded-lg text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--color-brand)" }}
            >
              {isPending ? "Ukládám…" : isEdit ? "Uložit" : "Vytvořit"}
            </button>
          </div>
        </form>
      </DialogSheetPanel>
    </DialogSheetRoot>
  );
}
