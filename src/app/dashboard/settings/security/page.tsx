"use client";

import { useEffect, useState } from 'react';
import { ShieldCheck, Smartphone, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const inputClass =
  'h-10 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:ring-[#d7ff3f]/30';
const labelClass = 'text-xs font-medium text-white/55';
const sectionClass =
  'rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_18px_50px_rgba(0,0,0,.18)] sm:p-5';

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [code, setCode] = useState('');
  const [factors, setFactors] = useState<any[]>([]);

  const loadFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error('No pudimos consultar la autenticación de dos factores.');
      return;
    }
    setFactors([...(data?.totp ?? [])].filter(factor => factor.status === 'verified'));
    setLoading(false);
  };

  useEffect(() => {
    void loadFactors();
  }, []);

  const startEnrollment = async () => {
    setEnrolling(true);
    setCode('');
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'FleetEase Authenticator',
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
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId,
    });
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
      toast.error('Código incorrecto. Revisa tu aplicación autenticadora.');
      return;
    }
    toast.success('Autenticación de dos factores activada.');
    setEnrolling(false);
    setFactorId('');
    setQrCode('');
    setCode('');
    await loadFactors();
  };

  const removeFactor = async (id: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Factor de autenticación eliminado.');
    await loadFactors();
  };

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header>
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
            Administración
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            Seguridad
          </h1>
          <p className="mt-1 text-sm text-white/45">
            Autenticación de dos factores (TOTP)
          </p>
        </header>

        <section className={sectionClass}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
              <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-white">Authenticator (TOTP)</h2>
              <p className="mt-0.5 text-xs text-white/40">
                Compatible con Google Authenticator, Authy, 1Password y otras apps TOTP
              </p>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-white/45">
              <Loader2 className="h-4 w-4 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
              Comprobando factores...
            </div>
          ) : factors.length > 0 ? (
            <div className="mt-5 space-y-2">
              {factors.map(factor => (
                <div
                  key={factor.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                      <Smartphone className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">
                        {factor.friendly_name || 'Authenticator'}
                      </p>
                      <p className="text-xs text-white/40">Activo y verificado</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFactor(factor.id)}
                    aria-label="Eliminar autenticador"
                    className="h-9 w-9 rounded-lg text-rose-400 hover:bg-rose-500/15 hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                </div>
              ))}
            </div>
          ) : !enrolling ? (
            <Button
              onClick={startEnrollment}
              className="mt-5 h-10 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
            >
              <ShieldCheck className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Activar 2FA
            </Button>
          ) : null}

          {enrolling && qrCode && (
            <div className="mt-5 grid items-center gap-5 rounded-[16px] border border-[#d7ff3f]/20 bg-[#d7ff3f]/[0.04] p-4 sm:grid-cols-[200px_1fr] sm:p-5">
              <div
                className="mx-auto w-fit rounded-xl bg-white p-3"
                dangerouslySetInnerHTML={{ __html: qrCode }}
                aria-label="Código QR para configurar autenticación de dos factores"
              />
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-white/90">1. Escanea el código QR</p>
                  <p className="mt-0.5 text-xs text-white/40">
                    Agrega FleetEase a tu aplicación autenticadora
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mfa-code" className={labelClass}>
                    2. Código de 6 dígitos
                  </Label>
                  <Input
                    id="mfa-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className={`${inputClass} max-w-xs text-center tracking-[0.35em]`}
                  />
                </div>
                <Button
                  onClick={verifyEnrollment}
                  disabled={code.length !== 6}
                  className="h-10 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e] disabled:opacity-40"
                >
                  Verificar y activar
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
