"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FileText, Sparkles, XCircle } from "lucide-react";

const STATUS_LINES = [
  "Sbírám data z databáze…",
  "Skládám datový report (PDF)…",
  "Generuji prezentaci (PPTX)…",
  "Nahrávám oba soubory…",
];

export type ReportGenPhase = "running" | "success" | "error";

interface ReportGenerateModalProps {
  open: boolean;
  phase: ReportGenPhase;
  /** 0–100 při phase === running */
  progress: number;
  errorMessage?: string | null;
  onClose: () => void;
}

export function ReportGenerateModal({
  open,
  phase,
  progress,
  errorMessage,
  onClose,
}: ReportGenerateModalProps) {
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    if (!open || phase !== "running") return;
    setLineIdx(0);
    const t = window.setInterval(() => {
      setLineIdx((i) => (i + 1) % STATUS_LINES.length);
    }, 2200);
    return () => window.clearInterval(t);
  }, [open, phase]);

  if (!open) return null;

  const brand = "var(--color-brand)";
  const onBrand = "var(--color-on-brand)";
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <div
      className="fixed inset-0 z-[200] flex cursor-default items-end justify-center p-0 md:items-center md:p-6"
      style={{
        backgroundColor: "rgba(15, 12, 25, 0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase === "error") onClose();
      }}
    >
      <div
        className="relative max-h-[min(100dvh,100%)] w-full max-w-[400px] overflow-hidden overflow-y-auto overscroll-contain rounded-t-[28px] p-[1px] md:max-h-[min(90dvh,800px)] md:rounded-[28px]"
        style={{
          background:
            "linear-gradient(135deg, rgba(70,72,212,0.55), rgba(199,196,215,0.35), rgba(70,72,212,0.4))",
          boxShadow:
            "0 24px 80px rgba(70, 72, 212, 0.2), 0 0 0 1px rgba(255,255,255,0.06) inset",
        }}
      >
        <div
          className="relative rounded-[26px] px-8 py-10"
          style={{
            background:
              "linear-gradient(165deg, var(--color-bg-card) 0%, rgba(246,242,250,0.98) 100%)",
          }}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-[0.12]"
            style={{ background: brand, filter: "blur(40px)" }}
          />

          {phase === "running" && (
            <>
              <div className="relative flex justify-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(70,72,212,0.15), rgba(70,72,212,0.05))",
                    boxShadow: "0 8px 32px rgba(70,72,212,0.12)",
                  }}
                >
                  <FileText className="text-[var(--color-brand)]" size={30} strokeWidth={1.25} />
                </div>
              </div>
              <h2
                className="relative mt-6 text-center text-lg font-bold tracking-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                Generuji report
              </h2>
              <p
                className="relative mt-2 min-h-[2.75rem] text-center text-sm leading-relaxed transition-opacity duration-300"
                style={{ color: "var(--color-text-muted)" }}
                key={lineIdx}
              >
                {STATUS_LINES[lineIdx]}
              </p>

              <div
                className="relative mt-8 h-2.5 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: "rgba(70,72,212,0.08)" }}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-300 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: brand,
                    boxShadow: "0 0 16px rgba(70,72,212,0.35)",
                  }}
                />
              </div>
              <p
                className="relative mt-3 text-center text-xs font-bold tabular-nums"
                style={{ color: "var(--color-text-muted)" }}
              >
                {Math.round(pct)} %
              </p>
              <p
                className="relative mt-4 text-center text-[11px] font-medium uppercase tracking-[0.12em]"
                style={{ color: "var(--color-text-muted)" }}
              >
                Datový report + prezentace (PDF, landscape)
              </p>
            </>
          )}

          {phase === "success" && (
            <div className="relative text-center">
              <div className="flex justify-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: "rgba(22,101,52,0.12)",
                    color: "#166534",
                  }}
                >
                  <CheckCircle2 size={34} strokeWidth={1.5} />
                </div>
              </div>
              <h2
                className="mt-5 text-lg font-bold tracking-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                Report a prezentace jsou připraveny
              </h2>
              <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                Stáhněte datový report nebo prezentaci v přehledu níže.
              </p>
              <div className="mt-4 flex justify-center gap-1">
                <Sparkles size={14} style={{ color: brand }} className="opacity-80" />
              </div>
            </div>
          )}

          {phase === "error" && (
            <div className="relative text-center">
              <div className="flex justify-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: "rgba(186,26,26,0.1)",
                    color: "#b91c1c",
                  }}
                >
                  <XCircle size={34} strokeWidth={1.5} />
                </div>
              </div>
              <h2
                className="mt-5 text-lg font-bold tracking-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                Generování selhalo
              </h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "#991b1b" }}>
                {errorMessage ?? "Zkuste to prosím znovu."}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-8 w-full rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: brand, color: onBrand }}
              >
                Zavřít
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
