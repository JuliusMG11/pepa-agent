"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="cs">
      <body
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "var(--color-bg-page)", fontFamily: "system-ui, sans-serif" }}
      >
        <div className="text-center max-w-sm px-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "rgba(186,26,26,0.08)" }}
          >
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
            Nastala neočekávaná chyba
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>
            {error.message ?? "Prosím, zkuste to znovu."}
            {error.digest && (
              <span className="block mt-1 text-xs font-mono" style={{ color: "#c7c4d7" }}>
                ID: {error.digest}
              </span>
            )}
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--color-brand)", color: "var(--color-on-brand)" }}
          >
            Zkusit znovu
          </button>
        </div>
      </body>
    </html>
  );
}
