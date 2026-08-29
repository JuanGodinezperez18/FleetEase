/**
 * @fileoverview Asignación de un pago a las cuotas pendientes del cronograma.
 *
 * Bug corregido: processCreditPayment solo tomaba LA SIGUIENTE cuota
 * pendiente (`.limit(1)`) y la marcaba 'paid' completa sin importar el
 * monto del pago. Si el crédito tenía cuotas de $1,000 y llegaba un pago
 * de $3,000, el balance total del crédito sí se descontaba correctamente
 * (remaining_balance -= 3000), pero en el cronograma solo se marcaba 1
 * cuota como pagada en vez de 3 -> el cronograma quedaba desincronizado
 * del balance real (ej. 10 pendientes -> debería quedar en 7, quedaba en 9).
 *
 * Esta función reparte el monto del pago sobre las cuotas pendientes en
 * orden (payment_number ascendente): cubre tantas cuotas completas como
 * alcance el monto, y si sobra un remanente que no alcanza para una cuota
 * completa, lo dobla como abono parcial sobre la siguiente cuota (sin
 * marcarla 'paid' todavía, para que un pago futuro la complete).
 */

import type { CreditPaymentSchedule } from '@/types/supabase';

export type PendingSchedule = Pick<
  CreditPaymentSchedule,
  'id' | 'amount' | 'paid_amount' | 'payment_number'
>;

export interface ScheduleAllocationUpdate {
  id: string;
  status: 'paid';
  paid_amount: number;
  paid_date: string;
}

export interface PartialScheduleAllocationUpdate {
  id: string;
  /** Permanece 'pending': el abono no cubrió la cuota completa. */
  paid_amount: number;
}

export interface ScheduleAllocationResult {
  /** Cuotas que quedaron completamente cubiertas por este pago. */
  fullyPaid: ScheduleAllocationUpdate[];
  /** Como máximo una cuota queda con abono parcial (la siguiente sin cubrir). */
  partiallyPaid: PartialScheduleAllocationUpdate[];
  /** Monto del pago que no se pudo aplicar a ninguna cuota (no debería ocurrir si amount <= remaining_balance). */
  unallocatedAmount: number;
}

/**
 * Reparte `paymentAmount` sobre `schedules` (deben venir ya filtradas a
 * status='pending' y ordenadas por payment_number ascendente).
 */
export function allocatePaymentToSchedules(
  schedules: PendingSchedule[],
  paymentAmount: number,
  paidDate: string
): ScheduleAllocationResult {
  const fullyPaid: ScheduleAllocationUpdate[] = [];
  const partiallyPaid: PartialScheduleAllocationUpdate[] = [];
  let remaining = paymentAmount;

  for (const schedule of schedules) {
    if (remaining <= 0) break;

    const alreadyPaidOnThisSchedule = schedule.paid_amount || 0;
    const due = schedule.amount - alreadyPaidOnThisSchedule;
    if (due <= 0) continue;

    if (remaining >= due) {
      fullyPaid.push({
        id: schedule.id,
        status: 'paid',
        paid_amount: schedule.amount,
        paid_date: paidDate,
      });
      remaining -= due;
    } else {
      partiallyPaid.push({
        id: schedule.id,
        paid_amount: alreadyPaidOnThisSchedule + remaining,
      });
      remaining = 0;
    }
  }

  return { fullyPaid, partiallyPaid, unallocatedAmount: remaining };
}
