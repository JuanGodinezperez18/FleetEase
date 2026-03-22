/**
 * Configuración de Stripe para la aplicación
 * 
 * Variables de ambiente requeridas:
 * - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET
 * - STRIPE_PRICE_ID_STARTER
 * - STRIPE_PRICE_ID_PRO
 * - STRIPE_PRICE_ID_ENTERPRISE
 */

export const stripeConfig = {
  // Precios de los planes (deben coincidir con los IDs de Stripe Price)
  prices: {
    starter: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STARTER || '',
    pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO || '',
    enterprise: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ENTERPRISE || '',
  },
  
  // URLs para el checkout
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/subscription?success=true`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/subscription?canceled=true`,
  
  // Configuración del portal de clientes
  portalConfig: {
    enabled: true,
    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/settings/subscription`,
  },
};

// Precios en centavos de USD (para referencia)
export const planPricesUSD = {
  starter: 29900,  // $299 MXN ≈ $15 USD
  pro: 59900,      // $599 MXN ≈ $30 USD
  enterprise: 99900, // $999 MXN ≈ $50 USD
};

// Características de cada plan para mostrar en la UI
export const planFeatures = {
  starter: {
    vehicles: 5,
    users: 1,
    features: [
      'Gestión de clientes y vehículos',
      'Registro de ingresos y gastos',
      'Dashboard básico',
      'Soporte por email',
      'Reportes básicos',
    ],
    limitations: [
      'Sin rentabilidad por vehículo',
      'Sin Client Score',
      'Sin alertas de mantenimiento',
      'Sin API de integración',
    ],
  },
  pro: {
    vehicles: 15,
    users: 3,
    features: [
      'Todo lo del plan Starter',
      'Rentabilidad por vehículo',
      'Alertas de mantenimiento',
      'Client Score',
      'Reportes en Excel',
      'Soporte prioritario',
      'Multi-usuario (hasta 3)',
    ],
    limitations: [
      'Sin API de integración',
      'Sin personalización de marca',
    ],
  },
  enterprise: {
    vehicles: -1, // ilimitado
    users: -1, // ilimitado
    features: [
      'Todo lo del plan Pro',
      'Vehículos ilimitados',
      'Usuarios ilimitados',
      'Multi-empresa',
      'API de integración',
      'Soporte 24/7',
      'Personalización de marca',
      'SLA garantizado',
    ],
    limitations: [],
  },
};

/**
 * Obtiene las características de un plan
 */
export function getPlanFeatures(planId: string) {
  return planFeatures[planId as keyof typeof planFeatures] || planFeatures.starter;
}

/**
 * Verifica si un plan tiene una característica específica
 */
export function hasFeature(planId: string, feature: string): boolean {
  const features = getPlanFeatures(planId);
  // Lógica simple de verificación de características
  const featureMap: Record<string, string[]> = {
    profitability: ['pro', 'enterprise'],
    clientScore: ['pro', 'enterprise'],
    maintenanceAlerts: ['pro', 'enterprise'],
    excelReports: ['pro', 'enterprise'],
    multiUser: ['pro', 'enterprise'],
    api: ['enterprise'],
    whiteLabel: ['enterprise'],
    multiCompany: ['enterprise'],
  };
  
  const allowedPlans = featureMap[feature] || [];
  return allowedPlans.includes(planId);
}
