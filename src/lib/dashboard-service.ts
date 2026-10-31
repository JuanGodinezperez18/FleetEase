// lib/dashboard-service.ts
import type { UserDashboardConfig, DashboardWidget } from '@/types/dashboard';
import { DEFAULT_DASHBOARD_CONFIG, DEFAULT_WIDGET_SIZE } from '@/types/dashboard';

// Cache en memoria
const dashboardCache = new Map<string, { data: UserDashboardConfig; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/** v3 = density layout + explicit size on defaults */
const CURRENT_DASHBOARD_VERSION = 3;
const REDUNDANT_DEFAULT_WIDGET_IDS = new Set([
  'income-month',
  'expenses-month',
  'net-income',
  'maintenance-overdue',
  'critical-clients',
  'total-lent',
  'total-pending',
]);

function applyDefaultSizes(widgets: DashboardWidget[]): DashboardWidget[] {
  return widgets.map(widget => {
    if (widget.size) return widget;
    const suggested =
      DEFAULT_WIDGET_SIZE[widget.id] ??
      (widget.type === 'chart' ? 'medium' : 'small');
    return { ...widget, size: suggested };
  });
}

function mergeDefaultWidgets(config: UserDashboardConfig): UserDashboardConfig {
  const version = config.dashboardVersion ?? 1;
  const needsRedundancyMigration = version < 2;
  const needsSizeMigration = version < 3;

  let migratedWidgets = needsRedundancyMigration
    ? config.widgets.filter(widget => !REDUNDANT_DEFAULT_WIDGET_IDS.has(widget.id))
    : config.widgets;

  if (needsSizeMigration) {
    migratedWidgets = applyDefaultSizes(migratedWidgets);
  }

  const existingIds = new Set(migratedWidgets.map(widget => widget.id));
  const maxOrder = migratedWidgets.reduce((max, widget) => Math.max(max, widget.order), -1);
  const missingWidgets: DashboardWidget[] = DEFAULT_DASHBOARD_CONFIG.widgets
    .filter(widget => !existingIds.has(widget.id))
    .map((widget, index) => ({ ...widget, order: maxOrder + index + 1 }));

  if (!needsRedundancyMigration && !needsSizeMigration && missingWidgets.length === 0) {
    return config;
  }

  return {
    ...config,
    dashboardVersion: CURRENT_DASHBOARD_VERSION,
    widgets: [...migratedWidgets, ...missingWidgets],
  };
}

export class DashboardService {
  static async getUserDashboard(userId: string): Promise<UserDashboardConfig | null> {
    try {
      const cached = dashboardCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
      }

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
        dashboardVersion: CURRENT_DASHBOARD_VERSION,
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
      if (cached) return cached.data;
      return null;
    }
  }

  static async updateDashboard(
    userId: string,
    config: Partial<Omit<UserDashboardConfig, 'userId'>>
  ): Promise<void> {
    try {
      const current = await this.getUserDashboard(userId);
      if (!current) throw new Error('Dashboard no encontrado');

      const updated = {
        ...current,
        ...config,
        dashboardVersion: CURRENT_DASHBOARD_VERSION,
        updatedAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(`dashboard_${userId}`, JSON.stringify(updated));
      }

      dashboardCache.delete(userId);
    } catch (error) {
      console.error('Error actualizando dashboard config:', error);
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

    const updatedWidgets = config.widgets.map(w =>
      w.id === widgetId ? { ...w, enabled: !w.enabled } : w
    );

    return this.updateDashboard(userId, { widgets: updatedWidgets });
  }

  static clearCache(userId?: string): void {
    if (userId) {
      dashboardCache.delete(userId);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`dashboard_${userId}`);
      }
    } else {
      dashboardCache.clear();
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('dashboard_')) localStorage.removeItem(key);
        });
      }
    }
  }

  static async prefetchDashboard(userId: string): Promise<void> {
    try {
      await this.getUserDashboard(userId);
    } catch (error) {
      console.error('Error prefetching dashboard:', error);
    }
  }
}

export const dashboardService = DashboardService;
