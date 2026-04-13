"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "Všechny statusy" },
  { value: "active", label: "Aktivní" },
  { value: "pending", label: "Čeká" },
  { value: "sold", label: "Prodáno" },
  { value: "withdrawn", label: "Staženo" },
] as const;

const TYPE_OPTIONS = [
  { value: "all", label: "Všechny typy" },
  { value: "byt", label: "Byt" },
  { value: "dum", label: "Dům" },
  { value: "komercni", label: "Komerční" },
  { value: "pozemek", label: "Pozemek" },
  { value: "garaze", label: "Garáž" },
] as const;

const DISTRICT_OPTIONS = [
  { value: "all", label: "Všechny čtvrti" },
  { value: "Holešovice", label: "Holešovice" },
  { value: "Vinohrady", label: "Vinohrady" },
  { value: "Žižkov", label: "Žižkov" },
  { value: "Smíchov", label: "Smíchov" },
  { value: "Dejvice", label: "Dejvice" },
  { value: "Nusle", label: "Nusle" },
  { value: "Vršovice", label: "Vršovice" },
] as const;

export function PropertyFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all" && value !== "") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page"); // reset pagination on filter change
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const params = new URLSearchParams(searchParams.toString());
      if (value.length >= 2) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const handleMissingData = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateParam("missing_data", e.target.checked ? "1" : "");
    },
    [updateParam]
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-[200px]"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid rgba(199,196,215,0.3)",
        }}
      >
        <Search size={14} style={{ color: "var(--color-text-muted)" }} strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Hledat adresu nebo název…"
          defaultValue={searchParams.get("search") ?? ""}
          onChange={handleSearch}
          className="flex-1 text-sm bg-transparent outline-none"
          style={{ color: "var(--color-text-primary)" }}
        />
      </div>

      {/* Status */}
      <select
        value={searchParams.get("status") ?? "all"}
        onChange={(e) => updateParam("status", e.target.value)}
        className="text-sm px-3 py-2 rounded-lg outline-none cursor-pointer"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid rgba(199,196,215,0.3)",
          color: "var(--color-text-primary)",
        }}
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Type */}
      <select
        value={searchParams.get("type") ?? "all"}
        onChange={(e) => updateParam("type", e.target.value)}
        className="text-sm px-3 py-2 rounded-lg outline-none cursor-pointer"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid rgba(199,196,215,0.3)",
          color: "var(--color-text-primary)",
        }}
      >
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* District */}
      <select
        value={searchParams.get("district") ?? "all"}
        onChange={(e) => updateParam("district", e.target.value)}
        className="text-sm px-3 py-2 rounded-lg outline-none cursor-pointer"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid rgba(199,196,215,0.3)",
          color: "var(--color-text-primary)",
        }}
      >
        {DISTRICT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Missing data checkbox */}
      <label
        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium"
        style={{
          backgroundColor: searchParams.get("missing_data")
            ? "rgba(70,72,212,0.08)"
            : "var(--color-bg-card)",
          border: `1px solid ${
            searchParams.get("missing_data")
              ? "rgba(70,72,212,0.25)"
              : "rgba(199,196,215,0.3)"
          }`,
          color: searchParams.get("missing_data") ? "var(--color-brand)" : "var(--color-text-secondary)",
        }}
      >
        <SlidersHorizontal size={13} strokeWidth={1.5} />
        <input
          type="checkbox"
          className="sr-only"
          checked={!!searchParams.get("missing_data")}
          onChange={handleMissingData}
        />
        Chybějící data
      </label>
    </div>
  );
}
