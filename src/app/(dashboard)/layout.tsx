import { Sidebar } from "@/components/layouts/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex h-dvh min-h-0 max-h-dvh overflow-hidden bg-[var(--color-bg-page)]">
      <Sidebar />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto [overflow-anchor:none]">
        {children}
      </main>
    </div>
  );
}
