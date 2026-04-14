/**
 * Noto Sans pro češtinu v jsPDF (standardní Helvetica neumí diakritiku).
 * Načítáme ze souborového systému (public/fonts/) — spolehlivější než CDN.
 */

import type { jsPDF } from "jspdf";
import { join } from "path";
import { readFileSync } from "fs";

let cachedB64: string | null | undefined;

function getB64(): string | null {
  if (cachedB64 === null) return null;
  if (cachedB64) return cachedB64;

  try {
    const fontPath = join(process.cwd(), "public", "fonts", "NotoSans-LatinExt.ttf");
    const buf = readFileSync(fontPath);
    cachedB64 = buf.toString("base64");
    return cachedB64;
  } catch {
    try {
      // Fallback: CDN fetch (synchronous base64 is not possible, caller must await)
      cachedB64 = null;
      return null;
    } catch {
      cachedB64 = null;
      return null;
    }
  }
}

/** Vrátí název fontu pro setFont, nebo null = použít helvetica. */
export async function registerCzechFont(doc: jsPDF): Promise<string | null> {
  // Try filesystem first (reliable in Node.js / Vercel)
  const b64 = getB64();
  if (b64) {
    const vfs = "NotoSans-Regular.ttf";
    doc.addFileToVFS(vfs, b64);
    doc.addFont(vfs, "NotoSans", "normal");
    return "NotoSans";
  }

  // Fallback: CDN
  try {
    const FONT_URL =
      "https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A99d.ttf";
    const res = await fetch(FONT_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
    const b64cdn = typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(buf).toString("base64");
    const vfs = "NotoSans-Regular.ttf";
    doc.addFileToVFS(vfs, b64cdn);
    doc.addFont(vfs, "NotoSans", "normal");
    return "NotoSans";
  } catch {
    return null;
  }
}

/** Nastaví font — u NotoSans je vždy řez normal (tučné přes větší fontSize). */
export function applyPdfFont(
  doc: jsPDF,
  family: string | null,
  bold: boolean
): void {
  if (family === "NotoSans") {
    doc.setFont("NotoSans", "normal");
    return;
  }
  doc.setFont("helvetica", bold ? "bold" : "normal");
}
