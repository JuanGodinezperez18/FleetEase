/**
 * @fileoverview Validación y armado del payload de creación de crédito.
 *
 * Extraída para que exista un único lugar que decida "¿se puede crear este
 * crédito?" y "¿cómo se calculan sus campos?" — antes esta lógica vivía
 * duplicada en credits/page.tsx (flujo completo) y use-dashboard-actions.ts
 * (acción rápida del dashboard), y la segunda copia se había quedado
 * desactualizada respecto a la primera (ver bug: la acción rápida llamaba
 * a addCredit crudo en vez de createCreditWithFinancialRecord).
 */

export interface CreditAvailabilityCheckInput {
  vehicleId: string;
  clientId: string;
  excludeCreditId?: string;
}

export interface ExistingCreditLike {
  id: string;
  vehicleId: string;
  clientId: string;
  status: string;
  isDeleted?: boolean;
}

export interface CreditAvailabilityResult {
  available: boolean;
  error?: string;
}

/**
 * Regla de negocio: un vehículo y un cliente solo pueden tener UN crédito
 * activo a la vez. Revisa ambas condiciones contra la lista de créditos
 * existentes.
 */
export function checkCreditAvailability(
  credits: ExistingCreditLike[],
  input: CreditAvailabilityCheckInput
): CreditAvailabilityResult {
  const activeCredits = credits.filter(c => c.status === 'active' && !c.isDeleted && c.id !== input.excludeCreditId);

  const vehicleTaken = activeCredits.find(c => c.vehicleId === input.vehicleId);
  if (vehicleTaken) {
    return { available: false, error: 'Este vehículo ya tiene un crédito activo.' };
  }

  const clientTaken = activeCredits.some(c => c.clientId === input.clientId);
  if (clientTaken) {
    return {
      available: false,
      error: 'Este cliente ya tiene un crédito activo. Complete o cancele el anterior primero.',
    };
  }

  return { available: true };
}

export interface CreditFormInput {
  clientId: string;
  vehicleId: string;
  startDate: string;
  weeklyPayment: number | string;
  numberOfPayments: number | string;
  companyId?: string | null;
}

export interface BuiltCreditData {
  clientId: string;
  vehicleId: string;
  startDate: string;
  totalAmount: number;
  weeklyPayment: number;
  numberOfPayments: number;
  paidAmount: number;
  remainingBalance: number;
  status: 'active';
  paymentsMade: number;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Arma el objeto completo que espera createCreditWithFinancialRecord a
 * partir de los datos crudos del formulario. totalAmount = weeklyPayment *
 * numberOfPayments (no hay tasa de interés en este producto).
 *
 * Lanza si no se puede determinar companyId — createCreditWithFinancialRecord
 * lo requiere y un crédito sin empresa asociada queda huérfano.
 */
export function buildCreditData(
  data: CreditFormInput,
  fallbackCompanyId: string | null | undefined,
  createdAt?: string
): BuiltCreditData {
  const weeklyPayment = Number(data.weeklyPayment) || 0;
  const numberOfPayments = Number(data.numberOfPayments) || 0;
  const totalAmount = weeklyPayment * numberOfPayments;

  const companyId = data.companyId || fallbackCompanyId || null;
  if (!companyId) {
    throw new Error('No se pudo determinar la empresa. Por favor, selecciona una empresa.');
  }

  const now = new Date().toISOString();

  return {
    clientId: data.clientId,
    vehicleId: data.vehicleId,
    startDate: data.startDate,
    totalAmount,
    weeklyPayment,
    numberOfPayments,
    paidAmount: 0,
    remainingBalance: totalAmount,
    status: 'active',
    paymentsMade: 0,
    companyId,
    createdAt: createdAt || now,
    updatedAt: now,
  };
}
