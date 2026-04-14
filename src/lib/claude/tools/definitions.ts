import type Anthropic from "@anthropic-ai/sdk";

export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "query_database",
    description:
      "Query properties, clients, leads, activities, or market_listings. Use this for any question about counts, lists, or aggregations from the database. Always use this tool — never guess data.",
    input_schema: {
      type: "object" as const,
      properties: {
        entity: {
          type: "string",
          enum: [
            "properties",
            "clients",
            "leads",
            "activities",
            "market_listings",
          ],
          description: "The database table to query.",
        },
        filters: {
          type: "object",
          description:
            "Key-value pairs to filter by. Only whitelisted columns accepted.",
          additionalProperties: { type: "string" },
        },
        date_range: {
          type: "object",
          properties: {
            column: { type: "string" },
            from: { type: "string", description: "ISO date string" },
            to: { type: "string", description: "ISO date string" },
          },
          required: ["column", "from"],
        },
        select: {
          type: "string",
          description:
            "Comma-separated column names to select. Defaults to '*'.",
        },
        order_by: {
          type: "object",
          properties: {
            column: { type: "string" },
            direction: { type: "string", enum: ["asc", "desc"] },
          },
          required: ["column"],
        },
        limit: {
          type: "number",
          description: "Max rows to return. Default 50, max 200.",
        },
      },
      required: ["entity"],
    },
  },
  {
    name: "get_calendar_availability",
    description:
      "Get free time slots from the agent's Google Calendar. Use when scheduling viewings or proposing meeting times.",
    input_schema: {
      type: "object" as const,
      properties: {
        days_ahead: {
          type: "number",
          description: "How many days ahead to look. Default 7.",
        },
        slot_duration_minutes: {
          type: "number",
          description: "Duration of each slot in minutes. Default 60.",
        },
        working_hours_start: {
          type: "string",
          description: "Start of working hours, e.g. '09:00'. Default '09:00'.",
        },
        working_hours_end: {
          type: "string",
          description: "End of working hours, e.g. '18:00'. Default '18:00'.",
        },
      },
      required: [],
    },
  },
  {
    name: "draft_email",
    description:
      "Draft a professional Czech-language email. Does NOT send — only generates draft for user review. Use for client follow-ups, viewing proposals, contract notifications.",
    input_schema: {
      type: "object" as const,
      properties: {
        recipient_name: {
          type: "string",
          description: "Full name of the email recipient.",
        },
        recipient_email: {
          type: "string",
          description: "Email address of the recipient.",
        },
        purpose: {
          type: "string",
          description:
            "Purpose of the email, e.g. 'viewing_proposal', 'follow_up', 'contract_send', 'market_update'.",
        },
        property_id: {
          type: "string",
          description:
            "UUID of the property to reference. Tool will load details automatically.",
        },
        proposed_slots: {
          type: "array",
          items: { type: "string" },
          description:
            "Formatted time slots to propose, e.g. ['středa 23. dubna 10:00–11:00'].",
        },
        custom_notes: {
          type: "string",
          description:
            "Additional context to include in the email, e.g. specific requirements, notes.",
        },
      },
      required: ["recipient_name", "purpose"],
    },
  },
  {
    name: "find_data_gaps",
    description:
      "Find properties with missing or NULL values in important fields. Use to identify data quality issues.",
    input_schema: {
      type: "object" as const,
      properties: {
        fields: {
          type: "array",
          items: { type: "string" },
          description:
            "Fields to check for NULL values. Allowed: 'reconstruction_notes', 'permit_data', 'description', 'area_m2', 'floor'.",
        },
        district: {
          type: "string",
          description: "Optional: filter by Prague district.",
        },
        export_format: {
          type: "string",
          enum: ["json", "csv"],
          description: "Output format. Default 'json'.",
        },
      },
      required: [],
    },
  },
  {
    name: "generate_report",
    description:
      "Aggregate business metrics for a time period into a structured report. Use for weekly/monthly summaries.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["weekly", "monthly", "quarterly", "custom"],
          description: "Report period.",
        },
        date_from: {
          type: "string",
          description: "ISO date string. Required for period='custom'.",
        },
        date_to: {
          type: "string",
          description: "ISO date string. Required for period='custom'.",
        },
        include_sections: {
          type: "array",
          items: { type: "string" },
          description:
            "Sections to include: 'leads', 'properties', 'clients', 'activities', 'market'. Defaults to all.",
        },
      },
      required: ["period"],
    },
  },
  {
    name: "create_presentation",
    description:
      "Generate a branded PDF summary (company colours) from report data, upload to storage, return download info. Use after generate_report.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Presentation title.",
        },
        period_label: {
          type: "string",
          description: "Human-readable period label, e.g. 'Duben 2025'.",
        },
        report_data: {
          type: "object",
          description:
            "ReportData object from generate_report tool output. Pass the full object.",
        },
      },
      required: ["title", "period_label", "report_data"],
    },
  },
  {
    name: "render_chart",
    description:
      "Return structured chart data for the frontend to render. Use when showing trends, distributions, or comparisons visually. For bar charts of leads over time, each data row MUST include either `lead_ids` (UUID strings for that bucket) or both `period_from` and `period_to` (ISO datetimes) so the user can click a bar and see the lead list.",
    input_schema: {
      type: "object" as const,
      properties: {
        chart_type: {
          type: "string",
          enum: ["line", "bar", "area", "pie", "composed"],
          description: "Chart type.",
        },
        title: {
          type: "string",
          description: "Chart title shown above the visualisation.",
        },
        data: {
          type: "array",
          items: { type: "object" },
          description:
            "Array of data points. Each object must include the x_key and all series values. For lead bar charts by month/period, add `lead_ids` (string[]) with UUIDs of leads in that bucket, OR `period_from` and `period_to` (ISO strings) for the bucket range.",
        },
        x_key: {
          type: "string",
          description: "Key in each data object to use as the X axis.",
        },
        series: {
          type: "array",
          items: {
            type: "object",
            properties: {
              key: { type: "string" },
              label: { type: "string" },
              color: { type: "string" },
            },
            required: ["key", "label"],
          },
          description: "Data series to render.",
        },
      },
      required: ["chart_type", "title", "data", "x_key", "series"],
    },
  },
  {
    name: "create_monitoring_job",
    description:
      "Create a scheduled monitoring job that watches real estate portals for new listings matching criteria.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Human-readable name for this monitoring job.",
        },
        location: {
          type: "string",
          description:
            "Prague district to monitor, e.g. 'Praha Vinohrady', 'Praha Holešovice'.",
        },
        property_types: {
          type: "array",
          items: { type: "string" },
          description: "Property types to watch: 'byt', 'dum', 'komercni'.",
        },
        price_max: {
          type: "number",
          description: "Maximum price in CZK.",
        },
        notify_telegram: {
          type: "boolean",
          description: "Send Telegram notification on new matches.",
        },
        notify_email: {
          type: "boolean",
          description: "Send email notification on new matches.",
        },
        schedule: {
          type: "string",
          enum: ["hourly", "daily", "twice_daily"],
          description: "How often to run. Default 'daily'.",
        },
      },
      required: ["name", "location"],
    },
  },
  {
    name: "get_emails",
    description:
      "Fetch the user's Gmail inbox messages. Use when asked about emails, received messages, or specific senders. Returns subject, sender, snippet and body excerpt for each message.",
    input_schema: {
      type: "object" as const,
      properties: {
        max_results: {
          type: "number",
          description: "Number of messages to return (1–20). Default 10.",
        },
        unread_only: {
          type: "boolean",
          description: "If true, return only unread messages.",
        },
        query: {
          type: "string",
          description:
            "Gmail search query, e.g. 'from:jan@firma.cz' or 'subject:nabídka'. Supports full Gmail search syntax.",
        },
      },
      required: [],
    },
  },
  {
    name: "search_market_listings",
    description:
      "Search scraped listings from Sreality and Bezrealitky. Use to find market data, compare prices, or analyse competition.",
    input_schema: {
      type: "object" as const,
      properties: {
        district: {
          type: "string",
          description: "Prague district to filter by.",
        },
        property_type: {
          type: "string",
          enum: ["byt", "dum", "komercni", "pozemek", "garaze"],
          description: "Property type filter.",
        },
        price_min: {
          type: "number",
          description: "Minimum price in CZK.",
        },
        price_max: {
          type: "number",
          description: "Maximum price in CZK.",
        },
        is_new: {
          type: "boolean",
          description: "If true, return only listings seen for the first time.",
        },
        days_back: {
          type: "number",
          description: "How many days back to look. Default 7.",
        },
      },
      required: [],
    },
  },
];
