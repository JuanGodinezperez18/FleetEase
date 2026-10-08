// types/dashboard.ts

import {
    DollarSign, TrendingUp, TrendingDown, Percent, Clock, Target, Calculator, Calendar, CalendarCheck,
    Shield, ShieldAlert, Truck, Car, Wrench, Gauge, Key, AlertCircle, AlertTriangle, Settings, Users,
    UserPlus, Heart, UserCheck, UserX, Star, XCircle, Landmark, CreditCard, CheckCircle, Wallet,
    CheckSquare, Banknote, Trophy, FileText, Award, Activity, BarChart, Zap, Server, PieChart, Building,
    Lock, Bell, type LucideIcon
  } from 'lucide-react';

export const IconMap: Record<string, LucideIcon> = {
  DollarSign, TrendingUp, TrendingDown, Percent, Clock, Target, Calculator, Calendar, CalendarCheck,
  Shield, ShieldAlert, Truck, Car, Wrench, Gauge, Key, AlertCircle, AlertTriangle, Settings, Users,
  UserPlus, Heart, UserCheck, UserX, Star, XCircle, Landmark, CreditCard, CheckCircle, Wallet,
  CheckSquare, Banknote, Trophy, FileText, Award, Activity, BarChart, Zap, Server, PieChart, Building, Lock, Bell,
} as const;

export type IconName = keyof typeof IconMap;

export interface KPIConfig {
  id: string;
  label: string;
  icon: IconName;
  type?: 'metric' | 'chart' | 'table';
  category: string;
  isInteractive?: boolean;
  color?: string;
}

