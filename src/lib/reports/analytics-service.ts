import type { Vehicle, Client, Partner, FinancialRecord } from '@/types';
import { sumRentalIncome, sumExpense, sumPayment, calculateNetProfit, calculatePartnerProfitability, calculateProfitMargin, filterRecordsByDateRange } from '@/lib/financial-metrics';

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
    const recordsByVehicle = new Map<string, FinancialRecord[]>();
    financialRecords.forEach(record => {
      if (record.isDeleted || (dateRange && !isWithinInterval(new Date(record.date), { start: dateRange.from, end: dateRange.to }))) return;
      if (!record.vehicleId) return;
      const records = recordsByVehicle.get(record.vehicleId);
      if (records) records.push(record);
      else recordsByVehicle.set(record.vehicleId, [record]);
    });

    return vehicles.map(vehicle => {
      const vehicleRecords = recordsByVehicle.get(vehicle.id) ?? [];
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
    const recordsByClient = new Map<string, FinancialRecord[]>();
    financialRecords.forEach(record => {
      if (
        record.isDeleted ||
        record.category === SECURITY_DEPOSIT_CATEGORY ||
        !record.clientId ||
        (dateRange && !isWithinInterval(new Date(record.date), { start: dateRange.from, end: dateRange.to }))
      ) return;
      const records = recordsByClient.get(record.clientId);
      if (records) records.push(record);
      else recordsByClient.set(record.clientId, [record]);
    });

    return clients.map(client => {
      const clientRecords = recordsByClient.get(client.id) ?? [];

      const paymentRecords = clientRecords.filter(r => r.type === 'payment');
      const totalPayments = sumPayment(paymentRecords);
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
    // Index once; preserve getPartnerFinancialRecords semantics, including historical
    // vehicle identity from active partner-linked records outside the report date range.
    const vehiclesByPartner = new Map<string, Vehicle[]>();
    for (const vehicle of vehicles) {
      if (vehicle.isDeleted || !vehicle.partnerId) continue;
      const list = vehiclesByPartner.get(vehicle.partnerId);
      if (list) list.push(vehicle);
      else vehiclesByPartner.set(vehicle.partnerId, [vehicle]);
    }

    const activeRecords = financialRecords.filter(r => !r.isDeleted);
    const recordsByPartner = new Map<string, FinancialRecord[]>();
    const recordsByVehicle = new Map<string, FinancialRecord[]>();

    for (const record of activeRecords) {
      if (record.partnerId) {
        const list = recordsByPartner.get(record.partnerId);
        if (list) list.push(record);
        else recordsByPartner.set(record.partnerId, [record]);
      }
      if (record.vehicleId) {
        const list = recordsByVehicle.get(record.vehicleId);
        if (list) list.push(record);
        else recordsByVehicle.set(record.vehicleId, [record]);
      }
    }

    return partners.map(partner => {
      const partnerVehicles = vehiclesByPartner.get(partner.id) ?? [];
      const activeVehicles = partnerVehicles.filter(v => v.status === 'active' || v.status === 'rented').length;

      const partnerRecords = recordsByPartner.get(partner.id) ?? [];
      const partnerVehicleIds = new Set(partnerVehicles.map(v => v.id));
      for (const record of partnerRecords) {
        if (record.vehicleId) partnerVehicleIds.add(record.vehicleId);
      }

      const seenRecords = new Set<FinancialRecord>();
      const relatedRecords: FinancialRecord[] = [];
      for (const record of partnerRecords) {
        seenRecords.add(record);
        relatedRecords.push(record);
      }
      for (const vehicleId of partnerVehicleIds) {
        for (const record of recordsByVehicle.get(vehicleId) ?? []) {
          if (!seenRecords.has(record)) {
            seenRecords.add(record);
            relatedRecords.push(record);
          }
        }
      }

      const partnerRecordsInRange = dateRange
        ? relatedRecords.filter(r => isWithinInterval(new Date(r.date), { start: dateRange.from, end: dateRange.to }))
        : relatedRecords;

      const profitability = calculatePartnerProfitability(partnerVehicles, partnerRecordsInRange);
      const totalIncome = profitability.totalIncome;
      const totalExpenses = profitability.totalExpenses;
      const netBalance = profitability.netProfit;
      const transactionsCount = partnerRecordsInRange.filter(r => r.type === 'expense' || (r.type === 'income' && r.category !== SECURITY_DEPOSIT_CATEGORY)).length;
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
