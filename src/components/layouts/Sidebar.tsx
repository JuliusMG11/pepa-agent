"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Building2,
  Users,
  TrendingUp,
  FileText,
  Bell,
  Settings,
  LogOut,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Ask Pepa", icon: MessageSquare, href: "/chat" },
  { label: "Nemovitosti", icon: Building2, href: "/properties" },
  { label: "Klienti", icon: Users, href: "/clients" },
  { label: "Leady", icon: TrendingUp, href: "/leads" },
  { label: "Reporty", icon: FileText, href: "/reports" },
  { label: "Monitoring", icon: Bell, href: "/monitoring" },
  { label: "Nastavení", icon: Settings, href: "/settings" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useUser();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <aside
      className="w-[72px] lg:w-[220px] shrink-0 flex flex-col h-screen sticky top-0 z-40 p-3 lg:p-6 transition-[width] duration-200 ease-out"
      style={{ backgroundColor: "var(--color-bg-sidebar)" }}
    >
      {/* Logo */}
      <div
        className="mb-8 lg:mb-10 flex items-center justify-center lg:justify-start gap-2 min-h-[28px]"
        aria-label="Pepa AI"
      >
        <span
          className="text-xl font-black tracking-tighter hidden lg:inline"
          style={{ color: "var(--color-brand)" }}
        >
          Pepa AI
        </span>
        <span className="text-lg font-black tracking-tighter lg:hidden" style={{ color: "var(--color-brand)" }}>
          P
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={label}
              title={label}
              className={[
                "group relative flex items-center gap-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out",
                "max-lg:justify-center lg:px-3 px-2",
                active
                  ? "lg:border-r-4 lg:border-r-[var(--color-brand)] lg:rounded-l-lg rounded-lg bg-[rgba(70,72,212,0.06)] text-[var(--color-brand)]"
                  : "rounded-lg hover:bg-slate-200/50 text-[#6b7280]",
              ].join(" ")}
            >
              <Icon size={18} strokeWidth={1.5} className="shrink-0" />
              <span className="hidden lg:inline truncate">{label}</span>
              <span
                className="pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 lg:hidden"
                style={{ backgroundColor: "var(--color-text-primary)" }}
                role="tooltip"
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Pro plan upsell */}
      <div className="mt-auto space-y-4">
        <div
          className="hidden lg:block rounded-xl p-4"
          style={{
            backgroundColor: "rgba(70,72,212,0.08)",
            border: "1px solid rgba(70,72,212,0.18)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={11} style={{ color: "var(--color-brand)" }} />
            <p className="text-[10px] font-black" style={{ color: "var(--color-brand)" }}>
              PRO PLAN
            </p>
          </div>
          <p
            className="text-[10px] leading-tight mb-3"
            style={{ color: "var(--color-text-muted)" }}
          >
            Pokročilé AI nástroje a prediktivní analytika nemovitostí.
          </p>
          <button
            className="w-full text-white text-[11px] font-bold py-2 rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: "var(--color-brand)" }}
          >
            Upgradovat
          </button>
        </div>

        {/* User row */}
        <div
          className="flex flex-col lg:flex-row items-center lg:items-center gap-2 lg:gap-3 pt-4"
          style={{ borderTop: "1px solid rgba(199,196,215,0.3)" }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
            style={{
              backgroundColor: "rgba(70,72,212,0.1)",
              color: "var(--color-brand)",
            }}
          >
            {initials}
          </div>
          <div className="hidden lg:block flex-1 min-w-0">
            <p
              className="text-xs font-bold truncate"
              style={{ color: "var(--color-text-primary)" }}
            >
              {profile?.full_name ?? "…"}
            </p>
            <p className="text-[10px] truncate" style={{ color: "var(--color-text-muted)" }}>
              {profile?.role === "admin" ? "Premium Tier" : "Agent"}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            title="Odhlásit se"
            aria-label="Odhlásit se"
            className="transition-colors max-lg:mt-1"
            style={{ color: "#9ca3af" }}
          >
            <LogOut size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </aside>
  );
}
