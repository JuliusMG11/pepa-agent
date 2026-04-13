"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  uploadPropertyDocument,
  validatePropertyDocumentFile,
} from "@/lib/property-documents";
import { updatePropertyDocumentUrls } from "@/app/(dashboard)/properties/actions";
import { toast } from "@/components/ui/toaster";
import { useRouter } from "next/navigation";

function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname.split("/").pop() ?? url;
    return decodeURIComponent(path.split("?")[0] ?? "dokument");
  } catch {
    return url.split("/").pop()?.split("?")[0] ?? "dokument";
  }
}

interface PropertyDocumentsSectionProps {
  propertyId: string;
  initialUrls: string[];
}

export function PropertyDocumentsSection({
  propertyId,
  initialUrls,
}: PropertyDocumentsSectionProps) {
  const router = useRouter();
  const [urls, setUrls] = useState<string[]>(() => [...initialUrls]);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrls([...initialUrls]);
  }, [initialUrls]);

  async function persist(next: string[]) {
    startTransition(async () => {
      const r = await updatePropertyDocumentUrls(propertyId, next);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      setUrls(next);
      toast.success("Dokumenty uloženy");
      router.refresh();
    });
  }

  async function handleUpload(file: File) {
    const err = validatePropertyDocumentFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const result = await uploadPropertyDocument(supabase, file, propertyId);
    setBusy(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    const next = [...urls, result.url];
    await persist(next);
  }

  function handleRemove(url: string) {
    const next = urls.filter((u) => u !== url);
    void persist(next);
  }

  const inputId = `property-docs-${propertyId}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Smlouvy, prohlášení, PD a další soubory (PDF, Word). Ukládají se do úložiště a odkaz se uloží k nemovitosti.
        </p>
        <div>
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            disabled={busy || pending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void handleUpload(f);
            }}
          />
          <button
            type="button"
            disabled={busy || pending}
            onClick={() => fileRef.current?.click()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "var(--color-brand)" }}
          >
            <Upload size={14} strokeWidth={2} />
            {busy || pending ? "Nahrávám…" : "Nahrát dokument"}
          </button>
        </div>
      </div>

      {urls.length === 0 ? (
        <p className="rounded-xl py-10 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
          Zatím žádné dokumenty. Nahrajte první soubor výše.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-3">
          {urls.map((url) => (
            <li
              key={url}
              className="flex max-w-max items-center gap-2 rounded-xl px-3 py-2.5"
              style={{
                border: "1px solid rgba(199,196,215,0.25)",
                backgroundColor: "rgba(246,242,250,0.5)",
              }}
            >
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex max-w-[min(100%,280px)] items-center gap-2 text-sm font-medium"
                style={{ color: "var(--color-brand)" }}
              >
                <FileText size={16} className="shrink-0" strokeWidth={1.5} />
                <span className="truncate">{fileNameFromUrl(url)}</span>
              </a>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleRemove(url)}
                className="shrink-0 rounded-lg p-2 transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ color: "#991b1b" }}
                aria-label="Odebrat dokument ze seznamu"
              >
                <Trash2 size={16} strokeWidth={1.5} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
