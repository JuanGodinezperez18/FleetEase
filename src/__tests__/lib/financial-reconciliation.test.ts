import { calculateFinancialReconciliation, getVehicleSalesCostBreakdown } from '@/lib/financial-metrics';
import type { FinancialRecord, Vehicle } from '@/types';

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

const makeVehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
  id: 'vehicle-1',
  alias: 'Unidad 1',
  make: 'Toyota',
  model: 'Yaris',
  plate: 'ABC-123',
  cost: 495000,
  status: 'sold',
  ...overrides,
} as Vehicle);

describe('financial reconciliation', () => {
  it('reconstructs report net profit from income, operating expenses and vehicle sales cost', () => {
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
      [makeVehicle()],
      undefined,
      new Set(['deposit-refund'])
    );

    expect(result.operationalIncome).toBe(100000);
    expect(result.vehicleSales).toBe(1166850);
    expect(result.totalIncome).toBe(1266850);
    expect(result.operatingExpenses).toBe(124750);
    expect(result.vehicleSalesCost).toBe(495000);
    expect(result.totalExpenses).toBe(619750);
    expect(result.netProfit).toBe(647100);
    expect(result.totalIncome - result.totalExpenses).toBe(result.netProfit);
    expect(result.includedRecords.map(record => record.id)).toEqual(['rental-income', 'vehicle-sale', 'duplicate-sale-record', 'operating-expense']);
    expect(result.excludedRecords.map(item => item.record.id)).toEqual(['deposit-refund', 'fine-income']);
  });

  it('counts each sold vehicle acquisition cost once and exposes an auditable breakdown', () => {
    const records = [
      makeRecord({ id: 'sale-1', creditGranted: true, vehicleId: 'vehicle-1', amount: 100000 }),
      makeRecord({ id: 'sale-2', creditGranted: true, vehicleId: 'vehicle-1', amount: 50000 }),
    ];
    const details = getVehicleSalesCostBreakdown(records, [makeVehicle()]);

    expect(details).toHaveLength(1);
    expect(details[0]).toMatchObject({
      vehicleId: 'vehicle-1',
      vehicleName: 'Unidad 1',
      plate: 'ABC-123',
      acquisitionCost: 495000,
    });
  });
});
