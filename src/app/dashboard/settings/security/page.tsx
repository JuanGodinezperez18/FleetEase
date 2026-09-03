"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Smartphone, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [factors, setFactors] = useState<any[]>([]);

  const loadFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error("No pudimos consultar la autenticación de dos factores.");
      return;
    }
    setFactors([...(data?.totp ?? [])].filter((factor) => factor.status === "verified"));
    setLoading(false);
  };

  useEffect(() => {
    void loadFactors();
  }, []);

  const startEnrollment = async () => {
    setEnrolling(true);
    setCode("");
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "FleetEase Authenticator",
    });
    if (error) {
      toast.error(error.message);
      setEnrolling(false);
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
  };

  const verifyEnrollment = async () => {
    if (!factorId || code.length < 6) return;
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      toast.error(challengeError.message);
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    if (error) {
      toast.error("Código incorrecto. Revisa tu aplicación autenticadora.");
      return;
    }
    toast.success("Autenticación de dos factores activada.");
    setEnrolling(false);
    setFactorId("");
    setQrCode("");
    setCode("");
    await loadFactors();
  };

  const removeFactor = async (id: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Factor de autenticación eliminado.");
    await loadFactors();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="fe-section-title">Seguridad</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Autenticación de dos factores</h1>
        <p className="mt-2 text-sm text-muted-foreground">Protege tu cuenta con un código temporal de una aplicación autenticadora.</p>
      </div>

      <section className="fe-surface rounded-2xl p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary/10 p-3 text-primary"><ShieldCheck className="h-6 w-6" /></div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-lg font-semibold">Authenticator (TOTP)</h2>
            <p className="mt-1 text-sm text-muted-foreground">Compatible con Google Authenticator, Authy, 1Password y otras aplicaciones TOTP.</p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Comprobando factores...</div>
        ) : factors.length > 0 ? (
          <div className="mt-6 space-y-3">
            {factors.map((factor) => (
              <div key={factor.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 p-4">
                <div className="flex items-center gap-3"><Smartphone className="h-5 w-5 text-primary" /><div><p className="text-sm font-medium">{factor.friendly_name || "Authenticator"}</p><p className="text-xs text-muted-foreground">Activo y verificado</p></div></div>
                <Button variant="ghost" size="icon" onClick={() => removeFactor(factor.id)} aria-label="Eliminar autenticador"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            ))}
          </div>
        ) : !enrolling ? (
          <Button onClick={startEnrollment} className="mt-6"><ShieldCheck className="mr-2 h-4 w-4" /> Activar 2FA</Button>
        ) : null}

        {enrolling && qrCode && (
          <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr] items-center rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="rounded-xl bg-white p-3 w-fit mx-auto" dangerouslySetInnerHTML={{ __html: qrCode }} aria-label="Código QR para configurar autenticación de dos factores" />
            <div className="space-y-4">
              <div><p className="font-medium">1. Escanea el código QR</p><p className="text-sm text-muted-foreground">Agrega FleetEase a tu aplicación autenticadora.</p></div>
              <div className="space-y-2"><Label htmlFor="mfa-code">2. Introduce el código de 6 dígitos</Label><Input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className="max-w-xs tracking-[0.35em] text-center" /></div>
              <Button onClick={verifyEnrollment} disabled={code.length !== 6}>Verificar y activar</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
