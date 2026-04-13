"use client";

import Link from "next/link";
import { AlertTriangle, ExternalLink } from "lucide-react";
import type { GapProperty } from "@/lib/claude/tools/find-data-gaps";

interface DataGapTableProps {
  gaps: GapProperty[];
}

const FIELD_LABELS: Record<string, string> = {
  reconstruction_notes: "Rekonstrukce",
  permit_data: "Stavební povolení",
  area_m2: "Plocha",
  floor: "Patro",
};

export function DataGapTable({ gaps }: DataGapTableProps) {
  if (gaps.length === 0) {
    return (
      <div
        className="mt-3 rounded-xl p-6 text-center"
        style={{
          backgroundColor: "#dcfce7",
          border: "1px solid rgba(22,101,52,0.15)",
        }}
      >
        <p className="text-sm font-semibold" style={{ color: "#166534" }}>
          Všechny nemovitosti mají kompletní data.
        </p>
      </div>
    );
  }

  return (
    <div
      className="mt-3 rounded-xl overflow-hidden"
      style={{
        border: "1px solid rgba(199,196,215,0.3)",
        boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ backgroundColor: "#fef3c7" }}
      >
        <AlertTriangle size={14} style={{ color: "#92400e" }} strokeWidth={1.5} />
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "#92400e" }}
        >
          {gaps.length} nemovitostí s chybějícími daty
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(199,196,215,0.3)" }}>
              <th
                className="text-left px-4 py-2.5 font-bold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)", backgroundColor: "#fafafa" }}
              >
                Nemovitost
              </th>
              <th
                className="text-left px-4 py-2.5 font-bold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)", backgroundColor: "#fafafa" }}
              >
                Chybí
              </th>
              <th
                className="text-right px-4 py-2.5 font-bold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)", backgroundColor: "#fafafa" }}
              >
                Akce
              </th>
            </tr>
          </thead>
          <tbody>
            {gaps.map((gap) => (
              <tr
                key={gap.id}
                style={{ borderBottom: "1px solid rgba(199,196,215,0.15)" }}
              >
                <td className="px-4 py-3">
                  <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {gap.title}
                  </p>
                  <p style={{ color: "var(--color-text-muted)" }}>{gap.address}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {gap.missing_fields.map((field) => (
                      <span
                        key={field}
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: "#fef3c7",
                          color: "#92400e",
                        }}
                      >
                        {FIELD_LABELS[field] ?? field}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/properties/${gap.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-70"
                    style={{ color: "var(--color-brand)" }}
                  >
                    Upravit
                    <ExternalLink size={11} strokeWidth={1.5} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
