// hooks/use-cached-analytics.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import type { DateRange } from 'react-day-picker';

/**
 * Hook genérico para cachear resultados de analytics
 * Proporciona caché inteligente con invalidación automática
 */
export function useCachedAnalytics<TData>(
  queryKey: string[],
  queryFn: () => TData,
  options?: {
    staleTime?: number;
    gcTime?: number;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey,
    queryFn,
    staleTime: options?.staleTime ?? 10 * 60 * 1000, // 10 minutos por defecto
    gcTime: options?.gcTime ?? 30 * 60 * 1000, // 30 minutos
    enabled: options?.enabled ?? true,
    refetchOnWindowFocus: false, // No refetch al cambiar de ventana
    refetchOnMount: false, // No refetch al montar si hay datos en caché
  });
}

/**
 * Genera una clave de caché estable para un rango de fechas
 */
export function getDateRangeKey(dateRange?: DateRange): string {
  if (!dateRange?.from || !dateRange?.to) return 'no-range';

  return `${dateRange.from.toISOString()}_${dateRange.to.toISOString()}`;
}

/**
 * Hook especializado para analytics de dashboard
 * Usa un caché más agresivo ya que los datos no cambian frecuentemente
 */
export function useCachedDashboardAnalytics<TData>(
  category: string,
  queryFn: () => TData,
  dateRange?: DateRange,
  dependencies: any[] = []
) {
  const dateRangeKey = getDateRangeKey(dateRange);

  return useQuery({
    queryKey: ['dashboard-analytics', category, dateRangeKey, ...dependencies],
    queryFn,
    staleTime: 15 * 60 * 1000, // 15 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
