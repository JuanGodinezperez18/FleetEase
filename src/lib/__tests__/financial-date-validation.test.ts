import { isFinancialDateNotInFuture } from '@/lib/financial-date-validation';

describe('isFinancialDateNotInFuture', () => {
  it('accepts dates before today and today itself', () => {
    expect(isFinancialDateNotInFuture('2026-11-01', '2026-11-02')).toBe(true);
    expect(isFinancialDateNotInFuture('2026-11-02', '2026-11-02')).toBe(true);
  });

  it('rejects dates after today', () => {
    expect(isFinancialDateNotInFuture('2026-11-03', '2026-11-02')).toBe(false);
  });

  it('rejects malformed or impossible calendar dates', () => {
    expect(isFinancialDateNotInFuture('02/11/2026', '2026-11-02')).toBe(false);
    expect(isFinancialDateNotInFuture('2026-02-30', '2026-11-02')).toBe(false);
  });
});
