/**
 * Pruebas de la regla financiera del módulo Créditos.
 *
 * Regla canónica:
 * - Crédito otorgado = cartera/financiamiento, no ingreso cobrado.
 * - Pago real de crédito = dinero efectivamente recibido.
 * - El principal otorgado nunca debe inflar ingresos ni utilidad.
 */
import {
  isCreditGranted,
  isCollectedIncome,
  sumIncome,
  sumPayment,
  sumRentalIncome,
  calculateNetProfit,
} from '@/lib/financial-metrics';
import type { FinancialRecord } from '@/types';

const record = (overrides: Partial<FinancialRecord> = {}): FinancialRecord => ({
  id: 'test',
  categoryId: 'cat',
  category: 'Renta',
  type: 'income',
  amount: 1000,
  description: 'test',
  date: '2026-09-14',
  isDeleted: false,
  ...overrides,
});

describe('reglas financieras del módulo Créditos', () => {
  it('identifica Crédito Otorgado por creditGranted=true', () => {
    expect(isCreditGranted(record({ creditGranted: true }))).toBe(true);
    expect(isCreditGranted(record({ creditGranted: false }))).toBe(false);
  });

  it('no considera Crédito Otorgado como ingreso cobrado', () => {
    const granted = record({
      amount: 7200,
      category: 'Crédito Otorgado',
      creditId: 'credit-1',
      creditGranted: true,
      description: 'Crédito Otorgado',
    });

    expect(isCollectedIncome(granted)).toBe(false);
    expect(sumIncome([granted])).toBe(0);
    expect(sumRentalIncome([granted])).toBe(0);
    expect(calculateNetProfit([granted])).toBe(0);
  });

  it('sí considera una renta normal como ingreso cobrado', () => {
    const rent = record({ amount: 1000, category: 'Renta Semanal' });
    expect(isCollectedIncome(rent)).toBe(true);
    expect(sumIncome([rent])).toBe(1000);
    expect(sumRentalIncome([rent])).toBe(1000);
  });

  it('mantiene separado el pago real de crédito', () => {
    const granted = record({ amount: 7200, creditGranted: true, creditId: 'credit-1' });
    const payment = record({
      id: 'payment-1',
      type: 'payment',
      amount: 600,
      creditId: 'credit-1',
      creditPayment: true,
      paymentKind: 'credit_payment',
    });

    expect(sumIncome([granted, payment])).toBe(0);
    expect(sumPayment([granted, payment])).toBe(600);
  });

  it('un pago mayor a una cuota cuenta por el importe realmente cobrado', () => {
    const payment = record({
      type: 'payment',
      amount: 2500,
      creditId: 'credit-1',
      creditPayment: true,
      paymentKind: 'credit_payment',
    });

    expect(sumPayment([payment])).toBe(2500);
  });
});
