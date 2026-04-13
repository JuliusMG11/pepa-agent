"use client";

import { useState } from "react";
import { Sparkles, MessageSquarePlus, Trash2 } from "lucide-react";
import type { SessionRecord } from "@/hooks/useAgentChat";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  VIEWING_EMAIL_SUGGESTED_QUESTION_CS,
  type ChatSidebarSuggestPayload,
} from "@/constants/chat-suggestions";

const CHAT_ONLY_SUGGESTIONS = [
  "Kolik nových klientů jsme měli tento měsíc?",
  "Které nemovitosti mají chybějící data?",
  "Napiš shrnutí minulého týdne",
  "Jaký je vývoj leadů za posledních 6 měsíců?",
  "Zobraz aktivní nemovitosti v Holešovicích",
  "Připrav prezentaci výsledků tohoto týdne",
] as const;

interface ChatSidebarProps {
  onSuggest: (payload: ChatSidebarSuggestPayload) => void;
  sessions: SessionRecord[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
}

function formatSessionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("cs-CZ", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function ChatSidebar({
  onSuggest,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}: ChatSidebarProps) {
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  return (
    <aside className="flex flex-col gap-6 h-full">
      {/* Historie konverzací */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid rgba(199,196,215,0.3)",
          boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3
            className="text-xs font-black uppercase tracking-wider"
            style={{ color: "var(--color-brand)" }}
          >
            Historie
          </h3>
          <button
            type="button"
            onClick={onNewChat}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white"
            style={{ backgroundColor: "var(--color-brand)" }}
          >
            <MessageSquarePlus size={12} />
            Nový chat
          </button>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {sessions.length === 0 ? (
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Zatím žádné konverzace.
            </p>
          ) : (
            [...sessions]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .map((s) => (
                <div
                  key={s.id}
                  className="flex items-start gap-1 rounded-lg px-2 py-1.5"
                  style={{
                    backgroundColor:
                      activeSessionId === s.id ? "rgba(70,72,212,0.08)" : "transparent",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectSession(s.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <p
                      className="text-xs font-semibold truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {s.title}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                      {formatSessionDate(s.createdAt ?? s.updatedAt)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSessionToDelete(s.id)}
                    className="shrink-0 p-1 rounded-md hover:opacity-80"
                    style={{ color: "#991b1b" }}
                    aria-label="Smazat konverzaci"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Suggested questions */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid rgba(199,196,215,0.3)",
          boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} style={{ color: "var(--color-brand)" }} strokeWidth={1.5} />
          <h3
            className="text-xs font-black uppercase tracking-wider"
            style={{ color: "var(--color-brand)" }}
          >
            Navrhované dotazy
          </h3>
        </div>
        <div className="space-y-2">
          {CHAT_ONLY_SUGGESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onSuggest({ type: "chat", text: q })}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium leading-snug transition-all"
              style={{ color: "var(--color-text-secondary)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "rgba(70,72,212,0.06)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--color-brand)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-secondary)";
              }}
            >
              {q}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onSuggest({ type: "viewing_wizard" })}
            className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold leading-snug transition-all border"
            style={{
              color: "var(--color-brand)",
              borderColor: "rgba(70,72,212,0.35)",
              backgroundColor: "rgba(70,72,212,0.06)",
            }}
          >
            {VIEWING_EMAIL_SUGGESTED_QUESTION_CS}
          </button>
        </div>
      </div>

      {/* Tips card */}
      <div
        className="rounded-2xl p-5"
        style={{
          backgroundColor: "rgba(70,72,212,0.06)",
          border: "1px solid rgba(70,72,212,0.12)",
        }}
      >
        <h3
          className="text-xs font-black uppercase tracking-wider mb-3"
          style={{ color: "var(--color-brand)" }}
        >
          Tipy
        </h3>
        <ul className="space-y-2">
          {[
            "Pepa vidí všechna vaše data v reálném čase",
            "Může generovat grafy přímo v chatu",
            "Navrhuje e-maily — vy je odešlete",
            "Vygeneruje PDF přehled ve firemním stylu",
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
              <span style={{ color: "var(--color-brand)" }}>·</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      <ConfirmDialog
        open={sessionToDelete !== null}
        title="Smazat konverzaci?"
        description="Konverzace zmizí z historie v tomto prohlížeči. Akci nelze vrátit zpět."
        confirmLabel="Smazat"
        cancelLabel="Zrušit"
        variant="danger"
        onCancel={() => setSessionToDelete(null)}
        onConfirm={() => {
          if (sessionToDelete) onDeleteSession(sessionToDelete);
          setSessionToDelete(null);
        }}
      />
    </aside>
  );
}
