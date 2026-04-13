import type { Metadata } from "next";
import Link from "next/link";
import { Topbar } from "@/components/layouts/Topbar";
import { MonitoringClient } from "@/components/features/monitoring/MonitoringClient";
import { createClient } from "@/lib/supabase/server";
import type { MonitoringJob, MarketListing } from "@/types/app";

export const metadata: Metadata = { title: "Monitoring" };

export default async function MonitoringPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [jobsResult, listingsResult] = await Promise.all([
    supabase
      .from("monitoring_jobs")
      .select("*")
      .eq("created_by", user?.id ?? "")
      .order("created_at", { ascending: false }),
    supabase
      .from("market_listings")
      .select("*")
      .order("first_seen_at", { ascending: false })
      .limit(50),
  ]);

  const jobs: MonitoringJob[] = (jobsResult.data ?? []) as MonitoringJob[];
  const listings: MarketListing[] = (listingsResult.data ?? []) as MarketListing[];

  return (
    <>
      <Topbar />
      <section className="px-4 sm:px-6 lg:px-8 pb-12 max-w-[1440px] mx-auto w-full mt-2">
        <MonitoringClient
          key={jobs.map((j) => j.id).join("-")}
          jobs={jobs}
          listings={listings}
        />
      </section>
    </>
  );
}
