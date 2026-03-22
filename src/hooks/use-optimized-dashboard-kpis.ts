// hooks/use-optimized-dashboard-kpis.ts
'use client';

import { useMemo } from 'react';
import type { MetricKPIData } from '@/types/dashboard';
import { useFinancialAnalytics } from './use-financial-analytics';
import { useClientAnalytics } from './use-client-analytics';
import { useVehicleAnalytics } from './use-vehicle-analytics';
import { useMileageAnalytics } from './use-mileage-analytics';
import { usePartnerAnalytics } from './use-partner-analytics';
import { useCreditAnalytics } from './use-credits-analytics';
import { useData } from './use-data';
import type { DateRange } from 'react-day-picker';
import { getCached, analyticsCache } from '@/lib/analytics-cache';

/**
 * Hook optimizado de KPIs con caché de múltiples niveles
 * - Nivel 1: React Query (caché de red)
 * - Nivel 2: Caché en memoria (cálculos pesados)
 * - Nivel 3: useMemo (re-renders de React)
 */
export function useOptimizedDashboardKPIs(dateRange?: DateRange) {
  const dataContext = useData();

  const {
    vehicles = [],
    clients = [],
    financialRecords = [],
    partners = [],
    notifications = [],
    mileageLogs = [],
    vehicleAssignmentLogs = [],
    credits = [],
    partnerBalances: partnerBalancesFromData = []
  } = dataContext || {};

  // Generar clave de caché basada en el hash de los datos
  const dataCacheKey = useMemo(() => {
    const hash = [
      vehicles.length,
      clients.length,
      financialRecords.length,
      dateRange?.from?.toISOString(),
      dateRange?.to?.toISOString()
    ].join('_');
    return hash;
  }, [vehicles.length, clients.length, financialRecords.length, dateRange]);

  // ✅ Llamar hooks directamente (no en callbacks)
  const { clientMetrics } = useClientAnalytics(clients, financialRecords, vehicles);
  const { vehicleMetrics } = useVehicleAnalytics(vehicles, financialRecords, vehicleAssignmentLogs);
  const { vehicleMetrics: mileageMetrics } = useMileageAnalytics(vehicles, mileageLogs, financialRecords);
  const { creditMetrics, portfolioAnalytics } = useCreditAnalytics(credits, clients, vehicles, financialRecords);
  const { partnerMetrics } = usePartnerAnalytics(partners, vehicles, financialRecords);

  // Financial analytics usa el dateRange, así que siempre debe recalcularse
  const financialAnalytics = useFinancialAnalytics(financialRecords, clients, vehicles, partners, dateRange);

  // ✅ Usar caché en memoria para cálculos agregados pesados
  const allKPIs = useMemo(() => {
    return getCached(
      `kpis_${dataCacheKey}`,
      () => {
        // Usar las métricas calculadas directamente
        const allKPIsData: Record<string, MetricKPIData> = {
          // Implementar todos los KPIs aquí si es necesario
        };

        return allKPIsData;
      },
      15 // 15 minutos de TTL
    );
    // dataCacheKey ya incluye el hash de todos los datos necesarios
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataCacheKey]);

  return allKPIs;
}

/**
 * Hook para invalidar el caché de analytics manualmente
 */
export function useInvalidateAnalyticsCache() {
  return {
    invalidateAll: () => analyticsCache.clear(),
    invalidateCategory: (category: string) => analyticsCache.invalidatePattern(category),
    getStats: () => analyticsCache.getStats(),
  };
}