export const AVAILABLE_KPIS = {
  CLIENTES: [
    { id: 'total-clients', label: 'Clientes Activos', icon: 'Users', color: 'blue', category: 'CLIENTES' },
    { id: 'client-balance-total', label: 'Balance Total Clientes', icon: 'Wallet', isInteractive: true, color: 'blue', category: 'CLIENTES' },
    { id: 'clients-with-debt', label: 'Clientes con Deuda', icon: 'AlertCircle', isInteractive: true, color: 'yellow', category: 'CLIENTES' },
    { id: 'critical-clients', label: 'Clientes Críticos (>$6k)', icon: 'AlertTriangle', isInteractive: true, color: 'red', category: 'CLIENTES' },
    { id: 'avg-client-balance', label: 'Saldo Promedio', icon: 'DollarSign', color: 'blue', category: 'CLIENTES' },
    { id: 'licenses-expiring', label: 'Licencias por Vencer', icon: 'Calendar', isInteractive: true, color: 'orange', category: 'CLIENTES' },
  ],
  FLOTA: [
    { id: 'total-vehicles', label: 'Vehículos Activos', icon: 'Truck', color: 'indigo', category: 'FLOTA' },
    { id: 'vehicles-rented', label: 'Vehículos Rentados', icon: 'Car', color: 'cyan', category: 'FLOTA' },
    { id: 'vehicles-available', label: 'Vehículos Disponibles', icon: 'CheckCircle', isInteractive: true, color: 'green', category: 'FLOTA' },
    { id: 'vehicles-without-income', label: 'Sin Generar Ingresos', icon: 'Clock', isInteractive: true, color: 'orange', category: 'FLOTA' },
    { id: 'insurance-expiring', label: 'Seguros por Vencer', icon: 'Shield', isInteractive: true, color: 'orange', category: 'FLOTA' },
  ],
  FINANZAS: [
    { id: 'income-month', label: 'Ingresos', icon: 'TrendingUp', isInteractive: true, color: 'green', category: 'FINANZAS' },
    { id: 'income-today', label: 'Ingresos de Hoy', icon: 'DollarSign', isInteractive: true, color: 'green', category: 'FINANZAS' },
    { id: 'expenses-month', label: 'Gastos', icon: 'TrendingDown', isInteractive: true, color: 'red', category: 'FINANZAS' },
    { id: 'expenses-today', label: 'Gastos de Hoy', icon: 'DollarSign', isInteractive: true, color: 'red', category: 'FINANZAS' },
    { id: 'net-income', label: 'Ingreso Neto', icon: 'Wallet', color: 'blue', category: 'FINANZAS' },
    { id: 'cash-flow-month', label: 'Flujo de Efectivo', icon: 'Banknote', color: 'cyan', category: 'FINANZAS' },
    { id: 'top-income-category', label: 'Top Categoría Ingresos', icon: 'Star', color: 'yellow', category: 'FINANZAS' },
    { id: 'top-expense-category', label: 'Top Categoría Gastos', icon: 'AlertCircle', isInteractive: true, color: 'orange', category: 'FINANZAS' },
  ],
  CREDITOS: [
    { id: 'active-credits', label: 'Créditos Activos', icon: 'CreditCard', isInteractive: true, color: 'purple', category: 'CREDITOS' },
    { id: 'overdue-credits', label: 'Pagos Vencidos', icon: 'AlertTriangle', isInteractive: true, color: 'red', category: 'CREDITOS' },
    { id: 'recovery-rate', label: 'Tasa de Recuperación', icon: 'Percent', color: 'green', category: 'CREDITOS' },
    { id: 'projected-income', label: 'Ingreso Proyectado Mensual', icon: 'Calculator', color: 'blue', category: 'CREDITOS' },
    { id: 'total-lent', label: 'Total Prestado', icon: 'Banknote', color: 'indigo', category: 'CREDITOS' },
    { id: 'total-pending', label: 'Saldo Pendiente', icon: 'Clock', color: 'orange', category: 'CREDITOS' },
  ],
  SOCIOS: [
    { id: 'total-partners', label: 'Socios Activos', icon: 'Users', color: 'cyan', category: 'SOCIOS' },
    { id: 'total-partner-balance', label: 'Balance Total Socios', icon: 'Banknote', isInteractive: true, color: 'blue', category: 'SOCIOS' },
    { id: 'partners-positive-balance', label: 'Socios con Saldo a Favor', icon: 'TrendingUp', isInteractive: true, color: 'green', category: 'SOCIOS' },
    { id: 'partners-negative-balance', label: 'Socios con Saldo en Contra', icon: 'TrendingDown', isInteractive: true, color: 'red', category: 'SOCIOS' },
    { id: 'vehicles-by-partners', label: 'Vehículos de Socios', icon: 'Car', color: 'indigo', category: 'SOCIOS' },
    { id: 'avg-partner-balance', label: 'Balance Promedio', icon: 'DollarSign', color: 'blue', category: 'SOCIOS' },
  ],
  KILOMETRAJE: [
    { id: 'maintenance-overdue', label: 'Mantenimiento Vencido', icon: 'AlertTriangle', isInteractive: true, color: 'red', category: 'KILOMETRAJE' },
    { id: 'maintenance-soon', label: 'Mantenimiento Próximo', icon: 'Clock', isInteractive: true, color: 'orange', category: 'KILOMETRAJE' },
    { id: 'avg-fleet-mileage', label: 'KM Promedio Flota', icon: 'Gauge', color: 'blue', category: 'KILOMETRAJE' },
    { id: 'high-mileage-vehicles', label: 'Vehículos Alto KM', icon: 'AlertCircle', isInteractive: true, color: 'yellow', category: 'KILOMETRAJE' },
    { id: 'avg-daily-km', label: 'KM Promedio Diario', icon: 'Activity', color: 'purple', category: 'KILOMETRAJE' },
    { id: 'total-mileage-logs', label: 'Total Registros', icon: 'FileText', color: 'cyan', category: 'KILOMETRAJE' },
  ],
  SISTEMA: [
    { id: 'unread-notifications', label: 'Notificaciones sin leer', icon: 'Bell', isInteractive: false, color: 'cyan', category: 'SISTEMA' },
  ],
  MULTAS: [
    { id: 'total-multas', label: 'Total Multas', icon: 'ShieldAlert', color: 'red', category: 'MULTAS' },
    { id: 'multas-pendientes', label: 'Multas Pendientes', icon: 'AlertTriangle', isInteractive: true, color: 'yellow', category: 'MULTAS' },
    { id: 'multas-pagadas', label: 'Multas Pagadas', icon: 'CheckCircle', color: 'green', category: 'MULTAS' },
    { id: 'monto-pendiente-multas', label: 'Monto Pendiente', icon: 'DollarSign', color: 'orange', category: 'MULTAS' },
    { id: 'vehiculos-con-multas', label: 'Vehículos con Multas', icon: 'Car', isInteractive: true, color: 'red', category: 'MULTAS' },
    { id: 'vehiculos-limpios', label: 'Vehículos Limpios', icon: 'CheckSquare', color: 'green', category: 'MULTAS' },
  ],
} as const;

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table';
  title: string;
  category: keyof typeof AVAILABLE_KPIS;
  dataKey: string;
  enabled: boolean;
  order: number;
  size?: 'small' | 'medium' | 'large';
}

