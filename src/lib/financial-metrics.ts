/**
 * Módulo canónico de métricas financieras de FleetEase.
 *
 * Helpers puros, sin estado, para calcular métricas sobre FinancialRecord.
 * Por defecto, todas las agregaciones excluyen registros soft-deleted (isDeleted)
 * y descartan fechas inválidas vía infallibleNormalizeDate.
 *
 * Reglas:
 * - Nunca modificar las fórmulas de negocio (margen, ROI, ocupación) sin aprobación explícita.
 * - Los helpers que devuelven montos siempre suman `r.amount || 0` para ser defensivos.
 */
import type { FinancialRecord, Vehicle, FinancialCategory } from '@/types';
import { differenceInDays, isWithinInterval } from 'date-fns';
import { infallibleNormalizeDate } from '@/lib/date-utils';

export type DateRange = { from: Date; to: Date };

export const DEFAULT_MAINTENANCE_INTERVAL_KM = 10000;

/**
 * Devuelve el conjunto de categoryId cuya categoría tiene el `affects` indicado.
 * Mecanismo robusto para identificar categorías especiales (depósito, pago de
 * crédito, etc.) sin depender de coincidencia de nombre de texto libre, que
 * varía por empresa. Ver columna `affects` en financial_categories (Supabase).
 */
export const categoryIdsByAffects = (
  categories: FinancialCategory[] | undefined | null,
  affects: FinancialCategory['affects']
): Set<string> => new Set((categories ?? []).filter(c => c.affects === affects).map(c => c.id));

/** Categoría de ingresos que NO se contabiliza como renta (depósito en garantía). */
export const SECURITY_DEPOSIT_CATEGORY = 'Deposito en Garantia';

// --- Predicados ---

export const isActiveRecord = (r: FinancialRecord): boolean => !r.isDeleted;

export const isIncome = (r: FinancialRecord): boolean => r.type === 'income';

export const isExpense = (r: FinancialRecord): boolean => r.type === 'expense';

export const isPayment = (r: FinancialRecord): boolean => r.type === 'payment';

/** Un registro transaccional es ingreso o gasto (excluye pagos). */
export const isTransaction = (r: FinancialRecord): boolean => r.type === 'income' || r.type === 'expense';

// --- Filtros ---

export const filterActiveRecords = (records: FinancialRecord[]): FinancialRecord[] =>
  records.filter(isActiveRecord);

export const filterIncome = (records: FinancialRecord[]): FinancialRecord[] =>
  records.filter(r => isActiveRecord(r) && isIncome(r));

export const filterExpense = (records: FinancialRecord[]): FinancialRecord[] =>
  records.filter(r => isActiveRecord(r) && isExpense(r));

export const filterPayment = (records: FinancialRecord[]): FinancialRecord[] =>
  records.filter(r => isActiveRecord(r) && isPayment(r));

export interface FilterOptions {
  excludeDeleted?: boolean;
}

/**
 * Filtra registros dentro de un rango de fechas inclusivo.
 * Por defecto excluye soft-deleted; usa `{ excludeDeleted: false }` para conservar el comportamiento heredado.
 */
export const filterRecordsByDateRange = (
  records: FinancialRecord[],
  dateRange: DateRange,
  options: FilterOptions = {}
): FinancialRecord[] => {
  const { excludeDeleted = true } = options;
  return records.filter(r => {
    if (excludeDeleted && r.isDeleted) return false;
    const recordDate = infallibleNormalizeDate(r.date);
    return recordDate ? isWithinInterval(recordDate, { start: dateRange.from, end: dateRange.to }) : false;
  });
};

/**
 * Filtra registros con fecha >= cutoffDate.
 * Por defecto excluye soft-deleted; usa `{ excludeDeleted: false }` para conservar el comportamiento heredado.
 */
