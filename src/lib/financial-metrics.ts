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
import type { FinancialRecord, Vehicle } from '@/types';
import { differenceInDays, isWithinInterval } from 'date-fns';
import { infallibleNormalizeDate } from '@/lib/date-utils';

export type DateRange = { from: Date; to: Date };

export const DEFAULT_MAINTENANCE_INTERVAL_KM = 10000;

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
export const sumRentalIncome = (records: FinancialRecord[]): number =>
  sumAmount(records.filter(r => isActiveRecord(r) && isIncome(r) && r.category !== SECURITY_DEPOSIT_CATEGORY));

// --- Métricas ---

export const calculateNetProfit = (records: FinancialRecord[]): number =>
  sumIncome(records) - sumExpense(records);

export const calculateProfitMargin = (income: number, expenses: number): number => {
  const net = income - expenses;
  return income > 0 ? (net / income) * 100 : 0;
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
