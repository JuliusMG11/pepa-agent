import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Result } from "@/types/app";
import { insertMonitoringJob } from "@/lib/monitoring/insert-job";
import { MONITORING_ALLOWED_DISTRICTS } from "@/lib/monitoring/allowed-districts";

export interface CreateMonitoringJobInput {
  name: string;
  location: string;
  property_types?: string[];
  price_max?: number;
  notify_telegram?: boolean;
  notify_email?: boolean;
  schedule?: "hourly" | "daily" | "twice_daily";
}

export interface MonitoringJobCreated {
  id: string;
  name: string;
  location: string;
  next_run_at: string;
  schedule: string;
}

export async function createMonitoringJobTool(
  input: CreateMonitoringJobInput,
  context: { userId: string; supabase: SupabaseClient<Database> }
): Promise<Result<MonitoringJobCreated>> {
  const {
    name,
    location,
    property_types = ["byt"],
    price_max,
    notify_telegram = true,
    notify_email = false,
    schedule = "daily",
  } = input;

  // Reuse stejná validace jako UI / API
  const result = await insertMonitoringJob(context.supabase, {
    userId: context.userId,
    location,
    name,
    propertyTypes: property_types,
    priceMax: price_max,
    notifyTelegram: notify_telegram,
    notifyEmail: notify_email,
  });

  if (!result.success) {
    const msg = result.error.message;
    const hint =
      msg.includes("podporována") || msg.includes("není podpor")
        ? ` Povolené lokality: ${MONITORING_ALLOWED_DISTRICTS.join(", ")}`
        : "";
    return { success: false, error: new Error(msg + hint) };
  }

  const nextRun = new Date();
  if (schedule === "hourly") {
    nextRun.setHours(nextRun.getHours() + 1, 0, 0, 0);
  } else {
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(8, 0, 0, 0);
  }

  return {
    success: true,
    data: {
      id: result.data.id,
      name: result.data.name,
      location,
      next_run_at: nextRun.toISOString(),
      schedule,
    },
  };
}
