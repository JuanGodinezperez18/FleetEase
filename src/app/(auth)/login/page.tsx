
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-provider';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Mail, Lock, ArrowRight, ArrowLeft, User, Shield, Building } from 'lucide-react';
import { toast } from 'sonner';
import { GlobalLoader } from '@/components/common/GlobalLoader';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // ✅ Nuevo estado
  const { login, loading, currentUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const callbackUrl = searchParams.get('callbackUrl');

  // ✅ MEJORA 1: Optimizar useEffect con cleanup y lógica más simple
  useEffect(() => {
    let isMounted = true;
  
    if (!loading && currentUser && !isRedirecting) {
      setIsRedirecting(true); // Prevenir múltiples redirecciones
  
      const redirectUser = async () => {
        try {
          // No es necesario obtener el rol de Firestore aquí, 
          // el middleware y los layouts de cada ruta se encargarán de la redirección final.
          // Simplificamos la redirección al dashboard o a la URL de callback.
          const destination = callbackUrl || '/dashboard';
          console.log(`[Login] Usuario autenticado. Redirigiendo a: ${destination}`);
          router.replace(destination);
        } catch (error) {
          console.error('[Login] Error durante la redirección:', error);
          // Fallback a dashboard en caso de error
          router.replace('/dashboard');
        } finally {
          if (isMounted) {
            // Aunque estamos navegando, es buena práctica resetear el estado si es necesario
            // En este caso, al navegar, el componente se desmontará.
          }
        }
      };
  
      redirectUser();
    }
  
    return () => {
      isMounted = false;
    };
  }, [currentUser, loading, isRedirecting, router, callbackUrl]); // ✅ Dependencias correctas


  // ✅ MEJORA 2: Validación de email
  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // ✅ MEJORA 3: handleNextStep con validación
  const handleNextStep = (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }
    if (!validateEmail(email)) {
      setError('Por favor ingresa un correo electrónico válido');
      return;
    }
    setStep(2);
    setError('');
  };

  const handleBackStep = () => {
    setStep(1);
    setError('');
  };

  // ✅ MEJORA 4: handleSubmit mejorado con mensajes específicos y prevención de doble submit
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (isSubmitting) return; // ✅ Prevenir múltiples envíos
    
    setError('');
    setIsSubmitting(true);

    if (!email || !password) {
      setError('Por favor completa todos los campos');
      setIsSubmitting(false);
      return;
    }

    try {
      await login(email, password, rememberMe);
      toast.success('Inicio de sesión exitoso');
    } catch (err: any) {
      console.error('Error en login:', err);
      
      // ✅ Mensajes específicos por código de error
      const errorMessages: Record<string, string> = {
        'auth/user-not-found': 'No existe una cuenta con este correo electrónico',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
        'auth/invalid-email': 'El correo electrónico no es válido',
        'auth/invalid-credential': 'Credenciales incorrectas. Verifica tu correo y contraseña',
      };
      
      const errorCode = err.code || 'unknown';
      const errorMessage = errorMessages[errorCode] || 'Error al iniciar sesión. Verifica tus credenciales.';
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ MEJORA 6: Loading states mejorados
  if (loading || currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" suppressHydrationWarning>
        <GlobalLoader />
        <p className="mt-4 text-slate-600 dark:text-slate-400">
            {currentUser ? 'Redirigiendo a tu dashboard...' : 'Cargando autenticación...'}
        </p>
      </div>
    );
  }

  // Variantes de animación
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      }
    }
  };

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      }
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
      transition: {
        duration: 0.3,
      }
    })
  };

  // ✅ MEJORA 8: Simplificar animación del logo
  const logoVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      }
    }
  };

  const titleVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: 0.2,
        ease: [0.22, 1, 0.36, 1],
      }
    }
  };

  const taglineVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: 0.3,
        ease: [0.22, 1, 0.36, 1],
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden" suppressHydrationWarning>
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -right-1/2 w-full h-full bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-slate-500/5 dark:bg-slate-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo y Branding */}
        <div className="mb-8 text-center">
          <motion.div
            variants={logoVariants}
            className="flex justify-center mb-4"
          >
            {/* ✅ MEJORA 7: Logo responsive */}
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-2xl shadow-slate-900/10 dark:shadow-slate-950/50 border-2 border-slate-200/50 dark:border-slate-700/50">
              <Image
                src="/logo.png"
                alt="FleetEase Logo"
                width={90}
                height={90}
                priority
                className="w-16 h-16 sm:w-[90px] sm:h-[90px]"
              />
            </div>
          </motion.div>
          
          <motion.h1
            variants={titleVariants}
            className="text-3xl font-bold mb-2 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent"
          >
            FleetEase Manager
          </motion.h1>
          
          <motion.p
            variants={taglineVariants}
            className="text-sm text-slate-600 dark:text-slate-400 font-medium"
          >
            Gestión de Flotas Inteligente
          </motion.p>
        </div>

        {/* Card de Login */}
        <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-2xl shadow-slate-900/5 dark:shadow-slate-950/50 backdrop-blur-sm bg-white/80 dark:bg-slate-900/80">
          <CardHeader className="space-y-4 pb-6">
            <div className="text-center space-y-2">
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Iniciar Sesión
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                {step === 1 ? 'Ingresa tu correo para continuar' : 'Ingresa tu contraseña'}
              </CardDescription>
            </div>

            {/* Indicador de progreso */}
            <div className="flex gap-2 justify-center pt-2">
              <motion.div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === 1 ? 'w-8 bg-blue-600' : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                }`}
                layoutId="progress"
              />
              <motion.div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === 2 ? 'w-8 bg-blue-600' : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                }`}
                layoutId="progress2"
              />
            </div>
          </CardHeader>

          <CardContent>
            <div className="relative overflow-hidden">
              <AnimatePresence mode="wait" custom={step}>
                {step === 1 ? (
                  <motion.form
                    key="step1"
                    custom={1}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    onSubmit={handleNextStep}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Correo Electrónico
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                        {/* ✅ MEJORA 3: Accesibilidad mejorada */}
                        <Input
                          id="email"
                          type="email"
                          placeholder="tu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          autoFocus
                          autoComplete="email"
                          aria-label="Correo electrónico"
                          aria-invalid={!!error}
                          aria-describedby={error ? "error-message" : undefined}
                          className="pl-10 h-11 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* ✅ MEJORA 3: Mensaje de error con accesibilidad */}
                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div
                          id="error-message"
                          role="alert"
                          aria-live="polite"
                          initial={{ opacity: 0, y: -10, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -10, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3"
                        >
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button
                      type="submit"
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 font-medium group"
                      disabled={!email}
                    >
                      Continuar
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </Button>
                  </motion.form>
                ) : (
                  <motion.form
                    key="step2"
                    custom={2}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    onSubmit={handleSubmit}
                    className="space-y-5"
                  >
                    <button
                      type="button"
                      onClick={handleBackStep}
                      className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors duration-200 group mb-4"
                    >
                      <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
                      {email}
                    </button>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Contraseña
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                        {/* ✅ MEJORA 3: Accesibilidad mejorada */}
                        <Input
                          id="password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoFocus
                          autoComplete="current-password"
                          aria-label="Contraseña"
                          aria-invalid={!!error}
                          aria-describedby={error ? "error-message" : undefined}
                          className="pl-10 h-11 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                        />
                      </div>
                    </div>

                    {/* ✅ MEJORA 3: Mensaje de error con accesibilidad */}
                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div
                          id="error-message"
                          role="alert"
                          aria-live="polite"
                          initial={{ opacity: 0, y: -10, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -10, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3"
                        >
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="remember"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                          className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                        />
                        <Label
                          htmlFor="remember"
                          className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none"
                        >
                          Recordarme
                        </Label>
                      </div>
                      <Link
                        href="/forgot-password"
                        className="text-sm text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 font-medium transition-colors duration-200"
                      >
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>

                    {/* ✅ MEJORA 5: Botón con estado de submitting */}
                    <Button
                      type="submit"
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-200 font-medium"
                      disabled={loading || isSubmitting}
                    >
                      {(loading || isSubmitting) ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Iniciando sesión...
                        </>
                      ) : (
                        'Iniciar Sesión'
                      )}
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* ✅ MEJORA 9: Badges de rol con aria-label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mt-6 grid grid-cols-3 gap-3"
          role="presentation"
          aria-label="Tipos de usuario disponibles"
        >
          <div className="text-center p-3 rounded-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
            <Shield className="h-5 w-5 mx-auto mb-1 text-blue-600 dark:text-blue-500" aria-hidden="true" />
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Admin</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
            <Building className="h-5 w-5 mx-auto mb-1 text-purple-600 dark:text-purple-500" aria-hidden="true" />
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Socio</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
            <User className="h-5 w-5 mx-auto mb-1 text-green-600 dark:text-green-500" aria-hidden="true" />
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Cliente</p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-center mt-6 text-sm text-slate-600 dark:text-slate-400"
        >
          <p>© 2025 FleetEase. Sistema de gestión de flotas vehiculares.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
