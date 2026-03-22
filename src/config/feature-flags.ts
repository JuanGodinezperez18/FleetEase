/**
 * Sistema de Feature Flags basado en el plan
 * Controla qué características están disponibles según el plan del usuario
 */

import type { PlanType } from '@/config/plans';

// Definición de todas las features disponibles en la aplicación
export type FeatureKey =
  | 'vehicles'           // Gestión de vehículos
  | 'clients'            // Gestión de clientes
  | 'partners'           // Gestión de socios
  | 'financial_records'  // Registro de ingresos/gastos
  | 'dashboard_basic'    // Dashboard básico
  | 'dashboard_advanced' // Dashboard avanzado con métricas
  | 'profitability'      // Rentabilidad por vehículo
  | 'client_score'       // Client Score (calificación de clientes)
  | 'maintenance_alerts' // Alertas de mantenimiento
  | 'reports_excel'      // Reportes en Excel
  | 'multi_user'         // Múltiples usuarios
  | 'api_access'         // API de integración
  | 'white_label'        // Personalización de marca
  | 'multi_company'      // Multi-empresa
  | 'priority_support'   // Soporte prioritario
  | 'sat_integration'    // Integración con SAT
  | 'custom_reports'     // Reportes personalizados
  | 'audit_logs'         // Logs de auditoría
  | 'advanced_analytics' // Analíticas avanzadas
  | 'bulk_operations'    // Operaciones masivas
  | 'email_notifications' // Notificaciones por email
  | 'whatsapp_notifications'; // Notificaciones por WhatsApp

// Configuración de features por plan
export const featureFlags: Record<PlanType, Record<FeatureKey, boolean>> = {
  starter: {
    vehicles: true,
    clients: true,
    partners: true,
    financial_records: true,
    dashboard_basic: true,
    dashboard_advanced: false,
    profitability: false,
    client_score: false,
    maintenance_alerts: false,
    reports_excel: false,
    multi_user: false,
    api_access: false,
    white_label: false,
    multi_company: false,
    priority_support: false,
    sat_integration: false,
    custom_reports: false,
    audit_logs: false,
    advanced_analytics: false,
    bulk_operations: false,
    email_notifications: true,
    whatsapp_notifications: false,
  },
  pro: {
    vehicles: true,
    clients: true,
    partners: true,
    financial_records: true,
    dashboard_basic: true,
    dashboard_advanced: true,
    profitability: true,
    client_score: true,
    maintenance_alerts: true,
    reports_excel: true,
    multi_user: true,
    api_access: false,
    white_label: false,
    multi_company: false,
    priority_support: true,
    sat_integration: false,
    custom_reports: false,
    audit_logs: true,
    advanced_analytics: false,
    bulk_operations: true,
    email_notifications: true,
    whatsapp_notifications: true,
  },
  enterprise: {
    vehicles: true,
    clients: true,
    partners: true,
    financial_records: true,
    dashboard_basic: true,
    dashboard_advanced: true,
    profitability: true,
    client_score: true,
    maintenance_alerts: true,
    reports_excel: true,
    multi_user: true,
    api_access: true,
    white_label: true,
    multi_company: true,
    priority_support: true,
    sat_integration: true,
    custom_reports: true,
    audit_logs: true,
    advanced_analytics: true,
    bulk_operations: true,
    email_notifications: true,
    whatsapp_notifications: true,
  },
};

/**
 * Verifica si una feature está disponible para un plan
 */
export function isFeatureEnabled(plan: PlanType, feature: FeatureKey): boolean {
  return featureFlags[plan][feature] || false;
}

/**
 * Verifica si múltiples features están disponibles
 */
export function areFeaturesEnabled(plan: PlanType, features: FeatureKey[]): boolean {
  return features.every(feature => isFeatureEnabled(plan, feature));
}

/**
 * Obtiene todas las features disponibles para un plan
 */
export function getAvailableFeatures(plan: PlanType): FeatureKey[] {
  return Object.entries(featureFlags[plan])
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature as FeatureKey);
}

/**
 * Obtiene todas las features NO disponibles para un plan (para mostrar upgrade)
 */
export function getUnavailableFeatures(plan: PlanType): FeatureKey[] {
  return Object.entries(featureFlags[plan])
    .filter(([_, enabled]) => !enabled)
    .map(([feature]) => feature as FeatureKey);
}

/**
 * Hook para verificar features en componentes
 */
export function checkFeature(plan: PlanType, feature: FeatureKey): {
  enabled: boolean;
  message: string;
} {
  const enabled = isFeatureEnabled(plan, feature);
  
  const messages: Record<FeatureKey, string> = {
    vehicles: 'Gestión de vehículos',
    clients: 'Gestión de clientes',
    partners: 'Gestión de socios',
    financial_records: 'Registro de ingresos y gastos',
    dashboard_basic: 'Dashboard básico',
    dashboard_advanced: 'Dashboard avanzado',
    profitability: 'Rentabilidad por vehículo',
    client_score: 'Client Score',
    maintenance_alerts: 'Alertas de mantenimiento',
    reports_excel: 'Reportes en Excel',
    multi_user: 'Múltiples usuarios',
    api_access: 'API de integración',
    white_label: 'Personalización de marca',
    multi_company: 'Multi-empresa',
    priority_support: 'Soporte prioritario',
    sat_integration: 'Integración con SAT',
    custom_reports: 'Reportes personalizados',
    audit_logs: 'Logs de auditoría',
    advanced_analytics: 'Analíticas avanzadas',
    bulk_operations: 'Operaciones masivas',
    email_notifications: 'Notificaciones por email',
    whatsapp_notifications: 'Notificaciones por WhatsApp',
  };

  return {
    enabled,
    message: enabled 
      ? `${messages[feature]} disponible`
      : `${messages[feature]} no disponible en tu plan`,
  };
}

// Mapeo de rutas a features requeridas
export const routeFeatureMap: Record<string, FeatureKey> = {
  '/dashboard/profitability': 'profitability',
  '/dashboard/reports': 'reports_excel',
  '/dashboard/users': 'multi_user',
  '/dashboard/settings/company': 'multi_company',
  '/dashboard/advanced-analytics': 'advanced_analytics',
};

/**
 * Verifica si una ruta está disponible para un plan
 */
export function isRouteAvailable(plan: PlanType, route: string): boolean {
  const requiredFeature = routeFeatureMap[route];
  if (!requiredFeature) return true; // Si no hay feature requerida, está disponible
  return isFeatureEnabled(plan, requiredFeature);
}
