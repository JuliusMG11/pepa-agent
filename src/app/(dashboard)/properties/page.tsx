import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, Database, Building2 } from "lucide-react";
import { Topbar } from "@/components/layouts/Topbar";
import { PropertyFilters } from "@/components/features/properties/PropertyFilters";
import { PropertyListActions } from "@/components/features/properties/PropertyListActions";
import { PropertiesTablePanel } from "@/components/features/properties/PropertiesTablePanel";
import { CsvImportToolbarButton } from "@/components/features/data-import/CsvImportToolbarButton";
import { createClient } from "@/lib/supabase/server";
import {
  getProperties,
  getAgents,
  type PropertyStatus,
  type PropertyType,
} from "@/lib/data/properties";
import { getClientSelectOptions } from "@/lib/data/clients";

export const metadata: Metadata = { title: "Nemovitosti" };

interface PropertiesPageProps {
  searchParams: Promise<{
    status?: string;
    type?: string;
    district?: string;
    search?: string;
    missing_data?: string;
  }>;
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const params = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const status = ((params.status as PropertyStatus) || "all") as PropertyStatus | "all";
  const type = ((params.type as PropertyType) || "all") as PropertyType | "all";
  const hasFilters =
    status !== "all" ||
    type !== "all" ||
    Boolean(params.district && params.district !== "all") ||
    Boolean(params.search?.trim()) ||
    params.missing_data === "1";

  const [{ data: properties, total }, agents, countRes, clientOptions] = await Promise.all([
    getProperties(supabase, {
      status,
      type,
      district: params.district,
      search: params.search,
      missing_data: params.missing_data === "1",
      page: 1,
      limit: 10,
    }),
    getAgents(supabase),
    supabase.from("v_property_summary").select("id", { count: "exact", head: true }),
    user ? getClientSelectOptions(supabase, user.id) : Promise.resolve([]),
  ]);

  const totalInDb = countRes.count ?? 0;

  const tableKey = [
    status,
    type,
    params.district ?? "",
    params.search ?? "",
    params.missing_data ?? "",
  ].join("|");

  return (
    <>
      <Topbar />
      <section className="px-4 sm:px-6 lg:px-8 pb-12 max-w-[1280px] mx-auto w-full space-y-6 mt-2">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              Nemovitosti
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {total} nemovitostí celkem
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <CsvImportToolbarButton entity="properties" />
            <Link
              href="/chat?q=Najdi%20nemovitosti%2C%20u%20kter%C3%BDch%20n%C3%A1m%20v%20syst%C3%A9mu%20chyb%C3%AD%20data%20o%20rekonstrukci%20a%20stavebn%C3%ADch%20%C3%BAprav%C3%A1ch%20a%20p%C5%99iprav%20jejich%20seznam%20k%20dopln%C4%9Bn%C3%AD."
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" }}
            >
              <Database size={13} strokeWidth={1.5} />
              Najít chybějící data
            </Link>
            <Link
              href="/properties?new=1"
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--color-brand)" }}
            >
              <Plus size={13} strokeWidth={2} />
              Přidat nemovitost
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Suspense>
          <PropertyFilters />
        </Suspense>

        {/* Dialog trigger (handles ?new=1) */}
        <Suspense>
          <PropertyListActions agents={agents} clients={clientOptions} />
        </Suspense>

        {/* Table — scrollovatelná oblast, prvních 10 + lazy */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-bg-card)",
            boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
            border: "1px solid rgba(199,196,215,0.12)",
          }}
        >
          <div className="p-4 sm:p-5">
            <PropertiesTablePanel
              key={tableKey}
              initial={properties}
              total={total}
              totalInDb={totalInDb}
              hasFilters={hasFilters}
              filterParams={{
                status,
                type,
                district: params.district,
                search: params.search,
                missing_data: params.missing_data,
              }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
