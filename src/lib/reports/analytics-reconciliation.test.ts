import { ReportAnalyticsService } from './analytics-service';
import { calculateFinancialReconciliation } from '@/lib/financial-metrics';
import type { FinancialRecord, Vehicle, Partner } from '@/types';

const vehicles = [{ id: 'v', partnerId: 'p', cost: 495000, status: 'sold', alias: 'Unidad' }] as Vehicle[];
const partners = [{ id: 'p', name: 'Socio' }] as Partner[];
const record = (id: string, data: Partial<FinancialRecord>): FinancialRecord => ({
  id, vehicleId: 'v', partnerId: 'p', categoryId: 'rent', category: 'Renta',
  type: 'income', amount: 1000, date: '2026-11-02', description: '', isDeleted: false,
  createdAt: '2026-11-02', ...data,
});
const records = [
  record('rent', { amount: 100000 }),
  record('sale', { amount: 1166850, creditGranted: true }),
  record('expense', { amount: 124750, type: 'expense', category: 'Mantenimiento' }),
  record('deposit', { amount: 50000, category: 'Depósito en Garantía' }),
  record('refund', { amount: 50000, type: 'expense', category: 'Devolución de Depósito' }),
  record('payment', { amount: 30000, type: 'payment' }),
  record('deleted', { amount: 999999, isDeleted: true }),
];

describe('report breakdown reconciliation', () => {
  it('uses the same income, expense, sales-cost and profit definitions as the summary for vehicles', () => {
    const expected = calculateFinancialReconciliation(records, vehicles);
    const [result] = ReportAnalyticsService.calculateVehicleMetrics(vehicles, records);
    expect(result.totalIncome).toBe(expected.totalIncome);
    expect(result.totalExpenses).toBe(expected.totalExpenses);
    expect(result.netProfit).toBe(647100);
    expect(result.transactionsCount).toBe(expected.includedRecords.length);
  });

  it('reconciles the partner breakdown including the acquisition cost of financed sales', () => {
    const expected = calculateFinancialReconciliation(records, vehicles);
    const [result] = ReportAnalyticsService.calculatePartnerMetrics(partners, vehicles, records);
    expect(result.totalIncome).toBe(expected.totalIncome);
    expect(result.totalExpenses).toBe(expected.totalExpenses);
    expect(result.netBalance).toBe(647100);
    expect(result.transactionsCount).toBe(expected.includedRecords.length);
  });
});
