"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  ExternalLink,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { MonitoringJob, MarketListing } from "@/types/app";
import { toast } from "@/components/ui/toaster";
import { MONITORING_ALLOWED_DISTRICTS } from "@/lib/monitoring/allowed-districts";
import {
  MonitoringRunModal,
  type MonitoringRunPhase,
} from "@/components/features/monitoring/MonitoringRunModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DialogSheetPanel,
  DialogSheetRoot,
  DialogSheetScrollBody,
} from "@/components/ui/dialog-sheet";

function formatDate(iso: string | null) {
  if (!iso) return "Nikdy";
  return new Date(iso).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCzk(n: number | null) {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mil. Kč`;
  return `${n.toLocaleString("cs-CZ")} Kč`;
}

function sourceBadgeStyle(source: string): { backgroundColor: string; color: string } {
  if (source === "sreality") {
    return { backgroundColor: "rgba(70,72,212,0.08)", color: "var(--color-brand)" };
  }
  if (source === "bezrealitky") {
    return { backgroundColor: "rgba(16,185,129,0.12)", color: "#047857" };
  }
  return { backgroundColor: "#fef3c7", color: "#92400e" };
}

function sourceLabel(source: string): string {
  if (source === "sreality") return "Sreality";
  if (source === "bezrealitky") return "Bezrealitky";
  return source;
}

const LISTINGS_PAGE = 10;

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: h,
  label: `${String(h).padStart(2, "0")}:00`,
}));

interface Props {
  jobs: MonitoringJob[];
  listings: MarketListing[];
}

export function MonitoringClient({ jobs: initialJobs, listings }: Props) {
  const router = useRouter();
  const [jobs, setJobs] = useState<MonitoringJob[]>(initialJobs);
  const [activeJobId, setActiveJobId] = useState<string | null>(
    initialJobs[0]?.id ?? null
  );
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [creating, setCreating] = useState(false);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [runPhase, setRunPhase] = useState<MonitoringRunPhase>("running");
  const [runError, setRunError] = useState<string | null>(null);
  const runCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [listingVisible, setListingVisible] = useState(LISTINGS_PAGE);
  const [jobToDelete, setJobToDelete] = useState<MonitoringJob | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newRunHour, setNewRunHour] = useState<number>(8);
  const [editJob, setEditJob] = useState<MonitoringJob | null>(null);
  const [editRunHour, setEditRunHour] = useState<number>(8);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  useEffect(() => {
    return () => {
      if (runCloseTimerRef.current) clearTimeout(runCloseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setListingVisible(LISTINGS_PAGE);
  }, [activeJobId]);

  const activeListings = listings.filter((l) => {
    if (!activeJobId) return true;
    const job = jobs.find((j) => j.id === activeJobId);
    return job ? job.locations.some((loc) => l.district.includes(loc) || loc.includes(l.district)) : true;
  });

  const newToday = activeListings.filter((l) => l.is_new).length;

  const displayedListings = activeListings.slice(0, listingVisible);
  const canLoadMoreListings = listingVisible < activeListings.length;

  async function handleToggleJob(job: MonitoringJob) {
    setTogglingId(job.id);
    try {
      const res = await fetch("/api/monitoring/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: job.id, enabled: !job.enabled }),
      });
      if (res.ok) {
        const nowEnabled = !job.enabled;
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, enabled: nowEnabled } : j))
        );
        toast.success(
          nowEnabled ? "Sledování aktivováno" : "Sledování pozastaveno"
        );
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(
          typeof json.error === "string" ? json.error : "Změna stavu selhala"
        );
      }
    } finally {
      setTogglingId(null);
    }
  }

  function closeRunModal() {
    if (runCloseTimerRef.current) {
      clearTimeout(runCloseTimerRef.current);
      runCloseTimerRef.current = null;
    }
    setRunModalOpen(false);
    setRunError(null);
  }

  async function handleTriggerNow() {
    if (runCloseTimerRef.current) {
      clearTimeout(runCloseTimerRef.current);
      runCloseTimerRef.current = null;
    }
    setError(null);
    setRunError(null);
    setRunPhase("running");
    setRunModalOpen(true);

    try {
      const res = await fetch("/api/monitoring/trigger", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        const msg =
          typeof json.error === "string" ? json.error : "Spuštění selhalo.";
        setError(msg);
        setRunError(msg);
        setRunPhase("error");
        toast.error(msg);
        return;
      }

      setRunPhase("success");
      toast.success("Monitoring spuštěn na pozadí");
      router.refresh();

      runCloseTimerRef.current = setTimeout(() => {
        setRunModalOpen(false);
        runCloseTimerRef.current = null;
      }, 2000);
    } catch {
      const msg = "Neočekávaná chyba při spuštění.";
      setError(msg);
      setRunError(msg);
      setRunPhase("error");
      toast.error(msg);
    }
  }

  async function handleDeleteJob() {
    if (!jobToDelete) return;
    setDeletingId(jobToDelete.id);
    try {
      const res = await fetch(
        `/api/monitoring/jobs?id=${encodeURIComponent(jobToDelete.id)}`,
        { method: "DELETE" }
      );
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : "Smazání se nepodařilo.");
        return;
      }
      const removedId = jobToDelete.id;
      setJobs((prev) => {
        const next = prev.filter((j) => j.id !== removedId);
        setActiveJobId((aid) => {
          if (aid !== removedId) return aid;
          return next[0]?.id ?? null;
        });
        return next;
      });
      toast.success("Lokalita odebrána ze sledování.");
      setJobToDelete(null);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreateJob() {
    if (!newLocation) {
      toast.error("Vyberte lokalitu.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/monitoring/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: newLocation, run_hour: newRunHour }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        id?: string;
        name?: string;
      };
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : "Uložení selhalo.");
        return;
      }
      toast.success("Lokalita přidána do sledování.");
      setAddOpen(false);
      setNewLocation("");
      setNewRunHour(8);
      if (json.id) setActiveJobId(json.id);
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit() {
    if (!editJob) return;
    setSaving(true);
    try {
      const res = await fetch("/api/monitoring/jobs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editJob.id, run_hour: editRunHour }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(
          typeof json.error === "string" ? json.error : "Uložení selhalo."
        );
        return;
      }
      setJobs((prev) =>
        prev.map((j) =>
          j.id === editJob.id ? { ...j, run_hour: editRunHour } : j
        )
      );
      toast.success("Čas spuštění upraven.");
      setEditJob(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={jobToDelete !== null}
        title="Odebrat lokalitu ze sledování?"
        description={
          jobToDelete
            ? `Přestanete sledovat „${jobToDelete.locations[0] ?? jobToDelete.name}“. Tuto akci nelze vrátit zpět.`
            : ""
        }
        confirmLabel="Odebrat"
        cancelLabel="Zrušit"
        variant="danger"
        isPending={deletingId !== null}
        onCancel={() => setJobToDelete(null)}
        onConfirm={handleDeleteJob}
      />

      <MonitoringRunModal
        open={runModalOpen}
        phase={runPhase}
        errorMessage={runError}
        onClose={closeRunModal}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Monitoring trhu
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {jobs.length} sledovaných lokalit · {newToday} nových nabídek dnes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleTriggerNow}
            disabled={runModalOpen && runPhase === "running"}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-60"
            style={{ borderColor: "rgba(199,196,215,0.6)", color: "var(--color-text-secondary)", backgroundColor: "var(--color-bg-page)" }}
          >
            <RefreshCw size={14} />
            Spustit nyní
          </button>
          <button
            type="button"
            onClick={() => {
              setNewLocation("");
              setAddOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-on-brand)" }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Přidat lokalitu
          </button>
        </div>
      </div>

      {error && (
        <div
          className="px-4 py-3 rounded-xl text-sm border"
          style={{ backgroundColor: "rgba(186,26,26,0.06)", borderColor: "rgba(186,26,26,0.2)", color: "#ba1a1a" }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6 items-stretch min-w-0 min-h-0">
        {/* Jobs list */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide px-1" style={{ color: "var(--color-text-muted)" }}>
            Sledované lokality
          </p>

          {jobs.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 rounded-2xl border text-center"
              style={{ borderColor: "rgba(199,196,215,0.4)", backgroundColor: "var(--color-bg-page)" }}
            >
              <Bell size={24} style={{ color: "#c7c4d7" }} className="mb-2" />
              <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                Žádné sledované lokality.
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                Přidejte čtvrť pomocí tlačítka výše.
              </p>
            </div>
          ) : (
            jobs.map((job) => {
              const isActive = job.id === activeJobId;
              const jobListings = listings.filter((l) =>
                job.locations.some((loc) => l.district.includes(loc) || loc.includes(l.district))
              );
              const jobNew = jobListings.filter((l) => l.is_new).length;
              const busy = togglingId === job.id || deletingId === job.id;

              return (
                <div
                  key={job.id}
                  className="rounded-xl border transition-all"
                  style={{
                    borderColor: isActive ? "rgba(70,72,212,0.3)" : "rgba(199,196,215,0.4)",
                    backgroundColor: isActive ? "rgba(70,72,212,0.04)" : "var(--color-bg-page)",
                  }}
                >
                  <div className="flex items-start gap-2 px-3 py-3 sm:px-4">
                    {/* div + role="button" — nikdy nevnímatelný <button> uvnitř jiného <button> (ikony vpravo jsou samostatné tlačítka) */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveJobId(job.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActiveJobId(job.id);
                        }
                      }}
                      className="flex-1 min-w-0 text-left cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[rgba(70,72,212,0.35)]"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={14} style={{ color: isActive ? "var(--color-brand)" : "var(--color-text-muted)" }} />
                        <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                          {job.locations[0] ?? job.name}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3">
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={
                            job.enabled
                              ? { backgroundColor: "rgba(22,101,52,0.08)", color: "#166534" }
                              : { backgroundColor: "rgba(199,196,215,0.3)", color: "var(--color-text-muted)" }
                          }
                        >
                          {job.enabled ? "Aktivní" : "Vypnuto"}
                        </span>
                        {jobNew > 0 && (
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-on-brand)" }}
                          >
                            {jobNew} nových
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                        Poslední run: {formatDate(job.last_run_at)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditJob(job);
                          setEditRunHour(job.run_hour ?? 8);
                        }}
                        disabled={busy}
                        className="p-1.5 rounded-lg transition-opacity disabled:opacity-50"
                        style={{ color: "var(--color-text-muted)" }}
                        aria-label="Upravit čas spuštění"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleJob(job)}
                        disabled={busy}
                        className="p-1.5 rounded-lg transition-opacity disabled:opacity-50"
                        aria-label={job.enabled ? "Vypnout sledování" : "Zapnout sledování"}
                      >
                        {togglingId === job.id ? (
                          <Loader2 size={14} className="animate-spin" style={{ color: "var(--color-text-muted)" }} />
                        ) : job.enabled ? (
                          <Bell size={14} style={{ color: "var(--color-brand)" }} />
                        ) : (
                          <BellOff size={14} style={{ color: "#c7c4d7" }} />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setJobToDelete(job)}
                        disabled={busy}
                        className="p-1.5 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                        style={{ color: "#991b1b" }}
                        aria-label="Odebrat lokalitu"
                      >
                        {deletingId === job.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} strokeWidth={2} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Listings panel — fixed height; scroll only inside table */}
        <div className="flex flex-col min-h-0 min-w-0">
          <div className="flex flex-col gap-1 mb-3 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide px-1" style={{ color: "var(--color-text-muted)" }}>
                Tabulka · nabídky
                {activeJobId && jobs.find((j) => j.id === activeJobId)
                  ? ` · ${jobs.find((j) => j.id === activeJobId)!.locations[0]}`
                  : ""}
              </p>
              {newToday > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0"
                  style={{ backgroundColor: "var(--color-brand)", color: "var(--color-on-brand)" }}
                >
                  {newToday} nových dnes
                </span>
              )}
            </div>
            <p className="text-[11px] px-1 leading-snug" style={{ color: "var(--color-text-muted)" }}>
              Zdroje: Sreality a Bezrealitky (byty na prodej) — aktualizace po spuštění monitoringu.
            </p>
          </div>

          {activeListings.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-20 rounded-2xl border"
              style={{ borderColor: "rgba(199,196,215,0.4)", backgroundColor: "var(--color-bg-page)" }}
            >
              <Sparkles size={24} style={{ color: "#c7c4d7" }} className="mb-2" />
              <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                Žádné nové nabídky dnes.
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                Spusťte monitoring tlačítkem Spustit nyní.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 min-w-0">
            <div
              className="rounded-2xl border flex flex-col min-h-[280px] max-h-[min(56vh,560px)] overflow-hidden"
              style={{ borderColor: "rgba(199,196,215,0.4)" }}
            >
              <div className="overflow-auto flex-1 min-h-0 overscroll-contain">
                <table className="w-full text-sm min-w-[640px] border-collapse">
                  <thead
                    className="sticky top-0 z-[2] shadow-[0_1px_0_rgba(199,196,215,0.35)]"
                    style={{ backgroundColor: "rgba(246,242,250,0.95)" }}
                  >
                    <tr>
                      {["Nemovitost", "Adresa", "Cena", "Plocha", "Portál", ""].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedListings.map((listing, idx) => (
                      <tr
                        key={listing.id}
                        style={{
                          borderTop: idx === 0 ? "none" : "1px solid rgba(199,196,215,0.25)",
                          backgroundColor: listing.is_new ? "rgba(70,72,212,0.02)" : "transparent",
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {listing.is_new && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-full font-bold shrink-0"
                                style={{ backgroundColor: "var(--color-brand)", color: "var(--color-on-brand)" }}
                              >
                                Nové
                              </span>
                            )}
                            <span className="font-medium line-clamp-1" style={{ color: "var(--color-text-primary)" }}>
                              {listing.title}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>
                          {listing.address ?? listing.district}
                        </td>
                        <td className="px-4 py-3 font-semibold" style={{ color: "var(--color-text-primary)" }}>
                          {formatCzk(listing.price)}
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>
                          {listing.area_m2 ? `${listing.area_m2} m²` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={sourceBadgeStyle(listing.source)}
                          >
                            {sourceLabel(listing.source)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={listing.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
                            style={{ backgroundColor: "rgba(70,72,212,0.08)", color: "var(--color-brand)" }}
                            aria-label="Otevřít inzerát"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {canLoadMoreListings && (
              <div className="flex justify-center pt-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setListingVisible((n) => n + LISTINGS_PAGE)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border transition-opacity hover:opacity-90"
                  style={{
                    borderColor: "rgba(199,196,215,0.5)",
                    color: "var(--color-text-secondary)",
                    backgroundColor: "var(--color-bg-page)",
                  }}
                >
                  Načíst dalších {LISTINGS_PAGE} ({displayedListings.length} z {activeListings.length})
                </button>
              </div>
            )}
            </div>
          )}
        </div>
      </div>

      {addOpen && (
        <DialogSheetRoot onClose={() => setAddOpen(false)}>
          <DialogSheetPanel
            maxWidthClassName="max-w-md"
            className="border border-[rgba(199,196,215,0.2)]"
          >
            <div className="relative flex shrink-0 items-start justify-between gap-3 border-b px-6 py-5 pr-14" style={{ borderColor: "rgba(199,196,215,0.2)" }}>
              <h2
                id="add-monitoring-title"
                className="text-base font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Přidat sledovanou lokalitu
              </h2>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-70"
                style={{ color: "var(--color-text-muted)" }}
                aria-label="Zavřít"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            <DialogSheetScrollBody className="!py-6">
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Vyberte pražskou čtvrť. Úloha se uloží a monitoring poběží podle nastavení (stejně jako přes agenta).
              </p>
              <label className="mt-4 block">
                <span
                  className="mb-1 block text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Lokalita
                </span>
                <select
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{
                    backgroundColor: "var(--color-bg-subtle)",
                    border: "1px solid rgba(199,196,215,0.3)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <option value="">Vyberte čtvrť…</option>
                  {MONITORING_ALLOWED_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-4 block">
                <span
                  className="mb-1 block text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Čas spuštění
                </span>
                <select
                  value={newRunHour}
                  onChange={(e) => setNewRunHour(Number(e.target.value))}
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{
                    backgroundColor: "var(--color-bg-subtle)",
                    border: "1px solid rgba(199,196,215,0.3)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {HOUR_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </DialogSheetScrollBody>
            <div
              className="flex shrink-0 justify-end gap-3 border-t px-6 py-4"
              style={{ borderColor: "rgba(199,196,215,0.2)" }}
            >
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                disabled={creating}
                className="cursor-pointer rounded-lg px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" }}
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={handleCreateJob}
                disabled={creating || !newLocation}
                className="cursor-pointer rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)" }}
              >
                {creating ? "Ukládám…" : "Přidat"}
              </button>
            </div>
          </DialogSheetPanel>
        </DialogSheetRoot>
      )}

      {editJob && (
        <DialogSheetRoot onClose={() => setEditJob(null)}>
          <DialogSheetPanel
            maxWidthClassName="max-w-md"
            className="border border-[rgba(199,196,215,0.2)]"
          >
            <div
              className="relative flex shrink-0 items-start justify-between gap-3 border-b px-6 py-5 pr-14"
              style={{ borderColor: "rgba(199,196,215,0.2)" }}
            >
              <h2
                className="text-base font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Upravit sledování
              </h2>
              <button
                type="button"
                onClick={() => setEditJob(null)}
                className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-opacity hover:opacity-70"
                style={{ color: "var(--color-text-muted)" }}
                aria-label="Zavřít"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>
            <DialogSheetScrollBody className="!py-6">
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {editJob.locations[0] ?? editJob.name}
              </p>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Nastavte čas, kdy má monitoring každý den spustit scraper.
              </p>
              <label className="mt-4 block">
                <span
                  className="mb-1 block text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Čas spuštění
                </span>
                <select
                  value={editRunHour}
                  onChange={(e) => setEditRunHour(Number(e.target.value))}
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{
                    backgroundColor: "var(--color-bg-subtle)",
                    border: "1px solid rgba(199,196,215,0.3)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {HOUR_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </DialogSheetScrollBody>
            <div
              className="flex shrink-0 justify-end gap-3 border-t px-6 py-4"
              style={{ borderColor: "rgba(199,196,215,0.2)" }}
            >
              <button
                type="button"
                onClick={() => setEditJob(null)}
                disabled={saving}
                className="cursor-pointer rounded-lg px-5 py-2.5 text-sm font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" }}
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="cursor-pointer rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "var(--color-brand)" }}
              >
                {saving ? "Ukládám…" : "Uložit"}
              </button>
            </div>
          </DialogSheetPanel>
        </DialogSheetRoot>
      )}
    </div>
  );
}
