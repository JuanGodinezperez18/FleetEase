"use client";

import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/types";

interface MfaChallengeProps {
  profile: UserProfile;
  onVerified: () => void;
  onCancel: () => Promise<void>;
}

export function MfaChallenge({ profile, onVerified, onCancel }: MfaChallengeProps) {
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const prepare = async () => {
      setLoading(true);
      setError(null);
      const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (!mounted) return;
      if (factorsError) {
        setError("No pudimos preparar la autenticación de dos factores.");
        setLoading(false);
        return;
      }
      const factor = (data?.totp ?? []).find((item) => item.status === "verified");
      if (!factor) {
        setError("No encontramos un autenticador verificado para esta cuenta.");
        setLoading(false);
        return;
      }
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id });
      if (!mounted) return;
      if (challengeError) {
        setError("No pudimos iniciar el desafío de seguridad. Inténtalo de nuevo.");
        setLoading(false);
        return;
      }
      setFactorId(factor.id);
      setChallengeId(challenge.id);
      setLoading(false);
    };
    void prepare();
    return () => { mounted = false; };
  }, []);

  const verify = async () => {
    if (!factorId || !challengeId || code.length !== 6) return;
    setVerifying(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });
    if (verifyError) {
      setError("Código incorrecto. Revisa tu aplicación autenticadora.");
      setVerifying(false);
      return;
    }
    onVerified();
  };

  return (
    <main className="min-h-screen grid place-items-center bg-background px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg sm:p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="mt-5 text-center">
          <p className="text-sm font-medium text-primary">Verificación de seguridad</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Confirma tu identidad</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Introduce el código de 6 dígitos de tu aplicación autenticadora para continuar{profile.name ? `, ${profile.name}` : ""}.
          </p>
        </div>

        {loading ? (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Preparando verificación...
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-mfa-code">Código de autenticación</Label>
              <Input
                id="login-mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(event) => { if (event.key === "Enter") void verify(); }}
                placeholder="000000"
                className="h-12 text-center text-lg tracking-[0.45em]"
              />
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="h-11 w-full" onClick={() => void verify()} disabled={verifying || code.length !== 6}>
              {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Verificar y continuar
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => void onCancel()} disabled={verifying}>
              Cancelar y cerrar sesión
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
