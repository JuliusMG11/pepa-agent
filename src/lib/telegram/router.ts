import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendMessage, sendChatAction } from "./client";
import { handleAgentQuery } from "./agent-handler";
import { generateReport, buildWeeklyPeriod } from "@/lib/reports/generator";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function formatCzk(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mil. Kč`;
  return `${n.toLocaleString("cs-CZ")} Kč`;
}

export async function routeUpdate(update: Record<string, unknown>): Promise<void> {
  const message = update.message as Record<string, unknown> | undefined;
  if (!message) return;

  const chatId = (message.chat as Record<string, unknown>)?.id as number;
  const text = (message.text as string | undefined)?.trim() ?? "";

  if (!text) return;

  const [command, ...args] = text.split(/\s+/);

  switch (command.toLowerCase()) {
    case "/start":
      await handleStart(chatId);
      break;
    case "/report":
      await handleReport(chatId);
      break;
    case "/leads":
      await handleLeads(chatId);
      break;
    case "/status":
      await handleStatus(chatId);
      break;
    case "/alert":
      await handleAlert(chatId, args.join(" "));
      break;
    case "/link":
      await handleLink(chatId, args[0]);
      break;
    default:
      // Free-text → agent
      await handleAgentQuery(chatId, text);
  }
}

async function handleStart(chatId: number): Promise<void> {
  const msg = `👋 *Ahoj, jsem Pepa!*

Tvůj AI asistent pro správu realitního back office.

*Dostupné příkazy:*
/report — týdenní shrnutí výsledků
/leads — dnešní leady
/status — rychlý přehled KPI
/alert [lokalita] — sledovat nové nabídky

Nebo mi napiš cokoliv česky — odpovím na základě firemních dat.`;
  await sendMessage(chatId, msg, "Markdown");
}

async function handleReport(chatId: number): Promise<void> {
  await sendChatAction(chatId, "typing");
  const supabase = getServiceClient();
  const period = buildWeeklyPeriod();

  try {
    const report = await generateReport(supabase as never, period);
    const m = report.metrics;

    const msg = `📊 *Report: ${period.label}*

*Leady:* ${m.newLeads} nových | ${m.closedWon} uzavřeno ✓ | ${m.closedLost} ztraceno
*Konverze:* ${m.conversionRate} %
*Noví klienti:* ${m.newClients}
*Prodané nemovitosti:* ${m.soldProperties}
*Obrat:* ${formatCzk(m.totalRevenue)}
${m.avgDaysToClose > 0 ? `*Prům. uzavření:* ${m.avgDaysToClose} dní` : ""}
${m.topAgent ? `\n🏆 *Top agent:* ${m.topAgent.name} (${m.topAgent.deals} obchodů)` : ""}`;

    await sendMessage(chatId, msg, "Markdown");
  } catch (err) {
    await sendMessage(chatId, "Nepodařilo se vygenerovat report. Zkus to znovu.");
    console.error("[Telegram /report]", err);
  }
}

async function handleLeads(chatId: number): Promise<void> {
  await sendChatAction(chatId, "typing");
  const supabase = getServiceClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: leads } = await supabase
    .from("v_lead_pipeline")
    .select("client_name, property_title, status, created_at")
    .gte("created_at", today.toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  if (!leads || leads.length === 0) {
    await sendMessage(chatId, "Dnes zatím žádné nové leady.");
    return;
  }

  const lines = leads.map(
    (l) => `• *${l.client_name}* — ${l.property_title ?? "bez nemovitosti"} (${l.status})`
  );
  await sendMessage(
    chatId,
    `📋 *Dnešní leady (${leads.length}):*\n\n${lines.join("\n")}`,
    "Markdown"
  );
}

async function handleStatus(chatId: number): Promise<void> {
  await sendChatAction(chatId, "typing");
  const supabase = getServiceClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [activeProps, leadsMonth, newClients] = await Promise.all([
    supabase
      .from("properties")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .is("deleted_at", null),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart)
      .is("deleted_at", null),
  ]);

  const msg = `📈 *Rychlý přehled*

🏠 Aktivní nemovitosti: *${activeProps.count ?? 0}*
🎯 Leady tento měsíc: *${leadsMonth.count ?? 0}*
👤 Noví klienti: *${newClients.count ?? 0}*`;

  await sendMessage(chatId, msg, "Markdown");
}

async function handleAlert(chatId: number, location: string): Promise<void> {
  if (!location) {
    await sendMessage(chatId, "Zadej lokalitu. Příklad: /alert Praha Holešovice");
    return;
  }

  const supabase = getServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("telegram_chat_id", chatId)
    .single();

  if (!profile) {
    await sendMessage(chatId, "Tvůj účet není propojen. Přejdi do Nastavení.");
    return;
  }

  const { error } = await supabase.from("monitoring_jobs").insert({
    name: `Alert: ${location}`,
    query: location,
    locations: [location],
    enabled: true,
    notify_telegram: true,
    telegram_chat_id: chatId,
    created_by: profile.id,
    filters: {},
  });

  if (error) {
    await sendMessage(chatId, `Nepodařilo se vytvořit monitoring: ${error.message}`);
    return;
  }

  await sendMessage(
    chatId,
    `✅ Sledování aktivováno pro *${location}*.\nKaždé ráno v 7:00 dostaneš přehled nových nabídek.`,
    "Markdown"
  );
}

async function handleLink(chatId: number, code: string): Promise<void> {
  if (!code) {
    await sendMessage(chatId, "Použij: /link [kód] — kód najdeš v Nastavení na webu.");
    return;
  }

  // In a real implementation, the link code would be stored in `profiles.telegram_link_code`
  // For now we store chat_id directly when the code matches
  const supabase = getServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("telegram_link_code", code)
    .single();

  if (!profile) {
    await sendMessage(chatId, "Kód není platný nebo vypršel. Vygeneruj nový v Nastavení.");
    return;
  }

  await supabase
    .from("profiles")
    .update({ telegram_chat_id: chatId, telegram_link_code: null })
    .eq("id", profile.id);

  await sendMessage(
    chatId,
    `✅ *Propojeno!* Ahoj, ${profile.full_name}!\n\nNyní mi můžeš posílat dotazy přímo odsud.`,
    "Markdown"
  );
}
