const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function call(method: string, body: Record<string, unknown>): Promise<void> {
  await fetch(`${BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function sendMessage(
  chatId: number,
  text: string,
  parseMode?: "Markdown" | "HTML"
): Promise<void> {
  await call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: true,
  });
}

export async function sendPhoto(
  chatId: number,
  photo: Uint8Array,
  caption?: string
): Promise<void> {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("photo", new Blob([photo.buffer as ArrayBuffer], { type: "image/png" }), "chart.png");
  if (caption) form.append("caption", caption);
  await fetch(`${BASE}/sendPhoto`, { method: "POST", body: form });
}

export async function sendDocument(
  chatId: number,
  document: Uint8Array,
  filename: string,
  caption?: string
): Promise<void> {
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("document", new Blob([document.buffer as ArrayBuffer], { type: "application/octet-stream" }), filename);
  if (caption) form.append("caption", caption);
  await fetch(`${BASE}/sendDocument`, { method: "POST", body: form });
}

export async function sendChatAction(
  chatId: number,
  action: "typing" | "upload_document"
): Promise<void> {
  await call("sendChatAction", { chat_id: chatId, action });
}
