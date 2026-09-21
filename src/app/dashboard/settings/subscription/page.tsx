"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  XCircle,
  TrendingUp,
  Zap,
  Building2,
  CreditCard,
  Calendar,
  Users,
  Car,
  ArrowRight,
  Star,
  Mail,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-provider';
import { useSubscription } from '@/hooks/use-subscription';
import { useData } from '@/hooks/use-data';
import { plans, type PlanType, type PlanConfig } from '@/config/plans';
import { isFeatureEnabled, type FeatureKey } from '@/config/feature-flags';
import { toast } from 'sonner';

const PLAN_ICONS: Record<PlanType, typeof Zap> = {
  free: Zap,
  starter: Zap,
  pro: TrendingUp,
  enterprise: Building2,
};

function getSafePlan(plan: unknown): PlanType {
  if (typeof plan === 'string' && plan in plans) {
    return plan as PlanType;
  }
  return 'free';
}

const sectionClass =
  'rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_18px_50px_rgba(0,0,0,.18)] sm:p-5';

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { companies } = useData();
  const { subscription, loading, processing, upgradePlan, openPortal, verifyUpgrade } =
    useSubscription();

  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const success = searchParams.get('success');
    const sessionId = searchParams.get('sessionId');

    if (success && sessionId) {
      setVerifying(true);
      verifyUpgrade(sessionId).finally(() => {
        setVerifying(false);
        router.replace('/dashboard/settings/subscription');
      });
    }
  }, [searchParams, verifyUpgrade, router]);

  if (loading || verifying) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-[30px] bg-[#080a0f] text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
        <p className="text-sm">Cargando suscripción...</p>
      </div>
    );
  }

  const company = companies?.[0];
  const currentPlan = getSafePlan(subscription?.plan);
  const currentPlanConfig: PlanConfig = plans[currentPlan];

  const vehicleUsage = subscription?.vehicleCount ?? 0;
  const vehicleLimit = subscription?.maxVehicles ?? currentPlanConfig.maxVehicles;
  const vehiclePercentage =
    vehicleLimit === -1
      ? 100
      : Math.min((vehicleUsage / Math.max(vehicleLimit, 1)) * 100, 100);

  const userCount = 1;
  const userLimit = subscription?.maxUsers ?? currentPlanConfig.maxUsers;
  const userPercentage =
    userLimit === -1 ? 100 : Math.min((userCount / Math.max(userLimit, 1)) * 100, 100);

  const handleUpgrade = async (planId: PlanType) => {
    if (!company?.id) {
      toast.error('Error', { description: 'No se encontró la compañía' });
      return;
    }
    if (planId === currentPlan) {
      toast.info('Ya tienes este plan');
      return;
    }
    try {
      await upgradePlan(planId, company.id);
    } catch (error) {
      console.error('Error upgrading plan:', error);
    }
  };

  const handleManageBilling = async () => {
    if (!company?.id) {
      toast.error('Error', { description: 'No se encontró la compañía' });
      return;
    }
    try {
      await openPortal(company.id);
    } catch (error) {
      console.error('Error opening portal:', error);
    }
  };

  const PlanIcon = PLAN_ICONS[currentPlan];

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
            Suscripción
          </h1>
          <p className="mt-1 text-sm text-white/45">Plan actual, límites y upgrades</p>
        </header>

        {/* Plan actual */}
        <section className={sectionClass}>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
                <PlanIcon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-white">
                    {currentPlanConfig.name}
                  </h2>
                  <span className="rounded-full border border-[#d7ff3f]/20 bg-[#d7ff3f]/10 px-2 py-0.5 text-[10px] font-semibold text-[#d7ff3f]">
                    {currentPlan === 'free'
                      ? 'Prueba gratis'
                      : `$${currentPlanConfig.price}/${currentPlanConfig.period}`}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-white/40">{currentPlanConfig.description}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-white/60">
                  <Car className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Vehículos
                </span>
                <span className="tabular-nums text-white/85">
                  {vehicleUsage} / {vehicleLimit === -1 ? '∞' : vehicleLimit}
                </span>
              </div>
              <Progress value={vehiclePercentage} className="h-1.5 bg-white/10" />
              {vehiclePercentage >= 90 && vehicleLimit !== -1 && (
                <p className="text-[11px] text-amber-300">Cerca del límite de vehículos</p>
              )}
            </div>
            <div className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-white/60">
                  <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Usuarios
                </span>
                <span className="tabular-nums text-white/85">
                  {userCount} / {userLimit === -1 ? '∞' : userLimit}
                </span>
              </div>
              <Progress value={userPercentage} className="h-1.5 bg-white/10" />
              {userPercentage >= 90 && userLimit !== -1 && (
                <p className="text-[11px] text-amber-300">Cerca del límite de usuarios</p>
              )}
            </div>
          </div>

          {subscription?.subscription && (
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/45">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
                Próxima facturación:{' '}
                {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" strokeWidth={1.75} />
                Estado: {subscription.subscription.status}
              </span>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              onClick={handleManageBilling}
              variant="outline"
              disabled={processing}
              className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <CreditCard className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Gestionar facturación
            </Button>
            {currentPlan !== 'enterprise' && (
              <Button
                onClick={() => handleUpgrade('enterprise')}
                disabled={processing}
                className="h-10 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
              >
                <Building2 className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                Contactar ventas
              </Button>
            )}
          </div>
        </section>

        {/* Planes */}
        <div>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[#d7ff3f]/80">
            Planes disponibles
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.values(plans) as PlanConfig[]).map(plan => {
              const isCurrentPlan = plan.id === currentPlan;
              const Icon = PLAN_ICONS[plan.id];

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-[20px] border p-4 sm:p-5 ${
                    isCurrentPlan
                      ? 'border-emerald-400/30 bg-emerald-400/[0.06]'
                      : plan.popular
                        ? 'border-[#d7ff3f]/30 bg-[#d7ff3f]/[0.04]'
                        : 'border-white/[0.07] bg-[#0e1117]'
                  }`}
                >
                  {plan.popular && !isCurrentPlan && (
                    <span className="absolute -top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-[#d7ff3f]/30 bg-[#0e1117] px-2.5 py-0.5 text-[10px] font-semibold text-[#d7ff3f]">
                      <Star className="h-3 w-3" strokeWidth={1.75} />
                      Popular
                    </span>
                  )}
                  {isCurrentPlan && (
                    <span className="absolute -top-2.5 right-4 rounded-full border border-emerald-400/30 bg-[#0e1117] px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                      Actual
                    </span>
                  )}

                  <div className="mb-3 flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/70">
                      <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{plan.name}</p>
                      <p className="text-[11px] text-white/40">{plan.description}</p>
                    </div>
                  </div>

                  <p className="mb-3 font-heading text-2xl font-semibold tabular-nums text-white">
                    ${plan.price}
                    <span className="text-sm font-normal text-white/40">/{plan.period}</span>
                  </p>

                  <ul className="mb-4 space-y-1.5 text-xs text-white/60">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-300" strokeWidth={1.75} />
                      {plan.maxVehicles === -1
                        ? 'Vehículos ilimitados'
                        : `${plan.maxVehicles} vehículos`}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-300" strokeWidth={1.75} />
                      {plan.maxUsers === -1
                        ? 'Usuarios ilimitados'
                        : `${plan.maxUsers} usuarios`}
                    </li>
                    {plan.features.slice(2, 5).map((feature: string) => (
                      <li key={feature} className="flex items-center gap-1.5">
                        <CheckCircle
                          className="h-3.5 w-3.5 shrink-0 text-emerald-300"
                          strokeWidth={1.75}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`h-10 w-full rounded-xl text-xs font-semibold ${
                      isCurrentPlan
                        ? 'border-white/10 bg-white/[0.06] text-white/50'
                        : plan.popular
                          ? 'bg-[#d7ff3f] text-black hover:bg-[#c8f02e]'
                          : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white'
                    }`}
                    variant={isCurrentPlan || !plan.popular ? 'outline' : 'default'}
                    disabled={isCurrentPlan || processing}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isCurrentPlan ? (
                      'Plan actual'
                    ) : (
                      <>
                        {plan.id === 'enterprise'
                          ? 'Contactar'
                          : plan.id === 'free'
                            ? 'Prueba gratis'
                            : 'Mejorar plan'}
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comparación */}
        <section className={sectionClass}>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#d7ff3f]/80">
            Comparación
          </p>
          <h2 className="mt-0.5 text-base font-semibold text-white">Características por plan</h2>
          <div className="mt-4">
            <FeatureComparison currentPlan={currentPlan} />
          </div>
        </section>

        {/* Soporte */}
        <section className={sectionClass}>
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
              <Mail className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">¿Necesitas ayuda?</h2>
              <p className="mt-0.5 text-xs text-white/40">Soporte técnico y ventas enterprise</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <p className="text-sm font-medium text-white/85">Soporte técnico</p>
              <p className="mt-1 text-xs text-white/40">
                Problemas técnicos, funcionalidades o reportes de errores
              </p>
              <a
                href="mailto:soporte@fleetease.mx"
                className="mt-2 inline-block text-xs font-medium text-[#d7ff3f] hover:underline"
              >
                soporte@fleetease.mx
              </a>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <p className="text-sm font-medium text-white/85">Ventas y Enterprise</p>
              <p className="mt-1 text-xs text-white/40">
                Planes personalizados y cuentas enterprise
              </p>
              <a
                href="mailto:ventas@fleetease.mx"
                className="mt-2 inline-block text-xs font-medium text-[#d7ff3f] hover:underline"
              >
                ventas@fleetease.mx
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeatureComparison({ currentPlan }: { currentPlan: PlanType }) {
  const features: { key: FeatureKey; label: string; category: string }[] = [
    { key: 'vehicles', label: 'Gestión de vehículos', category: 'Básico' },
    { key: 'clients', label: 'Gestión de clientes', category: 'Básico' },
    { key: 'financial_records', label: 'Ingresos y gastos', category: 'Básico' },
    { key: 'dashboard_basic', label: 'Dashboard básico', category: 'Básico' },
    { key: 'profitability', label: 'Rentabilidad por vehículo', category: 'Avanzado' },
    { key: 'client_score', label: 'Client Score', category: 'Avanzado' },
    { key: 'maintenance_alerts', label: 'Alertas de mantenimiento', category: 'Avanzado' },
    { key: 'reports_excel', label: 'Reportes en Excel', category: 'Reportes' },
    { key: 'multi_user', label: 'Múltiples usuarios', category: 'Equipo' },
    { key: 'api_access', label: 'API de integración', category: 'Enterprise' },
    { key: 'white_label', label: 'Personalización de marca', category: 'Enterprise' },
    { key: 'priority_support', label: 'Soporte prioritario', category: 'Soporte' },
  ];

  const categories = Array.from(new Set(features.map(f => f.category)));

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.07]">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.03]">
            <th className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-white/40">
              Característica
            </th>
            <th className="px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wide text-white/40">
              Starter
            </th>
            <th className="px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wide text-white/40">
              Pro
            </th>
            <th className="px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wide text-white/40">
              Enterprise
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map(category => {
            const categoryFeatures = features.filter(f => f.category === category);
            return (
              <React.Fragment key={category}>
                <tr className="bg-white/[0.02]">
                  <td
                    colSpan={4}
                    className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#d7ff3f]/70"
                  >
                    {category}
                  </td>
                </tr>
                {categoryFeatures.map(feature => (
                  <tr key={feature.key} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-3 py-2.5 text-white/75">{feature.label}</td>
                    <td className="px-3 py-2.5 text-center">
                      {isFeatureEnabled('starter', feature.key) ? (
                        <CheckCircle
                          className="mx-auto h-4 w-4 text-emerald-300"
                          strokeWidth={1.75}
                        />
                      ) : (
                        <XCircle className="mx-auto h-4 w-4 text-white/20" strokeWidth={1.75} />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {isFeatureEnabled('pro', feature.key) ? (
                        <CheckCircle
                          className="mx-auto h-4 w-4 text-emerald-300"
                          strokeWidth={1.75}
                        />
                      ) : (
                        <XCircle className="mx-auto h-4 w-4 text-white/20" strokeWidth={1.75} />
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {isFeatureEnabled('enterprise', feature.key) ? (
                        <CheckCircle
                          className="mx-auto h-4 w-4 text-emerald-300"
                          strokeWidth={1.75}
                        />
                      ) : (
                        <XCircle className="mx-auto h-4 w-4 text-white/20" strokeWidth={1.75} />
                      )}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
