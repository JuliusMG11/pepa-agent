"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, ImagePlus, Trash2, Upload, X } from "lucide-react";
import { upsertProperty } from "@/app/(dashboard)/properties/actions";
import { toast } from "@/components/ui/toaster";
import type { PropertySummary } from "@/lib/data/properties";
import { createClient } from "@/lib/supabase/client";
import { uploadPropertyImage, validatePropertyImageFile } from "@/lib/property-images";
import { uploadPropertyDocument, validatePropertyDocumentFile } from "@/lib/property-documents";
import {
  DialogSheetPanel,
  DialogSheetRoot,
  DialogSheetScrollBody,
} from "@/components/ui/dialog-sheet";
import { normalizeUuid } from "@/lib/validation/uuid";

const DISTRICTS = [
  "Holešovice", "Vinohrady", "Žižkov", "Smíchov", "Dejvice",
  "Nusle", "Vršovice", "Karlín", "Letňany", "Modřany", "Jiné",
];

interface Agent {
  id: string;
  full_name: string;
}

interface ClientOpt {
  id: string;
  full_name: string;
}

interface PropertyDialogProps {
  open: boolean;
  onClose: () => void;
  property?: PropertySummary | null;
  agents?: Agent[];
  clients?: ClientOpt[];
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-[10px] font-bold uppercase tracking-wider mb-1"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
        {required && <span style={{ color: "#991b1b" }}> *</span>}
      </label>
      {children}
    </div>
  );
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

