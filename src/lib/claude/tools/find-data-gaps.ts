import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Result } from "@/types/app";

export interface FindDataGapsInput {
  fields?: string[];
  district?: string;
  export_format?: "json" | "csv";
}

export interface GapProperty {
  id: string;
  title: string;
  address: string;
  district: string | null;
  missing_fields: string[];
}

export interface DataGapsResult {
  properties: GapProperty[];
  total: number;
  summary: Record<string, number>; // field → count of missing
}

// Only these fields may be checked — prevents arbitrary column access
const ALLOWED_GAP_FIELDS = [
  "reconstruction_notes",
  "permit_data",
  "area_m2",
  "floor",
] as const;

type AllowedGapField = (typeof ALLOWED_GAP_FIELDS)[number];

export async function findDataGapsTool(
  input: FindDataGapsInput,
  context: { supabase: SupabaseClient<Database> }
): Promise<Result<DataGapsResult>> {
  const {
    fields = ["reconstruction_notes", "permit_data", "area_m2"],
    district,
    export_format = "json",
  } = input;

  // Validate requested fields against whitelist
  const safeFields = fields.filter((f): f is AllowedGapField =>
    (ALLOWED_GAP_FIELDS as readonly string[]).includes(f)
  );

  if (safeFields.length === 0) {
    return {
      success: false,
      error: new Error(
        `No valid fields specified. Allowed: ${ALLOWED_GAP_FIELDS.join(", ")}`
      ),
    };
  }

  try {
    let query = context.supabase
      .from("properties")
      .select("id, title, address, district, reconstruction_notes, permit_data, area_m2, floor")
      .is("deleted_at", null)
      .eq("status", "active");

    if (district) {
      query = query.eq("district", district);
    }

    const { data, error } = await query.limit(200);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    const rows = data ?? [];
    const summary: Record<string, number> = {};

    const gapProperties: GapProperty[] = [];

    for (const row of rows) {
      const missingFields: string[] = [];

      for (const field of safeFields) {
        const val = (row as unknown as Record<string, unknown>)[field];
        if (val === null || val === undefined || val === "") {
          missingFields.push(field);
          summary[field] = (summary[field] ?? 0) + 1;
        }
      }

      if (missingFields.length > 0) {
        gapProperties.push({
          id: row.id,
          title: row.title,
          address: row.address ?? "",
          district: row.district ?? null,
          missing_fields: missingFields,
        });
      }
    }

    void export_format; // csv export would be a separate download step

    return {
      success: true,
      data: {
        properties: gapProperties,
        total: gapProperties.length,
        summary,
      },
    };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}
