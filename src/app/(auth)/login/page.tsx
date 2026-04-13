"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Zadejte platnou e-mailovou adresu"),
  password: z.string().min(6, "Heslo musí mít alespoň 6 znaků"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginForm) {
    setServerError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError("Nesprávný e-mail nebo heslo. Zkuste to znovu.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-page)]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-brand)] mb-4">
            <span className="text-white font-semibold text-lg">P</span>
          </div>
          <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)]">
            Pepa
          </h1>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
            Back office agent
          </p>
        </div>

        {/* Card */}
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-4">
              {/* Email */}
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

              {/* Password */}
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
                  autoComplete="current-password"
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

              {/* Server error */}
              {serverError && (
                <div className="rounded-lg bg-[var(--color-error-bg)] px-3 py-2.5">
                  <p className="text-[12px] text-[var(--color-error-text)]">
                    {serverError}
                  </p>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-9 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white rounded-lg text-[13px] font-medium transition-all duration-150 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Přihlašování…" : "Přihlásit se"}
              </Button>

              <p className="text-center text-[12px] text-[var(--color-text-secondary)]">
                Nemáte účet?{" "}
                <Link
                  href="/register"
                  className="font-medium text-[var(--color-brand)] hover:underline"
                >
                  Zaregistrujte se
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
