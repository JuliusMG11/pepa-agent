import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Phone, Mail, MessageSquare } from "lucide-react";
import { Topbar } from "@/components/layouts/Topbar";
import { ClientNotesEditor } from "@/components/features/clients/ClientNotesEditor";
import { ClientDetailActions } from "@/components/features/clients/ClientDetailActions";
import { createClient } from "@/lib/supabase/server";
import {
  getClientById,
  getClientLeads,
  getClientActivities,
  type ClientLead,
  type ClientActivity,
} from "@/lib/data/clients";
import { getAgentPropertiesForClientLinking } from "@/lib/data/properties";
import { ClientLinkedProperties } from "@/components/features/clients/ClientLinkedProperties";
import {
  CLIENT_SOURCE_LABELS as SOURCE_LABELS,
  CLIENT_SOURCE_STYLES as SOURCE_STYLES,
} from "@/lib/data/clients-display";

export const metadata: Metadata = { title: "Detail klienta" };

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Nový",
  contacted: "Kontaktován",
  viewing_scheduled: "Prohlídka",
  offer_made: "Nabídka",
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

const ACTIVITY_LABELS: Record<string, string> = {
  call: "Hovor",
  email: "E-mail",
  viewing: "Prohlídka",
  offer: "Nabídka",
  contract: "Smlouva",
  task: "Úkol",
  note: "Poznámka",
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `Před ${mins} min.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Před ${hrs} hod.`;
  const days = Math.floor(hrs / 24);
  return `Před ${days} dny`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function StatsCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="p-4 rounded-xl text-center"
      style={{
        backgroundColor: "var(--color-bg-subtle)",
        border: "1px solid rgba(199,196,215,0.2)",
      }}
    >
      <p className="text-2xl font-bold" style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
        {value}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </p>
    </div>
  );
}

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [client, leads, activities, propertyLinks] = await Promise.all([
    getClientById(supabase, id),
    getClientLeads(supabase, id),
    getClientActivities(supabase, id),
    user
      ? getAgentPropertiesForClientLinking(supabase, user.id, id)
      : Promise.resolve({ linked: [], unassigned: [] }),
  ]);

  if (!client) notFound();

  const totalLeads = leads.length;
  const closedWon = leads.filter((l) => l.status === "closed_won").length;
  const conversionRate =
    totalLeads > 0 ? Math.round((closedWon / totalLeads) * 100) : 0;
  const totalValue = leads
    .filter((l) => l.status === "closed_won" && l.property_price)
    .reduce((sum, l) => sum + (l.property_price ?? 0), 0);

  const src = client.source ?? "other";
  const srcStyle = SOURCE_STYLES[src] ?? SOURCE_STYLES.other;

  const askPepaUrl = `/chat?q=${encodeURIComponent(
    `Shrň mi vše o klientovi ${client.full_name}, jeho leadech a aktivitách v systému.`
  )}`;

  return (
    <>
      <Topbar />
      <section className="px-4 sm:px-6 lg:px-8 pb-12 max-w-[1280px] mx-auto w-full space-y-6 mt-2">

        {/* Breadcrumb */}
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ChevronLeft size={13} strokeWidth={2} />
          Klienti
        </Link>

        {/* Header */}
        <div
          className="p-6 rounded-2xl"
          style={{
            backgroundColor: "var(--color-bg-card)",
            boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
            border: "1px solid rgba(199,196,215,0.12)",
          }}
        >
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-lg font-bold"
              style={{ backgroundColor: "rgba(70,72,212,0.10)", color: "var(--color-brand)" }}
            >
              {initials(client.full_name)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                  {client.full_name}
                </h1>
                <span
                  className="px-2.5 py-1 text-[10px] font-bold rounded-full"
                  style={srcStyle}
                >
                  {SOURCE_LABELS[src] ?? src}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 mt-2">
                {client.email && (
                  <a
                    href={`mailto:${client.email}`}
                    className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Mail size={12} strokeWidth={1.5} />
                    {client.email}
                  </a>
                )}
                {client.phone && (
                  <a
                    href={`tel:${client.phone}`}
                    className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <Phone size={12} strokeWidth={1.5} />
                    {client.phone}
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0 items-end">
              <Link
                href={askPepaUrl}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg text-white transition-opacity hover:opacity-80"
                style={{ backgroundColor: "var(--color-brand)" }}
              >
                <MessageSquare size={13} strokeWidth={1.5} />
                Ask Pepa
              </Link>
              <ClientDetailActions client={client} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <StatsCard label="Celkem leadů" value={totalLeads} />
            <StatsCard label="Uzavřeno ✓" value={closedWon} />
            <StatsCard label="Konverze" value={`${conversionRate} %`} />
            <StatsCard
              label="Celková hodnota"
              value={
                totalValue > 0
                  ? `${(totalValue / 1_000_000).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} mil.`
                  : "—"
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Lead history */}
          <div
            className="col-span-12 lg:col-span-7 p-6 rounded-2xl"
            style={{
              backgroundColor: "var(--color-bg-card)",
              boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
              border: "1px solid rgba(199,196,215,0.12)",
            }}
          >
            <h2 className="font-bold text-sm mb-4" style={{ color: "var(--color-text-primary)" }}>
              Historie leadů
            </h2>
            {leads.length === 0 ? (
              <p className="text-sm py-6 text-center" style={{ color: "var(--color-text-muted)" }}>
                Žádné leady.
              </p>
            ) : (
              <ul className="space-y-0">
                {leads.map((lead: ClientLead, i) => {
                  const isLast = i === leads.length - 1;
                  const style = LEAD_STATUS_STYLES[lead.status] ?? LEAD_STATUS_STYLES.new;
                  return (
                    <li
                      key={lead.id}
                      className="py-3"
                      style={
                        !isLast
                          ? { borderBottom: "1px solid rgba(199,196,215,0.2)" }
                          : {}
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="px-2.5 py-1 text-[10px] font-bold rounded-full shrink-0"
                          style={style}
                        >
                          {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                        </span>
                        <div className="flex-1 min-w-0">
                          {lead.property_title && (
                            <p
                              className="text-xs font-semibold truncate"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {lead.property_title}
                            </p>
                          )}
                          {lead.property_address && (
                            <p className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                              {lead.property_address}
                            </p>
                          )}
                        </div>
                        <p className="text-[11px] shrink-0" style={{ color: "var(--color-text-muted)" }}>
                          {formatDate(lead.created_at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Right column: Activities + Notes */}
          <div className="col-span-12 lg:col-span-5 space-y-5">
            {/* Activity log */}
            <div
              className="p-5 rounded-2xl"
              style={{
                backgroundColor: "var(--color-bg-card)",
                boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
                border: "1px solid rgba(199,196,215,0.12)",
              }}
            >
              <h2 className="font-bold text-sm mb-4" style={{ color: "var(--color-text-primary)" }}>
                Aktivity
              </h2>
              {activities.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: "var(--color-text-muted)" }}>
                  Žádné aktivity.
                </p>
              ) : (
                <ul className="space-y-0">
                  {activities.map((act: ClientActivity, i) => {
                    const isLast = i === activities.length - 1;
                    return (
                      <li
                        key={act.id}
                        className="py-2.5"
                        style={
                          !isLast
                            ? { borderBottom: "1px solid rgba(199,196,215,0.15)" }
                            : {}
                        }
                      >
                        <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                          {ACTIVITY_LABELS[act.type] ?? act.type}
                          {act.title && (
                            <span className="font-normal ml-1" style={{ color: "var(--color-text-secondary)" }}>
                              — {act.title}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                          {timeAgo(act.created_at)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <ClientLinkedProperties
              clientId={client.id}
              linked={propertyLinks.linked}
              unassigned={propertyLinks.unassigned}
            />

            {/* Notes */}
            <div
              className="p-5 rounded-2xl"
              style={{
                backgroundColor: "var(--color-bg-card)",
                boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
                border: "1px solid rgba(199,196,215,0.12)",
              }}
            >
              <h2 className="font-bold text-sm mb-4" style={{ color: "var(--color-text-primary)" }}>
                Poznámky
              </h2>
              <ClientNotesEditor clientId={client.id} initialNotes={client.notes ?? ""} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
