// hooks/use-dashboard-config.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '@/lib/dashboard-service';
import type { UserDashboardConfig, DashboardWidget } from '@/types/dashboard';
import { toast } from 'sonner';

const DASHBOARD_QUERY_KEY = 'dashboard-config';

/**
 * Hook para obtener configuración del dashboard con React Query
 */
export function useDashboardConfig(userId: string | undefined) {
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, userId],
    queryFn: async () => {
      console.log('📊 [Dashboard Config] Cargando configuración para userId:', userId);

      if (!userId) {
        console.error('❌ [Dashboard Config] No userId proporcionado');
        throw new Error('User ID requerido');
      }

      console.log('📊 [Dashboard Config] Llamando a dashboardService.getUserDashboard...');
      const config = await dashboardService.getUserDashboard(userId);

      console.log('📊 [Dashboard Config] Configuración recibida:', config ? 'existe' : 'null');

      // ✅ Asegurar que los widgets siempre sean un array ordenado
      if (config && Array.isArray(config.widgets)) {
        config.widgets.sort((a, b) => a.order - b.order);
        console.log('✅ [Dashboard Config] Widgets ordenados:', config.widgets.length);
      }

      return config;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}


/**
 * Hook para actualizar dashboard con optimistic updates
 */
export function useUpdateDashboard(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<Omit<UserDashboardConfig, 'userId'>>) => {
      if (!userId) throw new Error('User ID requerido');
      await dashboardService.updateDashboard(userId, config);
    },
    onMutate: async (newConfig) => {
      // ✅ Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: [DASHBOARD_QUERY_KEY, userId] });

      // ✅ Snapshot del valor anterior
      const previousConfig = queryClient.getQueryData<UserDashboardConfig>([
        DASHBOARD_QUERY_KEY,
        userId,
      ]);

      // ✅ Optimistic update
      if (previousConfig) {
        queryClient.setQueryData<UserDashboardConfig>(
          [DASHBOARD_QUERY_KEY, userId],
          { ...previousConfig, ...newConfig }
        );
      }

      return { previousConfig };
    },
    onError: (err, newConfig, context) => {
      // ✅ Rollback en caso de error
      if (context?.previousConfig) {
        queryClient.setQueryData(
          [DASHBOARD_QUERY_KEY, userId],
          context.previousConfig
        );
      }
      toast.error('Error al actualizar dashboard');
      console.error('Error en mutación:', err);
    },
    onSuccess: () => {
      // ✅ Invalidar y refetch para asegurar consistencia
      queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY, userId] });
      toast.success('Dashboard actualizado');
    },
  });
}

/**
 * Hook para guardar orden de widgets
 */
export function useSaveWidgetOrder(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (widgets: DashboardWidget[]) => {
      if (!userId) throw new Error('User ID requerido');
      await dashboardService.saveWidgetOrder(userId, widgets);
    },
    onMutate: async (newWidgets) => {
      await queryClient.cancelQueries({ queryKey: [DASHBOARD_QUERY_KEY, userId] });

      const previousConfig = queryClient.getQueryData<UserDashboardConfig>([
        DASHBOARD_QUERY_KEY,
        userId,
      ]);

      if (previousConfig) {
        // Asegurarse de que `widgets` es un array antes de actualizar
        const updatedConfig = { 
          ...previousConfig, 
          widgets: Array.isArray(newWidgets) ? newWidgets : previousConfig.widgets 
        };
        queryClient.setQueryData<UserDashboardConfig>(
          [DASHBOARD_QUERY_KEY, userId],
          updatedConfig
        );
      }

      return { previousConfig };
    },
    onError: (err, newWidgets, context) => {
      if (context?.previousConfig) {
        queryClient.setQueryData(
          [DASHBOARD_QUERY_KEY, userId],
          context.previousConfig
        );
      }
      toast.error('Error al guardar orden');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY, userId] });
    },
  });
}
