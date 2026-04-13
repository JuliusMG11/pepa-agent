"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Radar, Sparkles, XCircle } from "lucide-react";

export type MonitoringRunPhase = "running" | "success" | "error";

const STATUS_LINES = [
  "Propojuji se s portály…",
  "Kontroluji nové inzeráty…",
  "Aktualizuji data v pozadí…",
];

interface MonitoringRunModalProps {
  open: boolean;
  phase: MonitoringRunPhase;
  errorMessage?: string | null;
  onClose: () => void;
}

export function MonitoringRunModal({
  open,
  phase,
  errorMessage,
  onClose,
}: MonitoringRunModalProps) {
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    if (!open || phase !== "running") return;
    setLineIdx(0);
    const t = window.setInterval(() => {
      setLineIdx((i) => (i + 1) % STATUS_LINES.length);
    }, 2400);
    return () => window.clearInterval(t);
  }, [open, phase]);

  if (!open) return null;

  const brand = "var(--color-brand)";
  const onBrand = "var(--color-on-brand)";

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
        className="relative max-h-[min(100dvh,100%)] w-full max-w-[380px] overflow-hidden overscroll-contain rounded-t-[28px] p-[1px] md:max-h-none md:rounded-[28px]"
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
          {/* Dekorativní světla */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-[0.12]"
            style={{ background: brand, filter: "blur(40px)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-12 -left-10 h-32 w-32 rounded-full opacity-[0.1]"
            style={{ background: brand, filter: "blur(36px)" }}
          />

          {phase === "running" && (
            <>
              <div className="relative flex justify-center">
                <div
                  className="monitoring-run-icon-ring flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(70,72,212,0.15), rgba(70,72,212,0.05))",
                    boxShadow: "0 8px 32px rgba(70,72,212,0.12)",
                  }}
                >
                  <Radar
                    className="monitoring-run-radar text-[var(--color-brand)]"
                    size={30}
                    strokeWidth={1.25}
                  />
                </div>
              </div>
              <h2
                className="relative mt-6 text-center text-lg font-bold tracking-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                Spouštím monitoring
              </h2>
              <p
                className="relative mt-2 min-h-[2.75rem] text-center text-sm leading-relaxed transition-opacity duration-300"
                style={{ color: "var(--color-text-muted)" }}
                key={lineIdx}
              >
                {STATUS_LINES[lineIdx]}
              </p>

              {/* Indeterminate progress */}
              <div
                className="relative mt-8 h-2 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: "rgba(70,72,212,0.08)" }}
              >
                <div className="monitoring-run-progress-inner h-full w-[38%] rounded-full" style={{ backgroundColor: brand }} />
              </div>
              <p
                className="relative mt-4 text-center text-[11px] font-medium uppercase tracking-[0.12em]"
                style={{ color: "var(--color-text-muted)" }}
              >
                Prosím nechte okno otevřené
              </p>
            </>
          )}

          {phase === "success" && (
            <div className="relative text-center">
              <div className="flex justify-center">
                <div
                  className="monitoring-run-success-pop flex h-16 w-16 items-center justify-center rounded-2xl"
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
                Hotovo
              </h2>
              <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
                Monitoring běží na pozadí. Za chvíli uvidíte aktualizovaná data.
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
                Spuštění se nepodařilo
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