export function PropertyDialog({
  open,
  onClose,
  property,
  agents = [],
  clients = [],
}: PropertyDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [documentUrls, setDocumentUrls] = useState<{ url: string; name: string }[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const docsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setCoverUrl(property?.cover_image_url?.trim() ?? "");
    setGalleryUrls([...(property?.gallery_urls ?? [])]);
    const docs = property?.document_urls;
    if (Array.isArray(docs) && docs.length > 0) {
      setDocumentUrls(
        docs.map((url) => ({
          url,
          name: url.split("/").pop()?.split("?")[0] ?? "dokument",
        }))
      );
    } else {
      setDocumentUrls([]);
    }
    setError(null);
  }, [open, property?.id]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const normalizedClientId = useMemo(
    () => (property?.client_id ? normalizeUuid(property.client_id) : null),
    [property?.client_id]
  );
  const normalizedAgentId = useMemo(
    () => (property?.agent_id ? normalizeUuid(property.agent_id) : null),
    [property?.agent_id]
  );

  const clientsForSelect = useMemo(() => {
    if (!normalizedClientId) return clients;
    if (clients.some((c) => normalizeUuid(c.id) === normalizedClientId)) {
      return clients;
    }
    return [
      {
        id: normalizedClientId,
        full_name: property?.client_name?.trim() || "Propojený klient",
      },
      ...clients,
    ];
  }, [clients, normalizedClientId, property?.client_name]);

  const agentsForSelect = useMemo(() => {
    if (!normalizedAgentId) return agents;
    if (agents.some((a) => normalizeUuid(a.id) === normalizedAgentId)) {
      return agents;
    }
    return [
      {
        id: normalizedAgentId,
        full_name: property?.agent_name?.trim() || "Agent",
      },
      ...agents,
    ];
  }, [agents, normalizedAgentId, property?.agent_name]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await upsertProperty(formData);
      if (result.success) {
        toast.success(
          isEdit ? "Nemovitost uložena" : "Nemovitost vytvořena"
        );
        onClose();
        if (!isEdit) {
          router.push(`/properties/${result.id}`);
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.error);
        setError(result.error);
      }
    });
  }

  const isEdit = !!property;

  return (
    <DialogSheetRoot onClose={onClose}>
      <DialogSheetPanel maxWidthClassName="max-w-2xl">
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-6 py-5"
          style={{ borderBottom: "1px solid rgba(199,196,215,0.2)" }}
        >
          <h2 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
            {isEdit ? "Upravit nemovitost" : "Přidat nemovitost"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:opacity-70 transition-opacity"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Form */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <DialogSheetScrollBody className="space-y-5 !py-6">
          {property && <input type="hidden" name="id" value={property.id} />}
          <input type="hidden" name="cover_image_url" value={coverUrl} />
          {galleryUrls.map((url, i) => (
            <input key={`g-${i}-${url.slice(-24)}`} type="hidden" name="gallery_urls" value={url} />
          ))}
          {documentUrls.map((d, i) => (
            <input key={`d-${i}-${d.url.slice(-20)}`} type="hidden" name="document_urls" value={d.url} />
          ))}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Název" required>
                <input
                  name="title"
                  defaultValue={property?.title ?? ""}
                  required
                  style={inputStyle}
                  placeholder="např. Byt 3+kk, Vinohrady"
                />
              </Field>
            </div>

            <div className="col-span-2">
              <Field label="Adresa" required>
                <input
                  name="address"
                  defaultValue={property?.address ?? ""}
                  required
                  style={inputStyle}
                  placeholder="Ulice, číslo popisné"
                />
              </Field>
            </div>

            <Field label="Město">
              <input
                name="city"
                defaultValue={property?.city ?? "Praha"}
                style={inputStyle}
              />
            </Field>

            <Field label="Čtvrť" required>
              <select
                name="district"
                defaultValue={property?.district ?? ""}
                required
                style={inputStyle}
              >
                <option value="">Vybrat čtvrť…</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Typ" required>
              <select
                name="type"
                defaultValue={property?.type ?? "byt"}
                required
                style={inputStyle}
              >
                <option value="byt">Byt</option>
                <option value="dum">Dům</option>
                <option value="komercni">Komerční</option>
                <option value="pozemek">Pozemek</option>
                <option value="garaze">Garáž</option>
              </select>
            </Field>

            <Field label="Status">
              <select
                name="status"
                defaultValue={property?.status ?? "active"}
                style={inputStyle}
              >
                <option value="active">Aktivní</option>
                <option value="pending">Čeká</option>
                <option value="sold">Prodáno</option>
                <option value="withdrawn">Staženo</option>
              </select>
            </Field>

            <Field label="Cena (Kč)" required>
              <input
                name="price"
                type="number"
                defaultValue={property?.price ?? ""}
                required
                min={0}
                style={inputStyle}
                placeholder="14200000"
              />
            </Field>

            <Field label="Plocha (m²)" required>
              <input
                name="area_m2"
                type="number"
                defaultValue={property?.area_m2 ?? ""}
                required
                min={0}
                style={inputStyle}
                placeholder="85"
              />
            </Field>

            <Field label="Patro">
              <input
                name="floor"
                type="number"
                defaultValue={property?.floor ?? ""}
                style={inputStyle}
                placeholder="3"
              />
            </Field>

            <Field label="Celkem pater">
              <input
                name="total_floors"
                type="number"
                defaultValue={property?.total_floors ?? ""}
                style={inputStyle}
                placeholder="6"
              />
            </Field>

            <Field label="Rok výstavby">
              <input
                name="year_built"
                type="number"
                defaultValue={property?.year_built ?? ""}
                style={inputStyle}
                placeholder="1995"
              />
            </Field>

            <Field label="Poslední renovace">
              <input
                name="last_renovation"
                defaultValue={property?.last_renovation ?? ""}
                style={inputStyle}
                placeholder="2022"
              />
            </Field>

            {agentsForSelect.length > 0 && (
              <div className="col-span-2">
                <Field label="Agent">
                  <select
                    name="agent_id"
                    defaultValue={normalizedAgentId ?? ""}
                    style={inputStyle}
                  >
                    <option value="">Bez přiřazeného agenta</option>
                    {agentsForSelect.map((a) => {
                      const optId = normalizeUuid(a.id) ?? a.id;
                      return (
                        <option key={optId} value={optId}>
                          {a.full_name}
                        </option>
                      );
                    })}
                  </select>
                </Field>
              </div>
            )}

            {clientsForSelect.length > 0 && (
              <div className="col-span-2">
                <Field label="Propojený klient (volitelné)">
                  <select
                    name="client_id"
                    defaultValue={normalizedClientId ?? ""}
                    style={inputStyle}
                  >
                    <option value="">Žádný — obecná nemovitost</option>
                    {clientsForSelect.map((c) => {
                      const optId = normalizeUuid(c.id) ?? c.id;
                      return (
                        <option key={optId} value={optId}>
                          {c.full_name}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[10px] mt-1.5" style={{ color: "var(--color-text-muted)" }}>
                    Pomůže párovat události z kalendáře s klientem v systému.
                  </p>
                </Field>
              </div>
            )}

            <div className="col-span-2">
              <Field label="Poznámky k rekonstrukci">
                <textarea
                  name="reconstruction_notes"
                  defaultValue={property?.reconstruction_notes ?? ""}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="Popis provedených nebo plánovaných rekonstrukcí…"
                />
              </Field>
            </div>

            <div className="col-span-2">
              <Field label="Stavební povolení">
                <textarea
                  name="permit_data"
                  defaultValue={property?.permit_data ?? ""}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                  placeholder="Číslo povolení, datum vydání, stavební úřad…"
                />
              </Field>
            </div>

            <div className="col-span-2">
              <Field label="Náhledová fotka">
                <p className="text-[11px] mb-2" style={{ color: "var(--color-text-muted)" }}>
                  Nahrát obrázek (max. 1 MB, JPEG / PNG / WebP / GIF). Uloží se do Supabase Storage.
                </p>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    const v = validatePropertyImageFile(file);
                    if (v) {
                      toast.error(v);
                      return;
                    }
                    setUploadBusy(true);
                    const supabase = createClient();
                    const folder = property?.id ?? "new";
                    const result = await uploadPropertyImage(supabase, file, folder);
                    setUploadBusy(false);
                    if ("error" in result) {
                      toast.error(result.error);
                      return;
                    }
                    setCoverUrl(result.url);
                    toast.success("Náhledová fotka nahrána");
                  }}
                />
                <div className="flex flex-col sm:flex-row gap-3 items-start">
                  <button
                    type="button"
                    disabled={uploadBusy}
                    onClick={() => coverInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer w-full sm:w-auto justify-center"
                    style={{
                      backgroundColor: "rgba(70,72,212,0.08)",
                      border: "1px dashed rgba(70,72,212,0.35)",
                      color: "var(--color-brand)",
                    }}
                  >
                    <ImagePlus size={18} strokeWidth={1.5} />
                    {coverUrl ? "Změnit obrázek" : "Nahrát obrázek"}
                  </button>
                  {coverUrl ? (
                    <div className="relative rounded-xl overflow-hidden border shrink-0" style={{ borderColor: "rgba(199,196,215,0.35)", maxWidth: 280 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={coverUrl} alt="" className="w-full h-40 object-cover block" />
                      <button
                        type="button"
                        onClick={() => setCoverUrl("")}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                        style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#fff" }}
                        aria-label="Odstranit náhled"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </Field>
            </div>

            <div className="col-span-2">
              <Field label="Galerie">
                <p className="text-[11px] mb-2" style={{ color: "var(--color-text-muted)" }}>
                  Přidávejte obrázky po jednom (max. 1 MB). Pořadí odpovídá pořadí nahrání.
                </p>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    const v = validatePropertyImageFile(file);
                    if (v) {
                      toast.error(v);
                      return;
                    }
                    setUploadBusy(true);
                    const supabase = createClient();
                    const folder = property?.id ?? "new";
                    const result = await uploadPropertyImage(supabase, file, folder);
                    setUploadBusy(false);
                    if ("error" in result) {
                      toast.error(result.error);
                      return;
                    }
                    setGalleryUrls((prev) => [...prev, result.url]);
                    toast.success("Fotka přidána do galerie");
                  }}
                />
                <button
                  type="button"
                  disabled={uploadBusy}
                  onClick={() => galleryInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer mb-3"
                  style={{
                    backgroundColor: "rgba(70,72,212,0.06)",
                    border: "1px dashed rgba(199,196,215,0.45)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <ImagePlus size={18} strokeWidth={1.5} />
                  Přidat fotku do galerie
                </button>
                {galleryUrls.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {galleryUrls.map((url, idx) => (
                      <div
                        key={`${url}-${idx}`}
                        className="relative rounded-xl overflow-hidden border"
                        style={{ borderColor: "rgba(199,196,215,0.35)" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-28 object-cover block" />
                        <button
                          type="button"
                          onClick={() =>
                            setGalleryUrls((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer shadow-md"
                          style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#fff" }}
                          aria-label="Odebrat z galerie"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Zatím žádné fotky — použijte tlačítko výše.
                  </p>
                )}
              </Field>
            </div>

            <div className="col-span-2">
              <Field label="Dokumenty">
                <p className="text-[11px] mb-2" style={{ color: "var(--color-text-muted)" }}>
                  PDF nebo Word (max. 5 MB na soubor). Můžete jich přidat více.
                </p>
                <input
                  ref={docsInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    const v = validatePropertyDocumentFile(file);
                    if (v) {
                      toast.error(v);
                      return;
                    }
                    setUploadBusy(true);
                    const supabase = createClient();
                    const folder = property?.id ?? "new";
                    const result = await uploadPropertyDocument(supabase, file, folder);
                    setUploadBusy(false);
                    if ("error" in result) {
                      toast.error(result.error);
                      return;
                    }
                    setDocumentUrls((prev) => [...prev, { url: result.url, name: result.name }]);
                    toast.success("Dokument nahrán");
                  }}
                />
                <button
                  type="button"
                  disabled={uploadBusy}
                  onClick={() => docsInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer mb-3 w-full sm:w-auto justify-center"
                  style={{
                    backgroundColor: "rgba(22,101,52,0.08)",
                    border: "1px dashed rgba(22,101,52,0.35)",
                    color: "#166534",
                  }}
                >
                  <Upload size={18} strokeWidth={1.5} />
                  Přidat dokument
                </button>
                {documentUrls.length > 0 ? (
                  <ul className="space-y-2">
                    {documentUrls.map((d, idx) => (
                      <li
                        key={`${d.url}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
                        style={{
                          border: "1px solid rgba(199,196,215,0.35)",
                          backgroundColor: "var(--color-bg-subtle)",
                        }}
                      >
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 min-w-0 text-xs font-medium"
                          style={{ color: "var(--color-brand)" }}
                        >
                          <FileText size={16} strokeWidth={1.5} className="shrink-0" />
                          <span className="truncate">{d.name}</span>
                        </a>
                        <button
                          type="button"
                          onClick={() =>
                            setDocumentUrls((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="shrink-0 p-1.5 rounded-lg cursor-pointer"
                          style={{ color: "#991b1b" }}
                          aria-label="Odebrat dokument"
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Žádné dokumenty — typicky smlouvy, prohlášení, PD.
                  </p>
                )}
              </Field>
            </div>
          </div>

          {error && (
            <p className="text-xs font-medium" style={{ color: "#991b1b" }}>
              {error}
            </p>
          )}
          </DialogSheetScrollBody>

          {/* Footer */}
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
              disabled={isPending || uploadBusy}
              className="px-5 py-2.5 text-sm font-bold rounded-lg text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-brand)" }}
            >
              {isPending ? "Ukládám…" : isEdit ? "Uložit změny" : "Přidat nemovitost"}
            </button>
          </div>
        </form>
      </DialogSheetPanel>
    </DialogSheetRoot>
  );
}
