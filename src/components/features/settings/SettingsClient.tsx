"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  User,
  Calendar,
  Send,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  Check,
  Palette,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import type { Profile } from "@/types/app";
import { toast } from "@/components/ui/toaster";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrátor",
  agent: "Agent",
  viewer: "Čtenář",
};

interface Props {
  profile: Profile | null;
  googleStatus?: string;
  googleEmail?: string;
  /** Parametr z Google OAuth (např. access_denied) */
  googleErrorReason?: string;
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
      <div
        className="flex items-center gap-2 px-5 py-4 border-b"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-bg-subtle)",
        }}
      >
        <Icon size={16} style={{ color: "var(--color-brand)" }} />
        <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {title}
        </h2>
      </div>
      <div className="p-5 space-y-4" style={{ backgroundColor: "var(--color-surface-low)" }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </span>
      <div className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
        {children}
      </div>
    </div>
  );
}

function ThemeToggleRow() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const modes = [
    { id: "light" as const, label: "Světlý", Icon: Sun },
    { id: "dark" as const, label: "Tmavý", Icon: Moon },
    { id: "system" as const, label: "Systém", Icon: Monitor },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {modes.map(({ id, label, Icon }) => {
        const active = mounted && theme === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors border"
            style={{
              borderColor: active ? "var(--color-brand)" : "rgba(199,196,215,0.35)",
              backgroundColor: active ? "rgba(70,72,212,0.08)" : "var(--color-bg-card)",
              color: active ? "var(--color-brand)" : "var(--color-text-secondary)",
            }}
          >
            <Icon size={14} strokeWidth={1.5} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsClient({
  profile,
  googleStatus,
  googleEmail,
  googleErrorReason,
}: Props) {
  const router = useRouter();
  const [googleToast, setGoogleToast] = useState<"connected" | "error" | null>(null);
  const [linkCodeCopied, setLinkCodeCopied] = useState(false);
  const telegramLinkCode = profile?.telegram_link_code ?? "";
  const telegramBotUsername =
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "PepaRealitniBot";

  useEffect(() => {
    if (googleStatus === "connected") setGoogleToast("connected");
    if (googleStatus === "error") setGoogleToast("error");
    if (googleStatus) {
      // Clean the URL
      const timeout = setTimeout(() => {
        router.replace("/settings");
        setGoogleToast(null);
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [googleStatus, router]);

  const isGoogleConnected = !!profile?.google_access_token;
  const connectedEmail =
    profile?.google_email ?? googleEmail ?? undefined;

  async function handleDisconnectGoogle() {
    const res = await fetch("/api/auth/google/disconnect", { method: "POST" });
    if (res.ok) {
      toast.success("Google Kalendář odpojen");
    } else {
      toast.error("Odpojení se nepodařilo");
    }
    router.refresh();
  }

  async function copyCode() {
    await navigator.clipboard.writeText(`/link ${telegramLinkCode}`);
    setLinkCodeCopied(true);
    setTimeout(() => setLinkCodeCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          Nastavení
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          Správa profilu a integrace
        </p>
      </div>

      {/* Toast */}
      {googleToast && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium"
          style={
            googleToast === "connected"
              ? {
                  backgroundColor: "rgba(22,101,52,0.06)",
                  borderColor: "rgba(22,101,52,0.2)",
                  color: "#166534",
                }
              : {
                  backgroundColor: "rgba(186,26,26,0.06)",
                  borderColor: "rgba(186,26,26,0.2)",
                  color: "#ba1a1a",
                }
          }
        >
          {googleToast === "connected" ? (
            <CheckCircle2 size={15} />
          ) : (
            <XCircle size={15} />
          )}
          {googleToast === "connected"
            ? `Google Kalendář úspěšně propojen${connectedEmail ? ` (${connectedEmail})` : ""}`
            : googleErrorReason === "access_denied"
              ? "Google přístup odmítl (403). V Google Cloud Console → OAuth consent screen přidej svůj e-mail mezi Test users, nebo zkus znovu a povol přístup."
              : "Propojení s Google Kalendářem selhalo. Zkus to znovu."}
        </div>
      )}

      <Section title="Vzhled" icon={Palette}>
        <div>
          <p className="text-sm mb-3" style={{ color: "var(--color-text-secondary)" }}>
            Režim rozhraní (světlý / tmavý / podle systému).
          </p>
          <ThemeToggleRow />
        </div>
      </Section>

      {/* Profile section */}
      <Section title="Profil" icon={User}>
        <Field label="Jméno">{profile?.full_name ?? "—"}</Field>
        <Field label="E-mail">{profile?.email ?? "—"}</Field>
        <Field label="Role">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "rgba(70,72,212,0.08)", color: "var(--color-brand)" }}
          >
            {ROLE_LABELS[profile?.role ?? "agent"] ?? profile?.role}
          </span>
        </Field>
      </Section>

      {/* Google Calendar section */}
      <Section title="Google Kalendář" icon={Calendar}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              {isGoogleConnected ? "Propojeno" : "Nepropojeno"}
            </p>
            {isGoogleConnected && connectedEmail && (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                {connectedEmail}
              </p>
            )}
            {!isGoogleConnected && (
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                Propojte Google účet — Pepa získá přístup ke Kalendáři i Gmailu.
              </p>
            )}
          </div>

          {isGoogleConnected ? (
            <div className="flex items-center gap-2">
              <span
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "rgba(22,101,52,0.08)", color: "#166534" }}
              >
                <CheckCircle2 size={12} />
                Aktivní
              </span>
              <a
                href="/api/auth/google"
                className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
                style={{ borderColor: "rgba(70,72,212,0.4)", color: "var(--color-brand)" }}
              >
                Znovu propojit
              </a>
              <button
                onClick={handleDisconnectGoogle}
                className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
                style={{ borderColor: "rgba(199,196,215,0.6)", color: "var(--color-text-muted)" }}
              >
                Odpojit
              </button>
            </div>
          ) : (
            <a
              href="/api/auth/google"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-colors"
              style={{ backgroundColor: "var(--color-brand)", color: "var(--color-on-brand)" }}
            >
              <ExternalLink size={13} />
              Propojit s Google
            </a>
          )}
        </div>
        {!isGoogleConnected && (
          <p
            className="text-[11px] leading-relaxed mt-4 pt-4 border-t"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
          >
            <strong style={{ color: "var(--color-text-secondary)" }}>Chyba 403 / „jen pro testery“:</strong>{" "}
            V projektu Google Cloud → OAuth consent screen přidej svůj Google účet do
            sekce <em>Test users</em> (režim Testing). Redirect URI v Credentials musí přesně odpovídat{" "}
            <code className="text-[10px]">GOOGLE_REDIRECT_URI</code> v .env.
          </p>
        )}
      </Section>

      {/* Telegram section */}
      <Section title="Telegram" icon={Send}>
        <div>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Propojte svůj Telegram účet pro mobilní přístup k Pepovi.
          </p>
          {profile?.telegram_chat_id ? (
            <div
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ backgroundColor: "rgba(22,101,52,0.06)" }}
            >
              <CheckCircle2 size={14} style={{ color: "#166534" }} />
              <span className="text-sm font-medium" style={{ color: "#166534" }}>
                Telegram propojen (ID: {profile.telegram_chat_id})
              </span>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <ol className="space-y-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                <li>
                  1. Otevři{" "}
                  <a
                    href={`https://t.me/${telegramBotUsername.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline"
                    style={{ color: "var(--color-brand)" }}
                  >
                    @{telegramBotUsername.replace(/^@/, "")}
                  </a>{" "}
                  na Telegramu
                </li>
                <li>2. Pošli zprávu (přesně tento řádek):</li>
              </ol>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-sm"
                style={{ backgroundColor: "rgba(70,72,212,0.06)", color: "var(--color-brand)" }}
              >
                <span className="flex-1">
                  {telegramLinkCode ? `/link ${telegramLinkCode}` : "Načítám kód…"}
                </span>
                <button
                  onClick={copyCode}
                  className="transition-opacity"
                  aria-label="Kopírovat kód"
                >
                  {linkCodeCopied ? (
                    <Check size={14} style={{ color: "#166534" }} />
                  ) : (
                    <Copy size={14} style={{ color: "var(--color-brand)" }} />
                  )}
                </button>
              </div>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Kód je uložen v účtu. Obnov stránku Nastavení pro nový kód, pokud vyprší. Po úspěšném /link
                uvidíš potvrzení v Telegramu.
              </p>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
