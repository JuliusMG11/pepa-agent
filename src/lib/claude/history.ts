import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Json } from "@/types/database";

const MAX_HISTORY_MESSAGES = 20;

type ConversationRow = Database["public"]["Tables"]["agent_conversations"]["Row"];

/**
 * Load the last N messages for a session and convert to Anthropic MessageParam format.
 * DB roles: "user" | "assistant" | "tool" (tool = tool result row)
 */
export async function loadConversationHistory(
  sessionId: string,
  supabase: SupabaseClient<Database>
): Promise<Anthropic.MessageParam[]> {
  const { data, error } = await supabase
    .from("agent_conversations")
    .select("role, content, tool_calls")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(MAX_HISTORY_MESSAGES);

  if (error || !data) return [];

  const rows = (data as ConversationRow[]).reverse();
  const messages: Anthropic.MessageParam[] = [];

  for (const row of rows) {
    if (row.role === "assistant") {
      // Use MessageParam content block types (not response ContentBlock types)
      const content: Array<
        Anthropic.TextBlockParam | Anthropic.ToolUseBlockParam
      > = [];

      if (row.content) {
        content.push({ type: "text", text: row.content });
      }

      // Reconstruct tool_use blocks from stored tool_calls
      if (row.tool_calls) {
        const toolCalls = row.tool_calls as Array<{
          id: string;
          name: string;
          input: Record<string, unknown>;
        }>;

        for (const tc of toolCalls) {
          content.push({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input: tc.input,
          });
        }
      }

      if (content.length > 0) {
        messages.push({ role: "assistant", content });
      }
    } else if (row.role === "tool") {
      // Tool result row — stored as JSON array in content
      try {
        const toolResults = JSON.parse(row.content ?? "[]") as Array<{
          tool_use_id: string;
          content: string;
        }>;

        const content: Anthropic.ToolResultBlockParam[] = toolResults.map(
          (tr) => ({
            type: "tool_result" as const,
            tool_use_id: tr.tool_use_id,
            content: tr.content,
          })
        );

        if (content.length > 0) {
          messages.push({ role: "user", content });
        }
      } catch {
        // Malformed tool result — skip
      }
    } else {
      // Plain user message
      messages.push({
        role: "user",
        content: row.content ?? "",
      });
    }
  }

  return messages;
}

/**
 * Save a user message to the conversation history.
 */
export async function saveUserMessage(
  params: { sessionId: string; userId: string; content: string },
  supabase: SupabaseClient<Database>
): Promise<void> {
  await supabase.from("agent_conversations").insert({
    session_id: params.sessionId,
    user_id: params.userId,
    role: "user",
    content: params.content,
  });
}

/**
 * Save an assistant response with optional tool calls to history.
 */
export async function saveAssistantMessage(
  params: {
    sessionId: string;
    userId: string;
    content: string;
    toolCalls?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
    toolResults?: Array<{ tool_use_id: string; content: string }>;
    richBlocks?: Array<{ type: string; payload: unknown }>;
  },
  supabase: SupabaseClient<Database>
): Promise<void> {
  const rows: Database["public"]["Tables"]["agent_conversations"]["Insert"][] =
    [];

  // Assistant message row
  rows.push({
    session_id: params.sessionId,
    user_id: params.userId,
    role: "assistant",
    content: params.content || null,
    tool_calls: params.toolCalls?.length
      ? (params.toolCalls as unknown as Json)
      : null,
    rich_blocks: params.richBlocks?.length
      ? (params.richBlocks as unknown as Json)
      : null,
  });

  // Tool results row (if any)
  if (params.toolResults?.length) {
    rows.push({
      session_id: params.sessionId,
      user_id: params.userId,
      role: "tool",
      content: JSON.stringify(params.toolResults),
    });
  }

  await supabase.from("agent_conversations").insert(rows);
}
