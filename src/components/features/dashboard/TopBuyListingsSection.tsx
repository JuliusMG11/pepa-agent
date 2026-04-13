"use client";

import { useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Sparkles } from "lucide-react";
import type { TopBuySnapshotPayload } from "@/lib/ai/top-buy-picks";
import { toast } from "@/components/ui/toaster";

function formatCzk(n: number | null) {
  if (n == null || n <= 0) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mil. Kč`;
  return `${n.toLocaleString("cs-CZ")} Kč`;
}

function sourceLabel(source: string): string {
  if (source === "sreality") return "Sreality";
  if (source === "bezrealitky") return "Bezrealitky";
  return source;
}

interface Props {
  initial: TopBuySnapshotPayload | null;
}

export function TopBuyListingsSection({ initial }: Props) {
  const [snapshot, setSnapshot] = useState<TopBuySnapshotPayload | null>(initial);
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/top-buy-listings", { method: "POST" });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        snapshot?: TopBuySnapshotPayload;
      };
      if (!res.ok) {
        toast.error(typeof json.error === "string" ? json.error : "Obnovení selhalo.");
        return;
      }
      if (json.snapshot) {
        setSnapshot(json.snapshot);
        toast.success("Žebříček aktualizován.");
      }
    } catch {
      toast.error("Neočekávaná chyba.");
    } finally {
      setLoading(false);
    }
  }

  const updatedLabel = snapshot
    ? new Date(snapshot.generated_at).toLocaleString("cs-CZ", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className="w-full p-6 rounded-xl min-w-0"
      style={{
        backgroundColor: "var(--color-bg-card)",
        boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
        border: "1px solid rgba(199,196,215,0.12)",
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-5">
        <div className="min-w-0">
          <h3 className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>
            Top 5 nemovitostí ke koupi
          </h3>
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            Výběr podle AI (Claude) z dat monitoringu trhu — poměr cena / lokalita. Po změně nabídek
            spusťte obnovení.
          </p>
          {updatedLabel && (
            <p className="text-[10px] mt-1.5 font-medium" style={{ color: "var(--color-text-muted)" }}>
              Naposledy: {updatedLabel}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center justify-center gap-2 shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold border transition-opacity disabled:opacity-60 cursor-pointer"
          style={{
            borderColor: "rgba(199,196,215,0.6)",
            color: "var(--color-text-secondary)",
            backgroundColor: "var(--color-bg-page)",
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {loading ? "Vyhodnocuji…" : "Obnovit výběr"}
        </button>
      </div>

      {!snapshot || snapshot.items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-14 rounded-xl text-center"
          style={{
            border: "1px solid rgba(199,196,215,0.2)",
            backgroundColor: "rgba(246,242,250,0.65)",
          }}
        >
          <Sparkles size={28} style={{ color: "#c7c4d7" }} className="mb-2" />
          <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            Zatím není žádný žebříček.
          </p>
          <p className="text-xs mt-1 max-w-md" style={{ color: "var(--color-text-muted)" }}>
            Klikněte na „Obnovit výběr“ — AI projde aktuální inzeráty z monitoringu a vybere top 5.
          </p>
        </div>
      ) : (
        <div
          className="overflow-x-auto overflow-y-auto rounded-xl border"
          style={{ borderColor: "rgba(199,196,215,0.25)", maxHeight: "min(420px, 55vh)" }}
        >
          <table className="w-full text-sm min-w-[560px]">
            <thead className="sticky top-0 z-[1]" style={{ backgroundColor: "rgba(246,242,250,0.95)" }}>
              <tr>
                {["#", "Nemovitost", "Čtvrť", "Cena", "Zdroj", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-semibold text-[10px] uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snapshot.items.map((row, idx) => (
                <tr
                  key={row.listing_id}
                  style={{
                    borderTop: idx === 0 ? "none" : "1px solid rgba(199,196,215,0.2)",
                  }}
                >
                  <td className="px-4 py-3 font-bold tabular-nums align-top" style={{ color: "var(--color-brand)" }}>
                    {row.rank}
                  </td>
                  <td className="px-4 py-3 font-medium max-w-[min(100%,320px)] align-top">
                    <span className="line-clamp-3" style={{ color: "var(--color-text-primary)" }}>
                      {row.title}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap align-top" style={{ color: "var(--color-text-secondary)" }}>
                    {row.district}
                  </td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap align-top" style={{ color: "var(--color-text-primary)" }}>
                    {formatCzk(row.price)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={
                        row.source === "bezrealitky"
                          ? { backgroundColor: "rgba(16,185,129,0.12)", color: "#047857" }
                          : { backgroundColor: "rgba(70,72,212,0.08)", color: "var(--color-brand)" }
                      }
                    >
                      {sourceLabel(row.source)}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-opacity hover:opacity-80"
                      style={{ backgroundColor: "rgba(70,72,212,0.08)", color: "var(--color-brand)" }}
                      aria-label="Otevřít inzerát"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
