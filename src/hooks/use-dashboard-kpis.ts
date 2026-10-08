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
import {
  categoryIdsByAffects,
  filterRecordsByVehicle,
  sumExpense,
  sumRentalIncome,
} from '@/lib/financial-metrics';

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
    // Si no hay rango, usar últimos 30 días (evita que "vehículos sin ingreso" use todo el historial).
    const effectiveFrom =
      dateRange?.from && dateRange?.to
        ? dateRange.from
        : new Date(Date.now() - 30 * 86_400_000);
    const effectiveTo =
      dateRange?.from && dateRange?.to ? dateRange.to : new Date();
    const filteredFinancialRecords = financialRecords.filter(r => {
      if (r.isDeleted) return false;
      const recordDate = infallibleNormalizeDate(r.date);
      if (!recordDate) return false;
      return isWithinInterval(recordDate, { start: effectiveFrom, end: effectiveTo });
    });

    const incomeRecords: typeof filteredFinancialRecords = [];
    const expenseRecords: typeof filteredFinancialRecords = [];
    for (const record of filteredFinancialRecords) {
      if (record.type === 'income') incomeRecords.push(record);
      else if (record.type === 'expense') expenseRecords.push(record);
    }

    const clientsById = new Map(clients.map(client => [client.id, client]));
    const creditsById = new Map(credits.map(credit => [credit.id, credit]));
    const mileageMetricsByVehicleId = new Map(mileageMetrics.map(metric => [metric.vehicleId, metric]));

    const clientBalances = clientMetrics.map(cm => ({
      clientId: cm.clientId,
      balance: cm.currentBalance || 0
    }));

    const totalClientBalance = clientBalances.reduce((sum, cb) => sum + cb.balance, 0);
    const partnerBalances = partnerBalancesFromData;
    let totalPartnerBalance = 0;
    let partnersPositiveBalance = 0;
    let partnersNegativeBalance = 0;
    for (const partnerBalance of partnerBalances) {
      totalPartnerBalance += partnerBalance.balance;
      if (partnerBalance.balance > 0) partnersPositiveBalance++;
      else if (partnerBalance.balance < 0) partnersNegativeBalance++;
    }

    const totalActiveClients = clients.filter(c => c.status === 'active' && !c.isDeleted).length;

    const enrichedClientMetrics = clientMetrics.map(metric => {
      const client = clientsById.get(metric.clientId);
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
    const rentedVehiclesData = operationalVehicles.filter(v => v.clientId != null);
    const totalRented = rentedVehiclesData.length;
    const availableVehiclesData = operationalVehicles.filter(
      v => v.clientId == null && v.status !== 'maintenance' && v.status !== 'inactive'
    );
    const availableVehicles = availableVehiclesData.length;
    const maintenanceVehiclesCount = operationalVehicles.filter(
      v => v.clientId == null && v.status === 'maintenance'
    ).length;
    const inactiveVehiclesCount = operationalVehicles.filter(
      v => v.clientId == null && v.status === 'inactive'
    ).length;

    const lastIncomeByVehicleId = new Map<string, string>();
    for (const record of financialRecords) {
      if (record.isDeleted || record.type !== 'income' || !record.vehicleId) continue;
      const prev = lastIncomeByVehicleId.get(record.vehicleId);
      if (!prev || record.date > prev) lastIncomeByVehicleId.set(record.vehicleId, record.date);
    }
    const incomeInPeriodByVehicle = new Set<string>();
    for (const record of incomeRecords) {
      if (record.vehicleId) incomeInPeriodByVehicle.add(record.vehicleId);
    }
    const nowMs = Date.now();
    const periodDays = Math.max(
      1,
      Math.floor((effectiveTo.getTime() - effectiveFrom.getTime()) / 86_400_000) + 1
    );
    const depositCategoryIds = categoryIdsByAffects(financialCategories, 'security_deposit');

    const vehiclesWithoutIncomeData = operationalVehicles
      .filter(v => !incomeInPeriodByVehicle.has(v.id))
      .map(v => {
        const last = lastIncomeByVehicleId.get(v.id) ?? null;
        const daysWithoutIncome = last
          ? Math.max(0, Math.floor((nowMs - new Date(last).getTime()) / 86_400_000))
          : periodDays;
        const neverHadIncome = !last;
        const weekly = Number(v.weeklyRentalValue) || 0;
        const dailyRate = weekly > 0 ? weekly / 7 : 0;
        const estimatedLostIncome = dailyRate > 0 ? Math.round(dailyRate * daysWithoutIncome) : 0;
        return {
          ...v,
          lastIncomeDate: last,
          daysWithoutIncome,
          neverHadIncome,
          estimatedLostIncome,
          imageUrl: typeof v.imageUrl === 'string' ? v.imageUrl : undefined,
        };
      })
      .sort((a, b) => {
        if (a.neverHadIncome !== b.neverHadIncome) return a.neverHadIncome ? -1 : 1;
        return (b.estimatedLostIncome || 0) - (a.estimatedLostIncome || 0);
      });
    const avgDaysWithoutIncome = (() => {
      if (vehiclesWithoutIncomeData.length === 0) return null;
      return Math.round(
        vehiclesWithoutIncomeData.reduce((s, v) => s + (v.daysWithoutIncome || 0), 0) /
          vehiclesWithoutIncomeData.length
      );
    })();
    const totalEstimatedLostIncome = vehiclesWithoutIncomeData.reduce(
      (s, v) => s + (v.estimatedLostIncome || 0),
      0
    );

    const creditByVehicleId = new Map<string, (typeof credits)[number]>();
    for (const c of credits) {
      if (c.isDeleted) continue;
      if (c.vehicleId) creditByVehicleId.set(c.vehicleId, c);
    }
    for (const v of operationalVehicles) {
      const assoc = (v as { associatedCreditId?: string | null }).associatedCreditId;
      if (assoc && creditsById.has(assoc) && !creditByVehicleId.has(v.id)) {
        creditByVehicleId.set(v.id, creditsById.get(assoc)!);
      }
    }

    // Renta: ingresos renta − gastos. Crédito: total crédito − admin; neta − costo vehículo
    const vehicleGrossProfitabilityData = operationalVehicles
      .map(v => {
        const vehicleRecords = filterRecordsByVehicle(filteredFinancialRecords, v.id);
        const vehicleCost = Number(v.cost) || 0;
        const credit = creditByVehicleId.get(v.id);
        const isCreditVehicle = Boolean(
          credit ||
            (v as { lockedByCredit?: boolean }).lockedByCredit ||
            (v as { associatedCreditId?: string | null }).associatedCreditId
        );

        if (isCreditVehicle && credit) {
          const totalIncome = Number(credit.totalAmount) || 0;
          const adminExpenses = sumExpense(
            vehicleRecords.filter(
              r =>
                (r.sourceRecordType && String(r.sourceRecordType).includes('vehicle_admin')) ||
                /administraci[oó]n/i.test(r.category || '')
            )
          );
          const totalExpenses = adminExpenses;
          const grossProfit = totalIncome - totalExpenses;
          const netProfit = grossProfit - vehicleCost;
          return {
            id: v.id,
            alias: v.alias,
            plate: v.plate,
            make: v.make,
            model: v.model,
            status: v.status,
            imageUrl: typeof v.imageUrl === 'string' ? v.imageUrl : undefined,
            weeklyRentalValue: v.weeklyRentalValue,
            operationType: 'credit' as const,
            totalIncome,
            totalExpenses,
            grossProfit,
            netProfit,
            vehicleCost,
          };
        }

        const totalIncome = sumRentalIncome(vehicleRecords, depositCategoryIds);
        const totalExpenses = sumExpense(vehicleRecords);
        const grossProfit = totalIncome - totalExpenses;
        const netProfit = grossProfit - vehicleCost;
        return {
          id: v.id,
          alias: v.alias,
          plate: v.plate,
          make: v.make,
          model: v.model,
          status: v.status,
          imageUrl: typeof v.imageUrl === 'string' ? v.imageUrl : undefined,
          weeklyRentalValue: v.weeklyRentalValue,
          operationType: 'rental' as const,
          totalIncome,
          totalExpenses,
          grossProfit,
          netProfit,
          vehicleCost,
        };
      })
      .sort((a, b) => b.grossProfit - a.grossProfit);
    const totalGrossProfit = vehicleGrossProfitabilityData.reduce((s, v) => s + v.grossProfit, 0);
    const avgGrossProfit =
      vehicleGrossProfitabilityData.length > 0
        ? totalGrossProfit / vehicleGrossProfitabilityData.length
        : 0;
    const maintenanceDue = mileageMetrics.filter(vm => (vm.kmToNextMaintenance || 0) <= 0).length;
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const insuranceExpiringVehicles = operationalVehicles.filter(v => {
      if (!v.insuranceExpiryDate) return false;
      const expiry = new Date(v.insuranceExpiryDate);
      return expiry < thirtyDaysFromNow && expiry > now;
    });
    const insuranceExpiring = insuranceExpiringVehicles.length;

    const activeCredits = credits.filter(c => c.status === 'active' && !c.isDeleted);
    const overdueCredits = creditMetrics.filter(cm => cm.paymentBehavior === 'Retraso Severo').length;
    const totalLent = portfolioAnalytics.totalPortfolioValue || 0;
    const totalRemaining = portfolioAnalytics.totalRemaining || 0;
    const projectedIncome = activeCredits.reduce((sum, c) => sum + (c.weeklyPayment || 0), 0) * 4;
    const recoveryRate = totalLent > 0 ? ((totalLent - totalRemaining) / totalLent) * 100 : 0;

    const activeCreditDetails = activeCredits.map(credit => {
      const client = clientsById.get(credit.clientId);
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
        const credit = creditsById.get(metric.creditId);
        const client = clientsById.get(metric.clientId);
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
        details: insuranceExpiringVehicles,
        loading: false
      },
      'vehicles-available': {
        value: availableVehicles,
        details: availableVehiclesData.map(v => {
          const metric = mileageMetricsByVehicleId.get(v.id);
          return { ...v, currentMileage: metric?.currentMileage, nextMaintenanceAt: metric?.nextMaintenanceDue };
        }),
        loading: false
      },
      'vehicles-without-income': {
        value: vehiclesWithoutIncomeData.length,
        subtitle: vehiclesWithoutIncomeData.length === 0
          ? 'Todos generaron ingreso en el período'
          : [
              avgDaysWithoutIncome != null ? `Prom. ${avgDaysWithoutIncome} días sin ingreso` : null,
              totalEstimatedLostIncome > 0
                ? `Dejado de ganar ~$${totalEstimatedLostIncome.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`
                : null,
            ].filter(Boolean).join(' · ') || `${vehiclesWithoutIncomeData.length} sin ingreso`,
        details: vehiclesWithoutIncomeData,
        loading: false
      },
      'vehicle-gross-profitability': {
        value: avgGrossProfit,
        subtitle:
          vehicleGrossProfitabilityData.length === 0
            ? 'Sin vehículos operativos'
            : `Bruta prom. · Total $${totalGrossProfit.toLocaleString('es-MX', { maximumFractionDigits: 0 })} (renta o crédito − gastos)`,
        trend: avgGrossProfit >= 0,
        details: vehicleGrossProfitabilityData,
        loading: false
      },
      'vehicles-maintenance': { value: maintenanceVehiclesCount, loading: false },
      'vehicles-inactive': { value: inactiveVehiclesCount, loading: false },

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

      // Socios
      'total-partners': {
        value: partners.filter(p => !p.isDeleted).length,
        loading: false,
      },
      'total-partner-balance': {
        value: Number.isFinite(totalPartnerBalance) ? totalPartnerBalance : 0,
        details: partnerBalances,
        loading: false,
      },
      'partners-positive-balance': {
        value: partnersPositiveBalance,
        details: partnerBalances.filter((p: { balance: number }) => p.balance > 0),
        loading: false,
      },
      'partners-negative-balance': {
        value: partnersNegativeBalance,
        details: partnerBalances.filter((p: { balance: number }) => p.balance < 0),
        loading: false,
      },
      'vehicles-by-partners': {
        value: vehicles.filter(v => !!v.partnerId && !v.isDeleted).length,
        loading: false,
      },
      'avg-partner-balance': {
        value:
          partnerBalances.length > 0
            ? (Number.isFinite(totalPartnerBalance) ? totalPartnerBalance : 0) / partnerBalances.length
            : 0,
        details: partnerBalances,
        loading: false,
      },
    };

    // Multas KPIs (si el analytics los expone)
    if (multasAnalytics) {
      Object.assign(allKPIs, {
        'multas-pendientes': { value: (multasAnalytics as any).pendientes ?? 0, loading: false },
        'multas-monto': { value: (multasAnalytics as any).montoPendiente ?? 0, loading: false },
      });
    }

    return allKPIs;
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
    multasAnalytics,
    financialCategories,
  ]);
}
