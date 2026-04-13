"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Upload, FileSpreadsheet } from "lucide-react";
import {
  importPropertiesCsv,
  importClientsCsv,
  importLeadsCsv,
} from "@/app/(dashboard)/import/actions";
import { toast } from "@/components/ui/toaster";
import {
  DialogSheetPanel,
  DialogSheetRoot,
  DialogSheetScrollBody,
} from "@/components/ui/dialog-sheet";

export type CsvImportEntity = "properties" | "clients" | "leads";

const TITLE: Record<CsvImportEntity, string> = {
  properties: "Import nemovitostí (CSV)",
  clients: "Import klientů (CSV)",
  leads: "Import leadů (CSV)",
};

const INSTRUCTIONS: Record<CsvImportEntity, string> = {
  properties: `První řádek = hlavička. Povinné sloupce: title, address, district, price, area_m2. Volitelné: city (výchozí Praha), type (byt|dum|komercni|pozemek|garaze), status (active|pending|sold|withdrawn).
Excel: Soubor → Uložit jako → CSV UTF-8.`,
  clients: `Hlavička: full_name (povinné), email, phone, source (referral|sreality|…|other).
Excel uložte jako CSV UTF-8.`,
  leads: `Hlavička: client_id (UUID klienta, povinné), property_id (UUID nemovitosti, volitelné), status, source.
Nejprve importujte klienty a nemovitosti, pak leady s jejich ID z databáze.`,
};

interface CsvImportDialogProps {
  entity: CsvImportEntity;
  open: boolean;
  onClose: () => void;
}

export function CsvImportDialog({ entity, open, onClose }: CsvImportDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const run =
        entity === "properties"
          ? importPropertiesCsv
          : entity === "clients"
            ? importClientsCsv
            : importLeadsCsv;
      const result = await run(fd);
      if (result.success) {
        toast.success(
          `Importováno ${result.imported}${result.skipped ? `, přeskočeno ${result.skipped}` : ""}`
        );
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
      <DialogSheetPanel maxWidthClassName="max-w-lg">
        <div
          className="flex shrink-0 items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(199,196,215,0.2)" }}
        >
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} style={{ color: "var(--color-brand)" }} />
            <h2 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
              {TITLE[entity]}
            </h2>
          </div>
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
          <DialogSheetScrollBody className="space-y-4 !py-6">
          <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: "var(--color-text-secondary)" }}>
            {INSTRUCTIONS[entity]}
          </p>
          <div>
            <label
              className="block text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              Soubor (.csv)
            </label>
            <input
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="block w-full text-xs"
              style={{ color: "var(--color-text-primary)" }}
            />
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
              className="px-5 py-2.5 text-sm font-bold rounded-lg"
              style={{ backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" }}
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-lg text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--color-brand)" }}
            >
              <Upload size={14} />
              {isPending ? "Importuji…" : "Nahrát"}
            </button>
          </div>
        </form>
      </DialogSheetPanel>
    </DialogSheetRoot>
  );
}
