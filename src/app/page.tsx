import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Building2, Zap, ShieldCheck } from "lucide-react";
import { LandingFeaturesSection } from "@/components/features/landing/LandingFeaturesSection";
import { LandingNavLinks } from "@/components/features/landing/LandingNavLinks";

export const metadata = {
  title: "Pepa — Back Office Agent",
  description:
    "Pepa handles your emails, reports, calendar, and data so your team can focus on closing deals.",
};

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-bg-page)", color: "var(--color-text-primary)" }}
    >
      {/* ── Navbar ── */}
      <nav
        className="fixed top-0 w-full z-50 backdrop-blur-md"
        style={{
          backgroundColor: "rgba(252,248,255,0.85)",
          borderBottom: "1px solid rgba(199,196,215,0.2)",
        }}
      >
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "var(--color-brand)" }}
            >
              <Building2 size={16} color="#fff" strokeWidth={2} />
            </div>
            <span
              className="text-xl font-black tracking-tighter"
              style={{ color: "var(--color-text-primary)" }}
            >
              Pepa
            </span>
          </div>

          {/* Nav links — client component (imperative hover colors) */}
          <LandingNavLinks />

          {/* CTA buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden md:block text-sm font-semibold transition-colors"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Přihlásit se
            </Link>
            <Link
              href="/register"
              className="px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--color-brand)" }}
            >
              Začít zdarma
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="pt-32 pb-24 px-6 max-w-7xl mx-auto">
        {/* ── Hero ── */}
        <section className="text-center mb-32 max-w-4xl mx-auto">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
            style={{
              backgroundColor: "rgba(70,72,212,0.08)",
              border: "1px solid rgba(70,72,212,0.15)",
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "var(--color-brand)" }}
            />
            <span
              className="text-sm font-semibold tracking-tight"
              style={{ color: "var(--color-brand)" }}
            >
              AI-powered back office
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-8 leading-[1.1]"
            style={{ color: "var(--color-text-primary)" }}
          >
            Your back office, on{" "}
            <span
              style={{
                backgroundImage: "linear-gradient(135deg, #4648d4, #6063ee)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              autopilot
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-lg md:text-xl leading-relaxed mb-12 max-w-2xl mx-auto"
            style={{ color: "var(--color-text-muted)" }}
          >
            Pepa vyřizuje e-maily, reporty, kalendář a data, aby se váš tým
            mohl soustředit na uzavírání obchodů. První AI navržená přímo pro
            realitní trh.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="w-full sm:w-auto px-10 py-4 rounded-xl text-lg font-bold text-white transition-all hover:scale-105"
              style={{
                backgroundColor: "var(--color-brand)",
                boxShadow: "0 8px 24px rgba(70,72,212,0.25)",
              }}
            >
              Začít zdarma
            </Link>
            <button
              className="w-full sm:w-auto px-10 py-4 rounded-xl text-lg font-bold transition-colors"
              style={{ color: "var(--color-text-primary)", backgroundColor: "transparent" }}
            >
              Zobrazit demo
            </button>
          </div>

          {/* Social proof */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex -space-x-3">
              {["JP", "MK", "TH", "AV"].map((initials) => (
                <div
                  key={initials}
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: "rgba(70,72,212,0.1)",
                    borderColor: "var(--color-bg-page)",
                    color: "var(--color-brand)",
                  }}
                >
                  {initials}
                </div>
              ))}
            </div>
            <p
              className="text-sm font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-text-muted)" }}
            >
              Důvěřuje nám 40+ realitních týmů
            </p>
          </div>
        </section>

        {/* ── Features grid ── */}
        <section className="space-y-12">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
              style={{ color: "var(--color-text-primary)" }}
            >
              Inteligentní automatizace pro každý úkol
            </h2>
            <div
              className="h-1 w-20 mx-auto rounded-full"
              style={{ backgroundColor: "var(--color-brand)" }}
            />
          </div>

          <LandingFeaturesSection />
        </section>

        {/* ── Bento section ── */}
        <section className="mt-40 grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          {/* Large card */}
          <div
            className="md:col-span-7 rounded-3xl p-12 flex flex-col justify-between overflow-hidden relative"
            style={{
              backgroundColor: "#6063ee",
              color: "var(--color-on-brand)",
            }}
          >
            <div className="relative z-10">
              <h3 className="text-3xl font-extrabold mb-6 tracking-tight">
                Inteligence plnohodnotného asistenta za zlomek nákladů.
              </h3>
              <p className="text-lg opacity-90 max-w-md leading-relaxed">
                Naše AI nejen zpracovává data — rozumí nuancím správy
                nemovitostí, vztahům s nájemníky a koordinaci transakcí.
              </p>
            </div>

            {/* Chat bubble preview */}
            <div
              className="mt-12 p-6 rounded-2xl relative z-10"
              style={{
                backgroundColor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: "var(--color-brand)" }}
                >
                  AI
                </div>
                <span className="font-bold text-sm">Pepa Assistant</span>
              </div>
              <p className="text-sm italic opacity-90">
                „Připravil jsem 4 e-maily k obnovení nájemní smlouvy a naplánoval
                prohlídku ve 14:00 s rodinou Novákových. Mám spustit prověření
                pro byt 4B?"
              </p>
            </div>

            {/* Blur circle */}
            <div
              className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full blur-3xl"
              style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            />
          </div>

          {/* Two small cards */}
          <div className="md:col-span-5 grid grid-rows-2 gap-6">
            <div
              className="rounded-3xl p-8"
              style={{
                backgroundColor: "var(--color-bg-subtle)",
                border: "1px solid rgba(199,196,215,0.2)",
              }}
            >
              <Zap
                size={24}
                style={{ color: "var(--color-brand)", marginBottom: "1rem" }}
                fill="var(--color-brand)"
              />
              <h4
                className="text-xl font-bold mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                99,9% přesnost
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                Trénováno na milionech realitních dokumentů pro maximální
                přesnost vašich dat.
              </p>
            </div>
            <div
              className="rounded-3xl p-8"
              style={{
                backgroundColor: "var(--color-bg-subtle)",
                border: "1px solid rgba(199,196,215,0.2)",
              }}
            >
              <ShieldCheck
                size={24}
                style={{ color: "var(--color-brand)", marginBottom: "1rem" }}
                fill="rgba(70,72,212,0.1)"
              />
              <h4
                className="text-xl font-bold mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                Podniková bezpečnost
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                SOC2 Type II s end-to-end šifrováním pro všechna data o
                nemovitostech a klientech.
              </p>
            </div>
          </div>
        </section>

        {/* ── CTA section ── */}
        <section
          className="mt-40 text-center py-20 px-8 rounded-[40px]"
          style={{ backgroundColor: "#f0ecf4" }}
        >
          <h2
            className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-6"
            style={{ color: "var(--color-text-primary)" }}
          >
            Připraveni škálovat vaši agenturu?
          </h2>
          <p className="text-lg mb-12" style={{ color: "var(--color-text-muted)" }}>
            Přidejte se k budoucnosti správy realitního back office ještě dnes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-10 py-4 rounded-xl font-bold text-lg text-white transition-all hover:opacity-90"
              style={{ backgroundColor: "var(--color-brand)" }}
            >
              Spustit bezplatnou zkušební verzi
            </Link>
            <button
              className="px-10 py-4 rounded-xl font-bold text-lg border-2 transition-all"
              style={{
                color: "var(--color-brand)",
                borderColor: "var(--color-brand)",
                backgroundColor: "transparent",
              }}
            >
              Kontaktovat prodej
            </button>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer
        className="py-20"
        style={{
          backgroundColor: "var(--color-bg-page)",
          borderTop: "1px solid rgba(199,196,215,0.2)",
        }}
      >
        <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "var(--color-brand)" }}
              >
                <Building2 size={16} color="#fff" strokeWidth={2} />
              </div>
              <span
                className="text-xl font-black tracking-tighter"
                style={{ color: "var(--color-text-primary)" }}
              >
                Pepa
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              Transformujeme realitní trh pomocí inteligentní AI automatizace.
            </p>
          </div>

          {/* Links */}
          {FOOTER_LINKS.map(({ heading, links }) => (
            <div key={heading}>
              <h5
                className="font-bold mb-6 text-sm"
                style={{ color: "var(--color-text-primary)" }}
              >
                {heading}
              </h5>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm transition-colors"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="max-w-7xl mx-auto px-8 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ borderTop: "1px solid rgba(199,196,215,0.2)" }}
        >
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            © 2025 Pepa AI. Všechna práva vyhrazena.
          </p>
        </div>
      </footer>
    </div>
  );
}

const FOOTER_LINKS = [
  {
    heading: "Produkt",
    links: ["Funkce", "Integrace", "Enterprise", "Ceník"],
  },
  {
    heading: "Společnost",
    links: ["O nás", "Kariéra", "Tisk", "Kontakt"],
  },
  {
    heading: "Právní",
    links: ["Zásady ochrany soukromí", "Podmínky služby", "Cookies"],
  },
];
