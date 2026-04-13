"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
import {
  loadChatSessions,
  saveChatSessions,
  titleFromFirstUserMessage,
  type ChatSessionRecord,
  type StoredChatMessage,
} from "@/lib/chat-storage";
import type { ChartPayload } from "@/lib/claude/tools/render-chart";
import type { EmailDraft } from "@/lib/claude/tools/draft-email";
import type { PresentationResult } from "@/lib/claude/tools/create-presentation";
import type { ReportData as AgentReportData } from "@/lib/claude/tools/generate-report";

// ── Types ──────────────────────────────────────────────────────────────────

export type RichBlock =
  | { type: "chart"; payload: ChartPayload }
  | { type: "email"; payload: EmailDraft }
  | { type: "download"; payload: PresentationResult }
  | { type: "report"; payload: AgentReportData };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  richBlocks: RichBlock[];
  isStreaming: boolean;
  error?: string;
  createdAt: Date;
}

// ── SSE event shapes from the API ──────────────────────────────────────────

interface SseText {
  type: "text";
  chunk: string;
}
interface SseChart {
  type: "chart";
  payload: ChartPayload;
}
interface SseEmail {
  type: "email";
  payload: EmailDraft;
}
interface SseDownload {
  type: "download";
  payload: PresentationResult;
}
interface SseReport {
  type: "report";
  payload: AgentReportData;
}
interface SseDone {
  type: "done";
}
interface SseError {
  type: "error";
  message: string;
}

type SseEvent =
  | SseText
  | SseChart
  | SseEmail
  | SseDownload
  | SseReport
  | SseDone
  | SseError;

/** API vyžaduje zod.string().uuid() — nikdy nanoid. */
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

function toStored(m: ChatMessage): StoredChatMessage | null {
  if (m.isStreaming) return null;
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    richBlocks: m.richBlocks as unknown[],
    error: m.error,
    createdAt: m.createdAt.toISOString(),
  };
}

