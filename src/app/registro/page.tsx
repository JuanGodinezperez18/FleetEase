"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, Mail, Lock, User, Phone, Building, CheckCircle, AlertCircle, Zap, TrendingUp, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type PlanType, plans } from '@/config/plans';

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  selectedPlan: PlanType;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<RegisterData>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    selectedPlan: 'starter',
  });

  const updateField = (field: keyof RegisterData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (step === 1 && data.name && data.email && data.companyName) {
      setStep(2);
    } else if (step === 2 && data.phone && data.password && data.confirmPassword) {
      if (data.password !== data.confirmPassword) {
        toast.error('Las contraseñas no coinciden');
        return;
      }
      if (data.password.length < 6) {
        toast.error('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      setStep(3);
    }
  };

  const handleBackStep = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // 1. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      // 2. Actualizar perfil con el nombre
      await updateProfile(user, {
        displayName: data.name,
      });

      // 3. Llamar a la función cloud para crear empresa y asignar usuario
      const functions = getFunctions();
      const createCompanyAndUser = httpsCallable(functions, 'createCompanyAndUser');

      const result = await createCompanyAndUser({
        email: data.email,
        name: data.name,
        phone: data.phone,
        companyName: data.companyName,
        plan: data.selectedPlan,
      });

      const responseData = result.data as any;

      if (responseData.success) {
        toast.success('¡Cuenta creada exitosamente!');
        toast.info('Redirigiendo al dashboard...');
        
        // 4. Redirigir al dashboard
        setTimeout(() => {
          router.replace('/dashboard');
        }, 2000);
      } else {
        throw new Error(responseData.message || 'Error al crear la cuenta');
      }
    } catch (error: any) {
      console.error('Error en registro:', error);
      
      let errorMessage = 'Error al crear la cuenta. Intenta de nuevo.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este correo ya está registrado. Inicia sesión o usa otro correo.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es muy débil. Usa al menos 6 caracteres.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El correo electrónico no es válido.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      
      // Si falla, intentar limpiar
      try {
        await auth.currentUser?.delete();
      } catch {}
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
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
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
      transition: { duration: 0.3 }
    })
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -right-1/2 w-full h-full bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-slate-500/5 dark:bg-slate-500/10 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-2xl relative z-10"
      >
        {/* Logo y Branding */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-4"
          >
            <div className="relative w-20 h-20 rounded-3xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-2xl">
              <Image
                src="/logo.png"
                alt="FleetEase Logo"
                width={70}
                height={70}
                priority
                className="w-[70px] h-[70px]"
              />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-3xl font-bold mb-2 bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent"
          >
            Comienza Gratis
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-sm text-slate-600 dark:text-slate-400"
          >
            Crea tu cuenta en 2 minutos • Sin tarjeta de crédito
          </motion.p>
        </div>

        {/* Card de Registro */}
        <Card className="border-slate-200/60 dark:border-slate-800/60 shadow-2xl backdrop-blur-sm bg-white/80 dark:bg-slate-900/80">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold">
                  {step === 1 && 'Información Básica'}
                  {step === 2 && 'Información de Contacto'}
                  {step === 3 && 'Confirma tu Registro'}
                </CardTitle>
                <CardDescription>
                  {step === 1 && 'Comencemos con los datos de tu empresa'}
                  {step === 2 && 'Ahora tus datos de contacto y acceso'}
                  {step === 3 && 'Revisa que todo esté correcto'}
                </CardDescription>
              </div>

              {/* Indicador de progreso */}
              <div className="flex gap-2">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      s <= step ? 'w-8 bg-blue-600' : 'w-2 bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="relative overflow-hidden">
              <motion.div
                key={step}
                custom={step}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-5"
              >
                {/* Paso 1: Información Básica y Selección de Plan */}
                {step === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nombre de tu Empresa</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="companyName"
                          placeholder="Ej: Transportes Rodríguez"
                          value={data.companyName}
                          onChange={(e) => updateField('companyName', e.target.value)}
                          className="pl-10 h-11"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Tu Nombre Completo</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="name"
                          placeholder="Ej: Juan Pérez"
                          value={data.name}
                          onChange={(e) => updateField('name', e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="tu@empresa.com"
                          value={data.email}
                          onChange={(e) => updateField('email', e.target.value)}
                          className="pl-10 h-11"
                          autoComplete="new-email"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Selecciona tu Plan</Label>
                      <div className="grid gap-3">
                        {(Object.values(plans) as any[]).map((plan: any) => (
                          <motion.div
                            key={plan.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setData(prev => ({ ...prev, selectedPlan: plan.id }))}
                            className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                              data.selectedPlan === plan.id
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {plan.popular && (
                              <div className="absolute -top-2.5 right-4 px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                                Más Popular
                              </div>
                            )}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${
                                  plan.id === 'starter' ? 'bg-green-100 text-green-600 dark:bg-green-950/30' :
                                  plan.id === 'pro' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/30' :
                                  'bg-purple-100 text-purple-600 dark:bg-purple-950/30'
                                }`}>
                                  {plan.id === 'starter' ? <Zap className="h-5 w-5" /> :
                                   plan.id === 'pro' ? <TrendingUp className="h-5 w-5" /> :
                                   <Building2 className="h-5 w-5" />}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900 dark:text-slate-100">{plan.name}</p>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">{plan.description}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">${plan.price}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">/{plan.period}</p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                              <span>{plan.maxVehicles === -1 ? 'Vehículos ilimitados' : `Hasta ${plan.maxVehicles} vehículos`}</span>
                              <span className="mx-1">•</span>
                              <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                              <span>{plan.maxUsers === -1 ? 'Usuarios ilimitados' : `${plan.maxUsers} usuario${plan.maxUsers > 1 ? 's' : ''}`}</span>
                            </div>
                            {data.selectedPlan === plan.id && (
                              <div className="absolute top-2 right-2">
                                <CheckCircle className="h-5 w-5 text-blue-600" />
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleNextStep}
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      disabled={!data.name || !data.email || !data.companyName}
                    >
                      Continuar
                    </Button>
                  </>
                )}

                {/* Paso 2: Contacto y Acceso */}
                {step === 2 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="Ej: 55 1234 5678"
                          value={data.phone}
                          onChange={(e) => updateField('phone', e.target.value)}
                          className="pl-10 h-11"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={data.password}
                          onChange={(e) => updateField('password', e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Repite tu contraseña"
                          value={data.confirmPassword}
                          onChange={(e) => updateField('confirmPassword', e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleBackStep}
                        variant="outline"
                        className="flex-1"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Atrás
                      </Button>
                      <Button
                        onClick={handleNextStep}
                        className="flex-1"
                        disabled={!data.phone || !data.password || !data.confirmPassword}
                      >
                        Continuar
                      </Button>
                    </div>
                  </>
                )}

                {/* Paso 3: Confirmación */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Building className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Empresa</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{data.companyName}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Tu Nombre</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{data.name}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Correo</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{data.email}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Teléfono</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{data.phone}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Plan {plans[data.selectedPlan].name} Incluido
                          </p>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            {plans[data.selectedPlan].maxVehicles === -1 ? 'Vehículos ilimitados' : `Hasta ${plans[data.selectedPlan].maxVehicles} vehículos`} • {plans[data.selectedPlan].maxUsers === -1 ? 'Usuarios ilimitados' : `${plans[data.selectedPlan].maxUsers} usuario${plans[data.selectedPlan].maxUsers > 1 ? 's' : ''}`} • ${plans[data.selectedPlan].price === 0 ? 'Gratis' : `$${plans[data.selectedPlan].price}/${plans[data.selectedPlan].period}`}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleBackStep}
                        variant="outline"
                        className="flex-1"
                        disabled={isSubmitting}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Atrás
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creando cuenta...
                          </>
                        ) : (
                          'Crear Cuenta'
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </CardContent>
        </Card>

        {/* Términos */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6"
        >
          Al registrarte, aceptas nuestros{' '}
          <Link href="/terminos" className="text-blue-600 hover:underline">
            Términos y Condiciones
          </Link>{' '}
          y{' '}
          <Link href="/privacidad" className="text-blue-600 hover:underline">
            Política de Privacidad
          </Link>
        </motion.p>

        {/* Login link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="text-center text-sm text-slate-600 dark:text-slate-400 mt-4"
        >
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Inicia sesión
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
