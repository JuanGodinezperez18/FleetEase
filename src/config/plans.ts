/**
 * Configuración de planes de suscripción
 * Alineados con la landing page
 */

export type PlanType = 'starter' | 'pro' | 'enterprise';

export interface PlanConfig {
  id: PlanType;
  name: string;
  price: number;
  currency?: string;
  period: string;
  maxVehicles: number; // -1 = ilimitado
  maxUsers: number; // -1 = ilimitado
  description: string;
  features: string[];
  popular?: boolean;
}

export const plans: Record<PlanType, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 299,
    currency: 'MXN',
    period: 'mes',
    maxVehicles: 5,
    maxUsers: 1,
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
    maxVehicles: -1, // Ilimitado
    maxUsers: -1, // Ilimitado
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

/**
 * Obtiene la configuración de un plan por su ID
 */
export function getPlanConfig(planId: PlanType): PlanConfig {
  return plans[planId];
}

/**
 * Verifica si un plan tiene límite de vehículos
 */
export function hasVehicleLimit(planId: PlanType): boolean {
  return plans[planId].maxVehicles !== -1;
}

/**
 * Verifica si un plan tiene límite de usuarios
 */
export function hasUserLimit(planId: PlanType): boolean {
  return plans[planId].maxUsers !== -1;
}

/**
 * Obtiene el límite de vehículos para un plan
 * @returns El número máximo de vehículos o Infinity si es ilimitado
 */
export function getVehicleLimit(planId: PlanType): number {
  const limit = plans[planId].maxVehicles;
  return limit === -1 ? Infinity : limit;
}

/**
 * Obtiene el límite de usuarios para un plan
 * @returns El número máximo de usuarios o Infinity si es ilimitado
 */
export function getUserLimit(planId: PlanType): number {
  const limit = plans[planId].maxUsers;
  return limit === -1 ? Infinity : limit;
}

/**
 * Verifica si se puede agregar un vehículo según el plan
 */
export function canAddVehicle(planId: PlanType, currentCount: number): boolean {
  const limit = getVehicleLimit(planId);
  return currentCount < limit;
}

/**
 * Verifica si se puede agregar un usuario según el plan
 */
export function canAddUser(planId: PlanType, currentCount: number): boolean {
  const limit = getUserLimit(planId);
  return currentCount < limit;
}

/**
 * Obtiene el mensaje de límite alcanzado para vehículos
 */
export function getVehicleLimitMessage(planId: PlanType, currentCount: number): string {
  const plan = plans[planId];
  if (plan.maxVehicles === -1) return '';
  return `Has alcanzado el límite de ${plan.maxVehicles} vehículos de tu plan ${plan.name}. Contacta para upgrade.`;
}

/**
 * Obtiene el mensaje de límite alcanzado para usuarios
 */
export function getUserLimitMessage(planId: PlanType, currentCount: number): string {
  const plan = plans[planId];
  if (plan.maxUsers === -1) return '';
  return `Has alcanzado el límite de ${plan.maxUsers} usuarios de tu plan ${plan.name}. Contacta para upgrade.`;
}
