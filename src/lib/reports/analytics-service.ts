import type { Vehicle, Client, Partner, FinancialRecord } from '@/types';
import { isWithinInterval } from 'date-fns';
import { sumRentalIncome, sumExpense, calculateNetProfit, getPartnerFinancialRecords, calculatePartnerProfitability, calculateProfitMargin } from '@/lib/financial-metrics';

const SECURITY_DEPOSIT_CATEGORY = 'Depósito en Garantía';

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


/**
 * Servicio de análisis de datos para reportes.
 *
 * Regla financiera central: los depósitos en garantía son dinero retenido,
 * no una cuenta por cobrar ni ingreso operativo.
 */
export class ReportAnalyticsService {
  static calculateVehicleMetrics(vehicles: Vehicle[], financialRecords: FinancialRecord[], dateRange?: { from: Date; to: Date }): VehicleMetric[] {
    return vehicles.map(vehicle => {
      let vehicleRecords = financialRecords.filter(r => r.vehicleId === vehicle.id && !r.isDeleted);
      if (dateRange) vehicleRecords = vehicleRecords.filter(r => isWithinInterval(new Date(r.date), { start: dateRange.from, end: dateRange.to }));
      const rentalIncome = sumRentalIncome(vehicleRecords);
      const expenseRecords = vehicleRecords.filter(r => r.type === 'expense');
      const totalExpenses = sumExpense(expenseRecords);
      const netProfit = calculateNetProfit(vehicleRecords);
      const profitability = calculateProfitMargin(rentalIncome, totalExpenses);
      const profitTransactions = vehicleRecords.filter(r => r.type === 'expense' || (r.type === 'income' && r.category !== SECURITY_DEPOSIT_CATEGORY));
      return { vehicle, totalIncome: rentalIncome, totalExpenses, netProfit, profitability, utilizationRate: vehicle.clientId ? 100 : 0, transactionsCount: profitTransactions.length };
    }).sort((a, b) => b.netProfit - a.netProfit);
  }

  static calculateClientMetrics(clients: Client[], financialRecords: FinancialRecord[], dateRange?: { from: Date; to: Date }): ClientMetric[] {
    return clients.map(client => {
      let clientRecords = financialRecords.filter(r => r.clientId === client.id && !r.isDeleted && r.category !== SECURITY_DEPOSIT_CATEGORY);
      if (dateRange) clientRecords = clientRecords.filter(r => isWithinInterval(new Date(r.date), { start: dateRange.from, end: dateRange.to }));

      const paymentRecords = clientRecords.filter(r => r.type === 'payment');
      const totalPayments = paymentRecords.reduce((sum, r) => sum + r.amount, 0);
      const lastPaymentRecord = paymentRecords.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      const daysSinceLastPayment = lastPaymentRecord
        ? Math.floor((Date.now() - new Date(lastPaymentRecord.date).getTime()) / (1000 * 60 * 60 * 24))
        : -1;

      // El saldo reportado es el saldo vigente del cliente ya resuelto por el proveedor de datos.
      // El reporte no debe reconstruir un saldo con el rango del informe, porque eso puede
      // mezclar el saldo inicial con movimientos parciales del periodo seleccionado.
      const calculatedBalance = Number(client.balance ?? 0);

      let paymentBehavior = 'N/A';
      if (calculatedBalance <= 0) paymentBehavior = 'Excelente';
      else if (calculatedBalance <= 1000) paymentBehavior = 'Bueno';
      else if (calculatedBalance <= 3000) paymentBehavior = 'Regular';
      else if (calculatedBalance <= 5000) paymentBehavior = 'Malo';
      else paymentBehavior = 'Crítico';

      return {
        client,
        totalPayments,
        balance: calculatedBalance,
        daysSinceLastPayment,
        paymentBehavior,
        transactionsCount: clientRecords.length,
      };
    }).sort((a, b) => b.totalPayments - a.totalPayments);
  }

  static calculatePartnerMetrics(partners: Partner[], vehicles: Vehicle[], financialRecords: FinancialRecord[], dateRange?: { from: Date; to: Date }): PartnerMetric[] {
    return partners.map(partner => {
      const partnerVehicles = vehicles.filter(v => v.partnerId === partner.id && !v.isDeleted);
      const activeVehicles = partnerVehicles.filter(v => v.status === 'active' || v.status === 'rented').length;
      let partnerRecords = getPartnerFinancialRecords(partner, partnerVehicles, financialRecords);
      if (dateRange) partnerRecords = partnerRecords.filter(r => isWithinInterval(new Date(r.date), { start: dateRange.from, end: dateRange.to }));
      const profitability = calculatePartnerProfitability(partnerVehicles, partnerRecords);
      const totalIncome = profitability.totalIncome;
      const totalExpenses = profitability.totalExpenses;
      const netBalance = profitability.netProfit;
      const transactionsCount = partnerRecords.filter(r => r.type === 'expense' || (r.type === 'income' && r.category !== SECURITY_DEPOSIT_CATEGORY)).length;
      return { partner, totalIncome, totalExpenses, netBalance, activeVehicles, transactionsCount };
    }).sort((a, b) => b.netBalance - a.netBalance);
  }

  static filterRecordsByDateRange(records: FinancialRecord[], dateRange: { from: Date; to: Date }): FinancialRecord[] {
    return records.filter(r => !r.isDeleted && isWithinInterval(new Date(r.date), { start: dateRange.from, end: dateRange.to }));
  }

  static getTopVehicles(vehicleMetrics: VehicleMetric[], limit: number = 5): VehicleMetric[] { return vehicleMetrics.sort((a, b) => b.netProfit - a.netProfit).slice(0, limit); }
  static getTopClients(clientMetrics: ClientMetric[], limit: number = 5): ClientMetric[] { return clientMetrics.sort((a, b) => b.totalPayments - a.totalPayments).slice(0, limit); }
  static getClientsWithCriticalBalance(clientMetrics: ClientMetric[], threshold: number = 5000): ClientMetric[] { return clientMetrics.filter(m => m.balance > threshold).sort((a, b) => b.balance - a.balance); }

}