function fromStored(s: StoredChatMessage): ChatMessage {
  return {
    id: s.id,
    role: s.role,
    content: s.content,
    richBlocks: (Array.isArray(s.richBlocks) ? s.richBlocks : []) as RichBlock[],
    isStreaming: false,
    error: s.error,
    createdAt: new Date(s.createdAt),
  };
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef<string>(newSessionUuid());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateMessage = useCallback(
    (id: string, updater: (msg: ChatMessage) => ChatMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
    },
    []
  );

  useEffect(() => {
    const list = loadChatSessions();
    setSessions(list);
    if (list.length > 0) {
      const sorted = [...list].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt)
      );
      const pick = sorted[0];
      setActiveSessionId(pick.id);
      sessionIdRef.current = pick.apiSessionId;
      setMessages(pick.messages.map(fromStored));
    } else {
      const id = nanoid();
      setActiveSessionId(id);
      sessionIdRef.current = newSessionUuid();
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    if (!activeSessionId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
      const storedMsgs = messages
        .map(toStored)
        .filter((m): m is StoredChatMessage => m != null);
      if (storedMsgs.length === 0) return;

      const firstUser = messages.find((m) => m.role === "user");
      const title = firstUser
        ? titleFromFirstUserMessage(firstUser.content)
        : "Nový chat";
      setSessions((prev) => {
        const existing = prev.find((s) => s.id === activeSessionId);
        const payloadKey = JSON.stringify(storedMsgs);
        const existingKey = existing
          ? JSON.stringify(existing.messages)
          : null;
        const messagesUnchanged =
          existing != null && payloadKey === existingKey;

        if (messagesUnchanged && existing) {
          return prev;
        }

        const now = new Date().toISOString();
        const updatedAt = now;
        const createdAt = existing?.createdAt ?? existing?.updatedAt ?? now;

        const next: ChatSessionRecord = {
          id: activeSessionId,
          title,
          updatedAt,
          createdAt,
          apiSessionId: sessionIdRef.current,
          messages: storedMsgs,
        };
        const others = prev.filter((s) => s.id !== activeSessionId);
        const merged = [next, ...others].sort((a, b) =>
          b.updatedAt.localeCompare(a.updatedAt)
        );
        saveChatSessions(merged);
        return merged;
      });
    }, 600);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [messages, activeSessionId]);

  const newChat = useCallback(() => {
    const id = nanoid();
    sessionIdRef.current = newSessionUuid();
    setActiveSessionId(id);
    setMessages([]);
  }, []);

  const selectSession = useCallback((id: string) => {
    const list = loadChatSessions();
    const s = list.find((x) => x.id === id);
    if (!s) return;
    sessionIdRef.current = s.apiSessionId;
    setActiveSessionId(id);
    setMessages(s.messages.map(fromStored));
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveChatSessions(next);
      return next;
    });
    setActiveSessionId((cur) => {
      if (cur !== id) return cur;
      sessionIdRef.current = newSessionUuid();
      setMessages([]);
      return nanoid();
    });
  }, []);

  const updateAssistantMessage = useCallback(
    (id: string, content: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id && m.role === "assistant"
            ? { ...m, content, richBlocks: m.richBlocks ?? [] }
            : m
        )
      );
    },
    []
  );

  const deleteMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMessageId = nanoid();
      const assistantMessageId = nanoid();

      // 1. Optimistically add user message
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: "user",
        content: text.trim(),
        richBlocks: [],
        isStreaming: false,
        createdAt: new Date(),
      };

      // 2. Add empty streaming assistant message
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        richBlocks: [],
        isStreaming: true,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);

      try {
        // 3. Fetch streaming response
        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            sessionId: sessionIdRef.current,
          }),
        });

        if (!res.ok) {
          const errorData = (await res.json()) as { error?: string };
          throw new Error(errorData.error ?? `HTTP ${res.status}`);
        }

        if (!res.body) throw new Error("No response body");

        // 4. Read SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const rawData = line.slice(6).trim();
            if (!rawData) continue;

            let event: SseEvent;
            try {
              event = JSON.parse(rawData) as SseEvent;
            } catch {
              continue;
            }

            switch (event.type) {
              case "text":
                updateMessage(assistantMessageId, (msg) => ({
                  ...msg,
                  content: msg.content + event.chunk,
                }));
                break;

              case "chart":
                updateMessage(assistantMessageId, (msg) => ({
                  ...msg,
                  richBlocks: [
                    ...(msg.richBlocks ?? []),
                    { type: "chart", payload: (event as SseChart).payload },
                  ],
                }));
                break;

              case "email":
                updateMessage(assistantMessageId, (msg) => ({
                  ...msg,
                  richBlocks: [
                    ...(msg.richBlocks ?? []),
                    { type: "email", payload: (event as SseEmail).payload },
                  ],
                }));
                break;

              case "download":
                updateMessage(assistantMessageId, (msg) => ({
                  ...msg,
                  richBlocks: [
                    ...(msg.richBlocks ?? []),
                    {
                      type: "download",
                      payload: (event as SseDownload).payload,
                    },
                  ],
                }));
                break;

              case "report":
                updateMessage(assistantMessageId, (msg) => ({
                  ...msg,
                  richBlocks: [
                    ...(msg.richBlocks ?? []),
                    {
                      type: "report",
                      payload: (event as SseReport).payload,
                    },
                  ],
                }));
                break;

              case "done":
                updateMessage(assistantMessageId, (msg) => ({
                  ...msg,
                  isStreaming: false,
                }));
                break;

              case "error":
                updateMessage(assistantMessageId, (msg) => ({
                  ...msg,
                  isStreaming: false,
                  error: (event as SseError).message,
                }));
                break;
            }
          }
        }
      } catch (err) {
        updateMessage(assistantMessageId, (msg) => ({
          ...msg,
          isStreaming: false,
          error:
            err instanceof Error
              ? err.message
              : "Nastala neočekávaná chyba.",
        }));
      } finally {
        updateMessage(assistantMessageId, (msg) =>
          msg.isStreaming ? { ...msg, isStreaming: false } : msg
        );
        setIsLoading(false);
      }
    },
    [isLoading, updateMessage]
  );

  const loadSession = useCallback((sessionId: string) => {
    sessionIdRef.current = sessionId;
    setMessages([]);
  }, []);

  const clearSession = useCallback(() => {
    newChat();
  }, [newChat]);

  return {
    messages,
    isLoading,
    sessionId: sessionIdRef.current,
    sessions,
    activeSessionId,
    sendMessage,
    loadSession,
    clearSession,
    newChat,
    selectSession,
    deleteSession,
    updateAssistantMessage,
    deleteMessage,
  };
}
