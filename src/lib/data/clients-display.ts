/** Štítky a barvy zdroje klienta — sdílené mezi stránkou Klienti a tabulkou. */

export const CLIENT_SOURCE_LABELS: Record<string, string> = {
  referral: "Doporučení",
  sreality: "Sreality",
  bezrealitky: "Bezrealitky",
  reality_cz: "Reality.cz",
  direct: "Přímý kontakt",
  social: "Sociální sítě",
  event: "Akce",
  other: "Jiné",
};

export const CLIENT_SOURCE_STYLES: Record<string, { backgroundColor: string; color: string }> = {
  referral: { backgroundColor: "#ccfbf1", color: "#0f766e" },
  sreality: { backgroundColor: "rgba(70,72,212,0.08)", color: "var(--color-brand)" },
  bezrealitky: { backgroundColor: "#fef3c7", color: "#92400e" },
  reality_cz: { backgroundColor: "#f3e8ff", color: "#7e22ce" },
  direct: { backgroundColor: "#dcfce7", color: "#166534" },
  social: { backgroundColor: "#e0f2fe", color: "#0369a1" },
  event: { backgroundColor: "#fee2e2", color: "#991b1b" },
  other: { backgroundColor: "#f0ecf4", color: "var(--color-text-secondary)" },
};
