"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Plus,
  Loader2,
  TrendingUp,
  Calendar,
  ChevronDown,
  Trash2,
} from "lucide-react";
import type { Report } from "@/types/app";
import type { ReportData } from "@/types/reports";
import { toast } from "@/components/ui/toaster";
import {
  ReportGenerateModal,
  type ReportGenPhase,
} from "@/components/features/reports/ReportGenerateModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteReport } from "@/app/(dashboard)/reports/actions";

const PERIOD_OPTIONS = [
  { value: "weekly", label: "Minulý týden" },
  { value: "monthly", label: "Minulý měsíc" },
] as const;

const TYPE_LABELS: Record<string, string> = {
  weekly: "Týdenní",
  monthly: "Měsíční",
  quarterly: "Kvartální",
  custom: "Vlastní",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface GeneratedReport {
  report: Report;
  reportData: ReportData;
  pdfUrl: string | null;
}

interface Props {
  initialReports: Report[];
}

export function ReportsClient({ initialReports }: Props) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [selectedPeriod, setSelectedPeriod] =
    useState<(typeof PERIOD_OPTIONS)[number]["value"]>("weekly");
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<GeneratedReport | null>(null);
  const [pdfLoading, setPdfLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [genModalOpen, setGenModalOpen] = useState(false);
  const [genPhase, setGenPhase] = useState<ReportGenPhase>("running");
  const [genProgress, setGenProgress] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  function clearProgressTimer() {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  async function handleGenerate() {
    setError(null);
    setGenError(null);
    setGenPhase("running");
    setGenProgress(4);
    setGenModalOpen(true);

    clearProgressTimer();
    progressTimerRef.current = setInterval(() => {
      setGenProgress((p) => {
        const next = p + 4 + Math.random() * 5;
        return next >= 92 ? 92 : next;
      });
    }, 380);

    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodType: selectedPeriod }),
      });

      clearProgressTimer();

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        const msg = typeof json.error === "string" ? json.error : "Generování reportu selhalo.";
        setError(msg);
        setGenError(msg);
        setGenPhase("error");
        toast.error(msg);
        return;
      }

      setGenProgress(100);
      const json = (await res.json()) as GeneratedReport;
      setLastGenerated(json);
      setReports((prev) => [json.report, ...prev]);
      setGenPhase("success");
      toast.success("PDF report je připravený ke stažení");
      window.setTimeout(() => {
        setGenModalOpen(false);
        setGenProgress(0);
      }, 1400);
    } catch {
      clearProgressTimer();
      const msg = "Neočekávaná chyba při generování.";
      setError(msg);
      setGenError(msg);
      setGenPhase("error");
      toast.error(msg);
    }
  }

  async function handleDownloadPdf(report: Report, reportData?: ReportData) {
    if (!reportData) return;
    setPdfLoading(report.id);
    try {
      const { generatePdf } = await import("@/lib/reports/pdf-export");
      const blob = await generatePdf(reportData);
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        URL.revokeObjectURL(url);
        toast.error("Prohlížeč zablokoval nové okno — povolte vyskakovací okna.");
        return;
      }
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
      toast.success("PDF otevřeno v novém okně");
    } finally {
      setPdfLoading(null);
    }
  }

  const selectedLabel =
    PERIOD_OPTIONS.find((o) => o.value === selectedPeriod)?.label ?? "Týden";

  async function handleConfirmDelete() {
    if (!reportToDelete) return;
    setDeletePending(true);
    const r = await deleteReport(reportToDelete.id);
    setDeletePending(false);
    if (r.success) {
      setReports((prev) => prev.filter((x) => x.id !== reportToDelete.id));
      if (lastGenerated?.report.id === reportToDelete.id) setLastGenerated(null);
      toast.success("Report byl smazán");
      setReportToDelete(null);
    } else {
      toast.error(r.error);
    }
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={reportToDelete !== null}
        title="Smazat report?"
        description="Trvale odstraní soubor z úložiště i záznam v aplikaci. Tuto akci nelze vrátit zpět."
        confirmLabel={deletePending ? "Mazání…" : "Smazat"}
        cancelLabel="Zrušit"
        variant="danger"
        isPending={deletePending}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deletePending && setReportToDelete(null)}
      />
      <ReportGenerateModal
        open={genModalOpen}
        phase={genPhase}
        progress={genProgress}
        errorMessage={genError}
        onClose={() => {
          setGenModalOpen(false);
          setGenProgress(0);
          clearProgressTimer();
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Reporty
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {reports.length} {reports.length === 1 ? "report" : "reportů"} celkem
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="relative">
            <button
              onClick={() => setShowPeriodMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors"
              style={{
                borderColor: "rgba(199,196,215,0.6)",
                color: "var(--color-text-secondary)",
                backgroundColor: "var(--color-bg-page)",
              }}
            >
              <Calendar size={14} />
              {selectedLabel}
              <ChevronDown size={13} />
            </button>
            {showPeriodMenu && (
              <div
                className="absolute right-0 mt-1 w-40 rounded-xl border shadow-lg z-10 overflow-hidden"
                style={{ backgroundColor: "var(--color-bg-page)", borderColor: "rgba(199,196,215,0.6)" }}
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSelectedPeriod(opt.value);
                      setShowPeriodMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                    style={{
                      color: selectedPeriod === opt.value ? "var(--color-brand)" : "var(--color-text-secondary)",
                      backgroundColor:
                        selectedPeriod === opt.value ? "rgba(70,72,212,0.06)" : "transparent",
                      fontWeight: selectedPeriod === opt.value ? 600 : 400,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={genModalOpen && genPhase === "running"}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-on-brand)" }}
          >
            {genModalOpen && genPhase === "running" ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} strokeWidth={2.5} />
            )}
            {genModalOpen && genPhase === "running" ? "Generuji…" : "Generovat report"}
          </button>

          {/* Chat shortcut */}
          <Link
            href="/chat"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{
              backgroundColor: "rgba(70,72,212,0.08)",
              color: "var(--color-brand)",
            }}
          >
            <TrendingUp size={14} />
            Zeptat se Pepy
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="px-4 py-3 rounded-xl text-sm border"
          style={{
            backgroundColor: "rgba(186,26,26,0.06)",
            borderColor: "rgba(186,26,26,0.2)",
            color: "#ba1a1a",
          }}
        >
          {error}
        </div>
      )}

      {/* Just-generated report banner */}
      {lastGenerated && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl border"
          style={{
            backgroundColor: "rgba(70,72,212,0.04)",
            borderColor: "rgba(70,72,212,0.2)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgba(70,72,212,0.1)" }}
            >
              <FileText size={16} style={{ color: "var(--color-brand)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {lastGenerated.report.title}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Právě vygenerováno — PDF vhodné pro klienta
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {lastGenerated.pdfUrl && (
              <a
                href={lastGenerated.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-on-brand)" }}
              >
                <Download size={13} />
                Otevřít PDF
              </a>
            )}
            <button
              onClick={() =>
                handleDownloadPdf(lastGenerated.report, lastGenerated.reportData)
              }
              disabled={pdfLoading === lastGenerated.report.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              style={{
                backgroundColor: "rgba(70,72,212,0.1)",
                color: "var(--color-brand)",
              }}
            >
              {pdfLoading === lastGenerated.report.id ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileText size={13} />
              )}
              PDF
            </button>
          </div>
        </div>
      )}

      {/* Reports table */}
      {reports.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border"
          style={{ borderColor: "rgba(199,196,215,0.4)", backgroundColor: "var(--color-bg-page)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: "rgba(70,72,212,0.08)" }}
          >
            <FileText size={26} style={{ color: "var(--color-brand)" }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Zatím žádné reporty. Zeptejte se Pepy.
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Nebo klikněte na Generovat report v horním panelu.
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl border overflow-x-auto"
          style={{ borderColor: "rgba(199,196,215,0.4)" }}
        >
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr style={{ backgroundColor: "rgba(246,242,250,0.8)" }}>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                  Název
                </th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                  Typ
                </th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                  Období
                </th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                  Vytvořeno
                </th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                  PDF
                </th>
                <th className="w-14 px-2 py-3" aria-label="Akce" />
              </tr>
            </thead>
            <tbody>
              {reports.map((report, idx) => {
                const isNew = lastGenerated?.report.id === report.id;
                const reportData = isNew ? lastGenerated?.reportData : undefined;

                return (
                  <tr
                    key={report.id}
                    style={{
                      borderTop: idx === 0 ? "none" : "1px solid rgba(199,196,215,0.25)",
                      backgroundColor: isNew ? "rgba(70,72,212,0.02)" : "transparent",
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: "rgba(70,72,212,0.08)" }}
                        >
                          <FileText size={13} style={{ color: "var(--color-brand)" }} />
                        </div>
                        <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                          {report.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: "rgba(70,72,212,0.08)",
                          color: "var(--color-brand)",
                        }}
                      >
                        {TYPE_LABELS[report.type] ?? report.type}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>
                      {formatDate(report.period_start)} –{" "}
                      {formatDate(report.period_end)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--color-text-muted)" }}>
                      {formatDate(report.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {report.storage_path && (
                          <SignedDownloadButton
                            storagePath={report.storage_path}
                            format={report.format}
                          />
                        )}
                        {reportData && (
                          <button
                            onClick={() => handleDownloadPdf(report, reportData)}
                            disabled={pdfLoading === report.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: "rgba(70,72,212,0.06)",
                              color: "var(--color-brand)",
                            }}
                          >
                            {pdfLoading === report.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <FileText size={12} />
                            )}
                            PDF
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setReportToDelete(report)}
                        className="inline-flex rounded-lg p-2 transition-opacity hover:opacity-80"
                        style={{ color: "#991b1b" }}
                        aria-label="Smazat report"
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Fetches a signed URL on demand and triggers download
function SignedDownloadButton({
  storagePath,
  format,
}: {
  storagePath: string;
  format: string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reports/signed-url?path=${encodeURIComponent(storagePath)}`
      );
      if (!res.ok) return;
      const { url } = await res.json();
      window.open(url as string, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
      style={{ backgroundColor: "var(--color-brand)", color: "var(--color-on-brand)" }}
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Download size={12} />
      )}
      {format.toUpperCase()}
    </button>
  );
}
