import type { Metadata } from "next";
import { Topbar } from "@/components/layouts/Topbar";
import { ReportsClient } from "@/components/features/reports/ReportsClient";
import { createClient } from "@/lib/supabase/server";
import type { Report } from "@/types/app";

export const metadata: Metadata = { title: "Reporty" };

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("reports")
    .select("*")
    .eq("generated_by", user?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(50);

  const reports: Report[] = (data ?? []) as Report[];

  return (
    <>
      <Topbar />
      <section className="px-4 sm:px-6 lg:px-8 pb-12 max-w-[1440px] mx-auto w-full mt-2">
        <ReportsClient initialReports={reports} />
      </section>
    </>
  );
}
