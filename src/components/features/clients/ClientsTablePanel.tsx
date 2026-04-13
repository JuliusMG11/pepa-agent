"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Loader2, Users } from "lucide-react";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import type { ClientRow } from "@/lib/data/clients";
import { CLIENT_SOURCE_LABELS, CLIENT_SOURCE_STYLES } from "@/lib/data/clients-display";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ClientTableRow({ client }: { client: ClientRow }) {
  const src = client.source ?? "other";
  const srcStyle = CLIENT_SOURCE_STYLES[src] ?? CLIENT_SOURCE_STYLES.other;

  return (
    <tr className="group transition-colors" style={{ borderTop: "1px solid rgba(199,196,215,0.12)" }}>
      <td className="px-6 py-4">
        <Link href={`/clients/${client.id}`} className="block">
          <p className="text-sm font-semibold group-hover:underline" style={{ color: "var(--color-text-primary)" }}>
            {client.full_name}
          </p>
          {client.email && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {client.email}
            </p>
          )}
        </Link>
      </td>
      <td className="px-6 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {client.phone ?? "—"}
      </td>
      <td className="px-6 py-4">
        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full" style={srcStyle}>
          {CLIENT_SOURCE_LABELS[src] ?? src}
        </span>
      </td>
      <td className="px-6 py-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
        {formatDate(client.created_at)}
      </td>
      <td className="px-6 py-4 text-right">
        <Link
          href={`/clients/${client.id}`}
          className="text-xs font-bold transition-opacity hover:opacity-70"
          style={{ color: "var(--color-brand)" }}
        >
          Zobrazit
        </Link>
      </td>
    </tr>
  );
}

const PAGE = 10;

export interface ClientsTablePanelProps {
  initial: ClientRow[];
  total: number;
  totalInDb: number;
  hasFilters: boolean;
  filterParams: {
    search?: string;
    source: string;
  };
}

export function ClientsTablePanel({
  initial,
  total,
  totalInDb,
  hasFilters,
  filterParams,
}: ClientsTablePanelProps) {
  const [items, setItems] = useState<ClientRow[]>(initial);
  const [loading, setLoading] = useState(false);
  const hasMore = items.length < total;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({
        offset: String(items.length),
        limit: String(PAGE),
        source: filterParams.source,
      });
      if (filterParams.search) q.set("search", filterParams.search);

      const res = await fetch(`/api/table/clients?${q.toString()}`);
      const json = (await res.json()) as { data?: ClientRow[]; total?: number };
      if (!res.ok || !json.data) return;
      setItems((prev) => {
        const ids = new Set(prev.map((c) => c.id));
        const next = json.data!.filter((c) => !ids.has(c.id));
        return [...prev, ...next];
      });
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, items.length, filterParams]);

  if (initial.length === 0) {
    if (totalInDb === 0) {
      return (
        <ListEmptyState
          embedded
          icon={<Users size={28} style={{ color: "#c7c4d7" }} />}
          title="Žádní klienti."
          description="Klienti se objeví po prvním kontaktu nebo importu z leadů."
        />
      );
    }
    if (hasFilters) {
      return (
        <ListEmptyState embedded title="Žádné výsledky" description="Žádní klienti neodpovídají zadaným filtrům." />
      );
    }
    return <ListEmptyState embedded title="Žádní klienti" description="Zkuste upravit vyhledávání nebo zdroj." />;
  }

  return (
    <div className="flex flex-col min-h-0">
      <div
        className="flex flex-col rounded-xl overflow-hidden min-h-[200px] max-h-[min(56vh,560px)]"
        style={{ border: "1px solid rgba(199,196,215,0.2)" }}
      >
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 overscroll-contain">
          <table className="w-full min-w-[720px] text-left border-collapse">
            <thead
              className="sticky top-0 z-[2] shadow-[0_1px_0_rgba(199,196,215,0.35)]"
              style={{ backgroundColor: "rgba(246,242,250,0.95)" }}
            >
              <tr>
                {["Klient", "Telefon", "Zdroj", "Přidán", ""].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-[10px] font-bold tracking-widest uppercase"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <ClientTableRow key={c.id} client={c} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-opacity disabled:opacity-60"
            style={{
              borderColor: "rgba(199,196,215,0.5)",
              color: "var(--color-text-secondary)",
              backgroundColor: "var(--color-bg-page)",
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Načítám…" : `Načíst dalších ${PAGE} (${items.length} z ${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
