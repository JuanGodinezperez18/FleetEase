// lib/dashboard-service.ts
import { supabase } from '@/lib/supabase';
import type { UserDashboardConfig, DashboardWidget } from '@/types/dashboard';
import { DEFAULT_DASHBOARD_CONFIG } from '@/types/dashboard';

const dashboardCache = new Map<string, { data: UserDashboardConfig; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000;
const logDashboard = (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') console.log(...args);
};

export class DashboardService {
  static async getUserDashboard(userId: string): Promise<UserDashboardConfig | null> {
    try {
      const cached = dashboardCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        logDashboard('Dashboard cargado desde cache');
        return cached.data;
      }

      logDashboard('Cargando configuración de dashboard desde almacenamiento local...');
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`dashboard_${userId}`);
        if (stored) {
          try {
            const data = JSON.parse(stored) as UserDashboardConfig;
            dashboardCache.set(userId, { data, timestamp: Date.now() });
            return data;
          } catch {
            // Ignorar configuración corrupta y reconstruir la configuración por defecto.
          }
        }
      }

      const defaultConfig: UserDashboardConfig = {
        userId,
        ...DEFAULT_DASHBOARD_CONFIG,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') localStorage.setItem(`dashboard_${userId}`, JSON.stringify(defaultConfig));
      dashboardCache.set(userId, { data: defaultConfig, timestamp: Date.now() });
      return defaultConfig;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error('Error obteniendo dashboard config:', error);
      const cached = dashboardCache.get(userId);
      if (cached) {
        if (process.env.NODE_ENV === 'development') console.warn('Usando dashboard desde cache por error de red');
        return cached.data;
      }
      return null;
    }
  }

  static async updateDashboard(userId: string, config: Partial<Omit<UserDashboardConfig, 'userId'>>): Promise<void> {
    try {
      const current = await this.getUserDashboard(userId);
      if (!current) throw new Error('Dashboard no encontrado');
      const updated = { ...current, ...config, updatedAt: new Date().toISOString() };
      if (typeof window !== 'undefined') localStorage.setItem(`dashboard_${userId}`, JSON.stringify(updated));
      dashboardCache.set(userId, { data: updated, timestamp: Date.now() });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error('Error actualizando dashboard config:', error);
      throw error;
    }
  }

  static async saveWidgetOrder(userId: string, widgets: DashboardWidget[]): Promise<void> {
    const cached = dashboardCache.get(userId);
    if (cached) {
      cached.data.widgets = widgets;
      cached.timestamp = Date.now();
    }
    return this.updateDashboard(userId, { widgets });
  }

  static async toggleWidget(userId: string, widgetId: string): Promise<void> {
    const config = await this.getUserDashboard(userId);
    if (!config) return;
    const updatedWidgets = config.widgets.map(w => w.id === widgetId ? { ...w, enabled: !w.enabled } : w);
    return this.updateDashboard(userId, { widgets: updatedWidgets });
  }

  static clearCache(userId?: string): void {
    if (userId) {
      dashboardCache.delete(userId);
      if (typeof window !== 'undefined') localStorage.removeItem(`dashboard_${userId}`);
      logDashboard(`Cache limpiado para usuario: ${userId}`);
    } else {
      dashboardCache.clear();
      if (typeof window !== 'undefined') Object.keys(localStorage).forEach(key => {
        if (key.startsWith('dashboard_')) localStorage.removeItem(key);
      });
      logDashboard('Cache completo limpiado');
    }
  }

  static async prefetchDashboard(userId: string): Promise<void> {
    try {
      await this.getUserDashboard(userId);
      logDashboard('Dashboard prefetched');
    } catch (error) {
      if (process.env.NODE_ENV === 'development') console.error('Error prefetching dashboard:', error);
    }
  }
}

export const dashboardService = DashboardService;
