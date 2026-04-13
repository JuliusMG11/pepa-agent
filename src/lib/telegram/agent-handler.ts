import { createClient as createServerClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { buildSystemPrompt } from "@/lib/claude/system-prompt";
import { runAgent } from "@/lib/claude/agent";
import { executeTool } from "@/lib/claude/tool-executor";
import {
  loadConversationHistory,
  saveUserMessage,
  saveAssistantMessage,
} from "@/lib/claude/history";
import { sendMessage, sendChatAction } from "./client";

function newSessionUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getServiceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function handleAgentQuery(
  chatId: number,
  text: string
): Promise<void> {
  const supabase = getServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("telegram_chat_id", chatId)
    .single();

  if (!profile) {
    await sendMessage(
      chatId,
      "Tvuj Telegram ucet neni propojen s Pepou. Prejdi do Nastaveni a propoj ho."
    );
    return;
  }

  await sendChatAction(chatId, "typing");

  const sessionId = newSessionUuid();
  const systemPrompt = buildSystemPrompt();

  await saveUserMessage(
    { sessionId, userId: profile.id, content: text },
    supabase
  );

  const history = await loadConversationHistory(sessionId, supabase);

  let fullResponse = "";
  const richBlocks: { type: string; payload: unknown }[] = [];

  try {
    fullResponse = await runAgent({
      messages: history,
      systemPrompt,
      onText: (chunk) => {
        fullResponse += chunk;
      },
      onToolCall: async (name, input) =>
        executeTool(name, input, { userId: profile.id, supabase }),
      onEvent: (type, payload) => {
        richBlocks.push({ type, payload });
      },
    });

    await saveAssistantMessage(
      { sessionId, userId: profile.id, content: fullResponse },
      supabase
    );

    const maxLen = 4096;
    if (fullResponse.length <= maxLen) {
      await sendMessage(chatId, fullResponse, "Markdown");
    } else {
      for (let i = 0; i < fullResponse.length; i += maxLen) {
        await sendMessage(chatId, fullResponse.slice(i, i + maxLen), "Markdown");
      }
    }

    for (const block of richBlocks) {
      if (block.type === "download") {
        const p = block.payload as { download_url?: string; filename?: string };
        if (p.download_url) {
          await sendMessage(
            chatId,
            `Stahnout soubor: [${p.filename ?? "soubor"}](${p.download_url})`,
            "Markdown"
          );
        }
      } else if (block.type === "email") {
        const p = block.payload as { subject?: string; body?: string };
        const body = p.body ?? "";
        const preview = `Koncept e-mailu\nPredmet: ${p.subject ?? ""}\n\n${body.slice(0, 800)}${body.length > 800 ? "..." : ""}`;
        await sendMessage(chatId, preview, "Markdown");
      }
    }
  } catch (err) {
    await sendMessage(
      chatId,
      "Omlouvam se, nastala chyba pri zpracovani dotazu. Zkus to prosim znovu."
    );
    console.error("[Telegram agent error]", err);
  }
}
