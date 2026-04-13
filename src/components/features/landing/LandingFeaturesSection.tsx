"use client";

import {
  MessageSquare,
  Mail,
  Calendar,
  BarChart2,
  Search,
  Sun,
  type LucideIcon,
} from "lucide-react";

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div
      className="group p-8 rounded-xl border transition-all duration-300 hover:shadow-xl"
      style={{
        backgroundColor: "var(--color-bg-card)",
        borderColor: "rgba(199,196,215,0.3)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-brand)";
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 20px 40px rgba(70,72,212,0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          "rgba(199,196,215,0.3)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center mb-6"
        style={{ backgroundColor: "var(--color-bg-subtle)" }}
      >
        <Icon size={22} style={{ color: "var(--color-brand)" }} strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
        {description}
      </p>
    </div>
  );
}

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: MessageSquare,
    title: "Přirozené dotazy",
    description:
      'Zeptejte se „Které obchody stagnují ve Vinohrady?" a okamžitě získejte odpověď z vašeho CRM a e-mailů.',
  },
  {
    icon: Mail,
    title: "Návrhy e-mailů",
    description:
      "Pepa identifikuje urgentní leady a navrhuje kontextová odpovědi ve vašem osobním stylu.",
  },
  {
    icon: Calendar,
    title: "Synchronizace kalendáře",
    description:
      "Automatické plánování prohlídek a inspekcí. Pepa vyřídí vše za vás.",
  },
  {
    icon: BarChart2,
    title: "Automatické reporty",
    description:
      "Generujte týdenní přehledy výkonu pro majitele a stakeholdery bez otevření jediné tabulky.",
  },
  {
    icon: Search,
    title: "Detekce mezer v datech",
    description:
      "AI monitoruje vaše inzeráty a CRM a identifikuje chybějící dokumenty nebo zastaralé ceny.",
  },
  {
    icon: Sun,
    title: "Ranní briefing",
    description:
      "Každé ráno v 8:00 dostanete personalizovaný přehled priorit na nadcházející den.",
  },
];

export function LandingFeaturesSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {FEATURES.map(({ icon: Icon, title, description }) => (
        <FeatureCard
          key={title}
          icon={Icon}
          title={title}
          description={description}
        />
      ))}
    </div>
  );
}
