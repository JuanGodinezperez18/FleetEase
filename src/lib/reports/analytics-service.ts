import type { Vehicle, Client, Partner, FinancialRecord } from '@/types';
import { isWithinInterval } from 'date-fns';
import { sumRentalIncome } from '@/lib/financial-metrics';

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
 * Servicio de análisis de datos para reportes.
 *
 * Regla financiera central: los depósitos en garantía son movimientos de
 * balance y no ingresos operativos. Todas las métricas de rentabilidad de
 * este servicio usan sumRentalIncome() para evitar contaminar utilidad,
 * margen y número de transacciones.
 */
export class ReportAnalyticsService {
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
          isWithinInterval(new Date(r.date), { start: dateRange.from, end: dateRange.to })
        );
      }

      const rentalIncome = sumRentalIncome(vehicleRecords);
      const expenseRecords = vehicleRecords.filter(r => r.type === 'expense');
      const totalExpenses = expenseRecords.reduce((sum, r) => sum + r.amount, 0);
      const netProfit = rentalIncome - totalExpenses;
      const profitability = totalExpenses > 0
        ? (netProfit / totalExpenses) * 100
        : rentalIncome > 0
        ? 100
        : 0;
      const profitTransactions = vehicleRecords.filter(
        r => r.type === 'expense' || (r.type === 'income' && r.category !== 'Depósito en Garantía')
      );

      return {
        vehicle,
        totalIncome: rentalIncome,
        totalExpenses,
        netProfit,
        profitability,
        utilizationRate: vehicle.clientId ? 100 : 0,
        transactionsCount: profitTransactions.length,
      };
    }).sort((a, b) => b.netProfit - a.netProfit);
  }

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
          isWithinInterval(new Date(r.date), { start: dateRange.from, end: dateRange.to })
        );
      }

      const totalPayments = clientRecords.reduce((sum, r) => sum + r.amount, 0);
      const lastPaymentRecord = clientRecords.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      const daysSinceLastPayment = lastPaymentRecord
        ? Math.floor((Date.now() - new Date(lastPaymentRecord.date).getTime()) / (1000 * 60 * 60 * 24))
        : -1;

      let paymentBehavior = 'N/A';
      if (client.balance <= 0) paymentBehavior = 'Excelente';
      else if (client.balance <= 1000) paymentBehavior = 'Bueno';
      else if (client.balance <= 3000) paymentBehavior = 'Regular';
      else if (client.balance <= 5000) paymentBehavior = 'Malo';
      else paymentBehavior = 'Crítico';

      return {
        client,
        totalPayments,
        balance: client.balance,
        daysSinceLastPayment,
        paymentBehavior,
        transactionsCount: clientRecords.filter(r => r.category !== 'Depósito en Garantía').length,
      };
    }).sort((a, b) => b.totalPayments - a.totalPayments);
  }

  static calculatePartnerMetrics(
    partners: Partner[],
    vehicles: Vehicle[],
    financialRecords: FinancialRecord[],
    dateRange?: { from: Date; to: Date }
  ): PartnerMetric[] {
    return partners.map(partner => {
      const partnerVehicles = vehicles.filter(v => v.partnerId === partner.id && !v.isDeleted);
      const activeVehicles = partnerVehicles.filter(v => v.status === 'active' || v.status === 'rented').length;
      let partnerRecords = financialRecords.filter(
        r => !r.isDeleted && partnerVehicles.some(v => v.id === r.vehicleId)
      );

      if (dateRange) {
        partnerRecords = partnerRecords.filter(r =>
          isWithinInterval(new Date(r.date), { start: dateRange.from, end: dateRange.to })
        );
      }

      const totalIncome = sumRentalIncome(partnerRecords);
      const totalExpenses = partnerRecords
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0);
      const netBalance = totalIncome - totalExpenses;
      const transactionsCount = partnerRecords.filter(
        r => r.type === 'expense' || (r.type === 'income' && r.category !== 'Depósito en Garantía')
      ).length;

      return {
        partner,
        totalIncome,
        totalExpenses,
        netBalance,
        activeVehicles,
        transactionsCount,
      };
    }).sort((a, b) => b.netBalance - a.netBalance);
  }

  static calculateFinancialSummary(
    financialRecords: FinancialRecord[],
    dateRange: { from: Date; to: Date },
    previousPeriod?: { from: Date; to: Date }
  ): FinancialSummary {
    const currentRecords = financialRecords.filter(r => {
      if (r.isDeleted) return false;
      return isWithinInterval(new Date(r.date), { start: dateRange.from, end: dateRange.to });
    });

    const income = sumRentalIncome(currentRecords);
    const expenses = currentRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);
    const netProfit = income - expenses;
    const profitMargin = income > 0 ? (netProfit / income) * 100 : 0;
    const profitRecords = currentRecords.filter(
      r => r.type === 'expense' || (r.type === 'income' && r.category !== 'Depósito en Garantía')
    );

    const expensesByCategory = currentRecords
      .filter(r => r.type === 'expense')
      .reduce((acc, r) => {
        const category = r.category || 'Sin categoría';
        acc[category] = (acc[category] || 0) + r.amount;
        return acc;
      }, {} as Record<string, number>);

    const incomeByCategory = currentRecords
      .filter(r => r.type === 'income' && r.category !== 'Depósito en Garantía')
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
      transactionsCount: profitRecords.length,
      expensesByCategory,
      incomeByCategory,
    };

    if (previousPeriod) {
      const previousRecords = financialRecords.filter(r => {
        if (r.isDeleted) return false;
        return isWithinInterval(new Date(r.date), { start: previousPeriod.from, end: previousPeriod.to });
      });
      const previousIncome = sumRentalIncome(previousRecords);
      const previousExpenses = previousRecords
        .filter(r => r.type === 'expense')
        .reduce((sum, r) => sum + r.amount, 0);
      const previousNetProfit = previousIncome - previousExpenses;
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : current < 0 ? -100 : 0;
        return ((current - previous) / Math.abs(previous)) * 100;
      };
      summary.incomeChange = calculateChange(income, previousIncome);
      summary.expensesChange = calculateChange(expenses, previousExpenses);
      summary.profitChange = calculateChange(netProfit, previousNetProfit);
    }

    return summary;
  }

  static filterRecordsByDateRange(records: FinancialRecord[], dateRange: { from: Date; to: Date }): FinancialRecord[] {
    return records.filter(r => {
      if (r.isDeleted) return false;
      return isWithinInterval(new Date(r.date), { start: dateRange.from, end: dateRange.to });
    });
  }

  static getTopVehicles(vehicleMetrics: VehicleMetric[], limit: number = 5): VehicleMetric[] {
    return vehicleMetrics.sort((a, b) => b.netProfit - a.netProfit).slice(0, limit);
  }

  static getTopClients(clientMetrics: ClientMetric[], limit: number = 5): ClientMetric[] {
    return clientMetrics.sort((a, b) => b.totalPayments - a.totalPayments).slice(0, limit);
  }

  static getClientsWithCriticalBalance(clientMetrics: ClientMetric[], threshold: number = 5000): ClientMetric[] {
    return clientMetrics.filter(m => m.balance > threshold).sort((a, b) => b.balance - a.balance);
  }

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
      const income = sumRentalIncome(monthRecords);
      const expenses = monthRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
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
