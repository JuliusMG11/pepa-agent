import type Anthropic from "@anthropic-ai/sdk";
import { anthropic, CLAUDE_MODEL } from "./client";
import { toolDefinitions } from "./tools/definitions";
import type { Result } from "@/types/app";
import type { ReportData as AgentReportData } from "./tools/generate-report";
import type { ChartPayload } from "./tools/render-chart";
import type { EmailDraft } from "./tools/draft-email";
import type { PresentationResult } from "./tools/create-presentation";
import type { EmailListResult } from "./tools/get-emails";

/** Avoid oversized tool payloads breaking the Anthropic request; strip non-JSON Error instances */
const MAX_TOOL_RESULT_JSON_CHARS = 100_000;

/** Also used for SSE chart/email payloads so Error objects and huge blobs do not break the stream */
export function stringifyForModel(value: unknown): string {
  try {
    const s = JSON.stringify(value, (_key, v) =>
      v instanceof Error ? v.message : v
    );
    if (s.length > MAX_TOOL_RESULT_JSON_CHARS) {
      return `${s.slice(0, MAX_TOOL_RESULT_JSON_CHARS)}…[zkráceno, celkem ${s.length} znaků]`;
    }
    return s;
  } catch {
    return JSON.stringify({
      success: false,
      error: "Serializace výsledku nástroje selhala.",
    });
  }
}

export interface RunAgentParams {
  messages: Anthropic.MessageParam[];
  systemPrompt: string;
  onText: (chunk: string) => void;
  onToolCall: (
    name: string,
    input: Record<string, unknown>,
    toolUseId: string
  ) => Promise<unknown>;
  onToolResult?: (toolUseId: string, content: string) => void;
  onEvent: (type: string, payload: unknown) => void;
}

/**
 * Agentic loop: streams a Claude response, executes tool calls, feeds results back,
 * and continues until the model stops with end_turn.
 */
export async function runAgent(params: RunAgentParams): Promise<string> {
  const { messages, systemPrompt, onText, onToolCall, onToolResult, onEvent } = params;
  const allMessages: Anthropic.MessageParam[] = [...messages];
  let fullText = "";

  // Safety guard — max 10 tool-call rounds to prevent infinite loops
  const MAX_ROUNDS = 10;
  let rounds = 0;

  while (rounds < MAX_ROUNDS) {
    rounds++;
    let stopReason: string | null = null;
    let assistantContent: Anthropic.Messages.ContentBlock[] = [];

    const stream = anthropic.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: allMessages,
      tools: toolDefinitions,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        onText(event.delta.text);
        fullText += event.delta.text;
      }

      if (event.type === "message_delta") {
        stopReason = event.delta.stop_reason ?? null;
      }
    }

    const finalMessage = await stream.finalMessage();
    assistantContent = finalMessage.content;
    stopReason = finalMessage.stop_reason ?? stopReason;

    // Add assistant turn to history
    allMessages.push({ role: "assistant", content: assistantContent });

    if (stopReason !== "tool_use") break;

    // Execute all tool calls in parallel
    const toolUseBlocks = assistantContent.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (toolUse) => {
        const result = await onToolCall(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
          toolUse.id
        );

        // Emit rich SSE — posílat jen data, ne celý Result (jinak klient nemá chart_type/series a .map() spadne)
        if (toolUse.name === "render_chart") {
          const res = result as Result<ChartPayload>;
          if (res.success && res.data) onEvent("chart", res.data);
        }
        if (toolUse.name === "draft_email") {
          const res = result as Result<EmailDraft>;
          if (res.success && res.data) onEvent("email", res.data);
        }
        if (toolUse.name === "create_presentation") {
          const res = result as Result<PresentationResult>;
          if (res.success && res.data) onEvent("download", res.data);
        }
        if (toolUse.name === "generate_report") {
          const res = result as Result<AgentReportData>;
          if (res.success) {
            onEvent("report", res.data);
          }
        }
        if (toolUse.name === "get_emails") {
          const res = result as Result<EmailListResult>;
          if (res.success && res.data) onEvent("email_list", res.data);
        }

        const resultContent = stringifyForModel(result);
        onToolResult?.(toolUse.id, resultContent);

        return {
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: resultContent,
        };
      })
    );

    // Feed tool results back for next round
    allMessages.push({ role: "user", content: toolResults });
  }

  return fullText;
}
