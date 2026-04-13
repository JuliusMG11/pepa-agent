"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { nanoid } from "nanoid";
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

export interface SessionRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// ── SSE event shapes from the API ──────────────────────────────────────────

interface SseText { type: "text"; chunk: string }
interface SseChart { type: "chart"; payload: ChartPayload }
interface SseEmail { type: "email"; payload: EmailDraft }
interface SseDownload { type: "download"; payload: PresentationResult }
interface SseReport { type: "report"; payload: AgentReportData }
interface SseDone { type: "done" }
interface SseError { type: "error"; message: string }

type SseEvent = SseText | SseChart | SseEmail | SseDownload | SseReport | SseDone | SseError;

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function titleFromText(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= 48) return t || "Nový chat";
  return `${t.slice(0, 45)}…`;
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sessionIdRef = useRef<string>(newUuid());
  const sessionCreatedRef = useRef(false);

  const updateMessage = useCallback(
    (id: string, updater: (msg: ChatMessage) => ChatMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
    },
    []
  );

  const loadSessionMessages = useCallback(async (id: string) => {
    const res = await fetch(`/api/chat/sessions/${id}/messages`);
    if (!res.ok) return;
    const json = (await res.json()) as {
      messages: Array<{
        id: string;
        role: "user" | "assistant";
        content: string;
        richBlocks: RichBlock[];
        createdAt: string;
      }>;
    };
    setMessages(
      (json.messages ?? []).map((m) => ({
        ...m,
        isStreaming: false,
        createdAt: new Date(m.createdAt),
      }))
    );
  }, []);

  // Load sessions from Supabase on mount
  useEffect(() => {
    async function init() {
      const res = await fetch("/api/chat/sessions");
      if (!res.ok) {
        const id = newUuid();
        setActiveSessionId(id);
        sessionIdRef.current = id;
        sessionCreatedRef.current = false;
        return;
      }
      const json = (await res.json()) as { sessions: SessionRecord[] };
      const list = json.sessions ?? [];
      setSessions(list);
      if (list.length > 0) {
        const latest = list[0];
        setActiveSessionId(latest.id);
        sessionIdRef.current = latest.id;
        sessionCreatedRef.current = true;
        await loadSessionMessages(latest.id);
      } else {
        const id = newUuid();
        setActiveSessionId(id);
        sessionIdRef.current = id;
        sessionCreatedRef.current = false;
        setMessages([]);
      }
    }
    init();
  }, [loadSessionMessages]);

  const newChat = useCallback(() => {
    const id = newUuid();
    sessionIdRef.current = id;
    sessionCreatedRef.current = false;
    setActiveSessionId(id);
    setMessages([]);
  }, []);

  const selectSession = useCallback(async (id: string) => {
    sessionIdRef.current = id;
    sessionCreatedRef.current = true;
    setActiveSessionId(id);
    setMessages([]);
    await loadSessionMessages(id);
  }, [loadSessionMessages]);

  const deleteSession = useCallback(async (id: string) => {
    await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      return next;
    });
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length > 0) {
        const next = remaining[0];
        sessionIdRef.current = next.id;
        sessionCreatedRef.current = true;
        loadSessionMessages(next.id);
        setActiveSessionId(next.id);
      } else {
        const newId = newUuid();
        sessionIdRef.current = newId;
        sessionCreatedRef.current = false;
        setMessages([]);
        setActiveSessionId(newId);
      }
      return remaining;
    });
  }, [loadSessionMessages]);

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

      const userMessage: ChatMessage = {
        id: userMessageId,
        role: "user",
        content: text.trim(),
        richBlocks: [],
        isStreaming: false,
        createdAt: new Date(),
      };

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

      // Create session in DB on first message
      if (!sessionCreatedRef.current) {
        const title = titleFromText(text.trim());
        await fetch("/api/chat/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, sessionId: sessionIdRef.current }),
        });
        sessionCreatedRef.current = true;
        const newSession: SessionRecord = {
          id: sessionIdRef.current,
          title,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(sessionIdRef.current);
      }

      try {
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

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const rawData = line.slice(6).trim();
            if (!rawData) continue;

            let event: SseEvent;
            try { event = JSON.parse(rawData) as SseEvent; } catch { continue; }

            switch (event.type) {
              case "text":
                updateMessage(assistantMessageId, (msg) => ({
                  ...msg,
                  content: msg.content + (event as SseText).chunk,
                }));
                break;
              case "chart":
                updateMessage(assistantMessageId, (msg) => ({
                  ...msg,
                  richBlocks: [...(msg.richBlocks ?? []), { type: "chart" as const, payload: (event as SseChart).payload }],
                }));
                break;
              case "email":
                updateMessage(assistantMessageId, (msg) => ({
                  ...msg,
                  richBlocks: [...(msg.richBlocks ?? []), { type: "email" as const, payload: (event as SseEmail).payload }],
                }));
                break;
              case "download":
                updateMessage(assistantMessageId, (msg) => ({
                  ...msg,
                  richBlocks: [...(msg.richBlocks ?? []), { type: "download" as const, payload: (event as SseDownload).payload }],
                }));
                break;
              case "report":
                updateMessage(assistantMessageId, (msg) => ({
                  ...msg,
                  richBlocks: [...(msg.richBlocks ?? []), { type: "report" as const, payload: (event as SseReport).payload }],
                }));
                break;
              case "done":
                updateMessage(assistantMessageId, (msg) => ({ ...msg, isStreaming: false }));
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === sessionIdRef.current
                      ? { ...s, updatedAt: new Date().toISOString() }
                      : s
                  )
                );
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
          error: err instanceof Error ? err.message : "Nastala neočekávaná chyba.",
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

  return {
    messages,
    isLoading,
    sessionId: sessionIdRef.current,
    sessions,
    activeSessionId,
    sendMessage,
    newChat,
    selectSession,
    deleteSession,
    updateAssistantMessage,
    deleteMessage,
  };
}
