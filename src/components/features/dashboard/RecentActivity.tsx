import { Phone, Mail, Eye, FileText, PenLine, CheckSquare, MessageSquare } from "lucide-react";
import type { ActivityRow } from "@/lib/data/dashboard";

interface RecentActivityProps {
  activities: ActivityRow[];
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  viewing: Eye,
  offer: FileText,
  contract: PenLine,
  task: CheckSquare,
  note: MessageSquare,
};

const ACTIVITY_LABELS: Record<string, string> = {
  call: "Hovor",
  email: "E-mail",
  viewing: "Prohlídka",
  offer: "Nabídka",
  contract: "Smlouva",
  task: "Úkol",
  note: "Poznámka",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `Před ${mins} min.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Před ${hrs} hod.`;
  const days = Math.floor(hrs / 24);
  return `Před ${days} dny`;
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>
        Žádné nedávné aktivity.
      </p>
    );
  }

  return (
    <ul className="space-y-0">
      {activities.map((act, i) => {
        const Icon = ACTIVITY_ICONS[act.activity_type] ?? MessageSquare;
        const label = ACTIVITY_LABELS[act.activity_type] ?? act.activity_type;
        const isLast = i === activities.length - 1;

        return (
          <li
            key={act.id}
            className="flex items-start gap-3 py-3"
            style={
              !isLast
                ? { borderBottom: "1px solid rgba(199,196,215,0.2)" }
                : {}
            }
          >
            {/* Icon */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: "rgba(70,72,212,0.08)" }}
            >
              <Icon size={13} style={{ color: "var(--color-brand)" }} strokeWidth={1.5} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {label}
                {act.description && (
                  <span
                    className="font-normal ml-1"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    — {act.description.slice(0, 60)}{act.description.length > 60 ? "…" : ""}
                  </span>
                )}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {timeAgo(act.created_at)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
