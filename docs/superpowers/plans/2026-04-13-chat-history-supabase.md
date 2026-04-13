# Chat History — Supabase Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage chat history with Supabase so sessions persist across devices, users see their own history, and web + Telegram history are unified.

**Architecture:** Add a `chat_sessions` table for session metadata (title, timestamps), add `rich_blocks jsonb` to `agent_conversations` for charts/emails/reports. Replace `chat-storage.ts` with API routes. `useAgentChat` fetches from Supabase instead of localStorage.

**Tech Stack:** Next.js App Router API routes, Supabase (RLS), TypeScript strict, Zod, existing `createClient` patterns.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `supabase/migrations/20260413000000_chat_sessions.sql` | New table + rich_blocks column |
| Create | `src/app/api/chat/sessions/route.ts` | GET list + POST create session |
| Create | `src/app/api/chat/sessions/[id]/route.ts` | DELETE session |
| Create | `src/app/api/chat/sessions/[id]/messages/route.ts` | GET messages with rich_blocks |
| Modify | `src/app/api/agent/chat/route.ts` | Save rich_blocks to DB |
| Modify | `src/hooks/useAgentChat.ts` | Replace localStorage with Supabase API calls |
| Modify | `src/components/features/chat/ChatSidebar.tsx` | Remove "stored in browser" text |
| Delete | `src/lib/chat-storage.ts` | No longer needed |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260413000000_chat_sessions.sql`

- [ ] **Step 1: Write migration file**

```sql
-- chat_sessions: stores session metadata (title, timestamps)
CREATE TABLE chat_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       text NOT NULL DEFAULT 'Nový chat',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sessions_read_own" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "sessions_insert_own" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_update_own" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "sessions_delete_own" ON chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Add rich_blocks to agent_conversations for charts/emails/reports
ALTER TABLE agent_conversations
  ADD COLUMN IF NOT EXISTS rich_blocks jsonb;
```

- [ ] **Step 2: Apply migration to production Supabase**

```bash
pnpm supabase db push
```

Expected: migration applied with no errors.

- [ ] **Step 3: Regenerate TypeScript types**

```bash
pnpm supabase gen types typescript --project-id hrqshtokvnfygpjdlvhc > src/types/database.ts
```

Expected: `src/types/database.ts` updated — `chat_sessions` table and `rich_blocks` column appear in the types.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260413000000_chat_sessions.sql src/types/database.ts
git commit -m "feat: add chat_sessions table and rich_blocks column"
```

---

## Task 2: Sessions API Routes

**Files:**
- Create: `src/app/api/chat/sessions/route.ts`
- Create: `src/app/api/chat/sessions/[id]/route.ts`

- [ ] **Step 1: Create GET + POST /api/chat/sessions**

```typescript
// src/app/api/chat/sessions/route.ts
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function GET(): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ sessions: data });
}

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  sessionId: z.string().uuid(),
});

export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  const { title, sessionId } = parsed.data;

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ id: sessionId, user_id: user.id, title })
    .select("id, title, created_at, updated_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ session: data }, { status: 201 });
}
```

- [ ] **Step 2: Create DELETE /api/chat/sessions/[id]**

```typescript
// src/app/api/chat/sessions/[id]/route.ts
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Delete conversations first (FK), then session
  await supabase
    .from("agent_conversations")
    .delete()
    .eq("session_id", id)
    .eq("user_id", user.id);

  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 3: Verify routes compile**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no TypeScript errors related to the new files.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/chat/sessions/
git commit -m "feat: add sessions CRUD API routes"
```

---

## Task 3: Messages API Route

**Files:**
- Create: `src/app/api/chat/sessions/[id]/messages/route.ts`

- [ ] **Step 1: Create GET /api/chat/sessions/[id]/messages**

This endpoint returns messages formatted for UI display (not Claude format), including `rich_blocks`.

```typescript
// src/app/api/chat/sessions/[id]/messages/route.ts
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabase
    .from("agent_conversations")
    .select("id, role, content, rich_blocks, created_at")
    .eq("session_id", id)
    .eq("user_id", user.id)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const messages = (data ?? []).map((row) => ({
    id: row.id,
    role: row.role as "user" | "assistant",
    content: row.content ?? "",
    richBlocks: Array.isArray(row.rich_blocks) ? row.rich_blocks : [],
    createdAt: row.created_at,
  }));

  return Response.json({ messages });
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/chat/sessions/[id]/messages/route.ts
git commit -m "feat: add messages endpoint for chat session"
```

---

## Task 4: Save rich_blocks in Chat API

