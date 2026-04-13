"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const registerSchema = z
  .object({
    email: z.string().email("Zadejte platnou e-mailovou adresu"),
    password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
    confirmPassword: z.string().min(6, "Potvrďte heslo"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hesla se neshodují",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(values: RegisterForm) {
    setServerError(null);
    setInfoMessage(null);
    const supabase = createClient();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${origin}/callback`,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setServerError("Tento e-mail je již zaregistrován. Přihlaste se.");
      } else {
        setServerError(error.message);
      }
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setInfoMessage(
      "Účet byl vytvořen. Pokud máte v projektu zapnuté potvrzení e-mailu, zkontrolujte schránku a odkaz v e-mailu.",
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-page)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-brand)] mb-4">
            <span className="text-white font-semibold text-lg">P</span>
          </div>
          <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
            Vytvořit účet
          </h1>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
            Pepa — back office agent
          </p>
        </div>

        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-[12px] font-medium text-[var(--color-text-primary)] mb-1.5"
                >
                  E-mail
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="vas@email.cz"
                  {...register("email")}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="mt-1 text-[11px] text-[var(--color-error-text)]">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-[12px] font-medium text-[var(--color-text-primary)] mb-1.5"
                >
                  Heslo
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register("password")}
                  aria-invalid={!!errors.password}
                />
                {errors.password && (
                  <p className="mt-1 text-[11px] text-[var(--color-error-text)]">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-[12px] font-medium text-[var(--color-text-primary)] mb-1.5"
                >
                  Potvrzení hesla
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register("confirmPassword")}
                  aria-invalid={!!errors.confirmPassword}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-[11px] text-[var(--color-error-text)]">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {serverError && (
                <div className="rounded-lg bg-[var(--color-error-bg)] px-3 py-2.5">
                  <p className="text-[12px] text-[var(--color-error-text)]">
                    {serverError}
                  </p>
                </div>
              )}

              {infoMessage && (
                <div className="rounded-lg bg-[var(--color-bg-subtle)] px-3 py-2.5 border border-[var(--color-border)]">
                  <p className="text-[12px] text-[var(--color-text-secondary)]">
                    {infoMessage}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-9 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white rounded-lg text-[13px] font-medium transition-all duration-150 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Registrace…" : "Zaregistrovat se"}
              </Button>

              <p className="text-center text-[12px] text-[var(--color-text-secondary)]">
                Už máte účet?{" "}
                <Link
                  href="/login"
                  className="font-medium text-[var(--color-brand)] hover:underline"
                >
                  Přihlásit se
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
