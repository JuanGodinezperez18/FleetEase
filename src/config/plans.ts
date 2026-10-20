/**
 * Catálogo comercial de FleetEase.
 * Debe mantenerse sincronizado con los Price IDs de Stripe.
 * Este archivo describe capacidades que hoy existen; comingSoon no se considera acceso.
 */
export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';
export interface PlanConfig {
  id: PlanType; name: string; price: number; currency?: string; period: string;
  maxVehicles: number; maxUsers: number; trialDays?: number;
  requiresPaymentMethod?: boolean; description: string; features: string[];
  comingSoon?: string[]; popular?: boolean;
  /** Si true, se muestran anuncios en el producto (monetización del plan Free). */
  showsAds?: boolean;
}

const starterFeatures = [
  'Gestión de vehículos y asignaciones','Clientes y expediente digital','Socios y control de unidades',
  'Ingresos, gastos y pagos','Saldos y cobranza de clientes','Créditos y calendario de pagos',
  'Multas y pagos parciales','Depósitos en garantía y devoluciones','Kilometraje y mantenimiento',
  'Alertas de vencimientos y operación','Inspecciones con fotografías','Seguimiento de vehículos con fotografías',
  'Documentos de vehículos y clientes','OCR de INE y tarjeta de circulación','Portal para clientes y portal para socios',
  'Cuentas por pagar y compras a proveedores','Dashboard operativo y flujo de efectivo',
  'Notificaciones dentro de FleetEase','Exportaciones de datos','Soporte por email',
];

const proFeatures = [
  'Todo lo incluido en Starter','Dashboard avanzado y configurable','Rentabilidad por vehículo',
  'Análisis financiero y tendencias','Client Score y análisis de comportamiento',
  'Analítica de vehículos, socios, créditos y kilometraje','Alertas inteligentes priorizadas',
  'Reportes configurables','Exportación PDF y Excel','Historial de reportes generados',
  'Auditoría y trazabilidad de operaciones','Operaciones masivas disponibles actualmente','Hasta 3 usuarios','Soporte prioritario',
];

export const plans: Record<PlanType, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'MXN',
    period: 'siempre',
    maxVehicles: 3,
    maxUsers: 1,
    // Sin trialDays: el plan Free es permanente.
    requiresPaymentMethod: false,
    showsAds: true,
    description: 'Gratis para siempre. Todas las funciones operativas, con anuncios. Ideal para empezar con hasta 3 vehículos.',
    features: [
      'Gratis para siempre',
      'Todas las funciones de Starter',
      'Hasta 3 vehículos',
      '1 usuario (empresa)',
      'Sin tarjeta de crédito',
      'Con anuncios (así se mantiene el plan gratis)',
      ...starterFeatures,
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 299,
    currency: 'MXN',
    period: 'mes',
    maxVehicles: 5,
    maxUsers: 1,
    requiresPaymentMethod: true,
    showsAds: false,
    description: 'Control operativo y financiero para flotillas pequeñas, sin anuncios',
    features: starterFeatures,
    comingSoon: ['WhatsApp Intelligence', 'Fleet Intelligence vía WhatsApp'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 699,
    currency: 'MXN',
    period: 'mes',
    maxVehicles: 15,
    maxUsers: 3,
    requiresPaymentMethod: true,
    showsAds: false,
    description: 'Rentabilidad, análisis y control avanzado para operaciones en crecimiento',
    features: proFeatures,
    comingSoon: [
      'WhatsApp Intelligence',
      'Fleet Intelligence vía WhatsApp para administradores, socios y clientes',
      'Automatizaciones operativas avanzadas',
    ],
    popular: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 2499,
    currency: 'MXN',
    period: 'mes',
    maxVehicles: -1,
    maxUsers: -1,
    requiresPaymentMethod: true,
    showsAds: false,
    description: 'Para empresas con flotillas medianas y grandes que requieren mayor capacidad y acompañamiento empresarial',
    features: [
      'Todo lo incluido en Pro',
      'Vehículos ilimitados',
      'Usuarios ilimitados',
      'Soporte y acompañamiento empresarial',
    ],
    comingSoon: [
      'API de integración y webhooks',
      'Multiempresa',
      'Personalización de marca (white-label)',
      'Reportes personalizados',
      'Integraciones GPS multi-proveedor',
    ],
  },
};

/** IDs de empresas de prueba con plan Enterprise permanente (no degradables por Stripe). */
export const PERMANENT_ENTERPRISE_COMPANY_IDS = [
  'cca57015-9633-42a2-870e-72e713d8e17b', // Mi Empresa — empresa de prueba
] as const;

export function isPermanentEnterpriseCompany(companyId: string | null | undefined): boolean {
  if (!companyId) return false;
  return (PERMANENT_ENTERPRISE_COMPANY_IDS as readonly string[]).includes(companyId);
}

export function getPlanConfig(planId: PlanType): PlanConfig {
  return plans[planId];
}
export function hasVehicleLimit(planId: PlanType): boolean {
  return plans[planId].maxVehicles !== -1;
}
export function hasUserLimit(planId: PlanType): boolean {
  return plans[planId].maxUsers !== -1;
}
export function getVehicleLimit(planId: PlanType): number {
  const limit = plans[planId].maxVehicles;
  return limit === -1 ? Infinity : limit;
}
export function getUserLimit(planId: PlanType): number {
  const limit = plans[planId].maxUsers;
  return limit === -1 ? Infinity : limit;
}
export function canAddVehicle(planId: PlanType, currentCount: number): boolean {
  return currentCount < getVehicleLimit(planId);
}
export function canAddUser(planId: PlanType, currentCount: number): boolean {
  return currentCount < getUserLimit(planId);
}
export function getVehicleLimitMessage(planId: PlanType, currentCount: number): string {
  const plan = plans[planId];
  if (plan.maxVehicles === -1) return '';
  return `Has alcanzado el límite de ${plan.maxVehicles} vehículos de tu plan ${plan.name}. Contacta para upgrade.`;
}
export function getUserLimitMessage(planId: PlanType, currentCount: number): string {
  const plan = plans[planId];
  if (plan.maxUsers === -1) return '';
  return `Has alcanzado el límite de ${plan.maxUsers} usuarios de tu plan ${plan.name}. Contacta para upgrade.`;
}

/** True si el plan muestra anuncios (monetización del Free). */
export function planShowsAds(planId: PlanType): boolean {
  return plans[planId]?.showsAds === true;
}
