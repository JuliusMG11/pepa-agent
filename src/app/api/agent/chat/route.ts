import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildSystemPrompt } from "@/lib/claude/system-prompt";
import { runAgent, stringifyForModel } from "@/lib/claude/agent";
import { executeTool } from "@/lib/claude/tool-executor";
import {
  loadConversationHistory,
  saveUserMessage,
  saveAssistantMessage,
} from "@/lib/claude/history";
import Anthropic from "@anthropic-ai/sdk";

const RequestSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().uuid(),
});

const RATE_LIMIT_PER_MINUTE = 10;

export async function POST(request: Request): Promise<Response> {
  // ── 1. Auth check ──
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Validate input ──
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { message, sessionId } = parsed.data;

  // ── 3. Rate limit check ──
  const windowStart = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from("agent_conversations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("role", "user")
    .gte("created_at", windowStart);

  if ((count ?? 0) >= RATE_LIMIT_PER_MINUTE) {
    return Response.json(
      { error: "Příliš mnoho požadavků. Zkus to za chvíli." },
      { status: 429 }
    );
  }

  // ── 4. Save user message ──
  await saveUserMessage(
    { sessionId, userId: user.id, content: message },
    supabase
  );

  // ── 5. Load history ──
  const history = await loadConversationHistory(sessionId, supabase);

  // The history already includes the message we just saved — remove last item
  // to avoid duplication (it was just inserted above)
  const historyWithoutLatest = history.slice(0, -1);

  // Append the current user message
  const messages: Anthropic.MessageParam[] = [
    ...historyWithoutLatest,
    { role: "user", content: message },
  ];

  // ── 6. Stream response ──
  const encoder = new TextEncoder();
  let accumulatedText = "";
  const toolCallsForHistory: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  }> = [];
  const toolResultsForHistory: Array<{ tool_use_id: string; content: string }> = [];
  const richBlocksForHistory: Array<{ type: string; payload: unknown }> = [];

  const stream = new ReadableStream({
    async start(controller) {
      function sendSse(data: string) {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }

      try {
        await runAgent({
          messages,
          systemPrompt: buildSystemPrompt(),

          onText(chunk) {
            accumulatedText += chunk;
            sendSse(JSON.stringify({ type: "text", chunk }));
          },

          async onToolCall(name, input, toolUseId) {
            // Use Claude's actual tool_use_id so history round-trips correctly
            toolCallsForHistory.push({ id: toolUseId, name, input });

            const result = await executeTool(name, input, {
              userId: user.id,
              supabase,
            });
            return result;
          },

          onToolResult(toolUseId, content) {
            toolResultsForHistory.push({ tool_use_id: toolUseId, content });
          },

          onEvent(type, payload) {
            richBlocksForHistory.push({ type, payload });
            sendSse(stringifyForModel({ type, payload }));
          },
        });

        // Signal stream end
        sendSse(JSON.stringify({ type: "done" }));
        controller.close();
      } catch (err) {
        const errorMessage =
          err instanceof Anthropic.APIError
            ? err.status === 429
              ? "Claude API: příliš mnoho požadavků. Zkuste za chvíli."
              : err.status === 529
                ? "Claude API je momentálně přetíženo. Zkuste za chvíli."
                : "Nastala chyba při komunikaci s AI."
            : "Nastala neočekávaná chyba.";

        sendSse(JSON.stringify({ type: "error", message: errorMessage }));
        controller.close();
      } finally {
        // ── 7. Persist assistant response ──
        if (accumulatedText || toolCallsForHistory.length > 0) {
          await saveAssistantMessage(
            {
              sessionId,
              userId: user.id,
              content: accumulatedText,
              toolCalls:
                toolCallsForHistory.length > 0
                  ? toolCallsForHistory
                  : undefined,
              toolResults:
                toolResultsForHistory.length > 0
                  ? toolResultsForHistory
                  : undefined,
              richBlocks:
                richBlocksForHistory.length > 0
                  ? richBlocksForHistory
                  : undefined,
            },
            supabase
          ).catch(console.error);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
