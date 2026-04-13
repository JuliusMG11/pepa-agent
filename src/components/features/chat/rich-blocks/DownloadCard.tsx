"use client";

import { useState } from "react";
import { FileDown, Clock, Copy, Check } from "lucide-react";
import type { PresentationResult } from "@/lib/claude/tools/create-presentation";

interface DownloadCardProps {
  result: PresentationResult;
}

export function DownloadCard({ result }: DownloadCardProps) {
  const [copied, setCopied] = useState(false);
  const expiresAt = new Date(result.expires_at);
  const expiresLabel = expiresAt.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const label =
    result.format === "pdf"
      ? "PDF — výsledkový přehled"
      : "Soubor ke stažení";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(result.download_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="mt-3 rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: "1px solid rgba(199,196,215,0.3)",
        boxShadow: "0 4px 20px rgba(70,72,212,0.06)",
      }}
    >
      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: "rgba(70,72,212,0.1)" }}
        >
          <FileDown size={22} style={{ color: "var(--color-brand)" }} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-xs font-black uppercase tracking-wider mb-0.5"
            style={{ color: "var(--color-brand)" }}
          >
            {label}
          </p>
          <p
            className="text-sm font-bold truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            {result.filename}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <Clock size={11} style={{ color: "var(--color-text-muted)" }} strokeWidth={1.5} />
            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
              Platnost odkazu do {expiresLabel}
            </p>
          </div>
        </div>
        <a
          href={result.download_url}
          download={result.filename}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 shrink-0 w-full sm:w-auto"
          style={{ backgroundColor: "var(--color-brand)" }}
        >
          <FileDown size={16} strokeWidth={2} />
          Stáhnout PDF
        </a>
      </div>

      <div
        className="px-4 pb-4 pt-0 border-t"
        style={{ borderColor: "rgba(199,196,215,0.2)" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-wider mt-3 mb-1.5" style={{ color: "var(--color-text-muted)" }}>
          Přímý odkaz ke stažení (zkopírování)
        </p>
        <div className="flex gap-2 items-start">
          <p
            className="flex-1 text-[11px] leading-relaxed break-all rounded-lg px-3 py-2 font-mono"
            style={{
              backgroundColor: "var(--color-bg-subtle)",
              color: "var(--color-text-secondary)",
              wordBreak: "break-all",
            }}
          >
            {result.download_url}
          </p>
          <button
            type="button"
            onClick={copyLink}
            className="shrink-0 p-2.5 rounded-lg transition-opacity hover:opacity-80 cursor-pointer"
            style={{
              backgroundColor: "rgba(70,72,212,0.1)",
              color: "var(--color-brand)",
            }}
            title="Kopírovat odkaz"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