export const CHART_WIDGETS: DashboardWidget[] = [
  { id: 'finance-summary-chart', type: 'chart', title: 'Resumen Financiero', category: 'FINANZAS', dataKey: 'finance-summary-chart', enabled: true, order: 8, size: 'large' },
  { id: 'fleet-status-chart', type: 'chart', title: 'Estado de la Flota', category: 'FLOTA', dataKey: 'fleet-status-chart', enabled: true, order: 9, size: 'large' },
  { id: 'credit-portfolio-chart', type: 'chart', title: 'Cartera de Créditos', category: 'CREDITOS', dataKey: 'credit-portfolio-chart', enabled: true, order: 10, size: 'large' },
  { id: 'maintenance-chart', type: 'chart', title: 'Salud de Mantenimiento', category: 'KILOMETRAJE', dataKey: 'maintenance-chart', enabled: true, order: 11, size: 'large' },
  { id: 'fines-chart', type: 'chart', title: 'Multas de la Flota', category: 'MULTAS', dataKey: 'fines-chart', enabled: true, order: 12, size: 'large' },
  { id: 'client-risk-chart', type: 'chart', title: 'Riesgo de Clientes', category: 'CLIENTES', dataKey: 'client-risk-chart', enabled: true, order: 13, size: 'large' },
];

export interface UserDashboardConfig {
  userId: string;
  companyId?: string;
  layout: 'grid' | 'list';
  theme?: 'light' | 'dark' | 'system';
  widgets: DashboardWidget[];
  createdAt?: string;
  updatedAt?: string;
  dashboardVersion?: number;
}

export const DEFAULT_DASHBOARD_CONFIG: Omit<UserDashboardConfig, 'userId' | 'companyId'> = {
  layout: 'grid',
  theme: 'system',
  widgets: [
    { id: 'unread-notifications', type: 'metric', title: 'Notificaciones sin leer', category: 'SISTEMA', dataKey: 'unread-notifications', enabled: true, order: 0, size: 'large' },
    { id: 'cash-flow-month', type: 'metric', title: 'Flujo de Efectivo', category: 'FINANZAS', dataKey: 'monthNetCashFlow', enabled: true, order: 1 },
    { id: 'total-vehicles', type: 'metric', title: 'Vehículos Activos', category: 'FLOTA', dataKey: 'totalActive', enabled: true, order: 1 },
    { id: 'total-clients', type: 'metric', title: 'Clientes Activos', category: 'CLIENTES', dataKey: 'totalActiveClients', enabled: true, order: 2 },
    { id: 'active-credits', type: 'metric', title: 'Créditos Activos', category: 'CREDITOS', dataKey: 'totalActiveCredits', enabled: true, order: 3 },
    ...CHART_WIDGETS.map((widget, index) => ({ ...widget, order: 4 + index })),
  ],
};

export interface BaseKPIData { value: string | number; loading?: boolean; error?: string; }
export interface MetricKPIData extends BaseKPIData {
  previousValue?: string | number;
  trend?: boolean;
  changePercent?: number;
  subtitle?: string;
  details?: any[];
  trendData?: number[];
}
export interface InteractiveKPIData extends MetricKPIData {}
