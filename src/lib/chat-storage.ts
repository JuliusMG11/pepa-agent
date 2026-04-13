const STORAGE_KEY = "pepa-chat-sessions-v1";

export interface StoredChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  richBlocks: unknown[];
  createdAt: string;
  error?: string;
}

export interface ChatSessionRecord {
  id: string;
  title: string;
  /** Poslední změna obsahu konverzace (nová zpráva, úprava…) */
  updatedAt: string;
  /** Čas prvního uložení — nemění se při pouhém přepnutí v historii */
  createdAt: string;
  apiSessionId: string;
  messages: StoredChatMessage[];
}

function safeParseMessages(raw: unknown): StoredChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((m) => {
    const msg = m as Record<string, unknown>;
    return {
      id: String(msg.id ?? ""),
      role: msg.role === "user" || msg.role === "assistant" ? msg.role : "assistant",
      content: String(msg.content ?? ""),
      richBlocks: Array.isArray(msg.richBlocks) ? msg.richBlocks : [],
      error: msg.error != null ? String(msg.error) : undefined,
      createdAt: msg.createdAt ? String(msg.createdAt) : new Date().toISOString(),
    };
  });
}

export function loadChatSessions(): ChatSessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((row) => {
      const r = row as Record<string, unknown>;
      const updatedAt = String(r.updatedAt ?? new Date().toISOString());
      return {
        id: String(r.id ?? ""),
        title: String(r.title ?? "Konverzácia"),
        updatedAt,
        createdAt: String(r.createdAt ?? r.updatedAt ?? updatedAt),
        apiSessionId: String(r.apiSessionId ?? ""),
        messages: safeParseMessages(r.messages),
      };
    });
  } catch {
    return [];
  }
}

export function saveChatSessions(sessions: ChatSessionRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    /* quota */
  }
}

export function titleFromFirstUserMessage(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= 48) return t || "Nový chat";
  return `${t.slice(0, 45)}…`;
}
