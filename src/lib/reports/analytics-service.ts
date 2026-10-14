import type { Vehicle, Client, Partner, FinancialRecord, VehicleAssignmentLog } from '@/types';
import { sumRentalIncome, sumExpense, sumPayment, calculateNetProfit, calculatePartnerProfitability, calculateProfitMargin, filterRecordsByDateRange } from '@/lib/financial-metrics';
import { differenceInCalendarDays, endOfDay, startOfDay } from 'date-fns';
import { infallibleNormalizeDate } from '@/lib/date-utils';

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
  static calculateVehicleMetrics(
    vehicles: Vehicle[],
    financialRecords: FinancialRecord[],
    dateRange?: { from: Date; to: Date },
    assignmentLogs: VehicleAssignmentLog[] = [],
  ): VehicleMetric[] {
    const recordsByVehicle = new Map<string, FinancialRecord[]>();
    const scopedRecords = dateRange
      ? filterRecordsByDateRange(financialRecords, dateRange)
      : financialRecords.filter(record => !record.isDeleted);
    scopedRecords.forEach(record => {
      if (!record.vehicleId) return;
      const records = recordsByVehicle.get(record.vehicleId);
      if (records) records.push(record);
      else recordsByVehicle.set(record.vehicleId, [record]);
    });

    return vehicles.filter(vehicle => !vehicle.isDeleted).map(vehicle => {
      const vehicleRecords = recordsByVehicle.get(vehicle.id) ?? [];
      const rentalIncome = sumRentalIncome(vehicleRecords);
      const expenseRecords = vehicleRecords.filter(r => r.type === 'expense');
      const totalExpenses = sumExpense(expenseRecords);
      const netProfit = calculateNetProfit(vehicleRecords);
      const profitability = calculateProfitMargin(rentalIncome, totalExpenses);
      const profitTransactions = vehicleRecords.filter(r => r.type === 'expense' || (r.type === 'income' && r.category !== SECURITY_DEPOSIT_CATEGORY));
      const utilizationRate = this.calculateUtilizationRate(vehicle, assignmentLogs, dateRange);
      return { vehicle, totalIncome: rentalIncome, totalExpenses, netProfit, profitability, utilizationRate, transactionsCount: profitTransactions.length };
    }).sort((a, b) => b.netProfit - a.netProfit);
  }

  static calculateClientMetrics(clients: Client[], financialRecords: FinancialRecord[], dateRange?: { from: Date; to: Date }): ClientMetric[] {
    const recordsByClient = new Map<string, FinancialRecord[]>();
    const scopedRecords = dateRange
      ? filterRecordsByDateRange(financialRecords, dateRange)
      : financialRecords.filter(record => !record.isDeleted);
    scopedRecords.forEach(record => {
      if (
        record.category === SECURITY_DEPOSIT_CATEGORY ||
        !record.clientId
      ) return;
      const records = recordsByClient.get(record.clientId);
      if (records) records.push(record);
      else recordsByClient.set(record.clientId, [record]);
    });

    return clients.filter(client => !client.isDeleted).map(client => {
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

    return partners.filter(partner => !partner.isDeleted).map(partner => {
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
        ? filterRecordsByDateRange(relatedRecords, dateRange)
        : relatedRecords;

      const profitability = calculatePartnerProfitability(partnerVehicles, partnerRecordsInRange);
      const totalIncome = profitability.totalIncome;
      const totalExpenses = profitability.totalExpenses;
      const netBalance = profitability.netProfit;
      const transactionsCount = partnerRecordsInRange.filter(r => r.type === 'expense' || (r.type === 'income' && r.category !== SECURITY_DEPOSIT_CATEGORY)).length;
      return { partner, totalIncome, totalExpenses, netBalance, activeVehicles, transactionsCount };
    }).sort((a, b) => b.netBalance - a.netBalance);
  }

  private static calculateUtilizationRate(
    vehicle: Vehicle,
    assignmentLogs: VehicleAssignmentLog[],
    dateRange?: { from: Date; to: Date },
  ): number {
    const today = endOfDay(new Date());
    const acquisitionDate = infallibleNormalizeDate(vehicle.acquisitionDate);
    const requestedStart = startOfDay(dateRange?.from ?? acquisitionDate ?? today);
    const requestedEnd = endOfDay(dateRange?.to ?? today);
    const periodStart = startOfDay(
      acquisitionDate && acquisitionDate > requestedStart ? acquisitionDate : requestedStart,
    );
    const periodEnd = endOfDay(requestedEnd < today ? requestedEnd : today);
    if (periodStart > periodEnd) return 0;

    const intervals = assignmentLogs
      .filter(log => log.vehicleId === vehicle.id)
      .map(log => {
        const start = infallibleNormalizeDate(log.startDate || log.assignedAt);
        const end = infallibleNormalizeDate(log.endDate || log.unassignedAt) ?? today;
        if (!start || end < start) return null;
        const clippedStart = startOfDay(start > periodStart ? start : periodStart);
        const clippedEnd = endOfDay(end < periodEnd ? end : periodEnd);
        return clippedStart <= clippedEnd ? { start: clippedStart, end: clippedEnd } : null;
      })
      .filter((interval): interval is { start: Date; end: Date } => interval !== null)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    if (intervals.length === 0) return 0;
    let assignedDays = 0;
    let currentStart = intervals[0].start;
    let currentEnd = intervals[0].end;
    for (const interval of intervals.slice(1)) {
      if (interval.start.getTime() <= currentEnd.getTime() + 24 * 60 * 60 * 1000) {
        if (interval.end > currentEnd) currentEnd = interval.end;
      } else {
        assignedDays += differenceInCalendarDays(currentEnd, currentStart) + 1;
        currentStart = interval.start;
        currentEnd = interval.end;
      }
    }
    assignedDays += differenceInCalendarDays(currentEnd, currentStart) + 1;
    const periodDays = differenceInCalendarDays(periodEnd, periodStart) + 1;
    return periodDays > 0 ? Math.min(100, Math.max(0, (assignedDays / periodDays) * 100)) : 0;
  }

  static filterRecordsByDateRange(records: FinancialRecord[], dateRange: { from: Date; to: Date }): FinancialRecord[] {
    return filterRecordsByDateRange(records, dateRange);
  }

  static getTopVehicles(vehicleMetrics: VehicleMetric[], limit: number = 5): VehicleMetric[] { return [...vehicleMetrics].sort((a, b) => b.netProfit - a.netProfit).slice(0, limit); }
  static getTopClients(clientMetrics: ClientMetric[], limit: number = 5): ClientMetric[] { return [...clientMetrics].sort((a, b) => b.totalPayments - a.totalPayments).slice(0, limit); }
  static getClientsWithCriticalBalance(clientMetrics: ClientMetric[], threshold: number = 5000): ClientMetric[] { return clientMetrics.filter(m => m.balance > threshold).sort((a, b) => b.balance - a.balance); }

}
