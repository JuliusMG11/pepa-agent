"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeUuid } from "@/lib/validation/uuid";

/** Prázdný výběr / whitespace z <select> → null; jinak normalizované UUID (bez přísného pipe z.uuid()). */
const optionalUuidNull = z.preprocess((val) => {
  if (val === undefined || val === null) return null;
  const t = typeof val === "string" ? val.trim() : String(val).trim();
  if (t === "" || t === "undefined" || t === "null") return null;
  return normalizeUuid(t);
}, z.union([z.null(), z.string()]).refine(
  (v) =>
    v === null ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v),
  { message: "Neplatné ID klienta nebo agenta" }
));

const PropertySchema = z.object({
  id: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    return normalizeUuid(val) ?? undefined;
  }, z.uuid().optional()),
  title: z.string().min(1, "Název je povinný"),
  address: z.string().min(1, "Adresa je povinná"),
  city: z.string().default("Praha"),
  district: z.string().min(1, "Čtvrť je povinná"),
  type: z.enum(["byt", "dum", "komercni", "pozemek", "garaze"]),
  status: z.enum(["active", "pending", "sold", "withdrawn"]).default("active"),
  price: z.coerce.number().positive("Cena musí být kladná"),
  area_m2: z.coerce.number().positive("Plocha musí být kladná"),
  floor: z.coerce.number().nullable().optional(),
  total_floors: z.coerce.number().nullable().optional(),
  year_built: z.coerce.number().nullable().optional(),
  last_renovation: z.string().nullable().optional(),
  reconstruction_notes: z.string().nullable().optional(),
  permit_data: z.string().nullable().optional(),
  agent_id: optionalUuidNull,
  client_id: optionalUuidNull,
  cover_image_url: z.union([z.string().url(), z.literal("")]).optional().transform((v) => (v === "" ? null : v)),
  gallery_urls: z.array(z.string().url()).default([]),
  document_urls: z.array(z.string().url()).default([]),
});

