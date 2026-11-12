import { calculateFinancialReconciliation, calculatePartnerProfitability } from '@/lib/financial-metrics';
import type { FinancialRecord } from '@/types';

const makeRecord = (overrides: Partial<FinancialRecord> = {}): FinancialRecord => ({
  id: 'record-1',
  categoryId: 'category-1',
  category: 'Renta',
  type: 'income',
  amount: 1000,
  description: 'Prueba',
  date: '2026-11-02',
  isDeleted: false,
  createdAt: '2026-11-02T12:00:00.000Z',
  ...overrides,
});

describe('financial reconciliation', () => {
  it('reconstructs report net profit from operating income and expenses with financed sales tracked separately', () => {
    const records = [
      makeRecord({ id: 'rental-income', amount: 100000 }),
      makeRecord({ id: 'vehicle-sale', amount: 1166850, creditGranted: true, vehicleId: 'vehicle-1' }),
      makeRecord({ id: 'duplicate-sale-record', amount: 0, creditGranted: true, vehicleId: 'vehicle-1' }),
      makeRecord({ id: 'operating-expense', type: 'expense', category: 'Mantenimiento', amount: 124750 }),
      makeRecord({ id: 'deposit-refund', type: 'expense', category: 'Devolución de Depósito', categoryId: 'deposit-refund', amount: 50000 }),
      makeRecord({ id: 'fine-income', type: 'income', category: 'Multa', amount: 25000 }),
      makeRecord({ id: 'deleted-income', amount: 900000, isDeleted: true }),
    ];

    const result = calculateFinancialReconciliation(
      records,
      undefined,
      new Set(['deposit-refund'])
    );

    expect(result.operationalIncome).toBe(100000);
    expect(result.vehicleSales).toBe(1166850);
    expect(result.totalIncome).toBe(100000);
    expect(result.operatingExpenses).toBe(124750);
    expect(result.totalExpenses).toBe(124750);
    expect(result.netProfit).toBe(-24750);
    expect(result.totalIncome - result.totalExpenses).toBe(result.netProfit);
    expect(result.includedRecords.map(record => record.id)).toEqual(['rental-income', 'operating-expense']);
    expect(result.excludedRecords.map(item => item.record.id)).toEqual(['vehicle-sale', 'duplicate-sale-record', 'deposit-refund', 'fine-income']);
  });

  it('includes only the partner side of the administration fee and excludes credit activity', () => {
    const result = calculatePartnerProfitability([
      makeRecord({ id: 'rental', amount: 40000 }),
      makeRecord({ id: 'expense', type: 'expense', amount: 10000 }),
      makeRecord({ id: 'sale', creditGranted: true, amount: 250000 }),
      makeRecord({ id: 'credit-payment', type: 'payment', amount: 4000 }),
      makeRecord({ id: 'admin-income', sourceRecordType: 'vehicle_admin_fee', amount: 800 }),
      makeRecord({ id: 'admin-expense', sourceRecordType: 'vehicle_admin_fee', type: 'expense', amount: 800 }),
      makeRecord({ id: 'credit-cancel', sourceRecordType: 'credit_cancellation_note', type: 'expense', amount: 20000 }),
    ]);

    expect(result.totalIncome).toBe(40000);
    expect(result.totalExpenses).toBe(10800);
    expect(result.netProfit).toBe(29200);
    expect(result.vehicleSales).toBe(250000);
  });
});
