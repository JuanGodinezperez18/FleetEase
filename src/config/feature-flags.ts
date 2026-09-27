/** Entitlements canónicos de FleetEase por plan. */
import type { PlanType } from '@/config/plans';

export type FeatureKey =
  | 'vehicles' | 'clients' | 'partners' | 'financial_records' | 'vehicle_assignments' | 'mileage' | 'maintenance' | 'credits'
  | 'payments' | 'fines' | 'security_deposits' | 'supplier_purchases' | 'accounts_payable' | 'inspections' | 'tracking' | 'documents' | 'ocr'
  | 'client_portal' | 'partner_portal' | 'notifications' | 'dashboard_basic' | 'dashboard_advanced' | 'dashboard_config' | 'profitability'
  | 'client_score' | 'maintenance_alerts' | 'reports_pdf' | 'reports_excel' | 'report_history' | 'multi_user' | 'priority_support' | 'audit_logs'
  | 'advanced_analytics' | 'bulk_operations' | 'email_notifications'
  | 'whatsapp_notifications' | 'whatsapp_intelligence' | 'fleet_intelligence' | 'advanced_automations' | 'api_access' | 'white_label'
  | 'multi_company' | 'custom_reports' | 'gps_integrations';

// Free es una prueba de Starter durante 14 días. Nunca hereda capacidades Pro/Enterprise.
const starter: Record<FeatureKey, boolean> = {
  vehicles:true, clients:true, partners:true, financial_records:true, vehicle_assignments:true, mileage:true, maintenance:true, credits:true,
  payments:true, fines:true, security_deposits:true, supplier_purchases:true, accounts_payable:true, inspections:true, tracking:true, documents:true, ocr:true,
  client_portal:true, partner_portal:true, notifications:true, dashboard_basic:true, dashboard_advanced:false, dashboard_config:false, profitability:false,
  client_score:false, maintenance_alerts:false, reports_pdf:true, reports_excel:false, report_history:false, multi_user:false, priority_support:false, audit_logs:false,
  advanced_analytics:false, bulk_operations:false, email_notifications:true, whatsapp_notifications:false, whatsapp_intelligence:false, fleet_intelligence:false,
  advanced_automations:false, api_access:false, white_label:false, multi_company:false, custom_reports:false, gps_integrations:false,
};

const pro: Record<FeatureKey, boolean> = {
  ...starter,
  dashboard_advanced:true, dashboard_config:true, profitability:true, client_score:true, maintenance_alerts:true,
  reports_excel:true, report_history:true, multi_user:true, priority_support:true, audit_logs:true, advanced_analytics:true, bulk_operations:true,
};

// Enterprise incluye hoy todo Pro. Sus capacidades exclusivas futuras permanecen en comingSoon y no se habilitan hasta implementarse.
const enterprise: Record<FeatureKey, boolean> = { ...pro };

export const featureFlags: Record<PlanType, Record<FeatureKey, boolean>> = {
  free: { ...starter },
  starter: { ...starter },
  pro,
  enterprise,
};

export function isFeatureEnabled(plan: PlanType, feature: FeatureKey): boolean {
  return featureFlags[plan]?.[feature] ?? false;
}

export function areFeaturesEnabled(plan: PlanType, features: FeatureKey[]): boolean {
  return features.every(feature => isFeatureEnabled(plan, feature));
}

export function getAvailableFeatures(plan: PlanType): FeatureKey[] {
  return Object.entries(featureFlags[plan]).filter(([, enabled]) => enabled).map(([feature]) => feature as FeatureKey);
}

export function getUnavailableFeatures(plan: PlanType): FeatureKey[] {
  return Object.entries(featureFlags[plan]).filter(([, enabled]) => !enabled).map(([feature]) => feature as FeatureKey);
}

const messages: Record<FeatureKey, string> = {
  vehicles:'Gestión de vehículos', clients:'Gestión de clientes', partners:'Gestión de socios', financial_records:'Ingresos y gastos', vehicle_assignments:'Asignaciones',
  mileage:'Kilometraje', maintenance:'Mantenimiento', credits:'Créditos', payments:'Pagos', fines:'Multas', security_deposits:'Depósitos en garantía',
  supplier_purchases:'Compras a proveedores', accounts_payable:'Cuentas por pagar', inspections:'Inspecciones', tracking:'Seguimiento', documents:'Documentos', ocr:'OCR documental',
  client_portal:'Portal de clientes', partner_portal:'Portal de socios', notifications:'Notificaciones', dashboard_basic:'Dashboard básico', dashboard_advanced:'Dashboard avanzado',
  dashboard_config:'Dashboard configurable', profitability:'Rentabilidad por vehículo', client_score:'Client Score', maintenance_alerts:'Alertas inteligentes de mantenimiento',
  reports_pdf:'Reportes PDF', reports_excel:'Reportes Excel', report_history:'Historial de reportes', multi_user:'Múltiples usuarios', priority_support:'Soporte prioritario',
  audit_logs:'Auditoría', advanced_analytics:'Analítica avanzada', bulk_operations:'Operaciones masivas', email_notifications:'Email', whatsapp_notifications:'Notificaciones por WhatsApp',
  whatsapp_intelligence:'WhatsApp Intelligence', fleet_intelligence:'Fleet Intelligence', advanced_automations:'Automatizaciones avanzadas', api_access:'API', white_label:'White-label',
  multi_company:'Multiempresa', custom_reports:'Reportes personalizados', gps_integrations:'Integraciones GPS',
};

export function checkFeature(plan: PlanType, feature: FeatureKey): { enabled: boolean; message: string } {
  const enabled = isFeatureEnabled(plan, feature);
  return { enabled, message: enabled ? `${messages[feature]} disponible` : `${messages[feature]} no disponible en tu plan` };
}

// Solo se bloquean aquí módulos completos que son realmente exclusivos de Pro.
// Los módulos Starter/Free siguen disponibles durante la prueba.
export const routeFeatureMap: Record<string, FeatureKey> = {
  '/dashboard/profitability':'profitability',
  '/dashboard/users':'multi_user',
};

export function isRouteAvailable(plan: PlanType, route: string): boolean {
  const requiredFeature = routeFeatureMap[route];
  return !requiredFeature || isFeatureEnabled(plan, requiredFeature);
}
