"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Phone,
  Mail,
  Eye,
  FileText,
  PenLine,
  CheckSquare,
  MessageSquare,
} from "lucide-react";
import type {
  PropertySummary,
  PropertyLead,
  PropertyActivity,
} from "@/lib/data/properties";
import { PropertyDocumentsSection } from "@/components/features/properties/PropertyDocumentsSection";

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Nový",
  contacted: "Kontaktován",
  viewing_scheduled: "Prohlídka naplánována",
  offer_made: "Nabídka podána",
  closed_won: "Uzavřen ✓",
  closed_lost: "Uzavřen ✗",
};

const LEAD_STATUS_STYLES: Record<string, { backgroundColor: string; color: string }> = {
  new: { backgroundColor: "rgba(70,72,212,0.08)", color: "var(--color-brand)" },
  contacted: { backgroundColor: "#fef3c7", color: "#92400e" },
  viewing_scheduled: { backgroundColor: "#e0f2fe", color: "#0369a1" },
  offer_made: { backgroundColor: "#f3e8ff", color: "#7e22ce" },
  closed_won: { backgroundColor: "#dcfce7", color: "#166534" },
  closed_lost: { backgroundColor: "#fee2e2", color: "#991b1b" },
};

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

const TYPE_LABELS: Record<string, string> = {
  byt: "Byt",
  dum: "Dům",
  komercni: "Komerční",
  pozemek: "Pozemek",
  garaze: "Garáž",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktivní",
  pending: "Čeká",
  sold: "Prodáno",
  withdrawn: "Staženo",
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface OverviewTabProps {
  property: PropertySummary;
}

function OverviewTab({ property }: OverviewTabProps) {
  const fields: Array<{ label: string; value: string | null | number }> = [
    { label: "Adresa", value: `${property.address}, ${property.city}` },
    { label: "Čtvrť", value: property.district },
    {
      label: "Typ",
      value: TYPE_LABELS[property.type] ?? property.type,
    },
    {
      label: "Status",
      value: STATUS_LABELS[property.status] ?? property.status,
    },
    {
      label: "Cena",
      value:
        property.price != null
          ? property.price.toLocaleString("cs-CZ") + " Kč"
          : null,
    },
    {
      label: "Plocha",
      value: property.area_m2 != null ? `${property.area_m2} m²` : null,
    },
    {
      label: "Patro",
      value:
        property.floor != null && property.total_floors != null
          ? `${property.floor}/${property.total_floors}`
          : property.floor != null
          ? String(property.floor)
          : null,
    },
    { label: "Rok výstavby", value: property.year_built },
    { label: "Poslední renovace", value: property.last_renovation },
    { label: "Agent", value: property.agent_name },
    {
      label: "Propojený klient",
      value: property.client_id
        ? property.client_name?.trim() || "Klient (bez jména v evidenci)"
        : null,
    },
    { label: "Vytvořeno", value: formatDate(property.created_at) },
    { label: "Aktualizováno", value: formatDate(property.updated_at) },
  ];

  const longFields: Array<{ label: string; value: string | null }> = [
    { label: "Poznámky k rekonstrukci", value: property.reconstruction_notes },
    { label: "Stavební povolení", value: property.permit_data },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              {label}
            </p>
            {label === "Propojený klient" && property.client_id ? (
              <Link
                href={`/clients/${property.client_id}`}
                className="text-sm font-medium inline-flex rounded-md hover:underline underline-offset-2"
                style={{ color: "var(--color-brand)" }}
              >
                {value != null && String(value).trim() !== ""
                  ? String(value)
                  : "Otevřít profil klienta"}
              </Link>
            ) : (
              <p
                className="text-sm font-medium"
                style={{ color: value != null ? "var(--color-text-primary)" : "#c7c4d7" }}
              >
                {value != null ? String(value) : "Nevyplněno"}
              </p>
            )}
          </div>
        ))}
      </div>
      {longFields.map(({ label, value }) => (
        <div key={label}>
          <p
            className="text-[10px] font-bold uppercase tracking-wider mb-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            {label}
          </p>
          <p
            className="text-sm leading-relaxed"
            style={{ color: value ? "var(--color-text-primary)" : "#c7c4d7" }}
          >
            {value ?? "Nevyplněno"}
          </p>
        </div>
      ))}
    </div>
  );
}

interface LeadsTabProps {
  leads: PropertyLead[];
}

