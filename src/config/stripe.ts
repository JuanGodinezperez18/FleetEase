/**
 * Configuración de Stripe.
 * Los precios y features comerciales se derivan del catálogo canónico de plans.ts.
 * Stripe solo conserva aquí Price IDs, checkout y ciclo de cobro.
 */
import { plans, type PlanType } from '@/config/plans';
import { isFeatureEnabled, type FeatureKey } from '@/config/feature-flags';

export const stripeConfig = {
  prices: {
    starter: { monthly: process.env.STRIPE_PRICE_ID_STARTER_MONTHLY || '', yearly: process.env.STRIPE_PRICE_ID_STARTER_YEARLY || '' },
    pro: { monthly: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || '', yearly: process.env.STRIPE_PRICE_ID_PRO_YEARLY || '' },
    enterprise: { monthly: process.env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY || '', yearly: process.env.STRIPE_PRICE_ID_ENTERPRISE_YEARLY || '' },
  },
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/subscription?success=true`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/subscription?canceled=true`,
  portalConfig: {
    enabled: true,
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/subscription`,
  },
};

// Compatibilidad con el nombre histórico. Los valores se derivan del catálogo
// comercial canónico en MXN y se expresan en centavos. No se utiliza para
// autorizar features ni para el checkout.
export const planPricesUSD = {
  starter: plans.starter.price * 100,
  pro: plans.pro.price * 100,
  enterprise: plans.enterprise.price * 100,
};

export const planFeatures = {
  starter: {
    vehicles: plans.starter.maxVehicles,
    users: plans.starter.maxUsers,
    features: plans.starter.features,
    limitations: plans.starter.comingSoon || [],
  },
  pro: {
    vehicles: plans.pro.maxVehicles,
    users: plans.pro.maxUsers,
    features: plans.pro.features,
    limitations: plans.pro.comingSoon || [],
  },
  enterprise: {
    vehicles: plans.enterprise.maxVehicles,
    users: plans.enterprise.maxUsers,
    features: plans.enterprise.features,
    limitations: plans.enterprise.comingSoon || [],
  },
};

export function getPlanFeatures(planId: string) {
  return planFeatures[planId as keyof typeof planFeatures] || planFeatures.starter;
}

export type BillingCycle = 'monthly' | 'yearly';

export function getStripePriceId(planId: string, billingCycle: BillingCycle): string {
  const planPrices = stripeConfig.prices[planId as keyof typeof stripeConfig.prices];
  if (!planPrices) throw new Error(`Plan inválido: ${planId}`);
  const priceId = planPrices[billingCycle];
  if (!priceId) throw new Error(`Falta configurar STRIPE_PRICE_ID_${planId.toUpperCase()}_${billingCycle.toUpperCase()} en las variables de entorno.`);
  return priceId;
}

/** Compatibilidad con llamadas existentes; la autorización usa feature-flags.ts. */
export function hasFeature(planId: string, feature: string): boolean {
  const aliases: Record<string, FeatureKey> = {
    profitability: 'profitability',
    clientScore: 'client_score',
    maintenanceAlerts: 'maintenance_alerts',
    excelReports: 'reports_excel',
    multiUser: 'multi_user',
    api: 'api_access',
    whiteLabel: 'white_label',
    multiCompany: 'multi_company',
  };
  const key = aliases[feature];
  if (!key || !(planId in plans)) return false;
  return isFeatureEnabled(planId as PlanType, key);
}
