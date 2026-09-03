"use client";

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { updatePassword } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) setReady(Boolean(session));
    };
    initialize();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY') setReady(true);
      else if (session) setReady(true);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSubmitting(true);
    try {
      const resetError = await updatePassword({ newPassword: password });
      if (resetError) throw resetError;
      setSuccess(true);
      toast.success('Contraseña actualizada correctamente');
    } catch (err) {
      console.error('[Supabase Auth] Error actualizando contraseña:', err);
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.';
      setError(message);
      toast.error('No se pudo actualizar la contraseña', { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--fe-ink)] p-4 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(215,255,63,0.10),transparent_45%)]" />
        <Card className="fe-surface relative w-full max-w-md border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl">
          <CardContent className="pt-9 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--fe-lime)]/30 bg-[var(--fe-lime)]/10">
              <CheckCircle2 className="h-7 w-7 text-[var(--fe-lime)]" />
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-white">Contraseña actualizada</h1>
            <p className="mt-2 text-sm text-white/60">Tu contraseña se cambió correctamente.</p>
            <Button className="mt-7 h-11 w-full bg-[var(--fe-lime)] font-semibold text-[var(--fe-ink)] hover:bg-[var(--fe-lime)]/90" onClick={() => router.push('/login')}>
              Iniciar sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--fe-ink)] p-4 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(215,255,63,0.08),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.04),transparent_35%)]" />
      <Card className="fe-surface relative w-full max-w-md border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--fe-lime)]/30 bg-[var(--fe-lime)]/10">
            <Lock className="h-6 w-6 text-[var(--fe-lime)]" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="font-heading text-2xl font-semibold tracking-tight text-white">Nueva contraseña</CardTitle>
            <CardDescription className="text-white/55">Escribe una nueva contraseña para tu cuenta de FleetEase.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.025] py-6 text-center text-sm text-white/55">Verificando el enlace de recuperación...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-white/75">Nueva contraseña</Label>
                <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={submitting} required className="h-11 border-white/10 bg-white/[0.04] text-white placeholder:text-white/30 focus:border-[var(--fe-lime)] focus:ring-[var(--fe-lime)]/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm text-white/75">Confirmar contraseña</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={submitting} required className="h-11 border-white/10 bg-white/[0.04] text-white placeholder:text-white/30 focus:border-[var(--fe-lime)] focus:ring-[var(--fe-lime)]/20" />
              </div>
              {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
              <Button type="submit" className="h-11 w-full bg-[var(--fe-lime)] font-semibold text-[var(--fe-ink)] shadow-lg shadow-[var(--fe-lime)]/10 hover:bg-[var(--fe-lime)]/90" disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Actualizando...</> : 'Cambiar contraseña'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
