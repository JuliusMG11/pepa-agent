import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Result } from "@/types/app";

type AllowedEntity =
  | "properties"
  | "clients"
  | "leads"
  | "activities"
  | "market_listings";

// Whitelisted filter columns per entity — prevents column injection
const ALLOWED_FILTER_COLUMNS: Record<AllowedEntity, readonly string[]> = {
  properties: ["status", "district", "type", "agent_id", "id"],
  clients: ["source", "id"],
  leads: ["status", "assigned_agent_id", "client_id", "property_id", "id"],
  activities: ["type", "related_to_type", "related_to_id", "id"],
  market_listings: ["district", "source", "is_new", "id"],
};

// Whitelisted order columns per entity
const ALLOWED_ORDER_COLUMNS: Record<AllowedEntity, readonly string[]> = {
  properties: ["created_at", "updated_at", "price", "area_m2"],
  clients: ["created_at", "updated_at", "full_name"],
  leads: [
    "created_at",
    "updated_at",
    "status",
    "first_contact_at",
    "last_contact_at",
    "closed_at",
  ],
  activities: ["created_at"],
  market_listings: ["first_seen_at", "last_seen_at", "price", "area_m2"],
};

export interface QueryDatabaseInput {
  entity: AllowedEntity;
  filters?: Record<string, string>;
  date_range?: { column: string; from: string; to?: string };
  select?: string;
  order_by?: { column: string; direction?: "asc" | "desc" };
  limit?: number;
}

export async function queryDatabaseTool(
  input: QueryDatabaseInput,
  context: { supabase: SupabaseClient<Database> }
): Promise<Result<unknown[]>> {
  const { entity, filters, date_range, select, order_by, limit } = input;

  if (!ALLOWED_FILTER_COLUMNS[entity]) {
    return { success: false, error: new Error(`Unknown entity: ${entity}`) };
  }

  try {
    let query = context.supabase
      .from(entity)
      .select(sanitiseSelect(select));

    // Apply whitelisted filters
    if (filters) {
      for (const [col, val] of Object.entries(filters)) {
        if (!ALLOWED_FILTER_COLUMNS[entity].includes(col)) {
          return {
            success: false,
            error: new Error(`Column '${col}' is not allowed for ${entity}`),
          };
        }
        query = query.eq(col, val);
      }
    }

    // Apply date range filter
    if (date_range) {
      if (
        !ALLOWED_ORDER_COLUMNS[entity].includes(date_range.column) &&
        ![
          "created_at",
          "updated_at",
          "first_seen_at",
          "last_seen_at",
          "scheduled_at",
          "completed_at",
        ].includes(date_range.column)
      ) {
        return {
          success: false,
          error: new Error(`Date column '${date_range.column}' is not allowed`),
        };
      }
      query = query.gte(date_range.column, date_range.from);
      if (date_range.to) {
        query = query.lte(date_range.column, date_range.to);
      }
    }

    // Apply ordering
    if (order_by) {
      if (!ALLOWED_ORDER_COLUMNS[entity].includes(order_by.column)) {
        return {
          success: false,
          error: new Error(`Order column '${order_by.column}' is not allowed`),
        };
      }
      query = query.order(order_by.column, {
        ascending: order_by.direction !== "desc",
      });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Apply limit (cap at 200)
    const safeLimit = Math.min(limit ?? 50, 200);
    query = query.limit(safeLimit);

    const { data, error } = await query;

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data: data ?? [] };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

/** Strip dangerous characters from select string — only allow word chars, commas, spaces, dots */
function sanitiseSelect(select: string | undefined): string {
  if (!select) return "*";
  return select.replace(/[^a-zA-Z0-9_,\s.]/g, "");
}
