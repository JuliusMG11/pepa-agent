import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type LeadSource = Database["public"]["Enums"]["lead_source"];

export interface ClientSummary extends ClientRow {
  total_leads: number;
  active_leads: number;
}

export interface ClientLead {
  id: string;
  status: LeadStatus;
  source: LeadSource | null;
  property_title: string | null;
  property_address: string | null;
  property_price: number | null;
  first_contact_at: string | null;
  last_contact_at: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface ClientActivity {
  id: string;
  type: Database["public"]["Enums"]["activity_type"];
  title: string;
  description: string | null;
  created_at: string;
}

export interface LeadPipelineRow {
  id: string;
  client_id: string;
  property_id: string | null;
  status: LeadStatus;
  source: LeadSource | null;
  first_contact_at: string | null;
  last_contact_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  property_title: string | null;
  property_address: string | null;
  property_price: number | null;
  agent_name: string | null;
  assigned_agent_id: string | null;
}

// ── Clients ────────────────────────────────────────────────────────────────

export async function getClients(
  supabase: SupabaseClient<Database>,
  opts: {
    search?: string;
    source?: LeadSource | "all";
    page?: number;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ data: ClientRow[]; total: number }> {
  const { search, source, page = 1 } = opts;
  const limit = opts.limit ?? 25;
  const offset =
    opts.offset != null ? opts.offset : (page - 1) * limit;

  let query = supabase
    .from("clients")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
    );
  }
  if (source && source !== "all") {
    query = query.eq("source", source);
  }

  const { data, count } = await query;
  return { data: (data ?? []) as ClientRow[], total: count ?? 0 };
}

/** Klienti pro výběr u nemovitosti (agent = svoji; admin = všichni) */
export async function getClientSelectOptions(
  supabase: SupabaseClient<Database>,
  agentId: string
): Promise<{ id: string; full_name: string }[]> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", agentId)
    .single();

  let query = supabase
    .from("clients")
    .select("id, full_name")
    .is("deleted_at", null)
    .order("full_name")
    .limit(500);

  if (profile?.role !== "admin") {
    query = query.eq("assigned_agent_id", agentId);
  }

  const { data } = await query;
  return (data ?? []) as { id: string; full_name: string }[];
}

export async function getClientById(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<ClientRow | null> {
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();
  return (data as ClientRow | null) ?? null;
}

export async function getClientLeads(
  supabase: SupabaseClient<Database>,
  clientId: string
): Promise<ClientLead[]> {
  const { data } = await supabase
    .from("v_lead_pipeline")
    .select("*")
    .order("created_at", { ascending: false });

  // v_lead_pipeline doesn't expose client_id directly, filter by name lookup would be lossy.
  // Query leads table directly and join with property for title/address.
  const { data: leads } = await supabase
    .from("leads")
    .select(
      "id, status, source, first_contact_at, last_contact_at, closed_at, created_at, property_id"
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (!leads || leads.length === 0) return [];

  // Gather property ids to resolve titles
  const propertyIds = leads
    .map((l) => l.property_id)
    .filter((id): id is string => id != null);

  let propertyMap: Record<string, { title: string; address: string; price: number }> = {};
  if (propertyIds.length > 0) {
    const { data: props } = await supabase
      .from("properties")
      .select("id, title, address, price")
      .in("id", propertyIds);
    for (const p of props ?? []) {
      propertyMap[p.id] = { title: p.title, address: p.address, price: p.price };
    }
  }

  void data; // v_lead_pipeline query result unused

  return leads.map((l) => {
    const prop = l.property_id ? propertyMap[l.property_id] : null;
    return {
      id: l.id,
      status: l.status as LeadStatus,
      source: (l.source as LeadSource | null) ?? null,
      property_title: prop?.title ?? null,
      property_address: prop?.address ?? null,
      property_price: prop?.price ?? null,
      first_contact_at: l.first_contact_at,
      last_contact_at: l.last_contact_at,
      closed_at: l.closed_at,
      created_at: l.created_at,
    };
  });
}

export async function getClientActivities(
  supabase: SupabaseClient<Database>,
  clientId: string
): Promise<ClientActivity[]> {
  const { data } = await supabase
    .from("activities")
    .select("id, type, title, description, created_at")
    .eq("related_to_type", "client")
    .eq("related_to_id", clientId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as ClientActivity[];
}

export async function updateClientNotes(
  supabase: SupabaseClient<Database>,
  clientId: string,
  notes: string
): Promise<void> {
  await supabase.from("clients").update({ notes }).eq("id", clientId);
}

// ── Leads pipeline ─────────────────────────────────────────────────────────

export async function getLeadPipeline(
  supabase: SupabaseClient<Database>
): Promise<LeadPipelineRow[]> {
  const { data } = await supabase
    .from("v_lead_pipeline")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as LeadPipelineRow[];
}

/** Pro drilldown z grafu (klik na sloupec) — max ~500 ID */
export async function getLeadPipelineByIds(
  supabase: SupabaseClient<Database>,
  ids: string[]
): Promise<LeadPipelineRow[]> {
  if (ids.length === 0) return [];
  const unique = [...new Set(ids)].slice(0, 500);
  const { data } = await supabase
    .from("v_lead_pipeline")
    .select("*")
    .in("id", unique)
    .order("created_at", { ascending: false });
  return (data ?? []) as LeadPipelineRow[];
}

export async function getLeadPipelineByCreatedRange(
  supabase: SupabaseClient<Database>,
  fromIso: string,
  toIso: string
): Promise<LeadPipelineRow[]> {
  const { data } = await supabase
    .from("v_lead_pipeline")
    .select("*")
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: false });
  return (data ?? []) as LeadPipelineRow[];
}

export async function getSourceBreakdown(
  supabase: SupabaseClient<Database>
): Promise<{ source: string; count: number }[]> {
  const { data } = await supabase
    .from("clients")
    .select("source")
    .is("deleted_at", null);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const src = row.source ?? "other";
    counts[src] = (counts[src] ?? 0) + 1;
  }

  return Object.entries(counts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);
}
