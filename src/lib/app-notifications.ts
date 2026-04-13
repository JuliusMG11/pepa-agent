/**
 * Jednoduchá historie událostí v aplikaci (toast + systém) — localStorage.
 */

export const APP_NOTIFICATIONS_STORAGE_KEY = "pepa_notification_log_v1";
const STORAGE_KEY = APP_NOTIFICATIONS_STORAGE_KEY;
const MAX = 40;

export type AppNotificationItem = {
  id: string;
  at: string;
  kind: "success" | "error" | "info";
  message: string;
};

function readAll(): AppNotificationItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is AppNotificationItem =>
        typeof x === "object" &&
        x !== null &&
        typeof (x as AppNotificationItem).id === "string" &&
        typeof (x as AppNotificationItem).message === "string"
    );
  } catch {
    return [];
  }
}

export function getAppNotifications(): AppNotificationItem[] {
  return readAll().sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
}

export function pushAppNotification(
  item: Omit<AppNotificationItem, "id" | "at"> & { at?: string }
): void {
  if (typeof window === "undefined") return;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const at = item.at ?? new Date().toISOString();
  const next: AppNotificationItem = {
    id,
    at,
    kind: item.kind,
    message: item.message,
  };
  const prev = readAll();
  const merged = [next, ...prev].slice(0, MAX);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    /* quota */
  }
  window.dispatchEvent(new CustomEvent("pepa-notifications-changed"));
}

export function clearAppNotifications(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("pepa-notifications-changed"));
}
