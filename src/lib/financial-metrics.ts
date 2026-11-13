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
import type { FinancialRecord, Vehicle, FinancialCategory, Partner, Client } from '@/types';
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

export const filterActiveRecords = (records: FinancialRecord[]): FinancialRecord[] => records.filter(isActiveRecord);
export const filterIncome = (records: FinancialRecord[]): FinancialRecord[] => records.filter(r => isActiveRecord(r) && isIncome(r));
export const filterExpense = (records: FinancialRecord[]): FinancialRecord[] => records.filter(r => isActiveRecord(r) && isExpense(r));
export const filterPayment = (records: FinancialRecord[]): FinancialRecord[] => records.filter(r => isActiveRecord(r) && isPayment(r));

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
export const sumIncome = (records: FinancialRecord[]): number => sumAmount(filterIncome(records).filter(r => r.category !== 'Multa'));
export const CREDIT_CANCELLATION_NOTE_SOURCE = 'credit_cancellation_note';

export const isCreditCancellationNote = (r: FinancialRecord): boolean =>
  r.sourceRecordType === CREDIT_CANCELLATION_NOTE_SOURCE;

export const sumExpense = (records: FinancialRecord[]): number =>
  sumAmount(filterExpense(records).filter(r => !isCreditCancellationNote(r)));
export const sumPayment = (records: FinancialRecord[]): number => sumAmount(filterPayment(records));



export const PAYMENT_CATEGORY_ALIASES = {
  client: ['pago de cliente', 'pago cliente', 'abono de cliente'],
  partner: ['pago a socio', 'pago de socio', 'abono a socio', 'comisión socio', 'comision socio'],
  supplier: ['pago a proveedor', 'pago de proveedor', 'abono a proveedor'],
  credit: ['pago de crédito', 'pago credito', 'pago de crédito semanal'],
  multa: ['pago de multa'],
} as const;

export type PaymentCategory = keyof typeof PAYMENT_CATEGORY_ALIASES;

export const normalizeFinancialCategory = (
  record: FinancialRecord,
  categoryMap?: Map<string, string>,
): string => (record.categoryId && categoryMap?.get(record.categoryId)) || record.category || '';

export const getPaymentCategory = (
  record: FinancialRecord,
  categoryMap?: Map<string, string>,
): PaymentCategory | 'other' => {
  const category = normalizeFinancialCategory(record, categoryMap).trim().toLowerCase();
  for (const [type, aliases] of Object.entries(PAYMENT_CATEGORY_ALIASES) as [PaymentCategory, readonly string[]][]) {
    if (aliases.includes(category)) return type;
  }
  return 'other';
};

export interface CashFlowBreakdown {
  customerCollections: number;
  creditCollections: number;
  multaCollections: number;
  securityDeposits: number;
  partnerPayments: number;
  supplierPayments: number;
  otherPayments: number;
  depositRefunds: number;
  cashInflow: number;
  cashOutflow: number;
  netCashFlow: number;
}

export const calculateCashFlowBreakdown = (
  records: FinancialRecord[],
  categoryMap?: Map<string, string>,
  depositCategoryIds?: Set<string>,
  depositRefundCategoryIds?: Set<string>,
): CashFlowBreakdown => {
  const activeRecords = records.filter(isActiveRecord);
  const paymentRecords = activeRecords.filter(isPayment);
  const sumPaymentsBy = (type: PaymentCategory): number =>
    sumAmount(paymentRecords.filter(r => getPaymentCategory(r, categoryMap) === type));
  const securityDeposits = sumAmount(activeRecords.filter(r =>
    isIncome(r) &&
    (r.category === SECURITY_DEPOSIT_CATEGORY || (!!r.categoryId && !!depositCategoryIds?.has(r.categoryId)))
  ));
  const depositRefunds = sumAmount(activeRecords.filter(r =>
    isExpense(r) &&
    (r.category === 'Devolución de Depósito' || (!!r.categoryId && !!depositRefundCategoryIds?.has(r.categoryId)))
  ));
  const customerCollections = sumPaymentsBy('client');
  const creditCollections = sumPaymentsBy('credit');
  const multaCollections = sumPaymentsBy('multa');
  const partnerPayments = sumPaymentsBy('partner');
  const supplierPayments = sumPaymentsBy('supplier');
  const otherPayments = sumAmount(paymentRecords.filter(r => getPaymentCategory(r, categoryMap) === 'other'));
  const cashInflow = customerCollections + creditCollections + multaCollections + securityDeposits;
  const cashOutflow = partnerPayments + supplierPayments + otherPayments + depositRefunds;
  return {
    customerCollections, creditCollections, multaCollections, securityDeposits,
    partnerPayments, supplierPayments, otherPayments, depositRefunds,
    cashInflow, cashOutflow, netCashFlow: cashInflow - cashOutflow,
  };
};

