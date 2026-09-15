/**
 * Módulo canónico de métricas financieras de FleetEase.
 *
 * Helpers puros, sin estado, para calcular métricas sobre FinancialRecord.
 * Por defecto, todas las agregaciones excluyen registros soft-deleted (isDeleted)
 * y descartan fechas inválidas vía infallibleNormalizeDate.
 *
 * Reglas de negocio financieras:
 * - Un crédito otorgado representa cartera/financiamiento, NO dinero cobrado.
 * - Un registro con creditGranted=true NUNCA se contabiliza como ingreso real.
 * - Un pago real de crédito se registra como type='payment' y sí representa
 *   efectivo cobrado; su importe es exactamente el importe pagado.
 * - Las rentas y demás ingresos operativos se contabilizan por sus registros
 *   income activos, excepto depósitos en garantía.
 * - Nunca modificar las fórmulas de negocio (margen, ROI, ocupación) sin aprobación explícita.
 *
 * Importante: el registro "Crédito Otorgado" puede permanecer en
 * financial_records para trazabilidad/auditoría, pero no debe entrar en las
 * métricas de ingreso cobrado ni de rentabilidad.
 */
import type { FinancialRecord, Vehicle, FinancialCategory } from '@/types';
import { differenceInDays, isWithinInterval } from 'date-fns';
import { infallibleNormalizeDate } from '@/lib/date-utils';

export type DateRange = { from: Date; to: Date };

export const DEFAULT_MAINTENANCE_INTERVAL_KM = 10000;

export const categoryIdsByAffects = (
  categories: FinancialCategory[] | undefined | null,
  affects: FinancialCategory['affects']
): Set<string> => new Set((categories ?? []).filter(c => c.affects === affects).map(c => c.id));

/** Categoría de ingresos que NO se contabiliza como renta/utilidad operativa. */
export const SECURITY_DEPOSIT_CATEGORY = 'Depósito en Garantía';

export const isActiveRecord = (r: FinancialRecord): boolean => !r.isDeleted;
export const isIncome = (r: FinancialRecord): boolean => r.type === 'income';
export const isExpense = (r: FinancialRecord): boolean => r.type === 'expense';
export const isPayment = (r: FinancialRecord): boolean => r.type === 'payment';
export const isTransaction = (r: FinancialRecord): boolean => r.type === 'income' || r.type === 'expense';

/**
 * Un crédito otorgado es un registro técnico de trazabilidad, no ingreso.
 * Mantener esta regla en un helper único evita que nuevos dashboards vuelvan
 * a sumar el principal del crédito por accidente.
 */
export const isCreditGranted = (r: FinancialRecord): boolean => r.creditGranted === true;

/** Ingreso cobrado: income activo que NO representa un crédito otorgado. */
export const isCollectedIncome = (r: FinancialRecord): boolean =>
  isActiveRecord(r) && isIncome(r) && !isCreditGranted(r);

export const filterActiveRecords = (records: FinancialRecord[]): FinancialRecord[] => records.filter(isActiveRecord);
export const filterIncome = (records: FinancialRecord[]): FinancialRecord[] => records.filter(r => isActiveRecord(r) && isIncome(r));
export const filterExpense = (records: FinancialRecord[]): FinancialRecord[] => records.filter(r => isActiveRecord(r) && isExpense(r));
export const filterPayment = (records: FinancialRecord[]): FinancialRecord[] => records.filter(r => isActiveRecord(r) && isPayment(r));
export const filterCollectedIncome = (records: FinancialRecord[]): FinancialRecord[] => records.filter(isCollectedIncome);

export interface FilterOptions { excludeDeleted?: boolean; }

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

export const filterRecordsByVehicle = (
  records: FinancialRecord[],
  vehicleId: string,
  options: FilterOptions = {}
): FinancialRecord[] => {
  const { excludeDeleted = true } = options;
  return records.filter(r => r.vehicleId === vehicleId && (excludeDeleted ? !r.isDeleted : true));
};

export const sumAmount = (records: FinancialRecord[]): number => records.reduce((sum, r) => sum + (r.amount || 0), 0);

/**
 * Ingreso financiero cobrado. Excluye Crédito Otorgado aunque su registro
 * técnico tenga type='income'. Los pagos de crédito viven como type='payment'
 * y se consultan mediante sumPayment, no se duplican aquí.
 */
export const sumIncome = (records: FinancialRecord[]): number => sumAmount(filterCollectedIncome(records));
export const sumExpense = (records: FinancialRecord[]): number => sumAmount(filterExpense(records));
export const sumPayment = (records: FinancialRecord[]): number => sumAmount(filterPayment(records));

/**
 * Ingreso operativo real: renta/ingreso cobrado que sí representa operación.
 * Los créditos otorgados son financiamiento/cartera, no ingreso ganado, aunque
 * permanezcan como registros `income` para conservar su trazabilidad contable.
 */
export const sumRentalIncome = (
  records: FinancialRecord[],
  depositCategoryIds?: Set<string>
): number =>
  sumAmount(records.filter(r =>
    isCollectedIncome(r) &&
    r.category !== SECURITY_DEPOSIT_CATEGORY &&
    !(depositCategoryIds && r.categoryId && depositCategoryIds.has(r.categoryId))
  ));

/** Utilidad operativa: renta/ingresos operativos menos gastos. */
export const calculateNetProfit = (records: FinancialRecord[]): number => sumRentalIncome(records) - sumExpense(records);

export const calculateProfitMargin = (income: number, expenses: number): number => {
  const net = income - expenses;
  if (income > 0) return (net / income) * 100;
  return net === 0 ? 0 : -100;
};

export const calculateAvgTransactionValue = (records: FinancialRecord[]): number => {
  const tx = records.filter(r => isActiveRecord(r) && isTransaction(r) && !isCreditGranted(r) && r.category !== SECURITY_DEPOSIT_CATEGORY);
  if (tx.length === 0) return 0;
  return sumAmount(tx) / tx.length;
};

export const getMaintenanceIntervalKm = (vehicle: Pick<Vehicle, 'maintenanceInterval'>): number => vehicle.maintenanceInterval || DEFAULT_MAINTENANCE_INTERVAL_KM;
export const getNextMaintenanceKm = (
  vehicle: Pick<Vehicle, 'lastMaintenanceMileage' | 'maintenanceInterval'>
): number => (vehicle.lastMaintenanceMileage || 0) + getMaintenanceIntervalKm(vehicle);
export const daysBetweenInclusive = (from: Date, to: Date): number => Math.max(differenceInDays(to, from) + 1, 1);
