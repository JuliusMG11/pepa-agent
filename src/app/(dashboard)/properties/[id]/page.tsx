import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MessageSquare, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { Topbar } from "@/components/layouts/Topbar";
import { PropertyDetailTabs } from "@/components/features/properties/PropertyDetailTabs";
import { createClient } from "@/lib/supabase/server";
import {
  getPropertyById,
  getPropertyLeads,
  getPropertyActivities,
  getAgents,
  dataQuality,
} from "@/lib/data/properties";
import { getClientSelectOptions } from "@/lib/data/clients";
import { PropertyDetailActions } from "@/components/features/properties/PropertyDetailActions";
import { Building2, ExternalLink, Images } from "lucide-react";

export const metadata: Metadata = { title: "Detail nemovitosti" };

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

const STATUS_STYLES: Record<string, { backgroundColor: string; color: string }> = {
  active: { backgroundColor: "#dcfce7", color: "#166534" },
  pending: { backgroundColor: "#fef3c7", color: "#92400e" },
  sold: { backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" },
  withdrawn: { backgroundColor: "#fee2e2", color: "#991b1b" },
};

const QUALITY_ICON = {
  green: CheckCircle2,
  amber: AlertCircle,
  red: AlertTriangle,
};

const QUALITY_COLOR = {
  green: "#166534",
  amber: "#92400e",
  red: "#991b1b",
};

const QUALITY_BG = {
  green: "#dcfce7",
  amber: "#fef3c7",
  red: "#fee2e2",
};

interface PropertyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [property, leads, activities, agents, clientOptions] = await Promise.all([
    getPropertyById(supabase, id),
    getPropertyLeads(supabase, id),
    getPropertyActivities(supabase, id),
    getAgents(supabase),
    user ? getClientSelectOptions(supabase, user.id) : Promise.resolve([]),
  ]);

  if (!property) notFound();

  const { missing, level } = dataQuality(property);
  const QualityIcon = QUALITY_ICON[level];

  const askPepaUrl = `/chat?q=${encodeURIComponent(
    `Řekni mi vše o nemovitosti ${property.title} na ${property.address}.`
  )}`;

  return (
    <>
      <Topbar />
      <section className="px-4 sm:px-6 lg:px-8 pb-12 max-w-[1280px] mx-auto w-full space-y-6 mt-2">

        {/* Breadcrumb */}
        <Link
          href="/properties"
          className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--color-text-muted)" }}
        >
          <ChevronLeft size={13} strokeWidth={2} />
          Nemovitosti
        </Link>

        {/* Hero + galerie */}
        <div
          className="relative w-full min-h-[220px] md:min-h-[260px] rounded-2xl overflow-hidden flex flex-col justify-end"
          style={{
            border: "1px solid rgba(199,196,215,0.15)",
          }}
        >
          {property.cover_image_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={property.cover_image_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute inset-0 z-[1]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(20,18,24,0.2) 0%, rgba(20,18,24,0.72) 100%)",
                }}
              />
            </>
          ) : (
            <>
              <div
                className="absolute inset-0 z-[1]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(70,72,212,0.12) 0%, rgba(246,242,250,0.9) 45%, rgba(255,255,255,0.95) 100%)",
                }}
              />
              <div
                className="absolute inset-0 z-[1] opacity-[0.07] pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 20%, #4648d4 0, transparent 40%), radial-gradient(circle at 80% 60%, #a78bfa 0, transparent 35%)",
                }}
              />
            </>
          )}
          <div className="relative z-[2] p-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: property.cover_image_url
                    ? "rgba(255,255,255,0.92)"
                    : "rgba(70,72,212,0.15)",
                  color: "var(--color-brand)",
                  boxShadow: property.cover_image_url ? "0 4px 20px rgba(0,0,0,0.12)" : undefined,
                }}
              >
                <Building2 size={32} strokeWidth={1.25} />
              </div>
              <div>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mb-1"
                  style={{ color: property.cover_image_url ? "rgba(255,255,255,0.85)" : "var(--color-text-muted)" }}
                >
                  Nemovitost v evidenci
                </p>
                <h2
                  className="text-lg font-bold"
                  style={{ color: property.cover_image_url ? "#fff" : "var(--color-text-primary)" }}
                >
                  {property.title}
                </h2>
                <p
                  className="text-sm mt-1"
                  style={{ color: property.cover_image_url ? "rgba(255,255,255,0.88)" : "var(--color-text-muted)" }}
                >
                  {property.address}, {property.city}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {property.source_url && (
                <a
                  href={property.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-opacity hover:opacity-85"
                  style={{
                    backgroundColor: property.cover_image_url ? "rgba(255,255,255,0.95)" : "var(--color-bg-card)",
                    border: "1px solid rgba(199,196,215,0.25)",
                    color: "var(--color-brand)",
                  }}
                >
                  <ExternalLink size={14} strokeWidth={1.5} />
                  Otevřít inzerát
                </a>
              )}
              {!property.cover_image_url && !property.gallery_urls?.length && (
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl"
                  style={{ backgroundColor: "rgba(70,72,212,0.08)", color: "var(--color-text-secondary)" }}
                >
                  <Images size={14} strokeWidth={1.5} />
                  Přidejte náhled a galerii v úpravě nemovitosti
                </div>
              )}
            </div>
          </div>
        </div>

        {property.gallery_urls && property.gallery_urls.length > 0 && (
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: "var(--color-bg-card)",
              border: "1px solid rgba(199,196,215,0.12)",
              boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>
              Galerie
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {property.gallery_urls.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[rgba(199,196,215,0.2)] group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Header card */}
        <div
          className="p-6 rounded-2xl"
          style={{
            backgroundColor: "var(--color-bg-card)",
            boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
            border: "1px solid rgba(199,196,215,0.12)",
          }}
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <span
                  className="px-2.5 py-1 text-[10px] font-bold rounded-full"
                  style={STATUS_STYLES[property.status] ?? STATUS_STYLES.withdrawn}
                >
                  {STATUS_LABELS[property.status] ?? property.status}
                </span>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {TYPE_LABELS[property.type] ?? property.type}
                </span>
                {property.district && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    · {property.district}
                  </span>
                )}
              </div>
              <h1
                className="text-xl font-bold leading-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                {property.title}
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                {property.address}, {property.city}
              </p>
              <p
                className="text-2xl font-bold mt-3"
                style={{ color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}
              >
                {property.price.toLocaleString("cs-CZ")} Kč
              </p>
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
              <PropertyDetailActions property={property} agents={agents} clients={clientOptions} />
            </div>
          </div>

          {/* Data quality card */}
          <div
            className="mt-5 p-4 rounded-xl flex items-start gap-3"
            style={{ backgroundColor: QUALITY_BG[level] }}
          >
            <QualityIcon
              size={16}
              strokeWidth={1.5}
              style={{ color: QUALITY_COLOR[level], marginTop: 1, flexShrink: 0 }}
            />
            <div className="flex-1">
              <p className="text-xs font-bold" style={{ color: QUALITY_COLOR[level] }}>
                {level === "green"
                  ? "Všechna klíčová pole jsou vyplněna"
                  : level === "amber"
                  ? `${missing.length} pole${missing.length === 1 ? " chybí" : "a chybí"}`
                  : `${missing.length} polí chybí — vyžaduje doplnění`}
              </p>
              {missing.length > 0 && (
                <p className="text-[11px] mt-1" style={{ color: QUALITY_COLOR[level] }}>
                  Chybí: {missing.join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="p-6 rounded-2xl"
          style={{
            backgroundColor: "var(--color-bg-card)",
            boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
            border: "1px solid rgba(199,196,215,0.12)",
          }}
        >
          <PropertyDetailTabs
            property={property}
            leads={leads}
            activities={activities}
          />
        </div>
      </section>
    </>
  );
}
