"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import type { NewListingsBanner as BannerData } from "@/lib/data/dashboard";

interface NewListingsBannerProps {
  data: BannerData;
}

export function NewListingsBanner({ data }: NewListingsBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const districtsText = data.districts.join(", ");

  return (
    <div
      className="flex items-center gap-3 px-5 py-3 rounded-xl"
      style={{
        backgroundColor: "rgba(70,72,212,0.06)",
        border: "1px solid rgba(70,72,212,0.15)",
      }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: "rgba(70,72,212,0.10)" }}
      >
        <Sparkles size={14} style={{ color: "var(--color-brand)" }} strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium flex-1" style={{ color: "var(--color-text-primary)" }}>
        <span className="font-bold" style={{ color: "var(--color-brand)" }}>
          Dnes ráno:{" "}
        </span>
        {data.count} nových nabídek v oblasti{" "}
        <span className="font-semibold">{districtsText}</span>
      </p>
      <Link
        href="/monitoring"
        className="text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 shrink-0"
        style={{ backgroundColor: "var(--color-brand)", color: "var(--color-on-brand)" }}
      >
        Zobrazit
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="w-6 h-6 flex items-center justify-center rounded-full transition-colors shrink-0 hover:opacity-70"
        style={{ color: "var(--color-text-muted)" }}
        aria-label="Zavřít"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
