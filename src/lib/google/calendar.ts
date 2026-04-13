import type { TimeSlot } from "@/lib/claude/tools/get-calendar-availability";

interface GetFreeSlotsParams {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  daysAhead: number;
  slotDurationMinutes: number;
  workStart: string;
  workEnd: string;
}

interface BusyPeriod {
  start: string;
  end: string;
}

export async function getFreeSlots(
  params: GetFreeSlotsParams
): Promise<TimeSlot[]> {
  let token = params.accessToken;

  // Refresh access token if expired
  if (new Date() >= params.tokenExpiresAt) {
    const refreshed = await refreshAccessToken(params.refreshToken);
    token = refreshed.access_token;
  }

  const timeMin = new Date();
  const timeMax = new Date();
  timeMax.setDate(timeMax.getDate() + params.daysAhead);

  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: "primary" }],
    }),
  });

  if (res.status === 401) {
    throw new Error(
      "Google Calendar: přístup zamítnut. Znovu propoj v Nastavení."
    );
  }
  if (res.status === 403) {
    throw new Error(
      "Google Calendar: přístup k rozsahu odmítnut. Znovu propoj v Nastavení → Integrace."
    );
  }
  if (!res.ok) {
    throw new Error(`Google Calendar API error: ${res.status}`);
  }

  const data = await res.json();
  const busyPeriods: BusyPeriod[] =
    (data as { calendars: { primary: { busy: BusyPeriod[] } } }).calendars
      .primary.busy ?? [];

  return invertToFreeSlots(busyPeriods, {
    from: timeMin,
    to: timeMax,
    workStart: params.workStart,
    workEnd: params.workEnd,
    slotDuration: params.slotDurationMinutes,
  });
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expiry_date: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
    expiry_date?: number;
  };
  if (data.error) {
    throw new Error(data.error_description ?? data.error);
  }
  return data as { access_token: string; expiry_date: number };
}

function invertToFreeSlots(
  busy: BusyPeriod[],
  options: {
    from: Date;
    to: Date;
    workStart: string;
    workEnd: string;
    slotDuration: number;
  }
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const current = new Date(options.from);
  current.setHours(0, 0, 0, 0);

  while (current <= options.to) {
    const [startH, startM] = options.workStart.split(":").map(Number);
    const [endH, endM] = options.workEnd.split(":").map(Number);

    let slotStart = new Date(current);
    slotStart.setHours(startH, startM, 0, 0);
    const dayEnd = new Date(current);
    dayEnd.setHours(endH, endM, 0, 0);

    while (slotStart < dayEnd) {
      const slotEnd = new Date(
        slotStart.getTime() + options.slotDuration * 60_000
      );
      if (slotEnd > dayEnd) break;

      const isBlocked = busy.some(
        (b) =>
          new Date(b.start) < slotEnd && new Date(b.end) > slotStart
      );

      if (!isBlocked && slotStart > new Date()) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          formatted: formatSlotCzech(slotStart, slotEnd),
        });
      }

      slotStart = slotEnd;
    }

    current.setDate(current.getDate() + 1);
  }

  return slots.slice(0, 10);
}

function formatSlotCzech(start: Date, end: Date): string {
  const dayName = start.toLocaleDateString("cs-CZ", { weekday: "long" });
  const date = start.toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
  });
  const startTime = start.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString("cs-CZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dayName} ${date} ${startTime}–${endTime}`;
}

const PRAGUE_TZ = "Europe/Prague";

function pragueDateString(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: PRAGUE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

async function authorizedFetch(
  accessToken: string,
  refreshToken: string,
  tokenExpiresAt: Date,
  url: string,
  init?: RequestInit
): Promise<Response> {
  let token = accessToken;
  if (new Date() >= tokenExpiresAt) {
    const refreshed = await refreshAccessToken(refreshToken);
    token = refreshed.access_token;
  }
  return fetch(url, {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${token}`,
    },
  });
}

export interface GoogleCalendarEventBrief {
  id: string;
  summary: string;
  htmlLink: string | null;
  start: string;
  end: string;
}

/**
 * Události z primárního kalendáře za posledních 36 h a následných 36 h,
 * vyfiltrované na „dnes“ v časové zóně Europe/Prague.
 */
export async function listTodaysPrimaryCalendarEvents(params: {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
}): Promise<GoogleCalendarEventBrief[]> {
  const now = new Date();
  const timeMin = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString();
  const todayPrague = pragueDateString(now);

  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  );
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("maxResults", "80");

  const res = await authorizedFetch(
    params.accessToken,
    params.refreshToken,
    params.tokenExpiresAt,
    url.toString()
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "Google Calendar: přístup zamítnut. Znovu propoj kalendář v Nastavení (jsou potřeba události)."
    );
  }
  if (!res.ok) {
    throw new Error(`Google Calendar API: ${res.status}`);
  }

  const data = (await res.json()) as {
    items?: Array<{
      id: string;
      summary?: string;
      htmlLink?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
    }>;
  };

  const items = data.items ?? [];
  const out: GoogleCalendarEventBrief[] = [];

  for (const it of items) {
    const startRaw =
      it.start?.dateTime ??
      (it.start?.date ? `${it.start.date}T00:00:00` : null);
    if (!startRaw) continue;
    const startDate = new Date(startRaw);
    if (pragueDateString(startDate) !== todayPrague) continue;

    const endRaw =
      it.end?.dateTime ??
      (it.end?.date ? `${it.end.date}T23:59:59` : startRaw);
    const endDate = new Date(endRaw);

    out.push({
      id: it.id,
      summary: it.summary ?? "(Bez názvu)",
      htmlLink: it.htmlLink ?? null,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    });
  }

  return out.sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
}

export async function createPrimaryCalendarEvent(params: {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
}): Promise<{ id: string; htmlLink: string | null }> {
  const res = await authorizedFetch(
    params.accessToken,
    params.refreshToken,
    params.tokenExpiresAt,
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: params.summary,
        description: params.description ?? "",
        start: {
          dateTime: params.start.toISOString(),
          timeZone: PRAGUE_TZ,
        },
        end: {
          dateTime: params.end.toISOString(),
          timeZone: PRAGUE_TZ,
        },
      }),
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "Google Calendar: nelze vytvořit událost — znovu propoj účet v Nastavení."
    );
  }
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Calendar: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as { id: string; htmlLink?: string };
  return { id: data.id, htmlLink: data.htmlLink ?? null };
}
