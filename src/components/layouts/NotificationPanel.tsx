"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bell, Trash2 } from "lucide-react";
import {
  APP_NOTIFICATIONS_STORAGE_KEY,
  clearAppNotifications,
  getAppNotifications,
  type AppNotificationItem,
} from "@/lib/app-notifications";

function kindLabel(kind: AppNotificationItem["kind"]): string {
  switch (kind) {
    case "success":
      return "Úspěch";
    case "error":
      return "Chyba";
    default:
      return "Info";
  }
}

function kindColor(kind: AppNotificationItem["kind"]): string {
  switch (kind) {
    case "success":
      return "#166534";
    case "error":
      return "#ba1a1a";
    default:
      return "var(--color-brand)";
  }
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotificationItem[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);

  const refresh = useCallback(() => {
    setItems(getAppNotifications());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === APP_NOTIFICATIONS_STORAGE_KEY) refresh();
    };
    const onCustom = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("pepa-notifications-changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pepa-notifications-changed", onCustom);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const updatePanelPosition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    const panelW = Math.min(22 * 16, vw - margin * 2);
    let right = vw - r.right;
    right = Math.max(margin, right);
    const leftEdge = vw - right - panelW;
    if (leftEdge < margin) {
      right = vw - margin - panelW;
    }
    setPanelPos({ top: r.bottom + margin, right });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    document.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      document.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  const unreadDot = items.length > 0;

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className="w-10 h-10 flex items-center justify-center rounded-full relative transition-colors cursor-pointer hover:opacity-90"
        style={{ backgroundColor: "rgba(240,236,244,1)" }}
        aria-label="Notifikace"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          refresh();
        }}
      >
        <Bell size={17} strokeWidth={1.5} style={{ color: "var(--color-text-secondary)" }} />
        {unreadDot ? (
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full border-2"
            style={{
              backgroundColor: "#ba1a1a",
              borderColor: "var(--color-bg-page)",
            }}
          />
        ) : null}
      </button>

      {open && panelPos ? (
        <div
          className="fixed z-[9999] w-[min(22rem,calc(100vw-1rem))] max-h-[min(70vh,28rem)] flex flex-col rounded-xl border shadow-2xl overflow-hidden"
          style={{
            top: panelPos.top,
            right: panelPos.right,
            backgroundColor: "var(--color-bg-page)",
            borderColor: "rgba(199,196,215,0.45)",
          }}
        >
          <div
            className="flex items-center justify-between px-3 py-2.5 border-b"
            style={{
              borderColor: "rgba(199,196,215,0.35)",
              backgroundColor: "var(--color-topbar-bg)",
            }}
          >
            <span className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
              Historie událostí
            </span>
            {items.length > 0 ? (
              <button
                type="button"
                className="text-xs font-medium flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer hover:opacity-80"
                style={{ color: "var(--color-text-muted)" }}
                onClick={() => {
                  clearAppNotifications();
                  refresh();
                }}
              >
                <Trash2 size={12} />
                Vymazat
              </button>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {items.length === 0 ? (
              <p className="text-sm px-3 py-6 text-center" style={{ color: "var(--color-text-muted)" }}>
                Zatím žádné záznamy. Úspěchy a chyby z toastů se ukládají sem.
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: "rgba(199,196,215,0.25)" }}>
                {items.map((n) => (
                  <li key={n.id} className="px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <span
                        className="text-[10px] font-bold uppercase shrink-0 mt-0.5"
                        style={{ color: kindColor(n.kind) }}
                      >
                        {kindLabel(n.kind)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug wrap-break-word" style={{ color: "var(--color-text-primary)" }}>
                          {n.message}
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>
                          {new Date(n.at).toLocaleString("cs-CZ")}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
