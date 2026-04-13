import type { Database } from "./database";

// Table row types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type Activity = Database["public"]["Tables"]["activities"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type AgentConversation =
  Database["public"]["Tables"]["agent_conversations"]["Row"];
export type MonitoringJob =
  Database["public"]["Tables"]["monitoring_jobs"]["Row"];
export type MarketListing =
  Database["public"]["Tables"]["market_listings"]["Row"];

// View row types
export type PropertySummary =
  Database["public"]["Views"]["v_property_summary"]["Row"];
export type LeadPipeline =
  Database["public"]["Views"]["v_lead_pipeline"]["Row"];
export type WeeklyKpi = Database["public"]["Views"]["v_weekly_kpis"]["Row"];

// Enum types
export type PropertyType = Database["public"]["Enums"]["property_type"];
export type PropertyStatus = Database["public"]["Enums"]["property_status"];
export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type LeadSource = Database["public"]["Enums"]["lead_source"];
export type ActivityType = Database["public"]["Enums"]["activity_type"];
export type ReportType = Database["public"]["Enums"]["report_type"];
export type UserRole = Database["public"]["Enums"]["user_role"];

// Insert types
export type PropertyInsert =
  Database["public"]["Tables"]["properties"]["Insert"];
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type ActivityInsert =
  Database["public"]["Tables"]["activities"]["Insert"];

// Update types
export type PropertyUpdate =
  Database["public"]["Tables"]["properties"]["Update"];
export type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];
export type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

// Result pattern for agent tools
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Agent message types (matches Anthropic SDK)
export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AgentToolCall {
  name: string;
  input: Record<string, unknown>;
}
