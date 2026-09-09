"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser } = useAuth();
  const { companies } = useData();
  const {
    subscription,
    loading,
    processing,
    upgradePlan,
    openPortal,
    verifyUpgrade,
  } = useSubscription();

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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando información de suscripción...</p>
        </div>
      </div>
    );
  }

  const company = companies?.[0];
  const currentPlan = getSafePlan(subscription?.plan);
  const currentPlanConfig: PlanConfig = plans[currentPlan];

  const vehicleUsage = subscription?.vehicleCount ?? 0;
  const vehicleLimit = subscription?.maxVehicles ?? currentPlanConfig.maxVehicles;
  const vehiclePercentage = vehicleLimit === -1
    ? 100
    : Math.min((vehicleUsage / Math.max(vehicleLimit, 1)) * 100, 100);

  const userCount = 1; // TODO: Obtener count real de usuarios
  const userLimit = subscription?.maxUsers ?? currentPlanConfig.maxUsers;
  const userPercentage = userLimit === -1
    ? 100
    : Math.min((userCount / Math.max(userLimit, 1)) * 100, 100);

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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Suscripción y Planes</h1>
        <p className="text-muted-foreground">
          Gestiona tu suscripción y conoce las características disponibles
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <PlanIcon className="h-6 w-6 text-blue-600" />
            Plan Actual: {currentPlanConfig.name}
            <Badge variant={currentPlan === 'pro' ? 'default' : 'secondary'} className="ml-2">
              {currentPlan === 'free'
                ? 'Prueba gratis'
                : `$${currentPlanConfig.price}/${currentPlanConfig.period}`}
            </Badge>
          </CardTitle>
          <CardDescription>{currentPlanConfig.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Car className="h-4 w-4" />
                  Vehículos utilizados
                </div>
                <span className="text-sm font-medium">
                  {vehicleUsage} / {vehicleLimit === -1 ? '∞' : vehicleLimit}
                </span>
              </div>
              <Progress value={vehiclePercentage} className="h-2" />
              {vehiclePercentage >= 90 && vehicleLimit !== -1 && (
                <p className="text-xs text-amber-600">⚠️ Estás por alcanzar el límite de vehículos</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  Usuarios utilizados
                </div>
                <span className="text-sm font-medium">
                  {userCount} / {userLimit === -1 ? '∞' : userLimit}
                </span>
              </div>
              <Progress value={userPercentage} className="h-2" />
              {userPercentage >= 90 && userLimit !== -1 && (
                <p className="text-xs text-amber-600">⚠️ Estás por alcanzar el límite de usuarios</p>
              )}
            </div>
          </div>

          {subscription?.subscription && (
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>
                  Próxima facturación:{' '}
                  {new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span>Estado: {subscription.subscription.status}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleManageBilling} variant="outline" disabled={processing}>
              <CreditCard className="h-4 w-4 mr-2" />
              Gestionar Facturación
            </Button>
            {currentPlan !== 'enterprise' && (
              <Button onClick={() => handleUpgrade('enterprise')} disabled={processing}>
                <Building2 className="h-4 w-4 mr-2" />
                Contactar Ventas
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-4">Planes Disponibles</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {(Object.values(plans) as PlanConfig[]).map((plan) => {
            const isCurrentPlan = plan.id === currentPlan;
            const PlanIcon = PLAN_ICONS[plan.id];

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.popular ? 'border-blue-600 shadow-lg' : ''
                } ${isCurrentPlan ? 'border-green-600 bg-green-50 dark:bg-green-950/20' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                    <Star className="h-3 w-3 inline mr-1" />
                    Más Popular
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-3 right-4 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                    Plan Actual
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      plan.id === 'free' ? 'bg-green-100 text-green-600' :
                      plan.id === 'starter' ? 'bg-green-100 text-green-600' :
                      plan.id === 'pro' ? 'bg-blue-100 text-blue-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      <PlanIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {plan.maxVehicles === -1 ? 'Vehículos ilimitados' : `${plan.maxVehicles} vehículos`}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      {plan.maxUsers === -1 ? 'Usuarios ilimitados' : `${plan.maxUsers} usuarios`}
                    </li>
                    {plan.features.slice(2, 5).map((feature: string) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? 'secondary' : plan.popular ? 'default' : 'outline'}
                    disabled={isCurrentPlan || processing}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isCurrentPlan ? 'Plan Actual' : (
                      <>
                        {plan.id === 'enterprise' ? 'Contactar' : plan.id === 'free' ? 'Prueba gratis' : 'Upgrade'}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparación de Características</CardTitle>
          <CardDescription>Conoce todas las características disponibles en cada plan</CardDescription>
        </CardHeader>
        <CardContent>
          <FeatureComparison currentPlan={currentPlan} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            ¿Necesitas Ayuda?
          </CardTitle>
          <CardDescription>Nuestro equipo de soporte está aquí para ayudarte</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <h4 className="font-medium mb-2">Soporte Técnico</h4>
              <p className="text-sm text-muted-foreground mb-3">Para problemas técnicos, preguntas sobre funcionalidades o reportar errores</p>
              <a href="mailto:soporte@fleetease.mx" className="text-sm text-blue-600 hover:underline">soporte@fleetease.mx</a>
            </div>
            <div className="flex-1">
              <h4 className="font-medium mb-2">Ventas y Planes Enterprise</h4>
              <p className="text-sm text-muted-foreground mb-3">Para información sobre planes personalizados y enterprise</p>
              <a href="mailto:ventas@fleetease.mx" className="text-sm text-blue-600 hover:underline">ventas@fleetease.mx</a>
            </div>
          </div>
        </CardContent>
      </Card>
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-4 font-medium">Característica</th>
            <th className="text-center py-3 px-4 font-medium">Starter</th>
            <th className="text-center py-3 px-4 font-medium">Pro</th>
            <th className="text-center py-3 px-4 font-medium">Enterprise</th>
          </tr>
        </thead>
        <tbody>
          {categories.map(category => {
            const categoryFeatures = features.filter(f => f.category === category);
            return (
              <React.Fragment key={category}>
                <tr className="bg-muted/50">
                  <td colSpan={4} className="py-2 px-4 font-semibold">{category}</td>
                </tr>
                {categoryFeatures.map(feature => (
                  <tr key={feature.key} className="border-b last:border-0">
                    <td className="py-3 px-4">{feature.label}</td>
                    <td className="text-center py-3 px-4">
                      {isFeatureEnabled('starter', feature.key) ? <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />}
                    </td>
                    <td className="text-center py-3 px-4">
                      {isFeatureEnabled('pro', feature.key) ? <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />}
                    </td>
                    <td className="text-center py-3 px-4">
                      {isFeatureEnabled('enterprise', feature.key) ? <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />}
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
