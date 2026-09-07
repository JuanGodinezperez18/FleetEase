// hooks/use-dashboard-config.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardService } from '@/lib/dashboard-service';
import type { UserDashboardConfig, DashboardWidget } from '@/types/dashboard';
import { toast } from 'sonner';

const DASHBOARD_QUERY_KEY = 'dashboard-config';
const logDashboard = (...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') console.log(...args);
};

export function useDashboardConfig(userId: string | undefined) {
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, userId],
    queryFn: async () => {
      logDashboard('📊 [Dashboard Config] Cargando configuración para userId:', userId);
      if (!userId) throw new Error('User ID requerido');
      logDashboard('📊 [Dashboard Config] Llamando a dashboardService.getUserDashboard...');
      const config = await dashboardService.getUserDashboard(userId);
      logDashboard('📊 [Dashboard Config] Configuración recibida:', config ? 'existe' : 'null');
      if (config && Array.isArray(config.widgets)) {
        config.widgets.sort((a, b) => a.order - b.order);
        logDashboard('✅ [Dashboard Config] Widgets ordenados:', config.widgets.length);
      }
      return config;
    },
    enabled: !!userId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useUpdateDashboard(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (config: Partial<Omit<UserDashboardConfig, 'userId'>>) => {
      if (!userId) throw new Error('User ID requerido');
      await dashboardService.updateDashboard(userId, config);
    },
    onMutate: async (newConfig) => {
      await queryClient.cancelQueries({ queryKey: [DASHBOARD_QUERY_KEY, userId] });
      const previousConfig = queryClient.getQueryData<UserDashboardConfig>([DASHBOARD_QUERY_KEY, userId]);
      if (previousConfig) queryClient.setQueryData<UserDashboardConfig>([DASHBOARD_QUERY_KEY, userId], { ...previousConfig, ...newConfig });
      return { previousConfig };
    },
    onError: (err, _newConfig, context) => {
      if (context?.previousConfig) queryClient.setQueryData([DASHBOARD_QUERY_KEY, userId], context.previousConfig);
      toast.error('Error al actualizar dashboard');
      if (process.env.NODE_ENV === 'development') console.error('Error en mutación:', err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY, userId] });
      toast.success('Dashboard actualizado');
    },
  });
}

export function useSaveWidgetOrder(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (widgets: DashboardWidget[]) => {
      if (!userId) throw new Error('User ID requerido');
      await dashboardService.saveWidgetOrder(userId, widgets);
    },
    onMutate: async (newWidgets) => {
      await queryClient.cancelQueries({ queryKey: [DASHBOARD_QUERY_KEY, userId] });
      const previousConfig = queryClient.getQueryData<UserDashboardConfig>([DASHBOARD_QUERY_KEY, userId]);
      if (previousConfig) queryClient.setQueryData<UserDashboardConfig>([DASHBOARD_QUERY_KEY, userId], { ...previousConfig, widgets: Array.isArray(newWidgets) ? newWidgets : previousConfig.widgets });
      return { previousConfig };
    },
    onError: (_err, _newWidgets, context) => {
      if (context?.previousConfig) queryClient.setQueryData([DASHBOARD_QUERY_KEY, userId], context.previousConfig);
      toast.error('Error al guardar orden');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY, userId] }),
  });
}
