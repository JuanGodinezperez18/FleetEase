"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-provider";
import { Loader2, Mail, Send, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";

type Step = "email_input" | "sending" | "sent";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [currentStep, setCurrentStep] = useState<Step>("email_input");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSentTime, setLastSentTime] = useState<number | null>(null);
  const { sendPasswordResetEmail, loading } = useAuth();

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const canResend = () => !lastSentTime || Date.now() - lastSentTime >= 60000;
  const getResendCooldown = () =>
    !lastSentTime ? 0 : Math.max(0, Math.ceil((60000 - (Date.now() - lastSentTime)) / 1000));

  const getErrorMessage = (err: unknown) => {
    const error = err as { code?: string; message?: string; status?: number };
    const message = error?.message || "";
    const normalized = message.toLowerCase();
    if (
      normalized.includes("rate limit") ||
      normalized.includes("too many requests") ||
      error?.status === 429
    ) {
      return "Se alcanzó el límite de envíos. Espera unos minutos e inténtalo nuevamente.";
    }
    if (normalized.includes("smtp")) {
      return "No se pudo enviar el correo. Revisa la configuración de correo.";
    }
    return message || "No se pudo enviar el enlace de recuperación. Intenta nuevamente.";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return setError("Por favor ingresa tu correo electrónico");
    if (!validateEmail(normalizedEmail))
      return setError("Por favor ingresa un correo electrónico válido");
    if (!canResend())
      return setError(`Por favor espera ${getResendCooldown()} segundos antes de reenviar`);

    setIsSubmitting(true);
    setCurrentStep("sending");
    try {
      await sendPasswordResetEmail(normalizedEmail);
      setCurrentStep("sent");
      setLastSentTime(Date.now());
      toast.success("Correo enviado", {
        description: "Se ha enviado un enlace para restablecer tu contraseña.",
      });
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      setCurrentStep("email_input");
      toast.error("Error", { description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080a0f] p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-1/4 -top-1/4 h-[60%] w-[60%] rounded-full bg-[#d7ff3f]/[0.04] blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[400px]"
      >
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
            Fleet OS
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-white">
            Recuperar <span className="text-[#d7ff3f]">acceso</span>
          </h1>
          <p className="mt-2 text-sm text-white/45">Te enviaremos un enlace a tu correo</p>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <AnimatePresence mode="wait">
            {currentStep === "sent" ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d7ff3f]/10">
                  <CheckCircle2 className="h-7 w-7 text-[#d7ff3f]" />
                </div>
                <h2 className="text-lg font-semibold text-white">Revisa tu correo</h2>
                <p className="mt-2 text-sm text-white/45">
                  Enviamos un enlace para restablecer la contraseña a
                </p>
                <p className="mt-1 font-medium text-[#d7ff3f]">{email}</p>

                <Button
                  onClick={() => handleSubmit({ preventDefault: () => {} } as FormEvent)}
                  disabled={loading || isSubmitting || !canResend()}
                  variant="outline"
                  className="mt-6 h-11 w-full rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5"
                >
                  {loading || isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reenviando…
                    </>
                  ) : !canResend() ? (
                    `Espera ${getResendCooldown()}s`
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Reenviar email
                    </>
                  )}
                </Button>
                <p className="mt-4 text-xs text-white/30">
                  ¿No llegó? Revisa spam o correo no deseado.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleSubmit}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-medium text-white/55">
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      required
                      autoFocus
                      autoComplete="email"
                      disabled={loading || isSubmitting}
                      className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/25 focus-visible:border-[#d7ff3f]/40 focus-visible:ring-[#d7ff3f]/15"
                    />
                  </div>
                  {error && (
                    <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
                      {error}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading || isSubmitting || !email}
                  className="h-11 w-full rounded-xl bg-[#d7ff3f] font-semibold text-[#080a0f] hover:bg-[#e0ff5c] disabled:opacity-40"
                >
                  {loading || isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Enviar enlace
                    </>
                  )}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-white/45 transition hover:text-[#d7ff3f]"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a iniciar sesión
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-white/30">
          © {new Date().getFullYear()} FleetEase Manager
        </p>
      </motion.div>
    </div>
  );
}
