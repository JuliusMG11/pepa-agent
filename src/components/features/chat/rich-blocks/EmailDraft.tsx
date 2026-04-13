"use client";

import { useState } from "react";
import { Copy, Check, Mail, ExternalLink } from "lucide-react";
import type { EmailDraft as EmailDraftType } from "@/lib/claude/tools/draft-email";

interface EmailDraftProps {
  email: EmailDraftType;
}

export function EmailDraft({ email }: EmailDraftProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = `Předmět: ${email.subject}\n\n${email.body}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const mailtoHref = email.to
    ? `mailto:${email.to}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`
    : `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;

  return (
    <div
      className="mt-3 rounded-xl overflow-hidden"
      style={{
        border: "1px solid rgba(199,196,215,0.3)",
        boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: "rgba(70,72,212,0.06)" }}
      >
        <div className="flex items-center gap-2">
          <Mail size={14} style={{ color: "var(--color-brand)" }} strokeWidth={1.5} />
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: "var(--color-brand)" }}
          >
            Návrh e-mailu
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
            style={{
              backgroundColor: copied
                ? "rgba(22,101,52,0.1)"
                : "rgba(70,72,212,0.08)",
              color: copied ? "#166534" : "var(--color-brand)",
            }}
          >
            {copied ? (
              <Check size={12} strokeWidth={2.5} />
            ) : (
              <Copy size={12} strokeWidth={1.5} />
            )}
            {copied ? "Zkopírováno" : "Kopírovat"}
          </button>
          <a
            href={mailtoHref}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
            style={{ backgroundColor: "rgba(70,72,212,0.08)", color: "var(--color-brand)" }}
          >
            <ExternalLink size={12} strokeWidth={1.5} />
            Otevřít
          </a>
        </div>
      </div>

      {/* Email meta */}
      <div
        className="px-4 py-3 space-y-1.5"
        style={{ borderBottom: "1px solid rgba(199,196,215,0.2)" }}
      >
        {email.to && (
          <div className="flex gap-2 text-xs">
            <span className="font-bold w-14 shrink-0" style={{ color: "var(--color-text-muted)" }}>
              Komu:
            </span>
            <span style={{ color: "var(--color-text-primary)" }}>
              {email.recipient_name} {email.to ? `<${email.to}>` : ""}
            </span>
          </div>
        )}
        <div className="flex gap-2 text-xs">
          <span className="font-bold w-14 shrink-0" style={{ color: "var(--color-text-muted)" }}>
            Předmět:
          </span>
          <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {email.subject}
          </span>
        </div>
      </div>

      {/* Email body */}
      <div className="px-4 py-3 bg-white">
        <pre
          className="text-xs leading-relaxed whitespace-pre-wrap font-sans"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {email.body}
        </pre>
      </div>
    </div>
  );
}
