"use client";

import { X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Potvrdiť",
  cancelLabel = "Zrušiť",
  variant = "default",
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const confirmBg =
    variant === "danger" ? "#991b1b" : "var(--color-brand)";
  const confirmHover =
    variant === "danger" ? "rgba(153,27,27,0.9)" : "var(--color-brand)";

  return (
    <div
      className="fixed inset-0 z-[100] flex cursor-default items-end justify-center p-0 md:items-center md:p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="relative max-h-[min(100dvh,100%)] w-full max-w-md cursor-default overflow-y-auto overscroll-contain rounded-t-2xl p-6 shadow-2xl md:max-h-[min(90dvh,720px)] md:rounded-2xl"
        style={{
          backgroundColor: "var(--color-bg-card)",
          border: "1px solid rgba(199,196,215,0.2)",
          boxShadow: "0 24px 80px rgba(70,72,212,0.18)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-70 cursor-pointer"
          style={{ color: "var(--color-text-muted)" }}
          aria-label="Zavrieť"
        >
          <X size={16} strokeWidth={2} />
        </button>
        <h2
          id="confirm-dialog-title"
          className="text-base font-bold pr-8"
          style={{ color: "var(--color-text-primary)" }}
        >
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          {description}
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-5 py-2.5 text-sm font-bold rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="px-5 py-2.5 text-sm font-bold rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: confirmBg }}
            onMouseEnter={(e) => {
              if (!isPending) (e.currentTarget as HTMLButtonElement).style.backgroundColor = confirmHover;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = confirmBg;
            }}
          >
            {isPending ? "Čakajte…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
