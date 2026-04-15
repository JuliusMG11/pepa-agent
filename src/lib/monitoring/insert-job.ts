import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Result } from "@/types/app";
import { MONITORING_ALLOWED_DISTRICTS } from "./allowed-districts";
import { computeNextRunAt } from "./compute-next-run-at";

export type MonitoringSchedule = "hourly" | "daily" | "twice_daily";

const ALLOWED_SET = new Set<string>(MONITORING_ALLOWED_DISTRICTS);

export interface InsertMonitoringJobParams {
  userId: string;
  location: string;
  name?: string;
  propertyTypes?: string[];
  priceMax?: number;
  notifyTelegram?: boolean;
  notifyEmail?: boolean;
  runHour?: number;
}

export async function insertMonitoringJob(
  supabase: SupabaseClient<Database>,
  params: InsertMonitoringJobParams
): Promise<Result<{ id: string; name: string }>> {
  const location = params.location.trim();
  if (!ALLOWED_SET.has(location)) {
    return {
      success: false,
      error: new Error(
        `Lokalita není podporována. Vyberte jednu z nabízených čtvrtí (Praha …).`
      ),
    };
  }

  const runHour = params.runHour ?? 8;
  const name = params.name?.trim() || `Monitoring: ${location}`;
  const property_types = params.propertyTypes ?? ["byt"];
  const notify_telegram = params.notifyTelegram ?? true;
  const notify_email = params.notifyEmail ?? false;

  const queryData = {
    location,
    property_types,
    ...(params.priceMax !== undefined && { price_max: params.priceMax }),
    notify_telegram,
    notify_email,
  };

  const { data, error } = await supabase
    .from("monitoring_jobs")
    .insert({
      name,
      query: JSON.stringify(queryData),
      locations: [location],
      enabled: true,
      created_by: params.userId,
      notify_telegram,
      notify_email,
      run_hour: runHour,
      next_run_at: computeNextRunAt(runHour).toISOString(),
    })
    .select("id, name")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: new Error(error?.message ?? "Nepodařilo se vytvořit úlohu."),
    };
  }

  return { success: true, data: { id: data.id, name: data.name } };
}
