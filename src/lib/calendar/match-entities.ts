/**
 * Heuristiky pro spárování textu z Google Calendar s klienty a nemovitostmi v DB.
 */

export function matchClientFromTitle(
  title: string,
  clients: { id: string; full_name: string }[]
): { id: string; full_name: string } | null {
  const t = title.toLowerCase();

  // „… klient Jan Novák …“
  const afterKlient = title.match(/klient[:\s]+([^,—\n()]+)/i);
  const extracted = afterKlient?.[1]?.trim().toLowerCase();

  let best: { id: string; full_name: string } | null = null;

  for (const c of clients) {
    const n = c.full_name.trim().toLowerCase();
    if (!n) continue;

    if (t.includes(n)) {
      return c;
    }

    if (extracted && (n.includes(extracted) || extracted.includes(n))) {
      best = c;
    }

    const parts = n.split(/\s+/).filter((p) => p.length > 2);
    if (parts.length >= 2 && parts.every((p) => t.includes(p))) {
      best = c;
    }
  }

  return best;
}

export function matchPropertyFromTitle(
  title: string,
  properties: { id: string; title: string; address: string }[]
): { id: string; title: string } | null {
  const t = title.toLowerCase();

  for (const p of properties) {
    const pt = p.title.trim().toLowerCase();
    if (pt.length >= 4 && t.includes(pt)) {
      return { id: p.id, title: p.title };
    }
    const addr = p.address.trim().toLowerCase();
    if (addr.length >= 6 && t.includes(addr.slice(0, Math.min(24, addr.length)))) {
      return { id: p.id, title: p.title };
    }
  }

  // část před „a klient“ / „klient“
  const beforeClient = t.split(/\ba klient\b/i)[0] ?? t;
  for (const p of properties) {
    const pt = p.title.trim().toLowerCase();
    if (pt.length >= 4 && beforeClient.includes(pt)) {
      return { id: p.id, title: p.title };
    }
  }

  return null;
}
