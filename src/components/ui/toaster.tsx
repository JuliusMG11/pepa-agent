"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { pushAppNotification } from "@/lib/app-notifications";

export type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

let _show: (message: string, variant?: ToastVariant) => void = () => {};

export const toast = {
  success: (msg: string) => _show(msg, "success"),
  error: (msg: string) => _show(msg, "error"),
  info: (msg: string) => _show(msg, "info"),
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const show = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { id, message, variant }]);
    pushAppNotification({ kind: variant, message });
    const timer = setTimeout(() => dismiss(id), 4000);
    timers.current.set(id, timer);
  }, [dismiss]);

  useEffect(() => { _show = show; }, [show]);

  const STYLES: Record<ToastVariant, { bg: string; border: string; color: string; Icon: React.ElementType }> = {
    success: { bg: "rgba(22,101,52,0.06)", border: "rgba(22,101,52,0.25)", color: "#166534", Icon: CheckCircle2 },
    error:   { bg: "rgba(186,26,26,0.06)", border: "rgba(186,26,26,0.25)", color: "#ba1a1a", Icon: XCircle },
    info:    { bg: "rgba(70,72,212,0.06)", border: "rgba(70,72,212,0.2)",  color: "var(--color-brand)", Icon: Info },
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none" style={{ maxWidth: "360px", width: "100%" }}>
      {toasts.map((t) => {
        const s = STYLES[t.variant];
        const { Icon } = s;
        return (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg pointer-events-auto"
            style={{ backgroundColor: s.bg, borderColor: s.border, color: s.color }}
          >
            <Icon size={15} />
            <span className="text-sm font-medium flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100 transition-opacity shrink-0" aria-label="Close">
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
