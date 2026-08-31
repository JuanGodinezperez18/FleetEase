"use client";

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { updatePassword } from '@/lib/auth';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock, CheckCircle2, ArrowLeft, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const initializeRecovery = async () => {
      try {
        const code = searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session) setReady(true);
        else setError('El enlace de recuperación no es válido o ya expiró. Solicita un nuevo enlace.');
      } catch (err) {
        console.error('[Password Recovery] Error inicializando sesión:', err);
        if (mounted) setError(err instanceof Error ? err.message : 'No se pudo validar el enlace de recuperación.');
      } finally {
        if (mounted) setChecking(false);
      }
    };
    initializeRecovery();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true);
        setError('');
        setChecking(false);
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
    setSubmitting(true);
    try {
      const resetError = await updatePassword({ newPassword: password });
      if (resetError) throw resetError;
      setSuccess(true);
      toast.success('Contraseña actualizada correctamente');
    } catch (err) {
      console.error('[Password Recovery] Error actualizando contraseña:', err);
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.';
      setError(message);
      toast.error('No se pudo actualizar la contraseña', { description: message });
    } finally { setSubmitting(false); }
  };

  const Background = () => (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none fixed left-1/2 top-[-260px] z-0 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-[#d7ff3f]/[0.08] blur-[130px]" />
    </>
  );

  const PasswordField = ({ id, label, value, onChange, visible, onToggle }: { id: string; label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void }) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-white/70">{label}</Label>
      <div className="relative">
        <Input id={id} type={visible ? 'text' : 'password'} autoComplete="new-password" value={value} onChange={(e) => onChange(e.target.value)} disabled={submitting} required className="h-11 border-white/[0.10] bg-white/[0.04] pr-12 text-white placeholder:text-white/25 focus:border-[#d7ff3f]/50 focus:ring-[#d7ff3f]/20" />
        <button type="button" onClick={onToggle} aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/40 transition hover:bg-white/[0.06] hover:text-[#d7ff3f]">
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#080a0f] px-5 py-12 text-white">
      <Background />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white"><Image src="/logo.png" alt="FleetEase" width={34} height={34} className="h-8 w-8 object-contain" priority /></div><span className="text-xl font-semibold tracking-[-0.03em]">FleetEase</span></Link>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">Nueva contraseña</h1>
          <p className="mt-2 text-sm text-white/45">Recupera el acceso a tu cuenta de FleetEase Manager.</p>
        </div>
        <Card className="border-white/[0.10] bg-[#0e1117]/95 text-white shadow-[0_30px_80px_rgba(0,0,0,.45)] backdrop-blur-xl">
          {success ? (
            <CardContent className="px-7 py-10 text-center"><CheckCircle2 className="mx-auto mb-5 h-14 w-14 text-[#d7ff3f]" /><CardTitle className="text-2xl text-white">Contraseña actualizada</CardTitle><p className="mt-2 text-sm text-white/45">Tu contraseña se cambió correctamente.</p><Button className="mt-7 w-full rounded-full bg-[#d7ff3f] font-bold text-[#080a0f] hover:bg-white" onClick={() => router.replace('/login')}>Iniciar sesión</Button></CardContent>
          ) : (
            <>
              <CardHeader className="border-b border-white/[0.07] px-7 py-6"><CardTitle className="flex items-center gap-3 text-xl text-white"><Lock className="h-5 w-5 text-[#d7ff3f]" /> Restablecer acceso</CardTitle><CardDescription className="text-white/40">Define una contraseña nueva y segura.</CardDescription></CardHeader>
              <CardContent className="px-7 py-7">
                {checking ? <div className="flex flex-col items-center py-8 text-center text-sm text-white/45"><Loader2 className="mb-3 h-6 w-6 animate-spin text-[#d7ff3f]" />Verificando el enlace...</div> : !ready ? <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-200"><AlertCircle className="mb-2 h-5 w-5 text-red-300" />{error}<Link href="/forgot-password" className="mt-3 block font-semibold text-[#d7ff3f] hover:text-white">Solicitar otro enlace</Link></div> : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <PasswordField id="password" label="Nueva contraseña" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword(v => !v)} />
                    <PasswordField id="confirm-password" label="Confirmar contraseña" value={confirmPassword} onChange={setConfirmPassword} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword(v => !v)} />
                    {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/[0.06] p-3 text-sm text-red-200">{error}</div>}
                    <Button type="submit" disabled={submitting} className="h-11 w-full rounded-full bg-[#d7ff3f] font-bold text-[#080a0f] shadow-[0_0_30px_rgba(215,255,63,.12)] hover:bg-white">{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Actualizando...</> : 'Cambiar contraseña'}</Button>
                  </form>
                )}
                <Link href="/login" className="mt-6 flex items-center justify-center gap-2 text-sm text-white/40 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Volver a iniciar sesión</Link>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