**Files:**
- Modify: `src/app/api/agent/chat/route.ts`
- Modify: `src/lib/claude/history.ts`

- [ ] **Step 1: Collect rich_blocks during streaming and pass to saveAssistantMessage**

In `src/app/api/agent/chat/route.ts`, find the `onEvent` callback and the `saveAssistantMessage` call. Replace both:

Find this in `route.ts` (around line 86–155):
```typescript
const toolCallsForHistory: Array<{
  id: string;
  name: string;
  input: Record<string, unknown>;
}> = [];
```

Replace with:
```typescript
const toolCallsForHistory: Array<{
  id: string;
  name: string;
  input: Record<string, unknown>;
}> = [];
const richBlocksForHistory: Array<{ type: string; payload: unknown }> = [];
```

Find:
```typescript
          onEvent(type, payload) {
            sendSse(stringifyForModel({ type, payload }));
          },
```

Replace with:
```typescript
          onEvent(type, payload) {
            richBlocksForHistory.push({ type, payload });
            sendSse(stringifyForModel({ type, payload }));
          },
```

Find:
```typescript
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
            },
            supabase
          ).catch(console.error);
        }
```

Replace with:
```typescript
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
              richBlocks:
                richBlocksForHistory.length > 0
                  ? richBlocksForHistory
                  : undefined,
            },
            supabase
          ).catch(console.error);
        }
```

- [ ] **Step 2: Update saveAssistantMessage to accept and persist richBlocks**

In `src/lib/claude/history.ts`, find the `saveAssistantMessage` params type:

```typescript
export async function saveAssistantMessage(
  params: {
    sessionId: string;
    userId: string;
    content: string;
    toolCalls?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
    toolResults?: Array<{ tool_use_id: string; content: string }>;
  },
```

Replace with:
```typescript
export async function saveAssistantMessage(
  params: {
    sessionId: string;
    userId: string;
    content: string;
    toolCalls?: Array<{ id: string; name: string; input: Record<string, unknown> }>;
    toolResults?: Array<{ tool_use_id: string; content: string }>;
    richBlocks?: Array<{ type: string; payload: unknown }>;
  },
```

Find the assistant message row insert:
```typescript
  rows.push({
    session_id: params.sessionId,
    user_id: params.userId,
    role: "assistant",
    content: params.content || null,
    tool_calls: params.toolCalls?.length
      ? (params.toolCalls as unknown as Json)
      : null,
  });
```

Replace with:
```typescript
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
```

