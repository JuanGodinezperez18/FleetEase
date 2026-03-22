
// lib/dashboard-service.ts
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { UserDashboardConfig, DashboardWidget } from '@/types/dashboard';
import { DEFAULT_DASHBOARD_CONFIG } from '@/types/dashboard';

// ✅ Caché en memoria
const dashboardCache = new Map<string, { data: UserDashboardConfig; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export class DashboardService {
  /**
   * Obtener configuración del dashboard del usuario con caché
   */
  static async getUserDashboard(userId: string): Promise<UserDashboardConfig | null> {
    try {
      // ✅ Verificar caché primero
      const cached = dashboardCache.get(userId);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('📦 Dashboard cargado desde caché');
        return cached.data;
      }

      console.log('🔄 Cargando dashboard desde Firestore...');
      const docRef = doc(db, 'userDashboards', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserDashboardConfig;
        
        // ✅ Guardar en caché
        dashboardCache.set(userId, { data, timestamp: Date.now() });
        
        return data;
      }

      // Si no existe, crear configuración por defecto
      const defaultConfig: UserDashboardConfig = {
        userId,
        ...DEFAULT_DASHBOARD_CONFIG,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(docRef, {
        ...defaultConfig,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // ✅ Guardar en caché
      dashboardCache.set(userId, { data: defaultConfig, timestamp: Date.now() });

      return defaultConfig;
    } catch (error) {
      console.error('Error obteniendo dashboard config:', error);
      
      // ✅ Intentar retornar desde caché si falla la red
      const cached = dashboardCache.get(userId);
      if (cached) {
        console.warn('⚠️ Usando dashboard desde caché por error de red');
        return cached.data;
      }
      
      return null;
    }
  }

  /**
   * Actualizar configuración del dashboard con invalidación de caché
   */
  static async updateDashboard(
    userId: string,
    config: Partial<Omit<UserDashboardConfig, 'userId'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, 'userDashboards', userId);
      
      await updateDoc(docRef, {
        ...config,
        updatedAt: serverTimestamp(),
      });

      // ✅ Invalidar caché
      dashboardCache.delete(userId);
      
      console.log('✅ Dashboard actualizado y caché invalidado');
    } catch (error) {
      console.error('Error actualizando dashboard config:', error);
      throw error;
    }
  }

  /**
   * Guardar orden de widgets con optimistic update
   */
  static async saveWidgetOrder(userId: string, widgets: DashboardWidget[]): Promise<void> {
    // ✅ Actualizar caché optimistamente
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
   * Limpiar caché manualmente (útil para desarrollo)
   */
  static clearCache(userId?: string): void {
    if (userId) {
      dashboardCache.delete(userId);
      console.log(`🗑️ Caché limpiado para usuario: ${userId}`);
    } else {
      dashboardCache.clear();
      console.log('🗑️ Caché completo limpiado');
    }
  }

  /**
   * Prefetch dashboard config (útil para optimización)
   */
  static async prefetchDashboard(userId: string): Promise<void> {
    try {
      await this.getUserDashboard(userId);
      console.log('✅ Dashboard prefetched');
    } catch (error) {
      console.error('Error prefetching dashboard:', error);
    }
  }
}

export const dashboardService = DashboardService;