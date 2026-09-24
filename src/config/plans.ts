/**
 * Catálogo comercial de FleetEase.
 * Este archivo describe capacidades que hoy existen en el producto.
 * Las capacidades en comingSoon no deben presentarse como incluidas todavía.
 */
export type PlanType = 'free' | 'starter' | 'pro' | 'enterprise';
export interface PlanConfig {
  id: PlanType; name: string; price: number; currency?: string; period: string;
  maxVehicles: number; maxUsers: number; trialDays?: number;
  requiresPaymentMethod?: boolean; description: string; features: string[];
  comingSoon?: string[]; popular?: boolean;
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
  'Reportes ejecutivos','Exportación PDF y Excel','Historial de reportes generados',
  'Auditoría y trazabilidad de operaciones','Operaciones masivas disponibles actualmente','Hasta 3 usuarios','Soporte prioritario',
];
export const plans: Record<PlanType, PlanConfig> = {
  free: { id:'free', name:'Free', price:0, currency:'MXN', period:'14 días', maxVehicles:2, maxUsers:1, trialDays:14, requiresPaymentMethod:false,
    description:'Prueba FleetEase durante 14 días sin tarjeta', features:['14 días gratis','Hasta 2 vehículos','1 usuario','Acceso de prueba a las funciones de Starter','Sin tarjeta de crédito'] },
  starter: { id:'starter', name:'Starter', price:299, currency:'MXN', period:'mes', maxVehicles:5, maxUsers:1, requiresPaymentMethod:true,
    description:'Control operativo y financiero para flotillas pequeñas', features:starterFeatures,
    comingSoon:['WhatsApp Intelligence','Fleet Intelligence vía WhatsApp'] },
  pro: { id:'pro', name:'Pro', price:599, currency:'MXN', period:'mes', maxVehicles:15, maxUsers:3, requiresPaymentMethod:true,
    description:'Rentabilidad, análisis y control avanzado para operaciones en crecimiento', features:proFeatures,
    comingSoon:['WhatsApp Intelligence','Fleet Intelligence vía WhatsApp para administradores, socios y clientes','Automatizaciones operativas avanzadas'], popular:true },
  enterprise: { id:'enterprise', name:'Enterprise', price:999, currency:'MXN', period:'mes', maxVehicles:-1, maxUsers:-1, requiresPaymentMethod:true,
    description:'Para empresas que necesitan mayor capacidad y servicios a la medida',
    features:['Todo lo incluido en Pro','Vehículos ilimitados','Usuarios ilimitados','Soporte y acompañamiento empresarial'],
    comingSoon:['API de integración y webhooks','Multiempresa','Personalización de marca (white-label)','Reportes personalizados','Integraciones GPS multi-proveedor'] },
};
export function getPlanConfig(planId: PlanType): PlanConfig { return plans[planId]; }
export function hasVehicleLimit(planId: PlanType): boolean { return plans[planId].maxVehicles !== -1; }
export function hasUserLimit(planId: PlanType): boolean { return plans[planId].maxUsers !== -1; }
export function getVehicleLimit(planId: PlanType): number { const limit=plans[planId].maxVehicles; return limit===-1?Infinity:limit; }
export function getUserLimit(planId: PlanType): number { const limit=plans[planId].maxUsers; return limit===-1?Infinity:limit; }
export function canAddVehicle(planId: PlanType,currentCount:number):boolean{return currentCount<getVehicleLimit(planId);}
export function canAddUser(planId: PlanType,currentCount:number):boolean{return currentCount<getUserLimit(planId);}
export function getVehicleLimitMessage(planId: PlanType,currentCount:number):string{const plan=plans[planId];if(plan.maxVehicles===-1)return '';return `Has alcanzado el límite de ${plan.maxVehicles} vehículos de tu plan ${plan.name}. Contacta para upgrade.`;}
export function getUserLimitMessage(planId: PlanType,currentCount:number):string{const plan=plans[planId];if(plan.maxUsers===-1)return '';return `Has alcanzado el límite de ${plan.maxUsers} usuarios de tu plan ${plan.name}. Contacta para upgrade.`;}
