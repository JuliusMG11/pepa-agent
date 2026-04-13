"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseCsv } from "@/lib/import/parse-csv";
import type { Database } from "@/types/database";

type PropertyType = Database["public"]["Enums"]["property_type"];
type PropertyStatus = Database["public"]["Enums"]["property_status"];
type LeadStatus = Database["public"]["Enums"]["lead_status"];
type LeadSource = Database["public"]["Enums"]["lead_source"];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_RE.test(s.trim());
}

export type ImportCsvResult =
  | { success: true; imported: number; skipped: number }
  | { success: false; error: string };

const PROPERTY_TYPES = new Set(["byt", "dum", "komercni", "pozemek", "garaze"]);
const PROPERTY_STATUS = new Set(["active", "pending", "sold", "withdrawn"]);
const LEAD_STATUS = new Set([
  "new",
  "contacted",
  "viewing_scheduled",
  "offer_made",
  "closed_won",
  "closed_lost",
]);
const LEAD_SOURCE = new Set([
  "referral",
  "sreality",
  "bezrealitky",
  "reality_cz",
  "direct",
  "social",
  "event",
  "other",
]);
const CLIENT_SOURCE = LEAD_SOURCE;

export async function importPropertiesCsv(formData: FormData): Promise<ImportCsvResult> {
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return { success: false, error: "Chýba súbor." };
  }
  const text = await (file as File).text();
  const { rows } = parseCsv(text);
  if (rows.length === 0) {
    return { success: false, error: "CSV neobsahuje dáta (okrem hlavičky)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nie ste prihlásený." };

  let imported = 0;
  let skipped = 0;

  for (const r of rows) {
    const title = r.title ?? r.název ?? r.nazev ?? "";
    const address = r.address ?? r.adresa ?? "";
    const district = r.district ?? r.ctvrt ?? r["čtvrť"] ?? "";
    const typeRaw = (r.type ?? r.typ ?? "byt").toLowerCase();
    const type = (PROPERTY_TYPES.has(typeRaw) ? typeRaw : "byt") as PropertyType;
    const statusRaw = (r.status ?? "active").toLowerCase();
    const status = (PROPERTY_STATUS.has(statusRaw) ? statusRaw : "active") as PropertyStatus;
    const city = r.city ?? r.mesto ?? "Praha";
    const price = Number(r.price ?? r.cena ?? "");
    const area = Number(r.area_m2 ?? r.plocha ?? r["plocha m2"] ?? "");
    if (!title || !address || !district || !Number.isFinite(price) || price <= 0 || !Number.isFinite(area) || area <= 0) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from("properties").insert({
      title,
      address,
      city,
      district,
      type,
      status,
      price: Math.round(price),
      area_m2: area,
      agent_id: user.id,
    });
    if (error) {
      skipped++;
      continue;
    }
    imported++;
  }

  revalidatePath("/properties");
  return { success: true, imported, skipped };
}

export async function importClientsCsv(formData: FormData): Promise<ImportCsvResult> {
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return { success: false, error: "Chýba súbor." };
  }
  const text = await (file as File).text();
  const { rows } = parseCsv(text);
  if (rows.length === 0) {
    return { success: false, error: "CSV neobsahuje dáta." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nie ste prihlásený." };

  let imported = 0;
  let skipped = 0;

  for (const r of rows) {
    const full_name = r.full_name ?? r.name ?? r.jmeno ?? r.meno ?? "";
    if (!full_name) {
      skipped++;
      continue;
    }
    const email = r.email?.trim() || null;
    const phone = r.phone ?? r.telefon ?? r.tel ?? null;
    const srcRaw = (r.source ?? "").toLowerCase();
    const source: LeadSource | null =
      srcRaw && CLIENT_SOURCE.has(srcRaw) ? (srcRaw as LeadSource) : null;

    const { error } = await supabase.from("clients").insert({
      full_name,
      email,
      phone,
      source,
      assigned_agent_id: user.id,
    });
    if (error) {
      skipped++;
      continue;
    }
    imported++;
  }

  revalidatePath("/clients");
  return { success: true, imported, skipped };
}

export async function importLeadsCsv(formData: FormData): Promise<ImportCsvResult> {
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return { success: false, error: "Chýba súbor." };
  }
  const text = await (file as File).text();
  const { rows } = parseCsv(text);
  if (rows.length === 0) {
    return { success: false, error: "CSV neobsahuje dáta." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Nie ste prihlásený." };

  let imported = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const r of rows) {
    const client_id = (r.client_id ?? r.klient_id ?? "").trim();
    if (!client_id || !isUuid(client_id)) {
      skipped++;
      continue;
    }
    const rawPid = (r.property_id ?? r.nemovitost_id ?? "").trim();
    const property_id =
      rawPid === "" ? null : isUuid(rawPid) ? rawPid : null;
    if (rawPid !== "" && property_id === null) {
      skipped++;
      continue;
    }
    const statusRaw = (r.status ?? "new").toLowerCase();
    const status = (LEAD_STATUS.has(statusRaw) ? statusRaw : "new") as LeadStatus;
    const srcRaw = (r.source ?? "").toLowerCase();
    const source: LeadSource | null =
      srcRaw && LEAD_SOURCE.has(srcRaw) ? (srcRaw as LeadSource) : null;

    const { error } = await supabase.from("leads").insert({
      client_id,
      property_id,
      status,
      source,
      assigned_agent_id: user.id,
      first_contact_at: now,
      last_contact_at: now,
    });
    if (error) {
      skipped++;
      continue;
    }
    imported++;
  }

  revalidatePath("/leads");
  return { success: true, imported, skipped };
}