export type UpsertPropertyResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function upsertProperty(
  formData: FormData
): Promise<UpsertPropertyResult> {
  const raw = Object.fromEntries(formData.entries());

  // Coerce empty strings to null for optional fields
  const nullIfEmpty = (key: string) =>
    raw[key] === "" || raw[key] === undefined ? null : raw[key];

  const documentMulti = formData
    .getAll("document_urls")
    .map(String)
    .map((s) => s.trim())
    .filter(Boolean);

  const galleryMulti = formData
    .getAll("gallery_urls")
    .map(String)
    .map((s) => s.trim())
    .filter(Boolean);
  const galleryRawSingle = raw.gallery_urls;
  const gallery_lines =
    galleryMulti.length > 0
      ? galleryMulti
      : typeof galleryRawSingle === "string"
        ? galleryRawSingle
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

  const coverRaw = raw.cover_image_url;
  const cover_image_url =
    coverRaw === "" || coverRaw === undefined || coverRaw === null
      ? null
      : String(coverRaw).trim();

  const parsed = PropertySchema.safeParse({
    ...raw,
    floor: nullIfEmpty("floor"),
    total_floors: nullIfEmpty("total_floors"),
    year_built: nullIfEmpty("year_built"),
    last_renovation: nullIfEmpty("last_renovation"),
    reconstruction_notes: nullIfEmpty("reconstruction_notes"),
    permit_data: nullIfEmpty("permit_data"),
    agent_id: nullIfEmpty("agent_id"),
    client_id: nullIfEmpty("client_id"),
    cover_image_url: cover_image_url ?? "",
    gallery_urls: gallery_lines,
    document_urls: documentMulti.length > 0 ? documentMulti : [],
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(", ");
    return { success: false, error: message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nejste přihlášeni." };

  const { id, ...fields } = parsed.data;
  const gallery_urls = fields.gallery_urls;

  // RLS: INSERT vyžaduje agent_id = auth.uid(); prázdný výběr → aktuální uživatel
  const agentId = fields.agent_id ?? user.id;

  if (id) {
    const { error } = await supabase
      .from("properties")
      .update({
        ...fields,
        gallery_urls,
        agent_id: fields.agent_id ?? agentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/properties");
    revalidatePath(`/properties/${id}`);
    return { success: true, id };
  }

  const { data, error } = await supabase
    .from("properties")
    .insert({ ...fields, gallery_urls, agent_id: agentId })
    .select("id")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Neznámá chyba" };
  revalidatePath("/properties");
  return { success: true, id: data.id };
}

export async function deleteProperty(propertyId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", propertyId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
  return { success: true };
}

const LinkClientSchema = z.object({
  propertyId: z
    .preprocess(
      (v) => (v === null || v === undefined ? "" : String(v).trim()),
      z
        .string()
        .transform((raw) => normalizeUuid(raw))
        .refine((v): v is string => v !== null, { message: "Neplatné ID nemovitosti" })
    ),
  clientId: z.preprocess((val) => {
    if (val === undefined || val === null) return null;
    const t = typeof val === "string" ? val.trim() : String(val).trim();
    if (t === "" || t === "undefined" || t === "null") return null;
    return normalizeUuid(t);
  }, z.union([z.null(), z.string()]).refine(
    (v) =>
      v === null ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v),
    { message: "Neplatné ID klienta" }
  )),
});

/**
 * Přiřadí nemovitost ke klientovi (nebo odpojí při clientId = null).
 * Stejný vztah jako pole client_id u nemovitosti.
 */
export async function setPropertyClientLink(
  propertyId: string,
  clientId: string | null
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = LinkClientSchema.safeParse({ propertyId, clientId });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nejste přihlášeni." };

  const { data: prop } = await supabase
    .from("properties")
    .select("id, agent_id, client_id")
    .eq("id", parsed.data.propertyId)
    .maybeSingle();

  if (!prop || prop.agent_id !== user.id) {
    return { success: false, error: "Nemovitost nenalezena nebo k ní nemáte přístup." };
  }

  const previousClientId = prop.client_id;

  if (parsed.data.clientId) {
    const { data: cli } = await supabase
      .from("clients")
      .select("id")
      .eq("id", parsed.data.clientId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!cli) {
      return { success: false, error: "Klient nenalezen." };
    }
  }

  const { error } = await supabase
    .from("properties")
    .update({
      client_id: parsed.data.clientId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.propertyId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/properties");
  revalidatePath(`/properties/${parsed.data.propertyId}`);
  revalidatePath("/clients");
  if (parsed.data.clientId) {
    revalidatePath(`/clients/${parsed.data.clientId}`);
  }
  if (previousClientId && previousClientId !== parsed.data.clientId) {
    revalidatePath(`/clients/${previousClientId}`);
  }

  return { success: true };
}

const UpdateDocumentsSchema = z.object({
  propertyId: z
    .preprocess((v) => normalizeUuid(v), z.union([z.string(), z.null()]))
    .refine((v): v is string => v !== null, { message: "Neplatné ID nemovitosti" })
    .pipe(z.uuid({ error: "Neplatné ID nemovitosti" })),
  document_urls: z.array(z.string().url()),
});

export async function updatePropertyDocumentUrls(
  propertyId: string,
  documentUrls: string[]
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = UpdateDocumentsSchema.safeParse({
    propertyId,
    document_urls: documentUrls,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nejste přihlášeni." };

  const { data: prop } = await supabase
    .from("properties")
    .select("id, agent_id")
    .eq("id", parsed.data.propertyId)
    .maybeSingle();

  if (!prop || prop.agent_id !== user.id) {
    return { success: false, error: "Nemovitost nenalezena nebo k ní nemáte přístup." };
  }

  const { error } = await supabase
    .from("properties")
    .update({
      document_urls: parsed.data.document_urls,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.propertyId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/properties");
  revalidatePath(`/properties/${parsed.data.propertyId}`);
  return { success: true };
}
