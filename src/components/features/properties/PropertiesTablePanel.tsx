"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Building2, Loader2 } from "lucide-react";
import { ListEmptyState } from "@/components/ui/list-empty-state";
import {
  dataQuality,
  type PropertySummary,
  type PropertyStatus,
  type PropertyType,
} from "@/lib/data/properties";

const STATUS_LABELS: Record<PropertyStatus, string> = {
  active: "Aktivní",
  pending: "Čeká",
  sold: "Prodáno",
  withdrawn: "Staženo",
};

const STATUS_STYLES: Record<PropertyStatus, { backgroundColor: string; color: string }> = {
  active: { backgroundColor: "#dcfce7", color: "#166534" },
  pending: { backgroundColor: "#fef3c7", color: "#92400e" },
  sold: { backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" },
  withdrawn: { backgroundColor: "#fee2e2", color: "#991b1b" },
};

const TYPE_LABELS: Record<PropertyType, string> = {
  byt: "Byt",
  dum: "Dům",
  komercni: "Komerční",
  pozemek: "Pozemek",
  garaze: "Garáž",
};

const QUALITY_STYLES = {
  green: { backgroundColor: "#dcfce7", color: "#166534" },
  amber: { backgroundColor: "#fef3c7", color: "#92400e" },
  red: { backgroundColor: "#fee2e2", color: "#991b1b" },
};

const QUALITY_LABELS = {
  green: "Kompletní",
  amber: "Neúplné",
  red: "Kritické",
};

function formatPrice(price: number): string {
  if (price >= 1_000_000) {
    return `${(price / 1_000_000).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} mil. Kč`;
  }
  return price.toLocaleString("cs-CZ") + " Kč";
}

function PropertyRow({ property }: { property: PropertySummary }) {
  const { level } = dataQuality(property);
  const statusStyle = STATUS_STYLES[property.status] ?? STATUS_STYLES.withdrawn;

  return (
    <tr className="group transition-colors" style={{ borderTop: "1px solid rgba(199,196,215,0.12)" }}>
      <td className="px-6 py-4">
        <Link href={`/properties/${property.id}`} className="block">
          <p className="text-sm font-semibold group-hover:underline" style={{ color: "var(--color-text-primary)" }}>
            {property.title}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {property.address}, {property.city}
          </p>
        </Link>
      </td>
      <td className="px-6 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {TYPE_LABELS[property.type] ?? property.type}
      </td>
      <td className="px-6 py-4">
        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full" style={statusStyle}>
          {STATUS_LABELS[property.status] ?? property.status}
        </span>
      </td>
      <td className="px-6 py-4 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {formatPrice(property.price)}
      </td>
      <td className="px-6 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {property.area_m2 != null ? `${property.area_m2} m²` : "—"}
      </td>
      <td className="px-6 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {property.agent_name ?? "—"}
      </td>
      <td className="px-6 py-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {property.lead_count ?? 0}
      </td>
      <td className="px-6 py-4">
        <span className="px-2.5 py-1 text-[10px] font-bold rounded-full" style={QUALITY_STYLES[level]}>
          {QUALITY_LABELS[level]}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <Link
          href={`/properties/${property.id}`}
          className="text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
          style={{ color: "var(--color-brand)" }}
        >
          Zobrazit
        </Link>
      </td>
    </tr>
  );
}

const PAGE = 10;

export interface PropertiesTablePanelProps {
  initial: PropertySummary[];
  total: number;
  totalInDb: number;
  hasFilters: boolean;
  filterParams: {
    status: string;
    type: string;
    district?: string;
    search?: string;
    missing_data?: string;
  };
}

export function PropertiesTablePanel({
  initial,
  total,
  totalInDb,
  hasFilters,
  filterParams,
}: PropertiesTablePanelProps) {
  const [items, setItems] = useState<PropertySummary[]>(initial);
  const [loading, setLoading] = useState(false);

  const hasMore = items.length < total;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({
        offset: String(items.length),
        limit: String(PAGE),
        status: filterParams.status,
        type: filterParams.type,
      });
      if (filterParams.district) q.set("district", filterParams.district);
      if (filterParams.search) q.set("search", filterParams.search);
      if (filterParams.missing_data === "1") q.set("missing_data", "1");

      const res = await fetch(`/api/table/properties?${q.toString()}`);
      const json = (await res.json()) as { data?: PropertySummary[]; total?: number };
      if (!res.ok || !json.data) return;
      setItems((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const next = json.data!.filter((p) => !ids.has(p.id));
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
          icon={<Building2 size={28} style={{ color: "#c7c4d7" }} />}
          title="Žádné nemovitosti."
          description="Přidejte první nemovitost do evidence."
        >
          <Link
            href="/properties?new=1"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-brand)" }}
          >
            Přidat nemovitost
          </Link>
        </ListEmptyState>
      );
    }
    if (hasFilters) {
      return (
        <ListEmptyState embedded title="Žádné výsledky" description="Žádné nemovitosti neodpovídají zadaným filtrům." />
      );
    }
    return <ListEmptyState embedded title="Žádné nemovitosti" description="Zkuste upravit filtry nebo přidat záznam." />;
  }

  return (
    <div className="flex flex-col min-h-0">
      <div
        className="flex flex-col rounded-xl overflow-hidden min-h-[200px] max-h-[min(56vh,560px)]"
        style={{ border: "1px solid rgba(199,196,215,0.2)" }}
      >
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 overscroll-contain">
          <table className="w-full min-w-[960px] text-left border-collapse">
            <thead
              className="sticky top-0 z-[2] shadow-[0_1px_0_rgba(199,196,215,0.35)]"
              style={{ backgroundColor: "rgba(246,242,250,0.95)" }}
            >
              <tr>
                {[
                  "Nemovitost",
                  "Typ",
                  "Status",
                  "Cena",
                  "Plocha",
                  "Agent",
                  "Leady",
                  "Kvalita dat",
                  "",
                ].map((h) => (
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
              {items.map((p) => (
                <PropertyRow key={p.id} property={p} />
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
