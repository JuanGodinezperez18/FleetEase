"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, ArrowRight, Mail, Lock, User, Phone, Building, CheckCircle, Zap, TrendingUp, Building2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { type PlanType, plans } from '@/config/plans';
import ReCAPTCHA from 'react-google-recaptcha';

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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const [data, setData] = useState<RegisterData>({
    name: '', email: '', phone: '', password: '', confirmPassword: '', companyName: '', selectedPlan: 'free',
  });

  const updateField = (field: keyof RegisterData, value: string) => setData(prev => ({ ...prev, [field]: value }));

  const handleNextStep = () => {
    if (step === 1 && data.name && data.email && data.companyName) setStep(2);
    else if (step === 2 && data.phone && data.password && data.confirmPassword) {
      if (data.password !== data.confirmPassword) { toast.error('Las contraseñas no coinciden'); return; }
      if (data.password.length < 8 || !/[a-z]/.test(data.password) || !/[A-Z]/.test(data.password) || !/\\d/.test(data.password) || !/[^A-Za-z0-9]/.test(data.password)) { toast.error('Usa al menos 8 caracteres, con mayúscula, minúscula, número y símbolo'); return; }
      setStep(3);
    }
  };

  const handleBackStep = () => setStep(step - 1);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password, name: data.name, phone: data.phone, companyName: data.companyName, plan: data.selectedPlan, captchaToken }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al crear la cuenta');
      if (!result.success) throw new Error(result.message || 'Error al crear la cuenta');

      if (result.checkoutUrl) {
        toast.success('Cuenta creada. Te llevaremos a Stripe para completar el pago.');
        window.location.href = result.checkoutUrl;
        return;
      }

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
      else if (error.message?.includes('contraseña')) errorMessage = error.message;
      else if (error.message?.includes('invalid email') || error.message?.includes('Invalid email')) errorMessage = 'El correo electrónico no es válido.';
      else if (error.message) errorMessage = error.message;
      toast.error(errorMessage);
    } finally { setIsSubmitting(false); }
  };

  const stepVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
    exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0, transition: { duration: 0.3 } }),
  };

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-[#080a0f] px-3 py-5 text-white sm:p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-1/4 -top-1/4 h-[60%] w-[60%] rounded-full bg-[#d7ff3f]/[0.04] blur-[100px]" />
        <div className="absolute -bottom-1/4 -left-1/4 h-[50%] w-[50%] rounded-full bg-[#d7ff3f]/[0.03] blur-[80px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="relative z-10 min-w-0 w-full max-w-[760px] py-4 sm:py-10">
        <div className="mb-6 text-center sm:mb-8">
          <div className="mb-3 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
            Fleet OS
          </div>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-xl">
            <Image src="/logo.png" alt="FleetEase Logo" width={48} height={48} priority className="h-12 w-12 object-contain" />
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
            FleetEase <span className="text-[#d7ff3f]">Manager</span>
          </h1>
          <p className="mt-1.5 text-sm text-white/45">Gestión inteligente de flotillas</p>
        </div>

        <div className="min-w-0 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] shadow-2xl backdrop-blur-xl">
          <div className="border-b border-white/[0.07] px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Registro de cuenta</p>
                <h2 className="text-lg font-semibold sm:text-xl">{step === 1 ? 'Información básica' : step === 2 ? 'Información de contacto' : 'Confirma tu registro'}</h2>
                <p className="mt-1 text-sm text-white/40">{step === 1 ? 'Comencemos con los datos de tu empresa' : step === 2 ? 'Ahora tus datos de contacto y acceso' : 'Revisa que todo esté correcto'}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 pt-1">
                {[1, 2, 3].map(s => <div key={s} className={`h-1 rounded-full transition-all ${s === step ? 'w-8 bg-[#d7ff3f]' : s < step ? 'w-5 bg-[#d7ff3f]/45' : 'w-1.5 bg-white/15'}`} />)}
              </div>
            </div>
          </div>

          <div className="min-w-0 px-4 py-5 sm:px-7 sm:py-7">
            <div className="relative min-w-0 overflow-hidden">
              <motion.div key={step} custom={step} variants={stepVariants} initial="enter" animate="center" exit="exit" className="space-y-5">
                {step === 1 && <>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="companyName" className="text-xs font-medium text-white/55">Nombre de tu empresa</Label><div className="relative"><Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" /><Input id="companyName" placeholder="Ej: Transportes Rodríguez" value={data.companyName} onChange={e => updateField('companyName', e.target.value)} className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/25 focus-visible:border-[#d7ff3f]/40 focus-visible:ring-[#d7ff3f]/15" autoFocus /></div></div>
                    <div className="space-y-2"><Label htmlFor="name" className="text-xs font-medium text-white/55">Tu nombre completo</Label><div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" /><Input id="name" placeholder="Ej: Juan Pérez" value={data.name} onChange={e => updateField('name', e.target.value)} className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/25" /></div></div>
                  </div>

                  <div className="space-y-2"><Label htmlFor="email" className="text-xs font-medium text-white/55">Correo electrónico</Label><div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" /><Input id="email" type="email" placeholder="tu@empresa.com" value={data.email} onChange={e => updateField('email', e.target.value)} className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/25" autoComplete="new-email" /></div></div>

                  <div className="space-y-3">
                    <div className="flex items-end justify-between gap-3"><Label className="text-xs font-medium text-white/55">Selecciona tu plan</Label><span className="text-[10px] uppercase tracking-wider text-white/25">Puedes cambiar después</span></div>
                    <div className="grid gap-3 md:grid-cols-2">
                      {(Object.values(plans) as any[]).map((plan: any) => {
                        const isFree = plan.id === 'free';
                        const selected = data.selectedPlan === plan.id;
                        return <motion.div key={plan.id} whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.995 }} onClick={() => setData(prev => ({ ...prev, selectedPlan: plan.id }))} className={`relative min-w-0 w-full cursor-pointer rounded-2xl border p-3 sm:p-4 transition-all ${selected ? 'border-[#d7ff3f]/70 bg-[#d7ff3f]/[0.07] shadow-[0_0_30px_rgba(215,255,63,.07)]' : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'} ${isFree ? 'ring-1 ring-[#d7ff3f]/15' : ''}`}>
                          {isFree && <div className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full bg-[#d7ff3f] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#080a0f]"><Sparkles className="h-3 w-3" /> Prueba gratis</div>}
                          {plan.popular && <div className="absolute -top-2.5 right-4 rounded-full bg-[#d7ff3f] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#080a0f]">Más popular</div>}
                          <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-start sm:gap-3">
                            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3"><div className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] p-1.5 sm:p-2 text-[#d7ff3f]">{isFree ? <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" /> : plan.id === 'starter' ? <Zap className="h-5 w-5" /> : plan.id === 'pro' ? <TrendingUp className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}</div><div className="min-w-0"><p className="font-semibold text-white">{plan.name}</p><p className="text-sm leading-5 text-white/40 sm:truncate">{plan.description}</p></div></div>
                            <div className="shrink-0 text-left sm:ml-auto sm:text-right"><p className="text-base font-bold text-white sm:text-lg">{plan.price === 0 ? 'Gratis' : `$${plan.price}`}</p><p className="text-xs text-white/30">{plan.price === 0 ? '14 días' : `/ ${plan.period}`}</p></div>
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] sm:text-xs text-white/45"><CheckCircle className="h-3.5 w-3.5 text-[#d7ff3f]" /><span>{plan.maxVehicles === -1 ? 'Vehículos ilimitados' : `Hasta ${plan.maxVehicles} vehículos`}</span><span className="text-white/15">•</span><CheckCircle className="h-3.5 w-3.5 text-[#d7ff3f]" /><span>{plan.maxUsers === -1 ? 'Usuarios ilimitados' : `${plan.maxUsers} usuario${plan.maxUsers > 1 ? 's' : ''}`}</span>{isFree && <><span className="text-white/15">•</span><span className="font-semibold text-[#d7ff3f]">No requiere tarjeta</span></>}</div>
                          {selected && <div className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3"><CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-[#d7ff3f]" /></div>}
                        </motion.div>;
                      })}
                    </div>
                  </div>

                  <Button onClick={handleNextStep} className="h-11 w-full rounded-xl bg-[#d7ff3f] font-semibold text-[#080a0f] hover:bg-[#e0ff5c]" disabled={!data.name || !data.email || !data.companyName}>Continuar <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </>}

                {step === 2 && <>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="phone" className="text-xs font-medium text-white/55">Teléfono / WhatsApp</Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" /><Input id="phone" type="tel" placeholder="Ej: 55 1234 5678" value={data.phone} onChange={e => updateField('phone', e.target.value)} className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/25" autoFocus /></div></div>
                    <div className="space-y-2"><Label htmlFor="password" className="text-xs font-medium text-white/55">Contraseña</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" /><Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={data.password} onChange={e => updateField('password', e.target.value)} className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/25" /></div></div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="confirmPassword" className="text-xs font-medium text-white/55">Confirmar contraseña</Label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" /><Input id="confirmPassword" type="password" placeholder="Repite tu contraseña" value={data.confirmPassword} onChange={e => updateField('confirmPassword', e.target.value)} className="h-11 rounded-xl border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-white/25" /></div></div>
                  <div className="flex gap-3"><Button onClick={handleBackStep} variant="outline" className="h-11 flex-1 rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5"><ArrowLeft className="mr-2 h-4 w-4" />Atrás</Button><Button onClick={handleNextStep} className="h-11 flex-1 rounded-xl bg-[#d7ff3f] font-semibold text-[#080a0f] hover:bg-[#e0ff5c]" disabled={!data.phone || !data.password || !data.confirmPassword}>Continuar <ArrowRight className="ml-2 h-4 w-4" /></Button></div>
                </>}

                {step === 3 && <div className="space-y-5">
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
                    <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Resumen</p>
                    <div className="grid gap-4 sm:grid-cols-2">{[[Building, 'Empresa', data.companyName], [User, 'Tu nombre', data.name], [Mail, 'Correo', data.email], [Phone, 'Teléfono', data.phone]].map(([Icon, label, value]: any) => <div key={label} className="flex items-start gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#d7ff3f]" /><div className="min-w-0"><p className="text-xs font-medium text-white/55">{label}</p><p className="truncate text-sm text-white">{value}</p></div></div>)}</div>
                  </div>
                  <div className="rounded-2xl border border-[#d7ff3f]/20 bg-[#d7ff3f]/[0.055] p-4 sm:p-5"><div className="flex items-start gap-3"><CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#d7ff3f]" /><div><p className="text-sm font-semibold text-white">Plan {plans[data.selectedPlan].name}</p><p className="mt-1 text-sm leading-6 text-white/55">{plans[data.selectedPlan].trialDays ? `${plans[data.selectedPlan].trialDays} días gratis` : ''}{plans[data.selectedPlan].trialDays ? ' • ' : ''}{plans[data.selectedPlan].maxVehicles === -1 ? 'Vehículos ilimitados' : `Hasta ${plans[data.selectedPlan].maxVehicles} vehículos`} • {plans[data.selectedPlan].maxUsers === -1 ? 'Usuarios ilimitados' : `${plans[data.selectedPlan].maxUsers} usuario${plans[data.selectedPlan].maxUsers > 1 ? 's' : ''}`} • {plans[data.selectedPlan].price === 0 ? 'Sin tarjeta' : `$${plans[data.selectedPlan].price}/${plans[data.selectedPlan].period}`}</p></div></div></div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                    {captchaSiteKey ? (
                      <ReCAPTCHA
                        sitekey={captchaSiteKey}
                        onChange={token => setCaptchaToken(token)}
                        onExpired={() => setCaptchaToken(null)}
                        onErrored={() => setCaptchaToken(null)}
                      />
                    ) : (
                      <p className="text-sm text-amber-200">El registro requiere configurar reCAPTCHA en el entorno de la aplicación.</p>
                    )}
                  </div>
                  <div className="flex gap-3"><Button onClick={handleBackStep} variant="outline" className="h-11 flex-1 rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5" disabled={isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" />Atrás</Button><Button onClick={handleSubmit} className="h-11 flex-1 rounded-xl bg-[#d7ff3f] font-semibold text-[#080a0f] hover:bg-[#e0ff5c]" disabled={isSubmitting || !captchaToken}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando cuenta...</> : data.selectedPlan === 'free' ? 'Activar prueba gratis' : 'Crear cuenta'}</Button></div>
                </div>}
              </motion.div>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-white/30">Al registrarte, aceptas nuestros <Link href="/terminos" className="text-[#d7ff3f] hover:text-white">Términos y Condiciones</Link> y <Link href="/privacidad" className="text-[#d7ff3f] hover:text-white">Política de Privacidad</Link></p>
        <p className="mt-3 text-center text-sm text-white/40">¿Ya tienes cuenta? <Link href="/login" className="font-medium text-[#d7ff3f] hover:text-white">Inicia sesión</Link></p>
      </motion.div>
    </div>
  );
}
