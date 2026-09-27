// hooks/use-dashboard-kpis.ts
import { useMemo } from 'react';
import type { MetricKPIData } from '@/types/dashboard';
import { useFinancialAnalytics } from './use-financial-analytics';
import { useNotificationsAnalytics } from './use-notifications-analytics';
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
    notifications = [],
    mileageLogs = [],
    vehicleAssignmentLogs = [],
    credits = [],
    partnerBalances: partnerBalancesFromData = [],
    multas = [],
    financialCategories = [],
    companies = [],
    clientMetrics = [],
    vehicleMetrics = []
  } = dataContext || {};

  const financialAnalytics = useFinancialAnalytics(financialRecords, clients, vehicles, partners, dateRange, financialCategories);
  
  const { analyzedNotifications = [] } = useNotificationsAnalytics(
    notifications,
    clients,
    vehicles,
    partners,
    financialRecords,
    []
  ) || {};

  const { vehicleMetrics: mileageMetrics = [] } = useMileageAnalytics(vehicles, mileageLogs, financialRecords, companies) || {};
  const { partnerMetrics = [] } = usePartnerAnalytics(partners, vehicles, financialRecords) || {};
  const { creditMetrics = [], portfolioAnalytics = { totalPortfolioValue: 0, totalRemaining: 0 } } = useCreditAnalytics(credits, clients, vehicles, financialRecords) || {};
  const multasAnalytics = useMultasAnalytics(multas, vehicles, clients);

  return useMemo(() => {
    const filteredFinancialRecords = dateRange && dateRange.from && dateRange.to
      ? financialRecords.filter(r => {
          if (r.isDeleted) return false;
          const recordDate = infallibleNormalizeDate(r.date);
          if (!recordDate) return false;
          return isWithinInterval(recordDate, {
            start: dateRange.from!,
            end: dateRange.to!
          });
        })
      : financialRecords;

    const incomeRecords = filteredFinancialRecords.filter(r => r.type === 'income');
    const expenseRecords = filteredFinancialRecords.filter(r => r.type === 'expense');

    const clientBalances = clientMetrics.map(cm => ({
      clientId: cm.clientId,
      balance: cm.currentBalance || 0
    }));

    const totalClientBalance = clientBalances.reduce((sum, cb) => sum + cb.balance, 0);
    const partnerBalances = partnerBalancesFromData;
    const totalPartnerBalance = partnerBalances.reduce((sum, pb) => sum + pb.balance, 0);

    const totalActiveClients = clients.filter(c => c.status === 'active' && !c.isDeleted).length;

    const enrichedClientMetrics = clientMetrics.map(metric => {
      const client = clients.find(c => c.id === metric.clientId);
      if (!client) return null;

      return {
        ...client,
        balance: metric.currentBalance || 0,
        ...metric
      };
    }).filter((cm): cm is NonNullable<typeof cm> => cm !== null);

    const clientsWithDebt = enrichedClientMetrics.filter(cm => (cm.currentBalance || 0) > 0);
    const criticalClients = enrichedClientMetrics.filter(cm => (cm.currentBalance || 0) > 6000);
    const licensesExpiringClients = enrichedClientMetrics.filter(cm => cm.licenseStatus === 'Próxima a Vencer' || cm.licenseStatus === 'Vencida');
    const licensesExpiringSoon = licensesExpiringClients.length;

    const operationalVehicles = vehicles.filter(v => v.status !== 'sold' && !v.isDeleted);
    const totalRented = operationalVehicles.filter(v => v.status === 'rented' || v.clientId !== null).length;
    const availableVehiclesData = operationalVehicles.filter(v => v.status === 'active' && v.clientId === null);
    const availableVehicles = availableVehiclesData.length;
    const maintenanceDue = mileageMetrics.filter(vm => (vm.kmToNextMaintenance || 0) <= 0).length;
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const insuranceExpiring = operationalVehicles.filter(v => {
      if (!v.insuranceExpiryDate) return false;
      const expiry = new Date(v.insuranceExpiryDate);
      return expiry < thirtyDaysFromNow && expiry > now;
    }).length;

    const activeCredits = credits.filter(c => c.status === 'active' && !c.isDeleted);
    const overdueCredits = creditMetrics.filter(cm => cm.paymentBehavior === 'Retraso Severo').length;
    const totalLent = portfolioAnalytics.totalPortfolioValue || 0;
    const totalRemaining = portfolioAnalytics.totalRemaining || 0;
    const projectedIncome = activeCredits.reduce((sum, c) => sum + (c.weeklyPayment || 0), 0) * 4;
    const recoveryRate = totalLent > 0 ? ((totalLent - totalRemaining) / totalLent) * 100 : 0;

    const activeCreditDetails = activeCredits.map(credit => {
      const client = clients.find(c => c.id === credit.clientId);
      const clientName = client ? `${client.firstname} ${client.lastname}`.trim() : 'Cliente Desconocido';

      return {
        id: credit.id,
        clientId: credit.clientId,
        clientName,
        amount: credit.totalAmount || 0,
        balance: credit.remainingBalance || 0,
        createdAt: credit.startDate || credit.createdAt || new Date().toISOString(),
        status: credit.status as 'active' | 'paid' | 'overdue',
        paymentsCount: credit.paymentsMade || 0,
        totalPayments: credit.numberOfPayments || 0,
      };
    });

    const overdueCreditDetails = creditMetrics
      .filter(cm => cm.paymentBehavior === 'Retraso Severo')
      .map(metric => {
        const credit = credits.find(c => c.id === metric.creditId);
        const client = clients.find(c => c.id === metric.clientId);
        const clientName = client ? `${client.firstname} ${client.lastname}`.trim() : 'Cliente Desconocido';

        return {
          id: metric.creditId,
          clientId: metric.clientId,
          clientName,
          amount: metric.totalAmount,
          balance: metric.remainingBalance,
          createdAt: credit?.startDate || credit?.createdAt || new Date().toISOString(),
          status: 'overdue' as const,
          paymentsCount: metric.paymentsMade,
          totalPayments: metric.paymentsTotal,
        };
      });
    
    const maintenanceSoon = mileageMetrics.filter(vm => {
      const kmToNext = vm.kmToNextMaintenance || 0;
      return kmToNext > 0 && kmToNext <= 1500;
    }).length;

    const cashFlow = financialAnalytics.cashFlowAnalysis || [];
    const incomeTrendData = cashFlow.map(m => (m.income || 0) + (m.payments || 0));
    const expenseTrendData = cashFlow.map(m => m.expenses || 0);
    const netTrendData = cashFlow.map(m => m.netFlow || 0);

    const incomeChange = financialAnalytics.monthlyGrowth?.income ?? 0;
    const expenseChange = financialAnalytics.monthlyGrowth?.expenses ?? 0;
    const profitChange = financialAnalytics.monthlyGrowth?.profit ?? 0;

    const hasSpark = (arr: number[]) => arr.length >= 2 && arr.some(v => v !== 0);

    const allKPIs: Record<string, MetricKPIData> = {
      'total-clients': { value: totalActiveClients, loading: false },
      'client-balance-total': {
        value: totalClientBalance,
        details: enrichedClientMetrics.filter(cm => (cm.currentBalance || 0) !== 0),
        loading: false
      },
      'clients-with-debt': { value: clientsWithDebt.length, details: clientsWithDebt, loading: false },
      'critical-clients': { value: criticalClients.length, details: criticalClients, loading: false },
      'avg-client-balance': { value: totalActiveClients > 0 ? totalClientBalance / totalActiveClients : 0, loading: false },
      'licenses-expiring': { value: licensesExpiringSoon, details: licensesExpiringClients, loading: false },

      'total-vehicles': { value: operationalVehicles.length, loading: false },
      'vehicles-rented': { value: totalRented, loading: false },
      'insurance-expiring': {
        value: insuranceExpiring,
        details: operationalVehicles.filter(v => {
          if (!v.insuranceExpiryDate) return false;
          const expiry = new Date(v.insuranceExpiryDate);
          return expiry < thirtyDaysFromNow && expiry > now;
        }),
        loading: false
      },
      'vehicles-available': {
        value: availableVehicles,
        details: availableVehiclesData.map(v => {
          const metric = mileageMetrics.find(m => m.vehicleId === v.id);
          return { ...v, currentMileage: metric?.currentMileage, nextMaintenanceAt: metric?.nextMaintenanceDue };
        }),
        loading: false
      },

      'income-month': {
        value: financialAnalytics.totalIncome || 0,
        changePercent: incomeChange,
        trend: incomeChange >= 0,
        trendData: hasSpark(incomeTrendData) ? incomeTrendData : undefined,
        details: incomeRecords,
        loading: false
      },
      'income-today': { value: financialAnalytics.todayIncome || 0, loading: false },
      'expenses-month': {
        value: financialAnalytics.totalExpenses || 0,
        changePercent: expenseChange,
        trend: expenseChange <= 0,
        trendData: hasSpark(expenseTrendData) ? expenseTrendData : undefined,
        details: expenseRecords,
        loading: false
      },
      'expenses-today': { value: financialAnalytics.todayExpenses || 0, loading: false },
      'net-income': {
        value: financialAnalytics.netProfit || 0,
        changePercent: profitChange,
        trend: profitChange >= 0,
        trendData: hasSpark(netTrendData) ? netTrendData : undefined,
        loading: false
      },
      'cash-flow-month': {
        value: financialAnalytics.netCashFlow || 0,
        trend: (financialAnalytics.netCashFlow || 0) >= 0,
        trendData: hasSpark(netTrendData) ? netTrendData : undefined,
        subtitle: `Entradas $${(financialAnalytics.cashInflow || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Salidas $${(financialAnalytics.cashOutflow || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        loading: false
      },
      'top-income-category': {
        value: (() => {
          const validCategories = financialAnalytics.incomeCategories?.filter(c => c.name !== 'Sin Categoría' && c.name !== 'Sin categoría');
          return validCategories && validCategories.length > 0 ? validCategories[0].name : financialAnalytics.incomeCategories?.[0]?.name || 'Sin datos';
        })(),
        subtitle: (() => {
          const validCategories = financialAnalytics.incomeCategories?.filter(c => c.name !== 'Sin Categoría' && c.name !== 'Sin categoría');
          if (validCategories && validCategories.length > 0 && validCategories[0].value) return `$${validCategories[0].value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          return financialAnalytics.incomeCategories?.[0]?.value ? `$${financialAnalytics.incomeCategories[0].value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined;
        })(),
        loading: false
      },
      'top-expense-category': {
        value: (() => {
          const validCategories = financialAnalytics.expenseCategories?.filter(c => c.name !== 'Sin Categoría' && c.name !== 'Sin categoría');
          return validCategories && validCategories.length > 0 ? validCategories[0].name : financialAnalytics.expenseCategories?.[0]?.name || 'Sin datos';
        })(),
        subtitle: (() => {
          const validCategories = financialAnalytics.expenseCategories?.filter(c => c.name !== 'Sin Categoría' && c.name !== 'Sin categoría');
          if (validCategories && validCategories.length > 0 && validCategories[0].value) return `$${validCategories[0].value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          return financialAnalytics.expenseCategories?.[0]?.value ? `$${financialAnalytics.expenseCategories[0].value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : undefined;
        })(),
        loading: false
      },

      'active-credits': {
        value: activeCredits.length,
        details: activeCreditDetails,
        loading: false
      },
      'overdue-credits': {
        value: overdueCredits,
        details: overdueCreditDetails,
        loading: false
      },
      'recovery-rate': { value: `${recoveryRate.toFixed(1)}%`, loading: false },
      'projected-income': { value: projectedIncome, loading: false },
      'total-lent': { value: totalLent, loading: false },
      'total-pending': { value: totalRemaining, loading: false },

      'total-partners': { value: partnerMetrics.length, loading: false },
      'total-partner-balance': { value: totalPartnerBalance, details: partnerBalances, loading: false },
      'partners-positive-balance': { value: partnerBalances.filter(pb => pb.balance > 0).length, loading: false },
      'partners-negative-balance': { value: partnerBalances.filter(pb => pb.balance < 0).length, loading: false },
      'vehicles-by-partners': { value: vehicles.filter(v => !!v.partnerId).length, loading: false },
      'avg-partner-balance': { value: partnerMetrics.length > 0 ? totalPartnerBalance / partnerMetrics.length : 0, loading: false },

      'maintenance-overdue': {
        value: maintenanceDue,
        details: vehicles.filter(v => {
          const metric = mileageMetrics.find(m => m.vehicleId === v.id);
          return metric && metric.kmToNextMaintenance <= 0;
        }).map(v => {
          const metric = mileageMetrics.find(m => m.vehicleId === v.id);
          return {
            ...v,
            currentMileage: metric?.currentMileage,
            nextMaintenanceAt: metric?.nextMaintenanceDue,
            lastMaintenanceMileage: metric?.lastMaintenanceMileage,
            kmToNextMaintenance: metric?.kmToNextMaintenance,
            maintenanceInterval: metric ? metric.nextMaintenanceDue - metric.lastMaintenanceMileage : v.maintenanceInterval,
          };
        }),
        loading: false
      },
      'maintenance-soon': {
        value: maintenanceSoon,
        details: vehicles.filter(v => {
          const metric = mileageMetrics.find(m => m.vehicleId === v.id);
          return metric && metric.kmToNextMaintenance > 0 && metric.kmToNextMaintenance <= 1500;
        }).map(v => {
          const metric = mileageMetrics.find(m => m.vehicleId === v.id);
          return {
            ...v,
            currentMileage: metric?.currentMileage,
            nextMaintenanceAt: metric?.nextMaintenanceDue,
            lastMaintenanceMileage: metric?.lastMaintenanceMileage,
            kmToNextMaintenance: metric?.kmToNextMaintenance,
            maintenanceInterval: metric ? metric.nextMaintenanceDue - metric.lastMaintenanceMileage : v.maintenanceInterval,
          };
        }),
        loading: false
      },
      'avg-fleet-mileage': {
        value: vehicleMetrics.length > 0 ? vehicleMetrics.reduce((sum, v) => sum + (v.currentMileage || 0), 0) / vehicleMetrics.length : 0,
        loading: false
      },
      'high-mileage-vehicles': { value: vehicleMetrics.filter(vm => (vm.currentMileage || 0) > 200000).length, loading: false },
      'avg-daily-km': {
        value: vehicleMetrics.length > 0 ? vehicleMetrics.reduce((sum, v) => sum + (v.dailyAverageKm || 0), 0) / vehicleMetrics.length : 0,
        loading: false
      },
      'total-mileage-logs': { value: mileageLogs.length, loading: false },

      'total-multas': { value: multasAnalytics.totalMultas, loading: false },
      'multas-pendientes': { value: multasAnalytics.multasPendientes, details: multasAnalytics.multasPorVehiculo.filter(m => m.pendientes > 0), loading: false },
      'multas-pagadas': { value: multasAnalytics.multasPagadas, loading: false },
      'monto-pendiente-multas': { value: multasAnalytics.totalPendienteAmount, loading: false },
      'vehiculos-con-multas': { value: multasAnalytics.vehiculosConMultas, details: multasAnalytics.multasPorVehiculo, loading: false },
      'vehiculos-limpios': { value: multasAnalytics.vehiculosLimpios, loading: false },
    };

    return allKPIs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    vehicles,
    clients,
    financialRecords,
    partners,
    notifications,
    mileageLogs,
    vehicleAssignmentLogs,
    credits,
    multas,
    dateRange,
    clientMetrics,
    vehicleMetrics,
    analyzedNotifications,
    mileageMetrics,
    partnerMetrics,
    creditMetrics,
    portfolioAnalytics,
    partnerBalancesFromData,
    financialAnalytics,
    multasAnalytics
  ]);
}
