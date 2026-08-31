"use client";

import React from 'react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-provider';
import { Check, Loader2, Mail, Send, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'sonner';

type Step = 'email_input' | 'sending' | 'sent';

const stepsConfig = [
  { id: 1, name: 'Verificación', shortName: 'Email' },
  { id: 2, name: 'Envío', shortName: 'Enviar' },
  { id: 3, name: 'Revisión', shortName: 'Revisar' },
  { id: 4, name: 'Recuperación', shortName: 'Nueva' },
];

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [currentStep, setCurrentStep] = useState<Step>('email_input');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSentTime, setLastSentTime] = useState<number | null>(null);
  const { sendPasswordResetEmail, loading } = useAuth();

  const validateEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const canResend = () => !lastSentTime || Date.now() - lastSentTime >= 60000;
  const getResendCooldown = () => !lastSentTime ? 0 : Math.max(0, Math.ceil((60000 - (Date.now() - lastSentTime)) / 1000));

  const getErrorMessage = (err: unknown) => {
    const error = err as { code?: string; message?: string; status?: number };
    const message = error?.message || '';
    const normalized = message.toLowerCase();
    if (normalized.includes('rate limit') || normalized.includes('too many requests') || error?.status === 429) return 'Se alcanzó el límite de envíos. Espera unos minutos e inténtalo nuevamente.';
    if (normalized.includes('smtp')) return `No se pudo enviar el correo mediante SMTP. Revisa la configuración de Supabase/Resend. (${message})`;
    if (normalized.includes('redirect') || normalized.includes('url')) return `La URL de recuperación no está autorizada en Supabase. (${message})`;
    return message || 'No se pudo enviar el enlace de recuperación. Intenta nuevamente.';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return setError('Por favor ingresa tu correo electrónico');
    if (!validateEmail(normalizedEmail)) return setError('Por favor ingresa un correo electrónico válido');
    if (!canResend()) return setError(`Por favor espera ${getResendCooldown()} segundos antes de reenviar`);

    setIsSubmitting(true);
    setCurrentStep('sending');
    try {
      await sendPasswordResetEmail(normalizedEmail);
      setCurrentStep('sent');
      setLastSentTime(Date.now());
      toast.success('Correo enviado', { description: 'Se ha enviado un enlace para restablecer tu contraseña.' });
    } catch (err) {
      console.error('[Forgot Password] Error al enviar correo:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      setCurrentStep('email_input');
      toast.error('Error', { description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const Stepper = () => (
    <div className="flex justify-between items-center mb-8 px-2" role="progressbar" aria-valuenow={currentStep === 'email_input' ? 1 : currentStep === 'sending' ? 2 : 3} aria-valuemin={1} aria-valuemax={4}>
      {stepsConfig.map((step, index) => {
        const status = currentStep === 'email_input' ? (step.id === 1 ? 'active' : 'pending') : currentStep === 'sending' ? (step.id === 1 ? 'completed' : step.id === 2 ? 'active' : 'pending') : (step.id <= 3 ? 'completed' : 'pending');
        const isLastStep = index === stepsConfig.length - 1;
        return <React.Fragment key={step.id}><div className="flex flex-col items-center text-center"><div className={cn('w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2', status === 'active' && 'bg-blue-600 border-blue-600 text-white', status === 'completed' && 'bg-green-500 border-green-500 text-white', status === 'pending' && 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400')} aria-label={`Paso ${step.id}: ${step.name}`}>{status === 'completed' ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : status === 'active' && currentStep === 'sending' && step.id === 2 ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <span className="font-bold text-sm sm:text-base">{step.id}</span>}</div><p className={cn('text-[10px] sm:text-xs mt-1 max-w-[60px] sm:max-w-none', status === 'active' || status === 'completed' ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400')}><span className="hidden sm:inline">{step.name}</span><span className="sm:hidden">{step.shortName}</span></p></div>{!isLastStep && <div className={cn('flex-1 h-0.5 mx-1 sm:mx-2', status === 'pending' ? 'bg-slate-300 dark:bg-slate-600' : 'bg-green-500')} />}</React.Fragment>;
      })}
    </div>
  );

  return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4"><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg"><Card className="shadow-2xl border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 rounded-2xl"><CardHeader className="text-center space-y-4 pt-8"><CardTitle className="text-3xl font-bold">Recuperar Contraseña</CardTitle><CardDescription className="text-slate-600 dark:text-slate-400">Sigue los pasos para restablecer tu acceso a FleetEase</CardDescription></CardHeader><CardContent className="px-8 pb-8 pt-2"><Stepper /><AnimatePresence mode="wait">{currentStep === 'sent' ? <motion.div key="sent" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center"><div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4"><Mail className="w-8 h-8 text-green-600" /></div><CardTitle className="text-2xl font-bold mb-2">¡Revisa tu correo!</CardTitle><p className="text-slate-600 dark:text-slate-400 mb-2">Hemos enviado un enlace para restablecer la contraseña a:</p><p className="font-semibold mb-4">{email}</p><Button onClick={() => handleSubmit({ preventDefault: () => {} } as FormEvent)} disabled={loading || isSubmitting || !canResend()} className="w-full" variant="outline">{(loading || isSubmitting) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reenviando...</> : !canResend() ? `Espera ${getResendCooldown()}s para reenviar` : <><Send className="mr-2 h-4 w-4" />Reenviar Email</>}</Button><p className="text-xs text-slate-500 mt-4">¿No recibiste el correo? Revisa spam o correo no deseado.</p></motion.div> : <motion.div key="email_input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}><form onSubmit={handleSubmit} className="space-y-5"><div className="space-y-2"><Label htmlFor="email">Correo Electrónico</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => { setEmail(e.target.value); if (error) setError(''); }} required autoFocus autoComplete="email" aria-invalid={!!error} aria-describedby={error ? 'error-message' : undefined} className="pl-10 h-11" disabled={loading || isSubmitting} /></div>{error && <p id="error-message" role="alert" aria-live="polite" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}</div><Button type="submit" className="w-full h-11" disabled={loading || isSubmitting || !email}>{(loading || isSubmitting) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : <><Mail className="mr-2 h-4 w-4" />Enviar Enlace</>}</Button></form></motion.div>}</AnimatePresence><div className="mt-6 text-center"><Link href="/login" className="inline-flex items-center gap-2 text-sm text-blue-600 font-medium"><ArrowLeft className="h-4 w-4" />Volver a Iniciar Sesión</Link></div></CardContent></Card></motion.div></div>;
}
