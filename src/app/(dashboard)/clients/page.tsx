import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Topbar } from "@/components/layouts/Topbar";
import { ClientFilters } from "@/components/features/clients/ClientFilters";
import { ClientListActions } from "@/components/features/clients/ClientListActions";
import { ClientsTablePanel } from "@/components/features/clients/ClientsTablePanel";
import { CsvImportToolbarButton } from "@/components/features/data-import/CsvImportToolbarButton";
import { createClient } from "@/lib/supabase/server";
import { getClients, type LeadSource } from "@/lib/data/clients";

export const metadata: Metadata = { title: "Klienti" };

/** @deprecated Import z `@/lib/data/clients-display` */
export {
  CLIENT_SOURCE_LABELS as SOURCE_LABELS,
  CLIENT_SOURCE_STYLES as SOURCE_STYLES,
} from "@/lib/data/clients-display";

interface ClientsPageProps {
  searchParams: Promise<{
    search?: string;
    source?: string;
  }>;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const source = ((params.source as LeadSource) || "all") as LeadSource | "all";
  const hasFilters = Boolean(params.search?.trim()) || source !== "all";

  const [{ data: clients, total }, countRes, availPropsRes] = await Promise.all([
    getClients(supabase, {
      search: params.search,
      source,
      page: 1,
      limit: 10,
    }),
    supabase.from("clients").select("id", { count: "exact", head: true }).is("deleted_at", null),
    user
      ? supabase
          .from("v_property_summary")
          .select("id, title, address")
          .eq("agent_id", user.id)
          .is("client_id", null)
          .limit(100)
      : Promise.resolve({ data: [] }),
  ]);

  const availableProperties = (availPropsRes.data ?? []) as { id: string; title: string; address: string }[];

  const totalClientsInDb = countRes.count ?? 0;

  const tableKey = [params.search ?? "", source].join("|");

  return (
    <>
      <Topbar />
      <section className="px-4 sm:px-6 lg:px-8 pb-12 max-w-[1280px] mx-auto w-full space-y-6 mt-2">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              Klienti
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {total} klientů celkem
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <CsvImportToolbarButton entity="clients" />
            <Link
              href="/clients?new=1"
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: "var(--color-brand)" }}
            >
              <Plus size={13} strokeWidth={2} />
              Přidat klienta
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Suspense>
          <ClientFilters />
        </Suspense>

        <Suspense>
          <ClientListActions availableProperties={availableProperties} />
        </Suspense>

        {/* Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-bg-card)",
            boxShadow: "0 4px 20px rgba(70,72,212,0.04)",
            border: "1px solid rgba(199,196,215,0.12)",
          }}
        >
          <div className="p-4 sm:p-5">
            <ClientsTablePanel
              key={tableKey}
              initial={clients}
              total={total}
              totalInDb={totalClientsInDb}
              hasFilters={hasFilters}
              filterParams={{
                search: params.search,
                source,
              }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
