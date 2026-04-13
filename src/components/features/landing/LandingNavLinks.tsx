"use client";

const LABELS = ["Solutions", "Properties", "Pricing", "Resources"] as const;

export function LandingNavLinks() {
  return (
    <div className="hidden md:flex items-center gap-8 text-sm font-semibold">
      {LABELS.map((l) => (
        <a
          key={l}
          href="#"
          className="transition-colors"
          style={{ color: "var(--color-text-muted)" }}
          onMouseOver={(e) => {
            (e.target as HTMLAnchorElement).style.color = "var(--color-brand)";
          }}
          onMouseOut={(e) => {
            (e.target as HTMLAnchorElement).style.color = "var(--color-text-muted)";
          }}
        >
          {l}
        </a>
      ))}
    </div>
  );
}
