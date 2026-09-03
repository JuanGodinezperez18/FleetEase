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
import { Loader2, ArrowLeft, Mail, Lock, User, Phone, Building, CheckCircle, AlertCircle, Zap, TrendingUp, Building2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
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
    name: '', email: '', phone: '', password: '', confirmPassword: '', companyName: '', selectedPlan: 'free',
  });

  const updateField = (field: keyof RegisterData, value: string) => setData(prev => ({ ...prev, [field]: value }));

  const handleNextStep = () => {
    if (step === 1 && data.name && data.email && data.companyName) setStep(2);
    else if (step === 2 && data.phone && data.password && data.confirmPassword) {
      if (data.password !== data.confirmPassword) { toast.error('Las contraseñas no coinciden'); return; }
      if (data.password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
      setStep(3);
    }
  };

  const handleBackStep = () => setStep(step - 1);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password, name: data.name, phone: data.phone, companyName: data.companyName, plan: data.selectedPlan }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al crear la cuenta');
      if (!result.success) throw new Error(result.message || 'Error al crear la cuenta');

      if (result.requiresPaymentMethod === false || data.selectedPlan === 'free') {
        toast.success('¡Tu prueba gratuita de 14 días está activa!');
        toast.info('Sin tarjeta. Puedes comenzar con hasta 2 vehículos y 1 usuario.');
      } else {
        toast.success('¡Cuenta creada exitosamente!');
      }
      setTimeout(() => router.replace('/login'), 2000);
    } catch (error: any) {
      console.error('Error en registro:', error);
      let errorMessage = 'Error al crear la cuenta. Intenta de nuevo.';
      if (error.message?.includes('already registered') || error.message?.includes('User already registered')) errorMessage = 'Este correo ya está registrado. Inicia sesión o usa otro correo.';
      else if (error.message?.includes('weak password') || error.message?.includes('Weak password')) errorMessage = 'La contraseña es muy débil. Usa al menos 6 caracteres.';
      else if (error.message?.includes('invalid email') || error.message?.includes('Invalid email')) errorMessage = 'El correo electrónico no es válido.';
      else if (error.message) errorMessage = error.message;
      toast.error(errorMessage);
    } finally { setIsSubmitting(false); }
  };

  const containerVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };
  const stepVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
    exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0, transition: { duration: 0.3 } }),
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080a0f] text-white p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[#d7ff3f]/[0.06] rounded-full blur-3xl" animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} />
        <motion.div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-white/[0.025] rounded-full blur-3xl" animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }} transition={{ duration: 25, repeat: Infinity, ease: 'linear' }} />
      </div>

      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="w-full max-w-2xl relative z-10">
        <div className="mb-8 text-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }} className="flex justify-center mb-4">
            <div className="relative w-20 h-20 rounded-3xl bg-white flex items-center justify-center shadow-2xl"><Image src="/logo.png" alt="FleetEase Logo" width={70} height={70} priority className="w-[70px] h-[70px]" /></div>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="text-3xl font-bold mb-2 tracking-tight">Comienza gratis con FleetEase</motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="text-sm text-white/45">14 días gratis • 1 usuario • 2 vehículos • Sin tarjeta</motion.p>
        </div>

        <Card className="border-white/[0.09] shadow-2xl backdrop-blur-sm bg-[#0e1117]/90 text-white">
          <CardHeader className="space-y-4 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold">{step === 1 && 'Información Básica'}{step === 2 && 'Información de Contacto'}{step === 3 && 'Confirma tu Registro'}</CardTitle>
                <CardDescription className="text-white/40">{step === 1 && 'Comencemos con los datos de tu empresa'}{step === 2 && 'Ahora tus datos de contacto y acceso'}{step === 3 && 'Revisa que todo esté correcto'}</CardDescription>
              </div>
              <div className="flex gap-2">{[1, 2, 3].map(s => <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s <= step ? 'w-8 bg-[#d7ff3f]' : 'w-2 bg-white/15'}`} />)}</div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="relative overflow-hidden">
              <motion.div key={step} custom={step} variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-5">
                {step === 1 && <>
                  <div className="space-y-2"><Label htmlFor="companyName">Nombre de tu Empresa</Label><div className="relative"><Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" /><Input id="companyName" placeholder="Ej: Transportes Rodríguez" value={data.companyName} onChange={e => updateField('companyName', e.target.value)} className="pl-10 h-11 border-white/10 bg-white/[0.035] text-white placeholder:text-white/25" autoFocus /></div></div>
                  <div className="space-y-2"><Label htmlFor="name">Tu Nombre Completo</Label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" /><Input id="name" placeholder="Ej: Juan Pérez" value={data.name} onChange={e => updateField('name', e.target.value)} className="pl-10 h-11 border-white/10 bg-white/[0.035] text-white placeholder:text-white/25" /></div></div>
                  <div className="space-y-2"><Label htmlFor="email">Correo Electrónico</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" /><Input id="email" type="email" placeholder="tu@empresa.com" value={data.email} onChange={e => updateField('email', e.target.value)} className="pl-10 h-11 border-white/10 bg-white/[0.035] text-white placeholder:text-white/25" autoComplete="new-email" /></div></div>

                  <div className="space-y-3">
                    <div className="flex items-end justify-between"><Label>Selecciona tu Plan</Label><span className="text-[10px] uppercase tracking-wider text-white/25">Puedes cambiar después</span></div>
                    <div className="grid gap-3">
                      {(Object.values(plans) as any[]).map((plan: any) => {
                        const isFree = plan.id === 'free';
                        const selected = data.selectedPlan === plan.id;
                        return <motion.div key={plan.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => setData(prev => ({ ...prev, selectedPlan: plan.id }))} className={`relative cursor-pointer rounded-2xl border p-4 transition-all ${selected ? 'border-[#d7ff3f]/70 bg-[#d7ff3f]/[0.07] shadow-[0_0_30px_rgba(215,255,63,.07)]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'} ${isFree ? 'ring-1 ring-[#d7ff3f]/20' : ''}`}>
                          {isFree && <div className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full bg-[#d7ff3f] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#080a0f]"><Sparkles className="h-3 w-3" /> Prueba gratis</div>}
                          {plan.popular && <div className="absolute -top-2.5 right-4 rounded-full bg-[#d7ff3f] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#080a0f]">Más Popular</div>}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-[#d7ff3f]">{isFree ? <Sparkles className="h-5 w-5" /> : plan.id === 'starter' ? <Zap className="h-5 w-5" /> : plan.id === 'pro' ? <TrendingUp className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}</div>
                              <div><p className="font-semibold text-white">{plan.name}</p><p className="text-sm text-white/40">{plan.description}</p></div>
                            </div>
                            <div className="text-right shrink-0"><p className="text-lg font-bold text-white">{plan.price === 0 ? 'Gratis' : `$${plan.price}`}</p><p className="text-xs text-white/30">{plan.price === 0 ? '14 días' : `/ ${plan.period}`}</p></div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/45"><CheckCircle className="h-3.5 w-3.5 text-[#d7ff3f]" /><span>{plan.maxVehicles === -1 ? 'Vehículos ilimitados' : `Hasta ${plan.maxVehicles} vehículos`}</span><span className="text-white/15">•</span><CheckCircle className="h-3.5 w-3.5 text-[#d7ff3f]" /><span>{plan.maxUsers === -1 ? 'Usuarios ilimitados' : `${plan.maxUsers} usuario${plan.maxUsers > 1 ? 's' : ''}`}</span>{isFree && <><span className="text-white/15">•</span><span className="text-[#d7ff3f] font-semibold">No requiere tarjeta</span></>}</div>
                          {selected && <div className="absolute top-3 right-3"><CheckCircle className="h-5 w-5 text-[#d7ff3f]" /></div>}
                        </motion.div>;
                      })}
                    </div>
                  </div>

                  <Button onClick={handleNextStep} className="w-full h-11 bg-[#d7ff3f] text-[#080a0f] hover:bg-white font-bold" disabled={!data.name || !data.email || !data.companyName}>Continuar</Button>
                </>}

                {step === 2 && <>
                  <div className="space-y-2"><Label htmlFor="phone">Teléfono / WhatsApp</Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" /><Input id="phone" type="tel" placeholder="Ej: 55 1234 5678" value={data.phone} onChange={e => updateField('phone', e.target.value)} className="pl-10 h-11 border-white/10 bg-white/[0.035] text-white placeholder:text-white/25" autoFocus /></div></div>
                  <div className="space-y-2"><Label htmlFor="password">Contraseña</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" /><Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={data.password} onChange={e => updateField('password', e.target.value)} className="pl-10 h-11 border-white/10 bg-white/[0.035] text-white placeholder:text-white/25" /></div></div>
                  <div className="space-y-2"><Label htmlFor="confirmPassword">Confirmar Contraseña</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" /><Input id="confirmPassword" type="password" placeholder="Repite tu contraseña" value={data.confirmPassword} onChange={e => updateField('confirmPassword', e.target.value)} className="pl-10 h-11 border-white/10 bg-white/[0.035] text-white placeholder:text-white/25" /></div></div>
                  <div className="flex gap-3"><Button onClick={handleBackStep} variant="outline" className="flex-1 border-white/10 bg-transparent text-white hover:bg-white/5"><ArrowLeft className="mr-2 h-4 w-4" />Atrás</Button><Button onClick={handleNextStep} className="flex-1 bg-[#d7ff3f] text-[#080a0f] hover:bg-white font-bold" disabled={!data.phone || !data.password || !data.confirmPassword}>Continuar</Button></div>
                </>}

                {step === 3 && <div className="space-y-6">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 space-y-3">
                    {[[Building, 'Empresa', data.companyName], [User, 'Tu Nombre', data.name], [Mail, 'Correo', data.email], [Phone, 'Teléfono', data.phone]].map(([Icon, label, value]: any) => <div key={label} className="flex items-start gap-3"><Icon className="h-5 w-5 text-[#d7ff3f] mt-0.5" /><div><p className="text-sm font-medium text-white">{label}</p><p className="text-sm text-white/40">{value}</p></div></div>)}
                  </div>
                  <div className="rounded-2xl border border-[#d7ff3f]/20 bg-[#d7ff3f]/[0.055] p-4"><div className="flex items-start gap-3"><CheckCircle className="h-5 w-5 text-[#d7ff3f] mt-0.5" /><div><p className="text-sm font-medium text-white">Plan {plans[data.selectedPlan].name}</p><p className="text-sm text-white/55 mt-1">{plans[data.selectedPlan].trialDays ? `${plans[data.selectedPlan].trialDays} días gratis` : ''}{plans[data.selectedPlan].trialDays ? ' • ' : ''}{plans[data.selectedPlan].maxVehicles === -1 ? 'Vehículos ilimitados' : `Hasta ${plans[data.selectedPlan].maxVehicles} vehículos`} • {plans[data.selectedPlan].maxUsers === -1 ? 'Usuarios ilimitados' : `${plans[data.selectedPlan].maxUsers} usuario${plans[data.selectedPlan].maxUsers > 1 ? 's' : ''}`} • {plans[data.selectedPlan].price === 0 ? 'Sin tarjeta' : `$${plans[data.selectedPlan].price}/${plans[data.selectedPlan].period}`}</p></div></div></div>
                  <div className="flex gap-3"><Button onClick={handleBackStep} variant="outline" className="flex-1 border-white/10 bg-transparent text-white hover:bg-white/5" disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" />Atrás</Button><Button onClick={handleSubmit} className="flex-1 bg-[#d7ff3f] text-[#080a0f] hover:bg-white font-bold" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando cuenta...</> : data.selectedPlan === 'free' ? 'Activar prueba gratis' : 'Crear Cuenta'}</Button></div>
                </div>}
              </motion.div>
            </div>
          </CardContent>
        </Card>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.5 }} className="text-center text-xs text-white/30 mt-6">Al registrarte, aceptas nuestros <Link href="/terminos" className="text-[#d7ff3f] hover:text-white">Términos y Condiciones</Link> y <Link href="/privacidad" className="text-[#d7ff3f] hover:text-white">Política de Privacidad</Link></motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.5 }} className="text-center text-sm text-white/40 mt-4">¿Ya tienes cuenta? <Link href="/login" className="text-[#d7ff3f] font-medium hover:text-white">Inicia sesión</Link></motion.p>
      </motion.div>
    </div>
  );
}
