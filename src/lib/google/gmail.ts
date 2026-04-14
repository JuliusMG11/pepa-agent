/**
 * Gmail API client — read-only.
 * Requires scope: https://www.googleapis.com/auth/gmail.readonly
 */

import { refreshAccessToken } from "./calendar";

export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  fromEmail: string;
  snippet: string;
  date: string;
  isUnread: boolean;
  bodyText: string | null;
}

async function gmailFetch(
  accessToken: string,
  refreshToken: string,
  tokenExpiresAt: Date,
  url: string
): Promise<Response> {
  let token = accessToken;
  if (new Date() >= tokenExpiresAt) {
    const refreshed = await refreshAccessToken(refreshToken);
    token = refreshed.access_token;
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "Gmail: přístup zamítnut. Znovu propoj Google účet v Nastavení → Integrace (přidej Gmail scope)."
    );
  }
  return res;
}

function parseHeader(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function extractEmail(from: string): string {
  const m = from.match(/<(.+?)>/);
  return m ? m[1]! : from;
}

function decodeBase64Url(s: string): string {
  try {
    const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function extractPlainText(payload: GmailPayload): string {
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data).slice(0, 800);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractPlainText(part);
      if (text) return text;
    }
  }
  return "";
}

interface GmailPayload {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPayload[];
}

export async function listGmailMessages(params: {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  maxResults?: number;
  labelIds?: string[];
  query?: string;
}): Promise<GmailMessage[]> {
  const { accessToken, refreshToken, tokenExpiresAt } = params;
  const max = Math.min(params.maxResults ?? 10, 20);
  const labels = (params.labelIds ?? ["INBOX"]).join(",");
  const q = params.query ?? "";

  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", String(max));
  listUrl.searchParams.set("labelIds", labels);
  if (q) listUrl.searchParams.set("q", q);

  const listRes = await gmailFetch(accessToken, refreshToken, tokenExpiresAt, listUrl.toString());
  if (!listRes.ok) {
    throw new Error(`Gmail list error: ${listRes.status}`);
  }

  const listData = await listRes.json() as { messages?: { id: string; threadId: string }[] };
  const ids = listData.messages ?? [];

  if (ids.length === 0) return [];

  // Fetch message details in parallel (batch of max 10)
  const messages = await Promise.all(
    ids.slice(0, 10).map(async ({ id }) => {
      const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
      const msgRes = await gmailFetch(accessToken, refreshToken, tokenExpiresAt, msgUrl);
      if (!msgRes.ok) return null;

      const msg = await msgRes.json() as {
        id: string;
        threadId: string;
        labelIds?: string[];
        snippet?: string;
        payload?: {
          headers: { name: string; value: string }[];
          mimeType?: string;
          body?: { data?: string };
          parts?: GmailPayload[];
        };
        internalDate?: string;
      };

      const headers = msg.payload?.headers ?? [];
      const subject = parseHeader(headers, "subject") || "(bez předmětu)";
      const from    = parseHeader(headers, "from");
      const dateStr = parseHeader(headers, "date");
      const isUnread = (msg.labelIds ?? []).includes("UNREAD");

      const bodyText = msg.payload ? extractPlainText(msg.payload as GmailPayload) : null;

      return {
        id: msg.id,
        threadId: msg.threadId,
        subject,
        from,
        fromEmail: extractEmail(from),
        snippet: msg.snippet ?? "",
        date: dateStr || (msg.internalDate ? new Date(Number(msg.internalDate)).toISOString() : ""),
        isUnread,
        bodyText,
      } satisfies GmailMessage;
    })
  );

  return messages.filter((m): m is GmailMessage => m !== null);
}
