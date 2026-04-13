"use client";

import { useRef, useEffect, useState, useLayoutEffect } from "react";
import { Zap, RefreshCw, Pencil, Trash2, Check } from "lucide-react";
import type { ChatMessage, RichBlock } from "@/hooks/useAgentChat";
import { ChatInput } from "./ChatInput";
import { InlineChart } from "./rich-blocks/InlineChart";
import { EmailDraft } from "./rich-blocks/EmailDraft";
import { DownloadCard } from "./rich-blocks/DownloadCard";
import { DataGapTable } from "./rich-blocks/DataGapTable";
import { InlineReportSummary } from "./rich-blocks/InlineReportSummary";
import type { ChartPayload } from "@/lib/claude/tools/render-chart";
import type { EmailDraft as EmailDraftType } from "@/lib/claude/tools/draft-email";
import type { PresentationResult } from "@/lib/claude/tools/create-presentation";
import type { ReportData as AgentReportData } from "@/lib/claude/tools/generate-report";
import type { GapProperty } from "@/lib/claude/tools/find-data-gaps";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => void;
  initialPrompt?: string;
  onEditAssistant?: (id: string, content: string) => void;
  onDeleteMessage?: (id: string) => void;
}

export function ChatPanel({
  messages,
  isLoading,
  onSend,
  initialPrompt,
  onEditAssistant,
  onDeleteMessage,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState(initialPrompt ?? "");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Pre-fill input if initial prompt provided
  useEffect(() => {
    if (initialPrompt) setInputValue(initialPrompt);
  }, [initialPrompt]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Message list — scroll jen zde; vstup zůstane dole */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-5 [scrollbar-gutter:stable]">
        {messages.length === 0 && (
          <EmptyState />
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onRetry={() => onSend(msg.content)}
            onEditAssistant={onEditAssistant}
            onDeleteMessage={onDeleteMessage}
          />
        ))}

        {/* Typing indicator — shows while waiting for first token */}
        {isLoading && messages.at(-1)?.isStreaming && messages.at(-1)?.content === "" && (
          <TypingIndicator />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input — fixní pod výpisem */}
      <div className="shrink-0 px-6 pb-6 pt-2 border-t border-[rgba(199,196,215,0.2)]" style={{ backgroundColor: "var(--color-bg-subtle)" }}>
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={(text) => {
            setInputValue("");
            onSend(text);
          }}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-16">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: "rgba(70,72,212,0.08)" }}
      >
        <Zap size={26} style={{ color: "var(--color-brand)" }} strokeWidth={1.5} />
      </div>
      <h3
        className="text-base font-bold mb-2"
        style={{ color: "var(--color-text-primary)" }}
      >
        Jak ti mohu pomoci?
      </h3>
      <p className="text-sm max-w-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
        Zeptej se mě na data, klienty, nemovitosti nebo reporty. Můžu
        generovat grafy, e-maily i PDF přehledy.
      </p>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <AgentAvatar />
      <div
        className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid rgba(199,196,215,0.3)",
          boxShadow: "0 2px 8px rgba(70,72,212,0.04)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: "var(--color-text-muted)",
              animation: `pulse-slow 1.2s ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function AgentAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-black mt-0.5"
      style={{ backgroundColor: "rgba(70,72,212,0.1)", color: "var(--color-brand)" }}
    >
      AI
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry: () => void;
  onEditAssistant?: (id: string, content: string) => void;
  onDeleteMessage?: (id: string) => void;
}

function MessageBubble({
  message,
  onRetry,
  onEditAssistant,
  onDeleteMessage,
}: MessageBubbleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isUser = message.role === "user";

  useEffect(() => {
    setDraft(message.content);
  }, [message.content]);

  useLayoutEffect(() => {
    if (!editing) return;
    const el = editTextareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    const h = Math.min(Math.max(el.scrollHeight, 72), 2000);
    el.style.height = `${h}px`;
  }, [editing, draft]);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[75%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed"
          style={{ backgroundColor: "var(--color-brand)", color: "var(--color-on-brand)" }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant bubble
  return (
    <div className="flex items-start gap-3 w-full min-w-0">
      <AgentAvatar />
      <div className={`min-w-0 ${editing ? "flex-1 w-full max-w-none" : "max-w-[85%]"}`}>
        {/* Text content */}
        {(message.content || message.isStreaming) && (
          <div className="space-y-2">
            {editing && onEditAssistant ? (
              <div className="space-y-2">
                <textarea
                  ref={editTextareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={1}
                  className="w-full min-h-[72px] max-h-[2000px] px-4 py-3 rounded-2xl text-sm resize-y overflow-hidden box-border"
                  style={{
                    backgroundColor: "var(--color-bg-card)",
                    border: "1px solid rgba(199,196,215,0.4)",
                    color: "var(--color-text-primary)",
                  }}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onEditAssistant(message.id, draft);
                      setEditing(false);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: "var(--color-brand)" }}
                  >
                    <Check size={12} />
                    Uložit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(message.content);
                      setEditing(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" }}
                  >
                    Zrušit
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="px-4 py-3 rounded-2xl rounded-tl-sm text-sm leading-relaxed"
                style={{
                  backgroundColor: "var(--color-bg-card)",
                  border: "1px solid rgba(199,196,215,0.3)",
                  boxShadow: "0 2px 8px rgba(70,72,212,0.04)",
                  color: "var(--color-text-primary)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {message.content}
                {message.isStreaming && (
                  <span
                    className="inline-block w-0.5 h-4 ml-0.5 align-text-bottom rounded-full"
                    style={{
                      backgroundColor: "var(--color-brand)",
                      animation: "pulse-slow 0.8s infinite",
                    }}
                  />
                )}
              </div>
            )}

            {!message.isStreaming && !message.error && (onEditAssistant || onDeleteMessage) && (
              <div className="flex gap-2">
                {onEditAssistant && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Pencil size={11} />
                    Upravit
                  </button>
                )}
                {onDeleteMessage && (
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md"
                    style={{ color: "#991b1b" }}
                  >
                    <Trash2 size={11} />
                    Smazat
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {message.error && (
          <div
            className="mt-2 flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
            style={{
              backgroundColor: "#ffdad6",
              color: "#ba1a1a",
            }}
          >
            <span className="flex-1">{message.error}</span>
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 text-xs font-bold transition-opacity hover:opacity-70"
            >
              <RefreshCw size={12} strokeWidth={2} />
              Zkusit znovu
            </button>
          </div>
        )}

        {/* Rich blocks */}
        {(message.richBlocks ?? []).map((block, i) => (
          <RichBlockRenderer key={i} block={block} />
        ))}

        {onDeleteMessage ? (
          <ConfirmDialog
            open={deleteOpen}
            title="Odstranit zprávu?"
            description="Tato zpráva zmizí z této konverzace v prohlížeči. Akci nelze vrátit zpět."
            confirmLabel="Odstranit"
            cancelLabel="Zrušit"
            variant="danger"
            onCancel={() => setDeleteOpen(false)}
            onConfirm={() => {
              onDeleteMessage(message.id);
              setDeleteOpen(false);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function RichBlockRenderer({ block }: { block: RichBlock }) {
  switch (block.type) {
    case "chart":
      return <InlineChart chart={block.payload as ChartPayload} />;
    case "email":
      return <EmailDraft email={block.payload as EmailDraftType} />;
    case "download":
      return <DownloadCard result={block.payload as PresentationResult} />;
    case "report":
      return (
        <InlineReportSummary report={block.payload as AgentReportData} />
      );
    default:
      return null;
  }
}

// DataGapTable is rendered when agent returns gap data inline
export function renderDataGapTable(gaps: GapProperty[]) {
  return <DataGapTable gaps={gaps} />;
}
