import Link from "next/link";
import { Plus, Building2, Radio } from "lucide-react";

interface QuickActionsProps {
  upcomingEvents?: Array<{
    title: string;
    date: string;
    time: string;
  }>;
}

const ACTIONS = [
  {
    label: "Nový lead",
    icon: Plus,
    href: "/leads?new=1",
    color: "var(--color-brand)",
    bg: "rgba(70,72,212,0.08)",
  },
  {
    label: "Nová nemovitost",
    icon: Building2,
    href: "/properties?new=1",
    color: "#904900",
    bg: "rgba(144,73,0,0.08)",
  },
  {
    label: "Spustit monitoring",
    icon: Radio,
    href: "/monitoring",
    color: "#166534",
    bg: "rgba(22,101,52,0.08)",
  },
];

export function QuickActions({ upcomingEvents = [] }: QuickActionsProps) {
  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {ACTIONS.map(({ label, icon: Icon, href, color, bg }) => (
          <Link
            key={label}
            href={href}
            className="flex flex-col items-center gap-2 py-4 rounded-xl transition-all hover:opacity-80"
            style={{ backgroundColor: bg }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${color}18` }}
            >
              <Icon size={17} style={{ color }} strokeWidth={1.5} />
            </div>
            <span
              className="text-[11px] font-bold text-center leading-tight"
              style={{ color }}
            >
              {label}
            </span>
          </Link>
        ))}
      </div>

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <div className="space-y-2">
          <p
            className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: "var(--color-text-muted)" }}
          >
            Nadcházející události
          </p>
          {upcomingEvents.map((event, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ backgroundColor: "rgba(70,72,212,0.04)" }}
            >
              <div
                className="text-center shrink-0 w-10"
              >
                <p className="text-[10px] font-bold uppercase" style={{ color: "var(--color-text-muted)" }}>
                  {event.date.split(" ")[0]}
                </p>
                <p className="text-lg font-black leading-tight" style={{ color: "var(--color-brand)" }}>
                  {event.date.split(" ")[1] ?? ""}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                  {event.title}
                </p>
                <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                  {event.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
