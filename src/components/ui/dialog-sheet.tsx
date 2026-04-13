"use client";

/**
 * Mobil: výsuv ze spodu na plnou výšku viewportu (100dvh), obsah scrollovatelný.
 * md+: centrovaný modal s max výškou (klasický dialog).
 */
export function DialogSheetRoot({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 md:items-center md:p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

export function DialogSheetPanel({
  children,
  maxWidthClassName = "max-w-2xl",
  className = "",
}: {
  children: React.ReactNode;
  /** např. max-w-md, max-w-2xl */
  maxWidthClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex w-full ${maxWidthClassName} flex-col min-h-0 overflow-hidden rounded-t-2xl md:rounded-2xl h-[100dvh] max-h-[100dvh] md:h-auto md:max-h-[min(90dvh,900px)] ${className}`}
      style={{
        backgroundColor: "var(--color-bg-card)",
        boxShadow: "0 20px 60px rgba(70,72,212,0.15)",
      }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}

/** Scrollovatelný blok pod fixní hlavičkou */
export function DialogSheetScrollBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] ${className}`}
    >
      {children}
    </div>
  );
}
