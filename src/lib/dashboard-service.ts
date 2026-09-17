// lib/dashboard-service.ts
import { supabase } from '@/lib/supabase';
import type { UserDashboardConfig, DashboardWidget } from '@/types/dashboard';
import { DEFAULT_DASHBOARD_CONFIG } from '@/types/dashboard';

// Cache en memoria
const dashboardCache = new Map<string, { data: UserDashboardConfig; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

function mergeDefaultWidgets(config: UserDashboardConfig): UserDashboardConfig {
  const existingIds = new Set(config.widgets.map(widget => widget.id));
  const maxOrder = config.widgets.reduce((max, widget) => Math.max(max, widget.order), -1);
  const missingWidgets: DashboardWidget[] = DEFAULT_DASHBOARD_CONFIG.widgets
    .filter(widget => !existingIds.has(widget.id))
    .map((widget, index) => ({ ...widget, order: maxOrder + index + 1 }));

  if (missingWidgets.length === 0) return config;
  return { ...config, widgets: [...config.widgets, ...missingWidgets] };
}

export class DashboardService {
  /**
   * Obtener configuracion del dashboard del usuario con cache
   */
  static async getUserDashboard(userId: string): Promise<UserDashboardConfig | null> {
    try {
      const cached = dashboardCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('Dashboard cargado desde cache');
        return cached.data;
      }

      console.log('Cargando dashboard desde Supabase...');
      // Usar localStorage como fallback ya que no hay tabla user_dashboards
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`dashboard_${userId}`);
        if (stored) {
          try {
            const data = mergeDefaultWidgets(JSON.parse(stored) as UserDashboardConfig);
            localStorage.setItem(`dashboard_${userId}`, JSON.stringify(data));
            dashboardCache.set(userId, { data, timestamp: Date.now() });
            return data;
          } catch {
            // Ignorar error de parseo
          }
        }
      }

      const defaultConfig: UserDashboardConfig = {
        userId,
        ...DEFAULT_DASHBOARD_CONFIG,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(`dashboard_${userId}`, JSON.stringify(defaultConfig));
      }

      dashboardCache.set(userId, { data: defaultConfig, timestamp: Date.now() });
      return defaultConfig;
    } catch (error) {
      console.error('Error obteniendo dashboard config:', error);
      const cached = dashboardCache.get(userId);
      if (cached) {
        console.warn('Usando dashboard desde cache por error de red');
        return cached.data;
      }
      return null;
    }
  }

  /**
   * Actualizar configuracion del dashboard con invalidacion de cache
   */
  static async updateDashboard(
    userId: string,
    config: Partial<Omit<UserDashboardConfig, 'userId'>>
  ): Promise<void> {
    try {
      const current = await this.getUserDashboard(userId);
      if (!current) throw new Error('Dashboard no encontrado');

      const updated = { ...current, ...config, updatedAt: new Date().toISOString() };

      if (typeof window !== 'undefined') {
        localStorage.setItem(`dashboard_${userId}`, JSON.stringify(updated));
      }

      dashboardCache.delete(userId);
      console.log('Dashboard actualizado y cache invalidado');
    } catch (error) {
      console.error('Error actualizando dashboard config:', error);
      throw error;
    }
  }

  /**
   * Guardar orden de widgets con optimistic update
   */
  static async saveWidgetOrder(userId: string, widgets: DashboardWidget[]): Promise<void> {
    const cached = dashboardCache.get(userId);
    if (cached) {
      cached.data.widgets = widgets;
      cached.timestamp = Date.now();
    }

    return this.updateDashboard(userId, { widgets });
  }

  /**
   * Alternar visibilidad de widget
   */
  static async toggleWidget(userId: string, widgetId: string): Promise<void> {
    const config = await this.getUserDashboard(userId);
    if (!config) return;

    const updatedWidgets = config.widgets.map(w =>
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    );

    return this.updateDashboard(userId, { widgets: updatedWidgets });
  }

  /**
   * Limpiar cache manualmente (util para desarrollo)
   */
  static clearCache(userId?: string): void {
    if (userId) {
      dashboardCache.delete(userId);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`dashboard_${userId}`);
      }
      console.log(`Cache limpiado para usuario: ${userId}`);
    } else {
      dashboardCache.clear();
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('dashboard_')) {
            localStorage.removeItem(key);
          }
        });
      }
      console.log('Cache completo limpiado');
    }
  }

  /**
   * Prefetch dashboard config (util para optimizacion)
   */
  static async prefetchDashboard(userId: string): Promise<void> {
    try {
      await this.getUserDashboard(userId);
      console.log('Dashboard prefetched');
    } catch (error) {
      console.error('Error prefetching dashboard:', error);
    }
  }
}

export const dashboardService = DashboardService;
