"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="flex flex-1 items-center justify-center min-h-screen"
      style={{ backgroundColor: "var(--color-bg-page)" }}
    >
      <div
        className="flex flex-col items-center text-center p-10 rounded-2xl max-w-sm w-full mx-4"
        style={{
          backgroundColor: "var(--color-bg-card)",
          boxShadow: "0 4px 20px rgba(70,72,212,0.06)",
        }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
          style={{ backgroundColor: "#ffdad6" }}
        >
          <AlertTriangle size={24} style={{ color: "#ba1a1a" }} strokeWidth={1.5} />
        </div>
        <h2
          className="text-lg font-bold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Něco se pokazilo
        </h2>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          {error.message || "Nastala neočekávaná chyba. Zkuste to prosím znovu."}
        </p>
        <button
          onClick={reset}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--color-brand)" }}
        >
          Zkusit znovu
        </button>
      </div>
    </div>
  );
}
