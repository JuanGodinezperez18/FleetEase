// lib/dashboard-service.ts
import { supabase } from '@/lib/supabase';
import type { UserDashboardConfig, DashboardWidget } from '@/types/dashboard';
import { DEFAULT_DASHBOARD_CONFIG } from '@/types/dashboard';

// Cache en memoria
const dashboardCache = new Map<string, { data: UserDashboardConfig; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export class DashboardService {
  /**
   * Obtener configuracion del dashboard del usuario con cache
   */
  static async getUserDashboard(userId: string): Promise<UserDashboardConfig | null> {
    try {
      // Verificar cache primero
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
            const data = JSON.parse(stored) as UserDashboardConfig;
            dashboardCache.set(userId, { data, timestamp: Date.now() });
            return data;
          } catch {
            // Ignorar error de parseo
          }
        }
      }

      // Si no existe, crear configuracion por defecto
      const defaultConfig: UserDashboardConfig = {
        userId,
        ...DEFAULT_DASHBOARD_CONFIG,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Guardar en localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(`dashboard_${userId}`, JSON.stringify(defaultConfig));
      }

      // Guardar en cache
      dashboardCache.set(userId, { data: defaultConfig, timestamp: Date.now() });

      return defaultConfig;
    } catch (error) {
      console.error('Error obteniendo dashboard config:', error);
      
      // Intentar retornar desde cache si falla la red
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
      // Guardar en localStorage
      const current = await this.getUserDashboard(userId);
      if (!current) throw new Error('Dashboard no encontrado');
      
      const updated = { ...current, ...config, updatedAt: new Date().toISOString() };
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(`dashboard_${userId}`, JSON.stringify(updated));
      }

      // Invalidar cache
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
    // Actualizar cache optimistamente
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
        // Limpiar todos los dashboards
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