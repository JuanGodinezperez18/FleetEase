/**
 * @fileoverview Tests del módulo canónico de métricas financieras.
 *
 * Estas funciones alimentan directamente el dashboard de rentabilidad
 * por vehículo y las analíticas financieras. Un error aquí se traduce
 * en cifras de negocio incorrectas para el usuario final.
 */
import {
  isActiveRecord,
  isIncome,
  isExpense,
  isPayment,
  isTransaction,
  filterActiveRecords,
  filterIncome,
  filterExpense,
  filterPayment,
  filterRecordsByDateRange,
  filterRecordsSince,
  filterRecordsByVehicle,
  sumAmount,
  sumIncome,
  sumExpense,
  sumPayment,
  sumRentalIncome,
  calculateNetProfit,
  calculateProfitMargin,
  calculateAvgTransactionValue,
  getMaintenanceIntervalKm,
  getNextMaintenanceKm,
  daysBetweenInclusive,
  DEFAULT_MAINTENANCE_INTERVAL_KM,
  SECURITY_DEPOSIT_CATEGORY,
  categoryIdsByAffects,
} from '@/lib/financial-metrics';
import type { FinancialRecord, Vehicle, FinancialCategory } from '@/types';

// --- Fixtures ---

const makeRecord = (overrides: Partial<FinancialRecord> = {}): FinancialRecord => ({
  id: 'r1',
  categoryId: 'cat-1',
  category: 'Renta',
  type: 'income',
  amount: 1000,
  description: 'test',
  date: '2026-01-15',
  isDeleted: false,
  createdAt: '2026-01-15T00:00:00.000Z',
  ...overrides,
});

