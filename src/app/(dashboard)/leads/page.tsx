import type { Metadata } from "next";
import { Suspense } from "react";
import { Topbar } from "@/components/layouts/Topbar";
import { LeadsPageClient } from "@/components/features/leads/LeadsPageClient";
import { createClient } from "@/lib/supabase/server";
import { getLeadPipeline } from "@/lib/data/clients";

export const metadata: Metadata = { title: "Leady" };

export default async function LeadsPage() {
  const supabase = await createClient();

  const [leads, clientsResult, propertiesResult] = await Promise.all([
    getLeadPipeline(supabase),
    supabase
      .from("clients")
      .select("id, full_name")
      .is("deleted_at", null)
      .order("full_name"),
    supabase
      .from("properties")
      .select("id, title, address")
      .is("deleted_at", null)
      .in("status", ["active", "pending"])
      .order("title"),
  ]);

  const clients = (clientsResult.data ?? []) as { id: string; full_name: string }[];
  const properties = (propertiesResult.data ?? []) as {
    id: string;
    title: string;
    address: string;
  }[];

  return (
    <>
      <Topbar />
      <section className="px-4 sm:px-6 lg:px-8 pb-12 max-w-[1440px] mx-auto w-full space-y-4 mt-2">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Pipeline leadů
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {leads.length} leadů celkem
          </p>
        </div>

        <Suspense>
          <LeadsPageClient
            leads={leads}
            clients={clients}
            properties={properties}
          />
        </Suspense>
      </section>
    </>
  );
}
