"use client";

import { Plus } from "lucide-react";
import { useUser } from "@/hooks/useUser";
import { NotificationPanel } from "@/components/layouts/NotificationPanel";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Dobré ráno";
  if (hour < 17) return "Dobré odpoledne";
  return "Dobrý večer";
}

export function Topbar() {
  const { profile } = useUser();
  const firstName = profile?.full_name?.split(" ")[0] ?? "Pepa";

  return (
    <header
      className="sticky top-0 z-40 w-full border-b backdrop-blur-md"
      style={{
        backgroundColor: "var(--color-topbar-bg)",
        borderColor: "rgba(199,196,215,0.2)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 lg:px-8">
        <div className="min-w-0">
          <h1
            className="text-xl sm:text-2xl font-bold tracking-tight truncate"
            style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
          >
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-xs sm:text-sm font-medium mt-0.5 line-clamp-2" style={{ color: "var(--color-text-muted)" }}>
            Přehled vašeho pražského portfolia
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <NotificationPanel />

          <div
            className="h-8 w-px"
            style={{ backgroundColor: "rgba(199,196,215,0.3)" }}
          />

          {/* New Analysis CTA */}
          <button
            type="button"
            className="flex cursor-pointer items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition-all whitespace-nowrap"
            style={{
              backgroundColor: "rgba(70,72,212,0.08)",
              color: "var(--color-brand)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(70,72,212,0.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(70,72,212,0.08)";
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Nová analýza
          </button>
        </div>
      </div>
    </header>
  );
}
