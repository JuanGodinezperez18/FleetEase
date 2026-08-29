/**
 * @fileoverview Lógica pura de validación y cálculo para pagos de crédito.
 *
 * Extraída de `processCreditPayment` (data-provider-supabase.tsx) para poder
 * probarla sin necesidad de mockear Supabase, React Query ni el contexto de
 * autenticación. El provider debe delegar aquí el cálculo y solo encargarse
 * de la I/O (leer el crédito, escribir el resultado, resolver categoryId).
 *
 * Reglas de negocio cubiertas (ver commit b719a78):
 * - Un crédito solo admite pagos si está 'active'.
 * - El monto debe ser > 0.
 * - El monto no puede exceder remaining_balance (antes se permitía sobrepago).
 * - Al llegar remaining_balance a 0, el crédito se marca 'completed'.
 */

import type { Credit } from '@/types/supabase';

export interface CreditPaymentValidationResult {
  valid: boolean;
  error?: string;
}

export interface CreditPaymentComputation {
  newPaidAmount: number;
  newRemainingBalance: number;
  paymentsMade: number;
  isCompleted: boolean;
}

/**
 * Valida si un pago puede aplicarse a un crédito dado su estado actual.
 * No lanza: devuelve { valid, error } para que el caller decida cómo
 * reportarlo (throw, toast, etc.).
 */
export function validateCreditPayment(
  credit: Pick<Credit, 'status' | 'remaining_balance'>,
  amount: number
): CreditPaymentValidationResult {
  if (credit.status !== 'active') {
    return { valid: false, error: 'El crédito no está activo' };
  }
  if (!(amount > 0)) {
    return { valid: false, error: 'El monto del pago debe ser mayor a 0' };
  }
  if (!Number.isFinite(amount)) {
    return { valid: false, error: 'El monto del pago no es un número válido' };
  }
  if (amount > credit.remaining_balance) {
    return {
      valid: false,
      error: `El pago ($${amount.toFixed(2)}) excede el saldo restante ($${credit.remaining_balance.toFixed(2)}). Registra como máximo el saldo restante.`,
    };
  }
  return { valid: true };
}

/**
 * Calcula el nuevo estado del crédito tras aplicar un pago válido.
 * Asume que `validateCreditPayment` ya pasó — no vuelve a validar.
 */
export function computeCreditPaymentUpdate(
  credit: Pick<Credit, 'paid_amount' | 'remaining_balance' | 'payments_made'>,
  amount: number,
  installmentsCovered: number = 1
): CreditPaymentComputation {
  const newPaidAmount = credit.paid_amount + amount;
  const newRemainingBalance = Math.max(0, credit.remaining_balance - amount);
  const paymentsMade = (credit.payments_made || 0) + installmentsCovered;
  const isCompleted = newRemainingBalance <= 0;

  return { newPaidAmount, newRemainingBalance, paymentsMade, isCompleted };
}
