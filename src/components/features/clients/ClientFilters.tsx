"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search } from "lucide-react";

const SOURCE_OPTIONS = [
  { value: "all", label: "Všechny zdroje" },
  { value: "referral", label: "Doporučení" },
  { value: "sreality", label: "Sreality" },
  { value: "bezrealitky", label: "Bezrealitky" },
  { value: "reality_cz", label: "Reality.cz" },
  { value: "direct", label: "Přímý kontakt" },
  { value: "social", label: "Sociální sítě" },
  { value: "event", label: "Akce" },
  { value: "other", label: "Jiné" },
] as const;

export function ClientFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
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

  return (
    <div className="flex flex-wrap items-center gap-3">
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
          placeholder="Hledat jméno, e-mail nebo telefon…"
          defaultValue={searchParams.get("search") ?? ""}
          onChange={handleSearch}
          className="flex-1 text-sm bg-transparent outline-none"
          style={{ color: "var(--color-text-primary)" }}
        />
      </div>

      <select
        value={searchParams.get("source") ?? "all"}
        onChange={(e) => updateParam("source", e.target.value)}
        className="text-sm px-3 py-2 rounded-lg outline-none cursor-pointer"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid rgba(199,196,215,0.3)",
          color: "var(--color-text-primary)",
        }}
      >
        {SOURCE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
