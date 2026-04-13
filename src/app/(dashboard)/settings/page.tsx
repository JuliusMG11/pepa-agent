import type { Metadata } from "next";
import { Topbar } from "@/components/layouts/Topbar";
import { SettingsClient } from "@/components/features/settings/SettingsClient";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/app";

export const metadata: Metadata = { title: "Nastavení" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; email?: string; reason?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id ?? "")
    .single();

  let profile = profileRaw;

  // Kód /link musí být v DB — dříve se generoval jen ve frontendu a propojení nikdy nefungovalo
  if (
    user?.id &&
    profile &&
    !profile.telegram_chat_id &&
    !profile.telegram_link_code
  ) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { error } = await supabase
      .from("profiles")
      .update({ telegram_link_code: code })
      .eq("id", user.id);
    if (!error) {
      profile = { ...profile, telegram_link_code: code };
    }
  }

  const params = await searchParams;

  return (
    <>
      <Topbar />
      <section className="px-4 sm:px-6 lg:px-8 pb-12 max-w-[900px] mx-auto w-full mt-2">
        <SettingsClient
          profile={profile as Profile}
          googleStatus={params.google}
          googleEmail={params.email}
          googleErrorReason={params.reason}
        />
      </section>
    </>
  );
}
