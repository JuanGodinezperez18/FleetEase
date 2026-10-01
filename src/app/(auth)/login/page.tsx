"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-provider";
import { motion, AnimatePresence } from "framer-motion";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, loading, currentUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const callbackUrl = searchParams.get("callbackUrl");

  useEffect(() => {
    let isMounted = true;
    if (!loading && currentUser && !isRedirecting) {
      setIsRedirecting(true);
      const destination = callbackUrl || "/dashboard";
      router.replace(destination);
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser, loading, isRedirecting, router, callbackUrl]);

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleNextStep = (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Por favor ingresa tu correo electrónico");
      return;
    }
    if (!validateEmail(email)) {
      setError("Por favor ingresa un correo electrónico válido");
      return;
    }
    setStep(2);
    setError("");
  };

  const handleBackStep = () => {
    setStep(1);
    setError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);

    if (!email || !password) {
      setError("Por favor completa todos los campos");
      setIsSubmitting(false);
      return;
    }

    try {
      await login(email, password, rememberMe);
      toast.success("Inicio de sesión exitoso");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "unknown";
      const errorMessages: Record<string, string> = {
        "auth/user-not-found": "No existe una cuenta con este correo electrónico",
        "auth/wrong-password": "Contraseña incorrecta",
        "auth/too-many-requests": "Demasiados intentos fallidos. Intenta más tarde",
        "auth/user-disabled": "Esta cuenta ha sido deshabilitada",
        "auth/invalid-email": "El correo electrónico no es válido",
        "auth/invalid-credential": "Credenciales incorrectas. Verifica tu correo y contraseña",
      };
      const errorMessage =
        errorMessages[code] || "Error al iniciar sesión. Verifica tus credenciales.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--fe-ink)] text-[var(--fe-text)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--fe-lime)]" />
        <p className="mt-4 text-sm text-[var(--fe-text-muted)]">
          {currentUser ? "Entrando a tu dashboard…" : "Cargando…"}
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--fe-ink)] p-4 text-[var(--fe-text)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-1/4 -top-1/4 h-[60%] w-[60%] rounded-full bg-[var(--fe-lime)]/[0.04] blur-[100px]" />
        <div className="absolute -bottom-1/4 -left-1/4 h-[50%] w-[50%] rounded-full bg-[var(--fe-lime)]/[0.03] blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-[400px]"
      >
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--fe-text-faint)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--fe-lime)] shadow-[0_0_12px_var(--fe-lime)]" />
            Fleet OS
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--fe-text)]">
            FleetEase <span className="text-[var(--fe-lime)]">Manager</span>
          </h1>
          <p className="mt-2 text-sm text-[var(--fe-text-muted)]">Gestión inteligente de flotillas</p>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-[var(--fe-text)]">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-[var(--fe-text-muted)]">
              {step === 1 ? "Ingresa tu correo para continuar" : "Ingresa tu contraseña"}
            </p>
            <div className="mt-4 flex justify-center gap-1.5">
              <div
                className={`h-1 rounded-full transition-all ${step === 1 ? "w-8 bg-[var(--fe-lime)]" : "w-1.5 bg-white/15"}`}
              />
              <div
                className={`h-1 rounded-full transition-all ${step === 2 ? "w-8 bg-[var(--fe-lime)]" : "w-1.5 bg-white/15"}`}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleNextStep}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-medium text-[var(--fe-text-muted)]">
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--fe-text-faint)]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      autoComplete="email"
                      className="h-11 rounded-xl border-[var(--fe-input-border)] bg-[var(--fe-input-bg)] pl-10 text-[var(--fe-input-text)] placeholder:text-[var(--fe-input-placeholder)] focus-visible:border-[var(--fe-lime)] focus-visible:ring-[var(--fe-focus-ring)]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={!email}
                  className="h-11 w-full rounded-xl bg-[var(--fe-lime)] font-semibold text-[var(--fe-ink)] hover:bg-white disabled:opacity-40"
                >
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <button
                  type="button"
                  onClick={handleBackStep}
                  className="mb-1 flex items-center gap-2 text-sm text-[var(--fe-text-muted)] transition hover:text-[var(--fe-text)]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {email}
                </button>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-medium text-[var(--fe-text-muted)]">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--fe-text-faint)]" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                      autoComplete="current-password"
                      className="h-11 rounded-xl border-[var(--fe-input-border)] bg-[var(--fe-input-bg)] pl-10 text-[var(--fe-input-text)] placeholder:text-[var(--fe-input-placeholder)] focus-visible:border-[var(--fe-lime)] focus-visible:ring-[var(--fe-focus-ring)]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(c) => setRememberMe(c as boolean)}
                      className="border-white/20 data-[state=checked]:border-[var(--fe-lime)] data-[state=checked]:bg-[var(--fe-lime)] data-[state=checked]:text-[var(--fe-ink)]"
                    />
                    <Label htmlFor="remember" className="cursor-pointer text-sm text-[var(--fe-text-muted)]">
                      Recordarme
                    </Label>
                  </div>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-[var(--fe-lime)] hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !password}
                  className="h-11 w-full rounded-xl bg-[var(--fe-lime)] font-semibold text-[var(--fe-ink)] hover:bg-white disabled:opacity-40"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando…
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-6 text-center text-[11px] text-[var(--fe-text-faint)]">
          © {new Date().getFullYear()} FleetEase Manager
        </p>
      </motion.div>
    </div>
  );
}
