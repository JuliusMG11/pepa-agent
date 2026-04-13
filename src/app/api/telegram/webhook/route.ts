import { waitUntil } from "@vercel/functions";
import { routeUpdate } from "@/lib/telegram/router";

// Allow up to 60s for the Claude agent to respond
export const maxDuration = 60;

const ALLOWED_USER_IDS = (process.env.TELEGRAM_ALLOWED_USER_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)
  .map(Number);

export async function POST(request: Request): Promise<Response> {
  // Verify Telegram webhook secret
  const secretHeader = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let update: Record<string, unknown>;
  try {
    update = await request.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Authorisation check
  const message = update.message as Record<string, unknown> | undefined;
  const fromId = (message?.from as Record<string, unknown> | undefined)?.id as number | undefined;

  if (fromId !== undefined && ALLOWED_USER_IDS.length > 0 && !ALLOWED_USER_IDS.includes(fromId)) {
    const chatId = (message?.chat as Record<string, unknown> | undefined)?.id as number | undefined;
    if (chatId) {
      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: "Přístup zamítnut." }),
        }
      );
    }
    return new Response("OK");
  }

  // Use waitUntil so Vercel keeps the function alive after returning OK
  // This is required — without it, Vercel terminates the function immediately
  // after the response and the agent never finishes processing
  waitUntil(
    routeUpdate(update).catch((err) =>
      console.error("[Telegram webhook error]", err)
    )
  );

  return new Response("OK");
}