export const filterRecordsSince = (
  records: FinancialRecord[],
  cutoffDate: Date,
  options: FilterOptions = {}
): FinancialRecord[] => {
  const { excludeDeleted = true } = options;
  return records.filter(r => {
    if (excludeDeleted && r.isDeleted) return false;
    const recordDate = infallibleNormalizeDate(r.date);
    return recordDate ? recordDate >= cutoffDate : false;
  });
};

/** Filtra registros de un vehículo. Por defecto excluye soft-deleted. */
export const filterRecordsByVehicle = (
  records: FinancialRecord[],
  vehicleId: string,
  options: FilterOptions = {}
): FinancialRecord[] => {
  const { excludeDeleted = true } = options;
  return records.filter(r => r.vehicleId === vehicleId && (excludeDeleted ? !r.isDeleted : true));
};

// --- Agregaciones ---

export const sumAmount = (records: FinancialRecord[]): number =>
  records.reduce((sum, r) => sum + (r.amount || 0), 0);

export const sumIncome = (records: FinancialRecord[]): number => sumAmount(filterIncome(records));

export const sumExpense = (records: FinancialRecord[]): number => sumAmount(filterExpense(records));

export const sumPayment = (records: FinancialRecord[]): number => sumAmount(filterPayment(records));

/**
 * Suma de ingresos por rentas (excluye depósitos en garantía).
 * Se usa en dashboards de rentabilidad por vehículo.
 */
/**
 * Suma el ingreso real de renta, excluyendo depósitos en garantía.
 * `depositCategoryIds` debe venir de `categoryIdsByAffects(categories, 'security_deposit')`;
 * si no se provee, cae de forma defensiva a la comparación por nombre legado.
 */
export const sumRentalIncome = (
  records: FinancialRecord[],
  depositCategoryIds?: Set<string>
): number =>
  sumAmount(records.filter(r =>
    isActiveRecord(r) && isIncome(r) &&
    r.category !== SECURITY_DEPOSIT_CATEGORY &&
    !(depositCategoryIds && r.categoryId && depositCategoryIds.has(r.categoryId))
  ));

// --- Métricas ---

export const calculateNetProfit = (records: FinancialRecord[]): number =>
  sumIncome(records) - sumExpense(records);

/**
 * Margen de rentabilidad como % del ingreso.
 * Si no hay ingreso (income <= 0):
 *   - Si tampoco hay pérdida neta (net === 0, ej. ambos en 0), el margen es 0%.
 *   - Si hay gastos sin ningún ingreso que los respalde, es pérdida total: -100%.
 * Esto evita ocultar vehículos/clientes que generan puro gasto sin ingreso.
 */
export const calculateProfitMargin = (income: number, expenses: number): number => {
  const net = income - expenses;
  if (income > 0) return (net / income) * 100;
  return net === 0 ? 0 : -100;
};

/**
 * Valor promedio de transacción sobre registros de ingreso/gasto activos.
 * Excluye soft-deleted y registros tipo `payment`.
 */
export const calculateAvgTransactionValue = (records: FinancialRecord[]): number => {
  const tx = records.filter(r => isActiveRecord(r) && isTransaction(r));
  if (tx.length === 0) return 0;
  return sumAmount(tx) / tx.length;
};

// --- Vehículos ---

export const getMaintenanceIntervalKm = (vehicle: Pick<Vehicle, 'maintenanceInterval'>): number =>
  vehicle.maintenanceInterval || DEFAULT_MAINTENANCE_INTERVAL_KM;

export const getNextMaintenanceKm = (
  vehicle: Pick<Vehicle, 'lastMaintenanceMileage' | 'maintenanceInterval'>
): number => (vehicle.lastMaintenanceMileage || 0) + getMaintenanceIntervalKm(vehicle);

// --- Utilidades ---

/** Días transcurridos entre dos fechas, inclusive (mínimo 1). */
export const daysBetweenInclusive = (from: Date, to: Date): number =>
  Math.max(differenceInDays(to, from) + 1, 1);