/**
 * Regla canónica de estado de cuenta de socios.
 * La identidad histórica del vehículo se conserva mediante los movimientos
 * financieros que todavía tienen partnerId, incluso cuando el vehículo ya fue vendido.
 */
export const getPartnerFinancialRecords = (
  partner: Partner,
  partnerVehicles: Vehicle[],
  financialRecords: FinancialRecord[],
): FinancialRecord[] => {
  const currentVehicleIds = new Set(
    partnerVehicles.filter(v => !v.isDeleted).map(v => v.id),
  );
  const historicalVehicleIds = new Set(
    financialRecords
      .filter(r => !r.isDeleted && r.partnerId === partner.id && r.vehicleId)
      .map(r => r.vehicleId as string),
  );
  const partnerVehicleIds = new Set([...currentVehicleIds, ...historicalVehicleIds]);

  return financialRecords.filter(r => {
    if (r.isDeleted) return false;
    if (r.partnerId === partner.id) return true;
    return !!r.vehicleId && partnerVehicleIds.has(r.vehicleId);
  });
};

export interface PartnerBalanceBreakdown {
  initialBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalPartnerPayments: number;
  balance: number;
}

export const calculatePartnerBalanceBreakdown = (
  partner: Partner,
  partnerVehicles: Vehicle[],
  financialRecords: FinancialRecord[],
): PartnerBalanceBreakdown => {
  const records = getPartnerFinancialRecords(partner, partnerVehicles, financialRecords);
  const totalIncome = sumAmount(records.filter(r => {
    if (r.type !== 'income') return false;
    const category = (r.category || '').trim().toLowerCase();
    return category === 'renta semanal' || category === 'crédito otorgado' || category === 'credito otorgado';
  }));
  const totalExpenses = sumAmount(records.filter(
    r => r.type === 'expense' && r.paymentMethod !== 'partner_pays' && !isCreditCancellationNote(r),
  )) + sumAmount(records.filter(
    r => isCreditCancellationNote(r) && r.partnerId === partner.id,
  ));
  const totalPartnerPayments = sumAmount(records.filter(
    r => r.type === 'payment' && r.partnerId === partner.id,
  ));
  const initialBalance = partner.initialBalance || 0;
  return {
    initialBalance,
    totalIncome,
    totalExpenses,
    totalPartnerPayments,
    balance: initialBalance + totalIncome - totalExpenses - totalPartnerPayments,
  };
};

export const calculatePartnerBalance = (
  partner: Partner,
  partnerVehicles: Vehicle[],
  financialRecords: FinancialRecord[],
): number => calculatePartnerBalanceBreakdown(partner, partnerVehicles, financialRecords).balance;

export const DRIVER_PAYMENT_CATEGORY = 'Pago a Conductor';

export interface ClientBalanceBreakdown {
  initialBalance: number;
  totalIncome: number;
  totalPayments: number;
  balance: number;
}

export const calculateClientBalance = (
  client: Client,
  financialRecords: FinancialRecord[],
): ClientBalanceBreakdown => {
  const records = financialRecords.filter(
    r => !r.isDeleted && r.clientId === client.id && r.category !== SECURITY_DEPOSIT_CATEGORY,
  );
  const totalIncome = sumAmount(records.filter(r => r.type === 'income'));
  const totalPayments = sumAmount(records.filter(r =>
    r.type === 'payment' ||
    (r.type === 'expense' && (r.category === DRIVER_PAYMENT_CATEGORY || isCreditCancellationNote(r)))
  ));
  const initialBalance = client.initialBalance || 0;
  return {
    initialBalance,
    totalIncome,
    totalPayments,
    balance: initialBalance + totalIncome - totalPayments,
  };
};

/**
 * Ventas de vehículos financiadas.
 *
 * En FleetEase el registro `creditGranted` representa la operación de venta
 * financiada asociada a un vehículo. No es efectivo cobrado: los pagos del
 * crédito se registran posteriormente como cobranzas y NO vuelven a sumar venta.
 */
export const sumVehicleSales = (records: FinancialRecord[]): number =>
  sumAmount(records.filter(r => isActiveRecord(r) && isIncome(r) && r.creditGranted === true));

/** Rentabilidad operativa atribuible al socio. */
export const calculatePartnerProfitability = (
  records: FinancialRecord[],
  depositCategoryIds?: Set<string>,
  refundDepositCategoryIds?: Set<string>
): FinancialReconciliation => calculateFinancialReconciliation(
  records.filter(record =>
    !(record.type === 'income' && record.sourceRecordType === 'vehicle_admin_fee') &&
    !(record.type === 'expense' && record.category === 'Pago a Socio')
  ),
  depositCategoryIds,
  refundDepositCategoryIds,
);

/**
 * Ingreso operativo por renta/servicios. Excluye ventas financiadas y depósitos.
 */