- [ ] **Step 3: Verify build**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/agent/chat/route.ts src/lib/claude/history.ts
git commit -m "feat: persist rich_blocks (charts, emails) to Supabase"
```

---

## Task 5: Replace useAgentChat localStorage with Supabase

**Files:**
- Modify: `src/hooks/useAgentChat.ts`

This is the main change. The hook now fetches sessions from `/api/chat/sessions` and messages from `/api/chat/sessions/[id]/messages`.

- [ ] **Step 1: Replace the entire useAgentChat.ts**

```typescript
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
  // Track whether a session row has been created in DB for current session
  const sessionCreatedRef = useRef(false);

  const updateMessage = useCallback(
    (id: string, updater: (msg: ChatMessage) => ChatMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? updater(m) : m)));
    },
    []
  );

  // Load sessions from Supabase on mount
  useEffect(() => {
    async function loadSessions() {
      const res = await fetch("/api/chat/sessions");
      if (!res.ok) return;
      const json = (await res.json()) as { sessions: SessionRecord[] };
      const list = json.sessions ?? [];
      setSessions(list);
      if (list.length > 0) {
        const latest = list[0]; // already sorted by updated_at DESC
        setActiveSessionId(latest.id);
        sessionIdRef.current = latest.id;
        sessionCreatedRef.current = true;
        // Load messages for the latest session
        const msgRes = await fetch(`/api/chat/sessions/${latest.id}/messages`);
        if (msgRes.ok) {
          const msgJson = (await msgRes.json()) as {
            messages: Array<{
              id: string;
              role: "user" | "assistant";
              content: string;
              richBlocks: RichBlock[];
              createdAt: string;
            }>;
          };
          setMessages(
            (msgJson.messages ?? []).map((m) => ({
              ...m,
              isStreaming: false,
              createdAt: new Date(m.createdAt),
            }))
          );
        }
      } else {
        const id = newUuid();
        setActiveSessionId(id);
        sessionIdRef.current = id;
        sessionCreatedRef.current = false;
        setMessages([]);
      }
    }
    loadSessions();
  }, []);

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

  const deleteSession = useCallback(async (id: string) => {
    await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      return next;
    });
    setActiveSessionId((cur) => {
      if (cur !== id) return cur;
      const remaining = sessions.filter((s) => s.id !== id);
      if (remaining.length > 0) {
        sessionIdRef.current = remaining[0].id;
        sessionCreatedRef.current = true;
        selectSession(remaining[0].id);
        return remaining[0].id;
      }
      const newId = newUuid();
      sessionIdRef.current = newId;
      sessionCreatedRef.current = false;
      setMessages([]);
      return newId;
    });
  }, [sessions, selectSession]);

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
                  richBlocks: [...(msg.richBlocks ?? []), { type: "chart", payload: (event as SseChart).payload }],
                }));
                break;
              case "email":
                updateMessage(assistantMessageId, (msg) => ({
                  ...msg,
                  richBlocks: [...(msg.richBlocks ?? []), { type: "email", payload: (event as SseEmail).payload }],
                }));
                break;
              case "download":
                updateMessage(assistantMessageId, (msg) => ({
                  ...msg,
                  richBlocks: [...(msg.richBlocks ?? []), { type: "download", payload: (event as SseDownload).payload }],
                }));
                break;
              case "report":
                updateMessage(assistantMessageId, (msg) => ({
                  ...msg,
                  richBlocks: [...(msg.richBlocks ?? []), { type: "report", payload: (event as SseReport).payload }],
                }));
                break;
              case "done":
                updateMessage(assistantMessageId, (msg) => ({ ...msg, isStreaming: false }));
                // Update session updated_at in local state
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
    [isLoading, updateMessage, sessions, selectSession]
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
```

- [ ] **Step 2: Update ChatSidebar to use SessionRecord instead of ChatSessionRecord**

In `src/components/features/chat/ChatSidebar.tsx`, replace the import:

Find:
```typescript
import type { ChatSessionRecord } from "@/lib/chat-storage";
```

Replace with:
```typescript
import type { SessionRecord } from "@/hooks/useAgentChat";
```

Find all occurrences of `ChatSessionRecord` and replace with `SessionRecord`.

Find the empty state text:
```typescript
            Konverzace se ukládají v tomto prohlížeči.
```

Replace with:
```typescript
            Zatím žádné konverzace.
```

- [ ] **Step 3: Update ChatPage to pass SessionRecord sessions**

In `src/app/(dashboard)/chat/page.tsx`, the `sessions` prop type passed to `ChatSidebar` comes from `useAgentChat`. Since we changed `useAgentChat` to return `SessionRecord[]` instead of `ChatSessionRecord[]`, verify no direct `ChatSessionRecord` imports remain in the file. If there are none, no changes needed.

- [ ] **Step 4: Verify build**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useAgentChat.ts src/components/features/chat/ChatSidebar.tsx
git commit -m "feat: replace localStorage chat history with Supabase"
```

---

## Task 6: Delete chat-storage.ts and Update Session Title on DB

**Files:**
- Delete: `src/lib/chat-storage.ts`
- Create: `src/app/api/chat/sessions/[id]/route.ts` (PATCH method — update title)

- [ ] **Step 1: Check no remaining imports of chat-storage**

```bash
grep -r "chat-storage" src/ --include="*.ts" --include="*.tsx"
```

Expected: no output. If any files still import from `chat-storage`, update them to use the new `SessionRecord` type from `useAgentChat`.

- [ ] **Step 2: Delete chat-storage.ts**

```bash
rm src/lib/chat-storage.ts
```

- [ ] **Step 3: Add PATCH to update session title (for updated_at refresh)**

Add this to `src/app/api/chat/sessions/[id]/route.ts` after the DELETE export:

```typescript
import { z } from "zod";

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  const { error } = await supabase
    .from("chat_sessions")
    .update({ updated_at: new Date().toISOString(), ...parsed.data })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 4: Final build check**

```bash
pnpm build 2>&1
```

Expected: clean build, 0 errors.

- [ ] **Step 5: Run tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: remove localStorage chat-storage, full Supabase chat history"
```

---

## Task 7: Deploy

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Deploy to Vercel**

```bash
vercel --prod
```

- [ ] **Step 3: Smoke test**

1. Open https://back-office-operation-agent.vercel.app/chat
2. Send a message — session should appear in sidebar
3. Open a new browser / incognito — log in — same sessions should appear
4. Delete a session — should disappear on both browsers after refresh
5. Charts/emails in responses should re-render when selecting an old session