function LeadsTab({ leads }: LeadsTabProps) {
  if (leads.length === 0) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
        Žádné leady pro tuto nemovitost.
      </p>
    );
  }

  return (
    <ul className="space-y-0">
      {leads.map((lead, i) => {
        const isLast = i === leads.length - 1;
        const statusStyle =
          LEAD_STATUS_STYLES[lead.status] ?? LEAD_STATUS_STYLES.new;

        return (
          <li
            key={lead.id}
            className="flex items-center gap-4 py-3"
            style={
              !isLast ? { borderBottom: "1px solid rgba(199,196,215,0.2)" } : {}
            }
          >
            <span
              className="px-2.5 py-1 text-[10px] font-bold rounded-full shrink-0"
              style={statusStyle}
            >
              {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                Zdroj: {lead.source ?? "—"} · Vytvořen: {formatDate(lead.created_at)}
              </p>
            </div>
            {lead.closed_at && (
              <p className="text-[11px] shrink-0" style={{ color: "var(--color-text-muted)" }}>
                Uzavřen: {formatDate(lead.closed_at)}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface ActivitiesTabProps {
  activities: PropertyActivity[];
}

function ActivitiesTab({ activities }: ActivitiesTabProps) {
  if (activities.length === 0) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: "var(--color-text-muted)" }}>
        Žádné aktivity pro tuto nemovitost.
      </p>
    );
  }

  return (
    <ul className="space-y-0">
      {activities.map((act, i) => {
        const Icon = ACTIVITY_ICONS[act.type] ?? MessageSquare;
        const isLast = i === activities.length - 1;

        return (
          <li
            key={act.id}
            className="flex items-start gap-3 py-3"
            style={
              !isLast ? { borderBottom: "1px solid rgba(199,196,215,0.2)" } : {}
            }
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: "rgba(70,72,212,0.08)" }}
            >
              <Icon size={13} style={{ color: "var(--color-brand)" }} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {ACTIVITY_LABELS[act.type] ?? act.type}
                {act.title && (
                  <span className="font-normal ml-1" style={{ color: "var(--color-text-secondary)" }}>
                    — {act.title}
                  </span>
                )}
              </p>
              {act.description && (
                <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  {act.description.slice(0, 100)}
                  {act.description.length > 100 ? "…" : ""}
                </p>
              )}
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

const TABS = [
  { id: "overview", label: "Přehled" },
  { id: "leads", label: "Leady" },
  { id: "activities", label: "Aktivity" },
  { id: "documents", label: "Dokumenty" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface PropertyDetailTabsProps {
  property: PropertySummary;
  leads: PropertyLead[];
  activities: PropertyActivity[];
}

export function PropertyDetailTabs({
  property,
  leads,
  activities,
}: PropertyDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div>
      {/* Tab bar */}
      <div
        className="flex gap-0 border-b"
        style={{ borderColor: "rgba(199,196,215,0.2)" }}
      >
        {TABS.map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-5 py-3 text-sm font-semibold transition-colors relative cursor-pointer"
            style={{
              color: activeTab === tab.id ? "var(--color-brand)" : "var(--color-text-muted)",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid var(--color-brand)"
                  : "2px solid transparent",
            }}
          >
            {tab.label}
            {tab.id === "leads" && leads.length > 0 && (
              <span
                className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full"
                style={{ backgroundColor: "rgba(70,72,212,0.10)", color: "var(--color-brand)" }}
              >
                {leads.length}
              </span>
            )}
            {tab.id === "activities" && activities.length > 0 && (
              <span
                className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full"
                style={{ backgroundColor: "rgba(70,72,212,0.10)", color: "var(--color-brand)" }}
              >
                {activities.length}
              </span>
            )}
            {tab.id === "documents" &&
              property.document_urls &&
              property.document_urls.length > 0 && (
                <span
                  className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full"
                  style={{ backgroundColor: "rgba(70,72,212,0.10)", color: "var(--color-brand)" }}
                >
                  {property.document_urls.length}
                </span>
              )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-6">
        {activeTab === "overview" && <OverviewTab property={property} />}
        {activeTab === "leads" && <LeadsTab leads={leads} />}
        {activeTab === "activities" && <ActivitiesTab activities={activities} />}
        {activeTab === "documents" && (
          <PropertyDocumentsSection
            propertyId={property.id}
            initialUrls={property.document_urls ?? []}
          />
        )}
      </div>
    </div>
  );
}
