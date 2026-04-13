"use client";

import { useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  onSend: (text: string) => void;
  isLoading: boolean;
  value: string;
  onChange: (value: string) => void;
}

const MAX_CHARS = 2000;
const COUNTER_THRESHOLD = 1500;

export function ChatInput({ onSend, isLoading, value, onChange }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea between 1–5 rows
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const lineHeight = 24; // ~24px per row
    const maxHeight = lineHeight * 5;
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + "px";
  }, [value]);

  const handleSend = useCallback(() => {
    if (!value.trim() || isLoading) return;
    onSend(value);
    onChange("");
  }, [value, isLoading, onSend, onChange]);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isOverLimit = value.length > MAX_CHARS;
  const showCounter = value.length >= COUNTER_THRESHOLD;
  const canSend = value.trim().length > 0 && !isLoading && !isOverLimit;

  return (
    <div
      className="relative"
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: "1px solid rgba(199,196,215,0.4)",
        borderRadius: 16,
        boxShadow: "0 4px 20px rgba(70,72,212,0.06)",
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Zeptej se Pepy na cokoliv..."
        disabled={isLoading}
        rows={1}
        maxLength={MAX_CHARS + 50} // allow slight over for feedback
        className="w-full resize-none px-4 pt-3.5 pb-12 text-sm bg-transparent outline-none leading-6"
        style={{ color: "var(--color-text-primary)" }}
      />

      {/* Bottom row */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 pb-3">
        {/* Character counter */}
        <span
          className="text-[11px] font-medium transition-opacity"
          style={{
            color: isOverLimit ? "#ba1a1a" : "var(--color-text-muted)",
            opacity: showCounter ? 1 : 0,
          }}
        >
          {value.length}/{MAX_CHARS}
        </span>

        {/* Helper text when empty */}
        {!showCounter && (
          <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
            Enter = odeslat · Shift+Enter = nový řádek
          </span>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Odeslat"
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{
            backgroundColor: canSend ? "var(--color-brand)" : "rgba(199,196,215,0.4)",
            cursor: canSend ? "pointer" : "not-allowed",
          }}
        >
          <ArrowUp
            size={15}
            strokeWidth={2.5}
            style={{ color: canSend ? "var(--color-on-brand)" : "#9ca3af" }}
          />
        </button>
      </div>
    </div>
  );
}
