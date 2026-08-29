/**
 * @fileoverview Tests de allocatePaymentToSchedules.
 *
 * Cubre el bug reportado: un crédito con cuotas de $1,000 y 10 pendientes,
 * al recibir un pago de $3,000, debía terminar con 7 pendientes (3 cuotas
 * marcadas como pagadas), no con 9 (solo 1 marcada, aunque el balance
 * total sí se hubiera descontado correctamente).
 */
import { allocatePaymentToSchedules } from '@/lib/credit-schedule-allocation';
import type { PendingSchedule } from '@/lib/credit-schedule-allocation';

const PAID_DATE = '2026-08-29T00:00:00.000Z';

const makePending = (count: number, amount = 1000): PendingSchedule[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `sched-${i + 1}`,
    amount,
    paid_amount: 0,
    payment_number: i + 1,
  }));

describe('allocatePaymentToSchedules', () => {
  it('caso reportado: 10 cuotas de $1,000 pendientes + pago de $3,000 -> 3 marcadas pagadas, quedan 7', () => {
    const schedules = makePending(10, 1000);
    const result = allocatePaymentToSchedules(schedules, 3000, PAID_DATE);

    expect(result.fullyPaid).toHaveLength(3);
    expect(result.fullyPaid.map(u => u.id)).toEqual(['sched-1', 'sched-2', 'sched-3']);
    expect(result.partiallyPaid).toHaveLength(0);
    expect(result.unallocatedAmount).toBe(0);
    // Las 7 restantes (sched-4..sched-10) no aparecen en ningún update,
    // es decir siguen 'pending' sin tocar - simulando "quedan 7".
  });

  it('un pago que cubre exactamente 1 cuota marca solo esa una', () => {
    const schedules = makePending(5, 1000);
    const result = allocatePaymentToSchedules(schedules, 1000, PAID_DATE);
    expect(result.fullyPaid).toHaveLength(1);
    expect(result.fullyPaid[0].id).toBe('sched-1');
  });

  it('marca cada cuota totalmente pagada con su propio monto (amount), no con el monto del pago', () => {
    const schedules = makePending(5, 1000);
    const result = allocatePaymentToSchedules(schedules, 2000, PAID_DATE);
    expect(result.fullyPaid).toEqual([
      { id: 'sched-1', status: 'paid', paid_amount: 1000, paid_date: PAID_DATE },
      { id: 'sched-2', status: 'paid', paid_amount: 1000, paid_date: PAID_DATE },
    ]);
  });

  it('un pago que no alcanza para 1 cuota completa deja un abono parcial (pending, no paid)', () => {
    const schedules = makePending(5, 1000);
    const result = allocatePaymentToSchedules(schedules, 400, PAID_DATE);
    expect(result.fullyPaid).toHaveLength(0);
    expect(result.partiallyPaid).toEqual([{ id: 'sched-1', paid_amount: 400 }]);
  });

  it('un pago que cubre 2 completas + remanente parcial en la 3ra', () => {
    const schedules = makePending(5, 1000);
    const result = allocatePaymentToSchedules(schedules, 2400, PAID_DATE);
    expect(result.fullyPaid).toHaveLength(2);
    expect(result.partiallyPaid).toEqual([{ id: 'sched-3', paid_amount: 400 }]);
  });

  it('respeta un abono parcial previo en la primera cuota pendiente', () => {
    const schedules: PendingSchedule[] = [
      { id: 'sched-1', amount: 1000, paid_amount: 600, payment_number: 1 },
      { id: 'sched-2', amount: 1000, paid_amount: 0, payment_number: 2 },
    ];
    // Faltan 400 para completar sched-1; con un pago de 500 debe completar
    // sched-1 (usa 400) y dejar 100 de abono parcial en sched-2.
    const result = allocatePaymentToSchedules(schedules, 500, PAID_DATE);
    expect(result.fullyPaid).toEqual([{ id: 'sched-1', status: 'paid', paid_amount: 1000, paid_date: PAID_DATE }]);
    expect(result.partiallyPaid).toEqual([{ id: 'sched-2', paid_amount: 100 }]);
  });

  it('no marca nada si no hay cuotas pendientes (lista vacía)', () => {
    const result = allocatePaymentToSchedules([], 1000, PAID_DATE);
    expect(result.fullyPaid).toHaveLength(0);
    expect(result.partiallyPaid).toHaveLength(0);
    expect(result.unallocatedAmount).toBe(1000);
  });

  it('un pago que excede el total de todas las cuotas pendientes deja el sobrante en unallocatedAmount', () => {
    const schedules = makePending(2, 1000); // total 2000
    const result = allocatePaymentToSchedules(schedules, 2500, PAID_DATE);
    expect(result.fullyPaid).toHaveLength(2);
    expect(result.unallocatedAmount).toBe(500);
  });

  it('procesa las cuotas en orden ascendente de payment_number tal como vienen ordenadas', () => {
    const schedules = makePending(4, 1000);
    const result = allocatePaymentToSchedules(schedules, 3000, PAID_DATE);
    expect(result.fullyPaid.map(u => u.id)).toEqual(['sched-1', 'sched-2', 'sched-3']);
  });
});
