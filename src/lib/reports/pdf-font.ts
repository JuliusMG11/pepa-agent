/**
 * Noto Sans pro češtinu v jsPDF (standardní Helvetica neumí diakritiku).
 * Načte se z CDN při prvním generování; při selhání zůstane Helvetica.
 */

import type { jsPDF } from "jspdf";

const FONT_URL =
  "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans@5.0.19/files/noto-sans-latin-400-normal.ttf";

let cachedVfsName: string | null | undefined;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  if (typeof btoa !== "undefined") return btoa(binary);
  return Buffer.from(buffer).toString("base64");
}

/** Vrátí název fontu pro setFont, nebo null = použít helvetica. */
export async function registerCzechFont(doc: jsPDF): Promise<string | null> {
  if (cachedVfsName === null) return null;
  if (cachedVfsName) return cachedVfsName;

  try {
    const res = await fetch(FONT_URL, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) {
      cachedVfsName = null;
      return null;
    }
    const b64 = arrayBufferToBase64(await res.arrayBuffer());
    const vfs = "NotoSans-Regular.ttf";
    doc.addFileToVFS(vfs, b64);
    doc.addFont(vfs, "NotoSans", "normal");
    cachedVfsName = "NotoSans";
    return "NotoSans";
  } catch {
    cachedVfsName = null;
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