export const sumRentalIncome = (
  records: FinancialRecord[],
  depositCategoryIds?: Set<string>
): number =>
  sumAmount(records.filter(r =>
    isActiveRecord(r) && isIncome(r) &&
    !r.creditGranted &&
    r.category !== SECURITY_DEPOSIT_CATEGORY &&
    !(depositCategoryIds && r.categoryId && depositCategoryIds.has(r.categoryId)) &&
    r.category !== 'Multa'
  ));

/** Utilidad operativa de renta/servicios: ingreso operativo menos gastos. */
export const calculateNetProfit = (records: FinancialRecord[]): number => sumRentalIncome(records) - sumExpense(records);

export const calculateProfitMargin = (income: number, expenses: number): number => {
  const net = income - expenses;
  if (income > 0) return (net / income) * 100;
  return net === 0 ? 0 : -100;
};

export const isDepositRefundRecord = (
  record: FinancialRecord,
  refundDepositCategoryIds?: Set<string>
): boolean => record.type === 'expense' && (
  record.category === 'Devolución de Depósito' ||
  (!!record.categoryId && !!refundDepositCategoryIds?.has(record.categoryId))
);

export interface ExcludedFinancialRecord {
  record: FinancialRecord;
  reason: string;
}

export interface FinancialReconciliation {
  operationalIncome: number;
  vehicleSales: number;
  totalIncome: number;
  operatingExpenses: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  includedRecords: FinancialRecord[];
  excludedRecords: ExcludedFinancialRecord[];
}

/** Explains why a record is visible in the period but excluded from profitability. */
export const getFinancialRecordExclusionReason = (
  record: FinancialRecord,
  depositCategoryIds?: Set<string>,
  refundDepositCategoryIds?: Set<string>
): string | null => {
  if (!isActiveRecord(record)) return 'Registro eliminado o inactivo';
  if (record.type === 'income') {
    if (record.creditGranted === true) return 'Venta financiada: se presenta por separado de la rentabilidad operativa.';
    if (record.category === SECURITY_DEPOSIT_CATEGORY || (!!record.categoryId && !!depositCategoryIds?.has(record.categoryId))) {
      return 'Depósito en garantía: se excluye de ingresos por ser un pasivo reembolsable.';
    }
    if (record.category === 'Multa') return 'Multa: no se considera ingreso operativo en la rentabilidad.';
    return null;
  }
  if (record.type === 'expense') {
    if (isCreditCancellationNote(record)) return 'Nota de cancelación: corresponde a la cartera de crédito.';
    if (isDepositRefundRecord(record, refundDepositCategoryIds)) {
      return 'Devolución de depósito: se excluye de gastos operativos.';
    }
    return null;
  }
  return 'Cobro o pago: se presenta en flujo de efectivo y no vuelve a sumar ingreso/gasto de rentabilidad.';
};

/** Conciliación operativa del periodo con las ventas financiadas por separado. */
export const calculateFinancialReconciliation = (
  records: FinancialRecord[],
  depositCategoryIds?: Set<string>,
  refundDepositCategoryIds?: Set<string>
): FinancialReconciliation => {
  const activeRecords = records.filter(isActiveRecord);
  const excludedRecords = activeRecords.flatMap(record => {
    const reason = getFinancialRecordExclusionReason(record, depositCategoryIds, refundDepositCategoryIds);
    return reason ? [{ record, reason }] : [];
  });
  const includedRecords = activeRecords.filter(record =>
    getFinancialRecordExclusionReason(record, depositCategoryIds, refundDepositCategoryIds) === null
  );
  const operationalIncome = sumRentalIncome(activeRecords, depositCategoryIds);
  const vehicleSales = sumVehicleSales(activeRecords);
  const operatingExpenses = sumExpense(includedRecords);
  const netProfit = operationalIncome - operatingExpenses;

  return {
    operationalIncome,
    vehicleSales,
    totalIncome: operationalIncome,
    operatingExpenses,
    totalExpenses: operatingExpenses,
    netProfit,
    profitMargin: calculateProfitMargin(operationalIncome, operatingExpenses),
    includedRecords,
    excludedRecords,
  };
};

export const calculateAvgTransactionValue = (records: FinancialRecord[]): number => {
  const tx = records.filter(r => isActiveRecord(r) && isTransaction(r) && !r.creditGranted && r.category !== SECURITY_DEPOSIT_CATEGORY);
  if (tx.length === 0) return 0;
  return sumAmount(tx) / tx.length;
};

export const getMaintenanceIntervalKm = (vehicle: Pick<Vehicle, 'maintenanceInterval'>): number => vehicle.maintenanceInterval || DEFAULT_MAINTENANCE_INTERVAL_KM;
export const getNextMaintenanceKm = (
  vehicle: Pick<Vehicle, 'lastMaintenanceMileage' | 'maintenanceInterval'>
): number => (vehicle.lastMaintenanceMileage || 0) + getMaintenanceIntervalKm(vehicle);
export const daysBetweenInclusive = (from: Date, to: Date): number => Math.max(differenceInDays(to, from) + 1, 1);
