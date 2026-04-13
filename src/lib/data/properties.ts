import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// The view returns all columns nullable, but core fields are guaranteed non-null
// by the underlying properties table constraints.
type _ViewRow = Database["public"]["Views"]["v_property_summary"]["Row"];
export type PropertySummary = Omit<
  _ViewRow,
  "id" | "title" | "address" | "city" | "status" | "type" | "price" | "created_at" | "updated_at"
> & {
  id: string;
  title: string;
  address: string;
  city: string;
  status: Database["public"]["Enums"]["property_status"];
  type: Database["public"]["Enums"]["property_type"];
  price: number;
  created_at: string;
  updated_at: string;
};
export type PropertyType = Database["public"]["Enums"]["property_type"];
export type PropertyStatus = Database["public"]["Enums"]["property_status"];
export type LeadStatus = Database["public"]["Enums"]["lead_status"];

export interface PropertyFilters {
  status?: PropertyStatus | "all";
  type?: PropertyType | "all";
  district?: string;
  search?: string;
  missing_data?: boolean;
  page?: number;
  /** Velikost stránky (výchozí 20). Pro lazy load použijte 10. */
  limit?: number;
  /** Přímý offset (má přednost před page). */
  offset?: number;
}

// Fields checked for data quality
const KEY_FIELD_LABELS: Record<string, string> = {
  area_m2: "Plocha (m²)",
  floor: "Patro",
  year_built: "Rok výstavby",
  last_renovation: "Poslední renovace",
  reconstruction_notes: "Poznámky k rekonstrukci",
  permit_data: "Stavební povolení",
};

export function dataQuality(row: PropertySummary): {
  missing: string[];
  level: "green" | "amber" | "red";
} {
  const missing: string[] = [];
  for (const [field, label] of Object.entries(KEY_FIELD_LABELS)) {
    if (row[field as keyof PropertySummary] == null) {
      missing.push(label);
    }
  }
  const level =
    missing.length === 0 ? "green" : missing.length <= 3 ? "amber" : "red";
  return { missing, level };
}

export async function getProperties(
  supabase: SupabaseClient<Database>,
  filters: PropertyFilters = {}
): Promise<{ data: PropertySummary[]; total: number }> {
  const { status, type, district, search, missing_data, page = 1 } = filters;
  const limit = filters.limit ?? 20;
  const offset =
    filters.offset != null ? filters.offset : (page - 1) * limit;

  let query = supabase
    .from("v_property_summary")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== "all") query = query.eq("status", status);
  if (type && type !== "all") query = query.eq("type", type);
  if (district && district !== "all") query = query.eq("district", district);
  if (search) {
    query = query.or(`title.ilike.%${search}%,address.ilike.%${search}%`);
  }
  if (missing_data) {
    query = query.or(
      "reconstruction_notes.is.null,permit_data.is.null,floor.is.null,year_built.is.null"
    );
  }

  const { data, count } = await query;
  return { data: (data ?? []) as PropertySummary[], total: count ?? 0 };
}

export async function getPropertyById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<PropertySummary | null> {
  const { data } = await supabase
    .from("v_property_summary")
    .select("*")
    .eq("id", id)
    .single();
  return (data as PropertySummary | null) ?? null;
}

export interface PropertyLead {
  id: string;
  status: LeadStatus;
  source: Database["public"]["Enums"]["lead_source"] | null;
  first_contact_at: string | null;
  last_contact_at: string | null;
  closed_at: string | null;
  created_at: string;
  client_id: string;
}

export async function getPropertyLeads(
  supabase: SupabaseClient<Database>,
  propertyId: string
): Promise<PropertyLead[]> {
  const { data } = await supabase
    .from("leads")
    .select(
      "id, status, source, first_contact_at, last_contact_at, closed_at, created_at, client_id"
    )
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });
  return (data ?? []) as PropertyLead[];
}

export interface PropertyActivity {
  id: string;
  type: Database["public"]["Enums"]["activity_type"];
  title: string;
  description: string | null;
  created_at: string;
  scheduled_at: string | null;
  completed_at: string | null;
}

export async function getPropertyActivities(
  supabase: SupabaseClient<Database>,
  propertyId: string
): Promise<PropertyActivity[]> {
  const { data } = await supabase
    .from("activities")
    .select(
      "id, type, title, description, created_at, scheduled_at, completed_at"
    )
    .eq("related_to_type", "property")
    .eq("related_to_id", propertyId)
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []) as PropertyActivity[];
}

export async function getAgents(supabase: SupabaseClient<Database>) {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["admin", "agent"])
    .order("full_name");
  return data ?? [];
}

export interface PropertyClientLinkRow {
  id: string;
  title: string;
  address: string;
  client_id: string | null;
}

/** Nemovitosti agenta: přiřazené danému klientovi + volné (bez klienta) pro výběr */
export async function getAgentPropertiesForClientLinking(
  supabase: SupabaseClient<Database>,
  agentId: string,
  clientId: string
): Promise<{ linked: PropertyClientLinkRow[]; unassigned: PropertyClientLinkRow[] }> {
  const { data } = await supabase
    .from("v_property_summary")
    .select("id, title, address, client_id")
    .eq("agent_id", agentId)
    .order("title");

  const rows = (data ?? []) as PropertyClientLinkRow[];
  const linked = rows.filter((p) => p.client_id === clientId);
  const unassigned = rows.filter((p) => p.client_id === null);
  return { linked, unassigned };
}
