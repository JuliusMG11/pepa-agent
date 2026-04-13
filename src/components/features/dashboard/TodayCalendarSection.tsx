"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ExternalLink,
  User,
  Building2,
  Mail,
  Phone,
  X,
} from "lucide-react";
import type { PipelineCalendarEvent } from "@/lib/data/calendar-pipeline";

interface TodayCalendarSectionProps {
  connected: boolean;
  message?: string;
  events: PipelineCalendarEvent[];
}

export function TodayCalendarSection({
  connected,
  message,
  events,
}: TodayCalendarSectionProps) {
  const [detail, setDetail] = useState<PipelineCalendarEvent | null>(null);

  return (
    <>
      <div
        className="p-6 rounded-xl"
        style={{
          backgroundColor: "var(--color-bg-card)",
          boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
          border: "1px solid rgba(199,196,215,0.12)",
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3
              className="font-bold text-sm flex items-center gap-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              <Calendar size={16} style={{ color: "var(--color-brand)" }} strokeWidth={2} />
              Dnešní schůzky (Google Kalendář)
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Události napárované s klienty a nemovitostmi podle názvu v kalendáři
            </p>
          </div>
        </div>

        {!connected && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: "rgba(70,72,212,0.06)", color: "var(--color-text-secondary)" }}
          >
            <p className="font-medium">{message ?? "Kalendář není propojený."}</p>
            <Link
              href="/settings"
              className="inline-block mt-2 text-xs font-bold underline"
              style={{ color: "var(--color-brand)" }}
            >
              Propojit Google účet v Nastavení
            </Link>
          </div>
        )}

        {connected && events.length === 0 && (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Dnes nemáte v kalendáři žádné naplánované události.
          </p>
        )}

        {connected && events.length > 0 && (
          <ul className="space-y-3">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
                style={{
                  border: "1px solid rgba(199,196,215,0.2)",
                  backgroundColor: "rgba(246,242,250,0.4)",
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold tabular-nums mb-1" style={{ color: "var(--color-brand)" }}>
                    {formatRange(ev.start, ev.end)}
                  </p>
                  <p className="text-sm font-semibold wrap-break-word" style={{ color: "var(--color-text-primary)" }}>
                    {ev.summary}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ev.matchedClientId && (
                      <Link
                        href={`/clients/${ev.matchedClientId}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                        style={{ backgroundColor: "rgba(70,72,212,0.1)", color: "var(--color-brand)" }}
                      >
                        <User size={11} />
                        {ev.matchedClientName}
                      </Link>
                    )}
                    {ev.matchedPropertyId && (
                      <Link
                        href={`/properties/${ev.matchedPropertyId}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                        style={{ backgroundColor: "#e0f2fe", color: "#0369a1" }}
                      >
                        <Building2 size={11} />
                        {ev.matchedPropertyTitle}
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {(ev.matchedClientId || ev.matchedPropertyId || ev.htmlLink) && (
                    <button
                      type="button"
                      onClick={() => setDetail(ev)}
                      className="text-[11px] font-bold px-3 py-2 rounded-lg"
                      style={{ backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" }}
                    >
                      Rychlý náhled
                    </button>
                  )}
                  {ev.htmlLink && (
                    <a
                      href={ev.htmlLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-3 py-2 rounded-lg"
                      style={{ backgroundColor: "var(--color-brand)", color: "#fff" }}
                    >
                      Google
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 md:items-center md:p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={() => setDetail(null)}
        >
          <div
            className="relative max-h-[min(100dvh,100%)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl p-6 md:max-h-[min(90dvh,720px)] md:rounded-2xl"
            style={{ backgroundColor: "var(--color-bg-card)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 p-1 rounded-full hover:opacity-70"
              style={{ color: "var(--color-text-muted)" }}
              onClick={() => setDetail(null)}
              aria-label="Zavřít"
            >
              <X size={18} />
            </button>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>
              Událost
            </p>
            <p className="text-sm font-bold mb-4" style={{ color: "var(--color-text-primary)" }}>
              {detail.summary}
            </p>

            {detail.matchedClientId && (
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
                  Klient
                </p>
                <p className="text-sm font-semibold">{detail.matchedClientName}</p>
                {detail.matchedClientEmail && (
                  <a
                    href={`mailto:${detail.matchedClientEmail}`}
                    className="flex items-center gap-2 text-xs mt-1"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <Mail size={12} />
                    {detail.matchedClientEmail}
                  </a>
                )}
                {detail.matchedClientPhone && (
                  <a
                    href={`tel:${detail.matchedClientPhone}`}
                    className="flex items-center gap-2 text-xs mt-1"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <Phone size={12} />
                    {detail.matchedClientPhone}
                  </a>
                )}
                <Link
                  href={`/clients/${detail.matchedClientId}`}
                  className="inline-block mt-2 text-xs font-bold"
                  style={{ color: "var(--color-brand)" }}
                >
                  Otevřít profil klienta →
                </Link>
              </div>
            )}

            {detail.matchedPropertyId && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
                  Nemovitost
                </p>
                <p className="text-sm font-semibold">{detail.matchedPropertyTitle}</p>
                <Link
                  href={`/properties/${detail.matchedPropertyId}`}
                  className="inline-block mt-2 text-xs font-bold"
                  style={{ color: "var(--color-brand)" }}
                >
                  Detail nemovitosti →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function formatRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  const d = s.toLocaleDateString("cs-CZ", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });
  const t1 = s.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  const t2 = e.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  return `${d} · ${t1}–${t2}`;
}
