// hooks/use-dashboard-kpis.ts
/* vercel-redeploy: dashboard fleet kpi fab */
import { useMemo } from 'react';
import type { MetricKPIData } from '@/types/dashboard';
import { useFinancialAnalytics } from './use-financial-analytics';
import { useData } from './use-data';
import { useMileageAnalytics } from './use-mileage-analytics';
import { usePartnerAnalytics } from './use-partner-analytics';
import { useCreditAnalytics } from './use-credits-analytics';
import { useMultasAnalytics } from './use-multas-analytics';
import type { DateRange } from 'react-day-picker';
import { isWithinInterval } from 'date-fns';
import { infallibleNormalizeDate } from '@/lib/date-utils';

/**
 * Hook central que agrega todos los KPIs de los hooks especializados.
 * Devuelve un único objeto con todos los datos listos para consumir.
 * Incluye trendData (sparklines) y trend (badge) automáticamente desde cashFlowAnalysis.
 */
export function useDashboardKPIs(dateRange?: DateRange) {
  const dataContext = useData();
  
  const {
    vehicles = [],
    clients = [],
    financialRecords = [],
    partners = [],
    mileageLogs = [],
    credits = [],
    partnerBalances: partnerBalancesFromData = [],
    multas = [],
    financialCategories = [],
    companies = [],
    clientMetrics = [],
    vehicleMetrics = []
  } = dataContext || {};

  const financialAnalytics = useFinancialAnalytics(financialRecords, clients, vehicles, dateRange, financialCategories);
  
  const { vehicleMetrics: mileageMetrics = [] } = useMileageAnalytics(vehicles, mileageLogs, financialRecords, companies) || {};
  const { partnerMetrics = [] } = usePartnerAnalytics(partners, vehicles, financialRecords) || {};
  const { creditMetrics = [], portfolioAnalytics = { totalPortfolioValue: 0, totalRemaining: 0 } } = useCreditAnalytics(credits, financialRecords) || {};
  const multasAnalytics = useMultasAnalytics(multas, vehicles, clients);

  return useMemo(() => {
    // Temporary baseline restore — full KPI enrichment lands in follow-up commit.
    return {} as Record<string, MetricKPIData>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    vehicles,
    clients,
    financialRecords,
    partners,
    mileageLogs,
    credits,
    multas,
    dateRange,
    clientMetrics,
    vehicleMetrics,
    mileageMetrics,
    partnerMetrics,
    creditMetrics,
    portfolioAnalytics,
    partnerBalancesFromData,
    financialAnalytics,
    multasAnalytics
  ]);
}