describe('financial-metrics', () => {
  // --- Predicados ---
  describe('predicados', () => {
    it('isActiveRecord: true solo cuando isDeleted es false', () => {
      expect(isActiveRecord(makeRecord({ isDeleted: false }))).toBe(true);
      expect(isActiveRecord(makeRecord({ isDeleted: true }))).toBe(false);
    });

    it('isIncome / isExpense / isPayment clasifican por type', () => {
      expect(isIncome(makeRecord({ type: 'income' }))).toBe(true);
      expect(isIncome(makeRecord({ type: 'expense' }))).toBe(false);
      expect(isExpense(makeRecord({ type: 'expense' }))).toBe(true);
      expect(isPayment(makeRecord({ type: 'payment' }))).toBe(true);
    });

    it('isTransaction: true para income/expense, false para payment', () => {
      expect(isTransaction(makeRecord({ type: 'income' }))).toBe(true);
      expect(isTransaction(makeRecord({ type: 'expense' }))).toBe(true);
      expect(isTransaction(makeRecord({ type: 'payment' }))).toBe(false);
    });
  });

  // --- Filtros ---
  describe('filterActiveRecords / filterIncome / filterExpense / filterPayment', () => {
    const records = [
      makeRecord({ id: '1', type: 'income', isDeleted: false }),
      makeRecord({ id: '2', type: 'expense', isDeleted: false }),
      makeRecord({ id: '3', type: 'payment', isDeleted: false }),
      makeRecord({ id: '4', type: 'income', isDeleted: true }), // borrado, debe excluirse
    ];

    it('filterActiveRecords excluye soft-deleted', () => {
      expect(filterActiveRecords(records)).toHaveLength(3);
    });

    it('filterIncome excluye borrados y no-income', () => {
      const result = filterIncome(records);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('filterExpense excluye borrados y no-expense', () => {
      const result = filterExpense(records);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('filterPayment excluye borrados y no-payment', () => {
      const result = filterPayment(records);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });
  });

  describe('filterRecordsByDateRange', () => {
    const records = [
      makeRecord({ id: 'antes', date: '2025-12-31' }),
      makeRecord({ id: 'inicio-exacto', date: '2026-01-01' }),
      makeRecord({ id: 'dentro', date: '2026-01-15' }),
      makeRecord({ id: 'fin-exacto', date: '2026-01-31' }),
      makeRecord({ id: 'despues', date: '2026-02-01' }),
      makeRecord({ id: 'borrado-dentro', date: '2026-01-15', isDeleted: true }),
    ];
    const range = { from: new Date('2026-01-01'), to: new Date('2026-01-31') };

    it('incluye los límites del rango (inclusivo)', () => {
      const result = filterRecordsByDateRange(records, range);
      const ids = result.map(r => r.id);
      expect(ids).toContain('inicio-exacto');
      expect(ids).toContain('fin-exacto');
    });

    it('excluye fechas fuera del rango', () => {
      const ids = filterRecordsByDateRange(records, range).map(r => r.id);
      expect(ids).not.toContain('antes');
      expect(ids).not.toContain('despues');
    });

    it('excluye soft-deleted por defecto', () => {
      const ids = filterRecordsByDateRange(records, range).map(r => r.id);
      expect(ids).not.toContain('borrado-dentro');
    });

    it('con excludeDeleted:false conserva los borrados dentro del rango', () => {
      const ids = filterRecordsByDateRange(records, range, { excludeDeleted: false }).map(r => r.id);
      expect(ids).toContain('borrado-dentro');
    });

    it('descarta registros con fecha inválida sin lanzar error', () => {
      const withBadDate = [...records, makeRecord({ id: 'fecha-mala', date: 'no-es-fecha' })];
      expect(() => filterRecordsByDateRange(withBadDate, range)).not.toThrow();
      const ids = filterRecordsByDateRange(withBadDate, range).map(r => r.id);
      expect(ids).not.toContain('fecha-mala');
    });
  });

  describe('filterRecordsSince', () => {
    const records = [
      makeRecord({ id: 'viejo', date: '2025-01-01' }),
      makeRecord({ id: 'en-el-corte', date: '2026-01-01' }),
      makeRecord({ id: 'nuevo', date: '2026-06-01' }),
      makeRecord({ id: 'borrado', date: '2026-06-01', isDeleted: true }),
    ];
    const cutoff = new Date('2026-01-01');

    it('incluye fecha igual al corte y posteriores', () => {
      const ids = filterRecordsSince(records, cutoff).map(r => r.id);
      expect(ids).toEqual(expect.arrayContaining(['en-el-corte', 'nuevo']));
    });

    it('excluye anteriores al corte', () => {
      const ids = filterRecordsSince(records, cutoff).map(r => r.id);
      expect(ids).not.toContain('viejo');
    });

    it('excluye soft-deleted por defecto', () => {
      const ids = filterRecordsSince(records, cutoff).map(r => r.id);
      expect(ids).not.toContain('borrado');
    });
  });

  describe('filterRecordsByVehicle', () => {
    const records = [
      makeRecord({ id: '1', vehicleId: 'v1' }),
      makeRecord({ id: '2', vehicleId: 'v2' }),
      makeRecord({ id: '3', vehicleId: 'v1', isDeleted: true }),
    ];

    it('filtra solo los del vehículo indicado, excluyendo borrados', () => {
      const result = filterRecordsByVehicle(records, 'v1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  // --- Agregaciones ---
  describe('sumAmount / sumIncome / sumExpense / sumPayment', () => {
    const records = [
      makeRecord({ id: '1', type: 'income', amount: 1000 }),
      makeRecord({ id: '2', type: 'expense', amount: 300 }),
      makeRecord({ id: '3', type: 'payment', amount: 200 }),
      makeRecord({ id: '4', type: 'income', amount: 500, isDeleted: true }), // no debe contar
    ];

    it('sumAmount suma amount de todos los registros pasados (sin filtrar)', () => {
      expect(sumAmount(records)).toBe(1000 + 300 + 200 + 500);
    });

    it('sumAmount es defensivo ante amount undefined/null', () => {
      const withBadAmount = [makeRecord({ amount: undefined as unknown as number })];
      expect(() => sumAmount(withBadAmount)).not.toThrow();
      expect(sumAmount(withBadAmount)).toBe(0);
    });

    it('sumIncome solo suma income activo', () => {
      expect(sumIncome(records)).toBe(1000);
    });

    it('sumExpense solo suma expense activo', () => {
      expect(sumExpense(records)).toBe(300);
    });

    it('sumPayment solo suma payment activo', () => {
      expect(sumPayment(records)).toBe(200);
    });

    it('con lista vacía todas las sumas dan 0', () => {
      expect(sumIncome([])).toBe(0);
      expect(sumExpense([])).toBe(0);
      expect(sumPayment([])).toBe(0);
    });
  });

  describe('sumRentalIncome', () => {
    it('excluye la categoría de depósito en garantía (legado, por nombre)', () => {
      const records = [
        makeRecord({ id: '1', type: 'income', amount: 1000, category: 'Renta' }),
        makeRecord({ id: '2', type: 'income', amount: 5000, category: SECURITY_DEPOSIT_CATEGORY }),
      ];
      expect(sumRentalIncome(records)).toBe(1000);
    });

    it('sigue excluyendo borrados y no-income', () => {
      const records = [
        makeRecord({ id: '1', type: 'income', amount: 1000, category: 'Renta' }),
        makeRecord({ id: '2', type: 'income', amount: 999, category: 'Renta', isDeleted: true }),
        makeRecord({ id: '3', type: 'expense', amount: 999, category: 'Renta' }),
      ];
      expect(sumRentalIncome(records)).toBe(1000);
    });

    it('excluye por categoryId cuando se provee el set de depositCategoryIds (mecanismo robusto)', () => {
      const records = [
        makeRecord({ id: '1', type: 'income', amount: 1000, categoryId: 'cat-renta', category: 'Renta Semanal' }),
        // Nombre de categoría distinto al legado, pero su ID sí está marcado como depósito real:
        makeRecord({ id: '2', type: 'income', amount: 5000, categoryId: 'cat-deposito', category: 'Depósito en Garantía' }),
      ];
      const depositCategoryIds = new Set(['cat-deposito']);
      expect(sumRentalIncome(records, depositCategoryIds)).toBe(1000);
    });

    it('sin depositCategoryIds no excluye una categoría con nombre distinto al legado', () => {
      // Documenta el comportamiento de fallback: sin el set, solo se filtra por
      // el nombre legado exacto (SECURITY_DEPOSIT_CATEGORY), no por cualquier
      // categoría que "suene" a depósito.
      const records = [
        makeRecord({ id: '1', type: 'income', amount: 1000, categoryId: 'cat-deposito', category: 'Depósito en Garantía' }),
      ];
      expect(sumRentalIncome(records)).toBe(1000);
    });
  });

  describe('categoryIdsByAffects', () => {
    const categories: FinancialCategory[] = [
      { id: 'cat-1', name: 'Renta Semanal', type: 'income', affects: 'client_balance' },
      { id: 'cat-2', name: 'Depósito en Garantía', type: 'income', affects: 'security_deposit' },
      { id: 'cat-3', name: 'Pago de Crédito', type: 'income', affects: 'credit_payment' },
      { id: 'cat-4', name: 'Otro Depósito Regional', type: 'income', affects: 'security_deposit' },
    ];

    it('devuelve todos los categoryId que coinciden con el affects pedido', () => {
      const ids = categoryIdsByAffects(categories, 'security_deposit');
      expect(ids.has('cat-2')).toBe(true);
      expect(ids.has('cat-4')).toBe(true);
      expect(ids.size).toBe(2);
    });

    it('no incluye categorías con otro affects', () => {
      const ids = categoryIdsByAffects(categories, 'security_deposit');
      expect(ids.has('cat-1')).toBe(false);
      expect(ids.has('cat-3')).toBe(false);
    });

    it('devuelve un Set vacío si no hay categorías o es undefined/null', () => {
      expect(categoryIdsByAffects(undefined, 'security_deposit').size).toBe(0);
      expect(categoryIdsByAffects(null, 'security_deposit').size).toBe(0);
      expect(categoryIdsByAffects([], 'security_deposit').size).toBe(0);
    });
  });

  describe('calculateNetProfit', () => {
    it('ingreso menos gasto', () => {
      const records = [
        makeRecord({ id: '1', type: 'income', amount: 1000 }),
        makeRecord({ id: '2', type: 'expense', amount: 400 }),
      ];
      expect(calculateNetProfit(records)).toBe(600);
    });

    it('puede dar negativo si los gastos superan al ingreso', () => {
      const records = [
        makeRecord({ id: '1', type: 'income', amount: 100 }),
        makeRecord({ id: '2', type: 'expense', amount: 400 }),
      ];
      expect(calculateNetProfit(records)).toBe(-300);
    });

    it('ignora los registros type payment', () => {
      const records = [
        makeRecord({ id: '1', type: 'income', amount: 1000 }),
        makeRecord({ id: '2', type: 'payment', amount: 9999 }),
      ];
      expect(calculateNetProfit(records)).toBe(1000);
    });
  });

  describe('calculateProfitMargin', () => {
    it('calcula el margen como % del ingreso', () => {
      expect(calculateProfitMargin(1000, 400)).toBe(60);
    });

    it('devuelve -100% cuando no hay ingreso pero sí hay gastos (pérdida total)', () => {
      expect(calculateProfitMargin(0, 500)).toBe(-100);
    });

    it('devuelve 0% cuando no hay ingreso ni gastos (neutro)', () => {
      expect(calculateProfitMargin(0, 0)).toBe(0);
    });

    it('puede devolver margen negativo cuando el ingreso es positivo pero los gastos lo superan', () => {
      expect(calculateProfitMargin(100, 400)).toBe(-300);
    });

    it('margen de 100% cuando no hay gastos', () => {
      expect(calculateProfitMargin(1000, 0)).toBe(100);
    });
  });

  describe('calculateAvgTransactionValue', () => {
    it('promedia solo income + expense, excluyendo payment', () => {
      const records = [
        makeRecord({ id: '1', type: 'income', amount: 100 }),
        makeRecord({ id: '2', type: 'expense', amount: 300 }),
        makeRecord({ id: '3', type: 'payment', amount: 9999 }),
      ];
      expect(calculateAvgTransactionValue(records)).toBe(200); // (100+300)/2
    });

    it('devuelve 0 con lista vacía (evita división entre cero)', () => {
      expect(calculateAvgTransactionValue([])).toBe(0);
    });

    it('excluye soft-deleted del promedio', () => {
      const records = [
        makeRecord({ id: '1', type: 'income', amount: 100 }),
        makeRecord({ id: '2', type: 'expense', amount: 99999, isDeleted: true }),
      ];
      expect(calculateAvgTransactionValue(records)).toBe(100);
    });
  });

  // --- Vehículos ---
  describe('getMaintenanceIntervalKm / getNextMaintenanceKm', () => {
    it('usa el intervalo del vehículo si está definido', () => {
      const vehicle: Pick<Vehicle, 'maintenanceInterval'> = { maintenanceInterval: 5000 };
      expect(getMaintenanceIntervalKm(vehicle)).toBe(5000);
    });

    it('usa el default cuando el vehículo no define intervalo', () => {
      const vehicle: Pick<Vehicle, 'maintenanceInterval'> = {} as Vehicle;
      expect(getMaintenanceIntervalKm(vehicle)).toBe(DEFAULT_MAINTENANCE_INTERVAL_KM);
    });

    it('getNextMaintenanceKm suma el ultimo mantenimiento + intervalo', () => {
      const vehicle = { lastMaintenanceMileage: 20000, maintenanceInterval: 10000 } as Vehicle;
      expect(getNextMaintenanceKm(vehicle)).toBe(30000);
    });

    it('getNextMaintenanceKm asume 0 km si nunca ha tenido mantenimiento', () => {
      const vehicle = { maintenanceInterval: 10000 } as Vehicle;
      expect(getNextMaintenanceKm(vehicle)).toBe(10000);
    });
  });

  // --- Utilidades ---
  describe('daysBetweenInclusive', () => {
    it('cuenta ambos extremos (inclusivo)', () => {
      // 1 al 31 de enero = 31 días inclusive
      expect(daysBetweenInclusive(new Date('2026-01-01'), new Date('2026-01-31'))).toBe(31);
    });

    it('mismo día cuenta como 1', () => {
      expect(daysBetweenInclusive(new Date('2026-01-01'), new Date('2026-01-01'))).toBe(1);
    });

    it('nunca devuelve menos de 1, incluso con rango invertido', () => {
      expect(daysBetweenInclusive(new Date('2026-01-31'), new Date('2026-01-01'))).toBe(1);
    });
  });
});
