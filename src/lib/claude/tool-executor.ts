import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

import { queryDatabaseTool, type QueryDatabaseInput } from "./tools/query-database";
import { getCalendarAvailabilityTool, type GetCalendarAvailabilityInput } from "./tools/get-calendar-availability";
import { draftEmailTool, type DraftEmailInput } from "./tools/draft-email";
import { findDataGapsTool, type FindDataGapsInput } from "./tools/find-data-gaps";
import { generateReportTool, type GenerateReportInput } from "./tools/generate-report";
import { createPresentationTool, type CreatePresentationInput } from "./tools/create-presentation";
import { renderChartTool, type RenderChartInput } from "./tools/render-chart";
import { createMonitoringJobTool, type CreateMonitoringJobInput } from "./tools/create-monitoring-job";
import { searchMarketListingsTool, type SearchMarketListingsInput } from "./tools/search-market-listings";
import { getEmailsTool, type GetEmailsInput } from "./tools/get-emails";

export interface ToolContext {
  userId: string;
  supabase: SupabaseClient<Database>;
}

/** Cast tool input through unknown to typed input — Claude's tool calls always match the schema */
function as<T>(input: Record<string, unknown>): T {
  return input as unknown as T;
}

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  switch (toolName) {
    case "query_database":
      return queryDatabaseTool(as<QueryDatabaseInput>(toolInput), context);

    case "get_calendar_availability":
      return getCalendarAvailabilityTool(
        as<GetCalendarAvailabilityInput>(toolInput),
        context
      );

    case "draft_email":
      return draftEmailTool(as<DraftEmailInput>(toolInput), context);

    case "find_data_gaps":
      return findDataGapsTool(as<FindDataGapsInput>(toolInput), context);

    case "generate_report":
      return generateReportTool(as<GenerateReportInput>(toolInput), context);

    case "create_presentation":
      return createPresentationTool(
        as<CreatePresentationInput>(toolInput),
        context
      );

    case "render_chart":
      return renderChartTool(as<RenderChartInput>(toolInput));

    case "create_monitoring_job":
      return createMonitoringJobTool(
        as<CreateMonitoringJobInput>(toolInput),
        context
      );

    case "search_market_listings":
      return searchMarketListingsTool(
        as<SearchMarketListingsInput>(toolInput),
        context
      );

    case "get_emails":
      return getEmailsTool(as<GetEmailsInput>(toolInput), context);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
