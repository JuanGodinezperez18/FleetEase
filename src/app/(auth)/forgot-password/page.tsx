
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
  const [isSubmitting, setIsSubmitting] = useState(false); // ✅ Nuevo
  const [lastSentTime, setLastSentTime] = useState<number | null>(null); // ✅ Nuevo
  const { sendPasswordResetEmail, loading } = useAuth();

  // ✅ MEJORA 1: Validación de email
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const getStepStatus = (stepId: number) => {
    switch (currentStep) {
      case 'email_input':
        return stepId === 1 ? 'active' : 'pending';
      case 'sending':
        if (stepId === 1) return 'completed';
        if (stepId === 2) return 'active';
        return 'pending';
      case 'sent':
        if (stepId <= 3) return 'completed';
        return 'pending';
      default:
        return 'pending';
    }
  };

  // ✅ MEJORA 2: Rate limiting
  const canResend = () => {
    if (!lastSentTime) return true;
    const timeSinceLastSent = Date.now() - lastSentTime;
    const cooldownPeriod = 60000; // 60 segundos
    return timeSinceLastSent >= cooldownPeriod;
  };

  const getResendCooldown = () => {
    if (!lastSentTime) return 0;
    const timeSinceLastSent = Date.now() - lastSentTime;
    const cooldownPeriod = 60000;
    return Math.max(0, Math.ceil((cooldownPeriod - timeSinceLastSent) / 1000));
  };

  // ✅ MEJORA 3: handleSubmit mejorado
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return; // ✅ Prevenir doble submit
    
    setError('');

    // ✅ Validación de email
    if (!email) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    if (!validateEmail(email)) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }

    // ✅ Rate limiting
    if (!canResend()) {
      const cooldown = getResendCooldown();
      setError(`Por favor espera ${cooldown} segundos antes de reenviar`);
      return;
    }

    setIsSubmitting(true);
    setCurrentStep('sending');

    try {
      await sendPasswordResetEmail(email);
      setCurrentStep('sent');
      setLastSentTime(Date.now()); // ✅ Guardar tiempo de envío
      toast.success('Correo enviado', {
        description: 'Se ha enviado un correo para restablecer tu contraseña.',
      });
    } catch (err: any) {
      console.error('Error al enviar correo:', err);
      
      // ✅ MEJORA 4: Mensajes de error específicos
      const errorMessages: Record<string, string> = {
        'auth/user-not-found': 'No existe una cuenta con este correo electrónico',
        'auth/invalid-email': 'El correo electrónico no es válido',
        'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet',
      };
      
      const errorCode = err.code || 'unknown';
      const errorMessage = errorMessages[errorCode] || 'Ocurrió un error inesperado. Intenta nuevamente.';
      
      setError(errorMessage);
      setCurrentStep('email_input');
      toast.error('Error', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ MEJORA 5: Stepper accesible y responsive
  const Stepper = () => (
    <div className="flex justify-between items-center mb-8 px-2" role="progressbar" aria-valuenow={currentStep === 'email_input' ? 1 : currentStep === 'sending' ? 2 : 3} aria-valuemin={1} aria-valuemax={4}>
      {stepsConfig.map((step, index) => {
        const status = getStepStatus(step.id);
        const isLastStep = index === stepsConfig.length - 1;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center text-center">
              <div
                className={cn(
                  'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                  status === 'active' && 'bg-blue-600 border-blue-600 text-white',
                  status === 'completed' && 'bg-green-500 border-green-500 text-white',
                  status === 'pending' && 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400'
                )}
                aria-label={`Paso ${step.id}: ${step.name}`}
              >
                {status === 'completed' ? (
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
                ) : status === 'active' && currentStep === 'sending' && step.id === 2 ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" aria-hidden="true" />
                ) : (
                  <span className={cn('font-bold text-sm sm:text-base')}>{step.id}</span>
                )}
              </div>
              <p
                className={cn(
                  'text-[10px] sm:text-xs mt-1 transition-colors duration-300 max-w-[60px] sm:max-w-none',
                  status === 'active' || status === 'completed' ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
                )}
              >
                <span className="hidden sm:inline">{step.name}</span>
                <span className="sm:hidden">{step.shortName}</span>
              </p>
            </div>
            {!isLastStep && (
              <div 
                className={cn(
                  "flex-1 h-0.5 mx-1 sm:mx-2 transition-colors duration-300",
                  getStepStatus(step.id + 1) === 'pending' ? 'bg-slate-300 dark:bg-slate-600' : 'bg-green-500'
                )} 
                aria-hidden="true"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
  
  const renderContent = () => {
    switch(currentStep) {
      case 'sent':
        return (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            {/* ✅ Icono de éxito */}
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-green-600 dark:text-green-500" />
            </div>
            
            <CardTitle className="text-2xl font-bold mb-2">¡Revisa tu correo!</CardTitle>
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              Hemos enviado un enlace para restablecer la contraseña a:
            </p>
            <p className="font-semibold text-slate-900 dark:text-slate-100 mb-4">{email}</p>
            
            {/* ✅ Instrucciones adicionales */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4 text-sm text-left mb-6">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">Pasos a seguir:</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
                <li>Abre tu correo electrónico</li>
                <li>Busca el email de FleetEase</li>
                <li>Haz clic en el enlace de recuperación</li>
                <li>Crea tu nueva contraseña</li>
              </ol>
            </div>

            {/* ✅ Botón de reenvío mejorado */}
            <Button 
              onClick={handleSubmit as any} 
              disabled={loading || isSubmitting || !canResend()} 
              className="w-full"
              variant="outline"
            >
              {(loading || isSubmitting) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : !canResend() ? (
                `Espera ${getResendCooldown()}s para reenviar`
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Reenviar Email
                </>
              )}
            </Button>

            {/* ✅ Nota adicional */}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
              ¿No recibiste el correo? Revisa tu carpeta de spam o correo no deseado.
            </p>
          </motion.div>
        );
        
      case 'email_input':
      case 'sending':
      default:
        return (
          <motion.div
            key="email_input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Correo Electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  {/* ✅ MEJORA 3: Input con accesibilidad */}
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(''); // ✅ Limpiar error al escribir
                    }}
                    required
                    autoFocus
                    autoComplete="email"
                    aria-label="Correo electrónico"
                    aria-invalid={!!error}
                    aria-describedby={error ? "error-message" : undefined}
                    className="pl-10 h-11 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                    disabled={loading || isSubmitting}
                  />
                </div>
                
                {/* ✅ MEJORA 3: Mensaje de error accesible */}
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.p
                      id="error-message"
                      role="alert"
                      aria-live="polite"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 font-medium"
                disabled={loading || isSubmitting || !email}
              >
                {(loading || isSubmitting) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar Enlace
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="shadow-2xl shadow-slate-900/5 dark:shadow-slate-950/50 border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm bg-white/80 dark:bg-slate-900/80 rounded-2xl">
          <CardHeader className="text-center space-y-4 pt-8">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              Recuperar Contraseña
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Sigue los pasos para restablecer tu acceso a FleetEase
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-8 pb-8 pt-2">
            <Stepper />
            <AnimatePresence mode="wait">
              {renderContent()}
            </AnimatePresence>
            
            {/* ✅ Link mejorado */}
            <div className="mt-6 text-center">
              <Link 
                href="/login" 
                className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 font-medium transition-colors duration-200 group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
                Volver a Iniciar Sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}