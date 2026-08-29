/**
 * @fileoverview Tests del módulo de pagos de crédito.
 *
 * Cubre las reglas corregidas en el commit b719a78: un crédito solo admite
 * pagos si está activo, el monto debe ser positivo, no puede exceder el
 * saldo restante, y el crédito se completa al llegar el saldo a 0.
 */
import {
  validateCreditPayment,
  computeCreditPaymentUpdate,
} from '@/lib/credit-payments';
import type { Credit } from '@/types/supabase';

const makeCredit = (overrides: Partial<Credit> = {}): Credit => ({
  id: 'credit-1',
  client_id: 'client-1',
  vehicle_id: 'vehicle-1',
  total_amount: 10000,
  paid_amount: 2000,
  remaining_balance: 8000,
  weekly_payment: 500,
  number_of_payments: 20,
  payments_made: 4,
  start_date: '2026-01-01',
  status: 'active',
  is_deleted: false,
  created_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('credit-payments', () => {
  describe('validateCreditPayment', () => {
    it('rechaza pagos sobre un crédito no activo', () => {
      const credit = makeCredit({ status: 'completed' });
      const result = validateCreditPayment(credit, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/no está activo/i);
    });

    it('rechaza montos en 0', () => {
      const credit = makeCredit();
      const result = validateCreditPayment(credit, 0);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/mayor a 0/i);
    });

    it('rechaza montos negativos', () => {
      const credit = makeCredit();
      const result = validateCreditPayment(credit, -50);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/mayor a 0/i);
    });

    it('rechaza montos no finitos (NaN/Infinity)', () => {
      const credit = makeCredit();
      expect(validateCreditPayment(credit, NaN).valid).toBe(false);
      expect(validateCreditPayment(credit, Infinity).valid).toBe(false);
    });

    it('rechaza un pago que excede el saldo restante (sobrepago)', () => {
      const credit = makeCredit({ remaining_balance: 500 });
      const result = validateCreditPayment(credit, 501);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/excede el saldo restante/i);
      expect(result.error).toContain('500.00');
      expect(result.error).toContain('501.00');
    });

    it('acepta un pago que iguala exactamente el saldo restante', () => {
      const credit = makeCredit({ remaining_balance: 500 });
      const result = validateCreditPayment(credit, 500);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('acepta un pago parcial válido sobre un crédito activo', () => {
      const credit = makeCredit({ remaining_balance: 8000 });
      const result = validateCreditPayment(credit, 500);
      expect(result.valid).toBe(true);
    });
  });

  describe('computeCreditPaymentUpdate', () => {
    it('acumula paid_amount y descuenta remaining_balance', () => {
      const credit = makeCredit({ paid_amount: 2000, remaining_balance: 8000, payments_made: 4 });
      const result = computeCreditPaymentUpdate(credit, 500);
      expect(result.newPaidAmount).toBe(2500);
      expect(result.newRemainingBalance).toBe(7500);
      expect(result.paymentsMade).toBe(5);
      expect(result.isCompleted).toBe(false);
    });

    it('marca el crédito como completado cuando el saldo llega exactamente a 0', () => {
      const credit = makeCredit({ paid_amount: 9500, remaining_balance: 500, payments_made: 19 });
      const result = computeCreditPaymentUpdate(credit, 500);
      expect(result.newRemainingBalance).toBe(0);
      expect(result.isCompleted).toBe(true);
      expect(result.paymentsMade).toBe(20);
    });

    it('nunca deja remaining_balance negativo (clamp a 0)', () => {
      // Este caso no debería ocurrir si validateCreditPayment corrió antes,
      // pero el cálculo por sí mismo debe ser defensivo.
      const credit = makeCredit({ paid_amount: 9900, remaining_balance: 100, payments_made: 19 });
      const result = computeCreditPaymentUpdate(credit, 100);
      expect(result.newRemainingBalance).toBe(0);
      expect(result.isCompleted).toBe(true);
    });

    it('incrementa payments_made incluso si payments_made venía undefined/0', () => {
      const credit = makeCredit({ payments_made: 0 });
      const result = computeCreditPaymentUpdate(credit, 500);
      expect(result.paymentsMade).toBe(1);
    });

    it('suma installmentsCovered en vez de +1 fijo cuando el pago cubre varias cuotas (sobrepago)', () => {
      // Caso reportado: pago de $3,000 contra cuotas de $1,000 debe sumar
      // 3 al contador de cuotas pagadas, no 1.
      const credit = makeCredit({ payments_made: 4, paid_amount: 4000, remaining_balance: 6000 });
      const result = computeCreditPaymentUpdate(credit, 3000, 3);
      expect(result.paymentsMade).toBe(7);
    });

    it('con installmentsCovered=0 (pago parcial que no completa ninguna cuota) no incrementa el contador', () => {
      const credit = makeCredit({ payments_made: 4 });
      const result = computeCreditPaymentUpdate(credit, 400, 0);
      expect(result.paymentsMade).toBe(4);
    });

    it('no altera el objeto crédito original (pura, sin side effects)', () => {
      const credit = makeCredit({ paid_amount: 2000, remaining_balance: 8000 });
      const snapshot = { ...credit };
      computeCreditPaymentUpdate(credit, 500);
      expect(credit).toEqual(snapshot);
    });
  });

  describe('validación + cómputo en conjunto (flujo completo)', () => {
    it('un pago válido pasa validación y produce el cómputo esperado', () => {
      const credit = makeCredit({ remaining_balance: 1000, paid_amount: 9000, payments_made: 18 });
      const validation = validateCreditPayment(credit, 1000);
      expect(validation.valid).toBe(true);

      const result = computeCreditPaymentUpdate(credit, 1000);
      expect(result.newRemainingBalance).toBe(0);
      expect(result.isCompleted).toBe(true);
      expect(result.newPaidAmount).toBe(10000);
    });
  });
});
