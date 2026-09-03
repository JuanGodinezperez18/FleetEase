/**
 * Configuración de planes de suscripción.
 * El plan Free es un trial de 14 días y no requiere método de pago.
 */

export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';

export interface PlanConfig {
  id: PlanType;
  name: string;
  price: number;
  currency?: string;
  period: string;
  maxVehicles: number; // -1 = ilimitado
  maxUsers: number; // -1 = ilimitado
  trialDays?: number;
  requiresPaymentMethod?: boolean;
  description: string;
  features: string[];
  popular?: boolean;
}

export const plans: Record<PlanType, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'MXN',
    period: '14 días',
    maxVehicles: 2,
    maxUsers: 1,
    trialDays: 14,
    requiresPaymentMethod: false,
    description: 'Prueba FleetEase durante 14 días sin tarjeta',
    features: [
      '14 días gratis',
      'Hasta 2 vehículos',
      '1 usuario',
      'Dashboard y gestión básica',
      'Sin tarjeta de crédito',
      'Sin compromiso',
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
    description: 'Para flotillas pequeñas que comienzan',
    features: [
      'Hasta 5 vehículos',
      '1 usuario admin',
      'Gestión de clientes y vehículos',
      'Registro de ingresos y gastos',
      'Dashboard básico',
      'Soporte por email',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 599,
    currency: 'MXN',
    period: 'mes',
    maxVehicles: 15,
    maxUsers: 3,
    requiresPaymentMethod: true,
    description: 'El más popular para renta de apps',
    features: [
      'Hasta 15 vehículos',
      '3 usuarios',
      'Rentabilidad por vehículo',
      'Alertas de mantenimiento',
      'Client Score',
      'Reportes en Excel',
      'Soporte prioritario',
    ],
    popular: true,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 999,
    currency: 'MXN',
    period: 'mes',
    maxVehicles: -1,
    maxUsers: -1,
    requiresPaymentMethod: true,
    description: 'Para empresas que escalan',
    features: [
      'Vehículos ilimitados',
      'Usuarios ilimitados',
      'Todas las features Pro',
      'Multi-empresa',
      'API de integración',
      'Soporte 24/7',
      'Personalización de marca',
    ],
  },
};

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
