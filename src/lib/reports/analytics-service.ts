import type { Vehicle, Client, Partner, FinancialRecord } from '@/types';
import { isWithinInterval } from 'date-fns';

export interface VehicleMetric {
  vehicle: Vehicle;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitability: number;
  utilizationRate: number;
  transactionsCount: number;
}

export interface ClientMetric {
  client: Client;
  totalPayments: number;
  balance: number;
  daysSinceLastPayment: number;
  paymentBehavior: string;
  transactionsCount: number;
}

export interface PartnerMetric {
  partner: Partner;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  activeVehicles: number;
  transactionsCount: number;
}

export interface FinancialSummary {
  income: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
  transactionsCount: number;
  expensesByCategory: Record<string, number>;
  incomeByCategory: Record<string, number>;
  incomeChange?: number;
  expensesChange?: number;
  profitChange?: number;
}

/**
 * Servicio de análisis de datos para reportes
 */
export class ReportAnalyticsService {
  /**
   * Calcula métricas de vehículos
   */
  static calculateVehicleMetrics(
    vehicles: Vehicle[],
    financialRecords: FinancialRecord[],
    dateRange?: { from: Date; to: Date }
  ): VehicleMetric[] {
    return vehicles.map(vehicle => {
      let vehicleRecords = financialRecords.filter(
        r => r.vehicleId === vehicle.id && !r.isDeleted
      );

      if (dateRange) {
        vehicleRecords = vehicleRecords.filter(r =>
          isWithinInterval(new Date(r.date), {
            start: dateRange.from,
            end: dateRange.to,
          })
        );
      }

      const totalIncome = vehicleRecords
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0);

      const totalExpenses = vehicleRecords
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0);

      const netProfit = totalIncome - totalExpenses;

      const profitability = totalExpenses > 0
        ? (netProfit / totalExpenses) * 100
        : totalIncome > 0
        ? 100
        : 0;

      // Calcular tasa de utilización (simplificado)
      // En un escenario real, esto debería basarse en días asignados vs días disponibles
      const utilizationRate = vehicle.clientId ? 100 : 0;

      return {
        vehicle,
        totalIncome,
        totalExpenses,
        netProfit,
        profitability,
        utilizationRate,
        transactionsCount: vehicleRecords.length,
      };
    }).sort((a, b) => b.netProfit - a.netProfit);
  }

  /**
   * Calcula métricas de clientes
   */
  static calculateClientMetrics(
    clients: Client[],
    financialRecords: FinancialRecord[],
    dateRange?: { from: Date; to: Date }
  ): ClientMetric[] {
    return clients.map(client => {
      let clientRecords = financialRecords.filter(
        r => r.clientId === client.id && !r.isDeleted && r.type === 'income'
      );

      if (dateRange) {
        clientRecords = clientRecords.filter(r =>
          isWithinInterval(new Date(r.date), {
            start: dateRange.from,
            end: dateRange.to,
          })
        );
      }

      const totalPayments = clientRecords.reduce((sum, r) => sum + r.amount, 0);

      // Encontrar último pago
      const lastPaymentRecord = clientRecords.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];

      const daysSinceLastPayment = lastPaymentRecord
        ? Math.floor(
            (Date.now() - new Date(lastPaymentRecord.date).getTime()) / (1000 * 60 * 60 * 24)
          )
        : -1;

      // Determinar comportamiento de pago
      let paymentBehavior = 'N/A';
      if (client.balance <= 0) {
        paymentBehavior = 'Excelente';
      } else if (client.balance <= 1000) {
        paymentBehavior = 'Bueno';
      } else if (client.balance <= 3000) {
        paymentBehavior = 'Regular';
      } else if (client.balance <= 5000) {
        paymentBehavior = 'Malo';
      } else {
        paymentBehavior = 'Crítico';
      }

      return {
        client,
        totalPayments,
        balance: client.balance,
        daysSinceLastPayment,
        paymentBehavior,
        transactionsCount: clientRecords.length,
      };
    }).sort((a, b) => b.totalPayments - a.totalPayments);
  }

  /**
   * Calcula métricas de socios
   */
  static calculatePartnerMetrics(
    partners: Partner[],
    vehicles: Vehicle[],
    financialRecords: FinancialRecord[],
    dateRange?: { from: Date; to: Date }
  ): PartnerMetric[] {
    return partners.map(partner => {
      // Vehículos del socio
      const partnerVehicles = vehicles.filter(
        v => v.partnerId === partner.id && !v.isDeleted
      );

      const activeVehicles = partnerVehicles.filter(
        v => v.status === 'active' || v.status === 'rented'
      ).length;

      // Registros financieros de vehículos del socio
      let partnerRecords = financialRecords.filter(
        r => !r.isDeleted && partnerVehicles.some(v => v.id === r.vehicleId)
      );

      if (dateRange) {
        partnerRecords = partnerRecords.filter(r =>
          isWithinInterval(new Date(r.date), {
            start: dateRange.from,
            end: dateRange.to,
          })
        );
      }

      const totalIncome = partnerRecords
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0);

      const totalExpenses = partnerRecords
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0);

      const netBalance = totalIncome - totalExpenses;

      return {
        partner,
        totalIncome,
        totalExpenses,
        netBalance,
        activeVehicles,
        transactionsCount: partnerRecords.length,
      };
    }).sort((a, b) => b.netBalance - a.netBalance);
  }

  /**
   * Calcula resumen financiero
   */
  static calculateFinancialSummary(
    financialRecords: FinancialRecord[],
    dateRange: { from: Date; to: Date },
    previousPeriod?: { from: Date; to: Date }
  ): FinancialSummary {
    // Filtrar registros del período actual
    const currentRecords = financialRecords.filter(r => {
      if (r.isDeleted) return false;
      const recordDate = new Date(r.date);
      return isWithinInterval(recordDate, {
        start: dateRange.from,
        end: dateRange.to,
      });
    });

    const income = currentRecords
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);

    const expenses = currentRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);

    const netProfit = income - expenses;
    const profitMargin = income > 0 ? (netProfit / income) * 100 : 0;

    // Gastos por categoría
    const expensesByCategory = currentRecords
      .filter(r => r.type === 'expense')
      .reduce((acc, r) => {
        const category = r.category || 'Sin categoría';
        acc[category] = (acc[category] || 0) + r.amount;
        return acc;
      }, {} as Record<string, number>);

    // Ingresos por categoría
    const incomeByCategory = currentRecords
      .filter(r => r.type === 'income')
      .reduce((acc, r) => {
        const category = r.category || 'Sin categoría';
        acc[category] = (acc[category] || 0) + r.amount;
        return acc;
      }, {} as Record<string, number>);

    const summary: FinancialSummary = {
      income,
      expenses,
      netProfit,
      profitMargin,
      transactionsCount: currentRecords.length,
      expensesByCategory,
      incomeByCategory,
    };

    // Calcular cambios si hay período anterior
    if (previousPeriod) {
      const previousRecords = financialRecords.filter(r => {
        if (r.isDeleted) return false;
        const recordDate = new Date(r.date);
        return isWithinInterval(recordDate, {
          start: previousPeriod.from,
          end: previousPeriod.to,
        });
      });

      const previousIncome = previousRecords
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0);

      const previousExpenses = previousRecords
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0);

      const previousNetProfit = previousIncome - previousExpenses;

      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) {
          if (current > 0) return 100;
          if (current < 0) return -100;
          return 0;
        }
        return ((current - previous) / Math.abs(previous)) * 100;
      };

      summary.incomeChange = calculateChange(income, previousIncome);
      summary.expensesChange = calculateChange(expenses, previousExpenses);
      summary.profitChange = calculateChange(netProfit, previousNetProfit);
    }

    return summary;
  }

  /**
   * Filtra registros financieros por rango de fechas
   */
  static filterRecordsByDateRange(
    records: FinancialRecord[],
    dateRange: { from: Date; to: Date }
  ): FinancialRecord[] {
    return records.filter(r => {
      if (r.isDeleted) return false;
      const recordDate = new Date(r.date);
      return isWithinInterval(recordDate, {
        start: dateRange.from,
        end: dateRange.to,
      });
    });
  }

  /**
   * Obtiene los top N vehículos más rentables
   */
  static getTopVehicles(
    vehicleMetrics: VehicleMetric[],
    limit: number = 5
  ): VehicleMetric[] {
    return vehicleMetrics
      .sort((a, b) => b.netProfit - a.netProfit)
      .slice(0, limit);
  }

  /**
   * Obtiene los top N clientes por pagos
   */
  static getTopClients(
    clientMetrics: ClientMetric[],
    limit: number = 5
  ): ClientMetric[] {
    return clientMetrics
      .sort((a, b) => b.totalPayments - a.totalPayments)
      .slice(0, limit);
  }

  /**
   * Obtiene clientes con balance crítico
   */
  static getClientsWithCriticalBalance(
    clientMetrics: ClientMetric[],
    threshold: number = 5000
  ): ClientMetric[] {
    return clientMetrics
      .filter(m => m.balance > threshold)
      .sort((a, b) => b.balance - a.balance);
  }

  /**
   * Calcula tendencia de ingresos/gastos mensual
   */
  static calculateMonthlyTrends(
    financialRecords: FinancialRecord[],
    months: number = 6
  ): Array<{ month: string; income: number; expenses: number; profit: number }> {
    const trends: Array<{ month: string; income: number; expenses: number; profit: number }> = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthRecords = financialRecords.filter(r => {
        if (r.isDeleted) return false;
        const recordDate = new Date(r.date);
        return recordDate >= monthDate && recordDate < nextMonthDate;
      });

      const income = monthRecords
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0);

      const expenses = monthRecords
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0);

      trends.push({
        month: monthDate.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }),
        income,
        expenses,
        profit: income - expenses,
      });
    }

    return trends;
  }
}
