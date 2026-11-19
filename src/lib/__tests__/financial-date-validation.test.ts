import { isFinancialDateNotInFuture } from '@/lib/financial-date-validation';

describe('isFinancialDateNotInFuture', () => {
  afterEach(() => jest.useRealTimers());

  it('uses Monterrey midnight when the browser calendar is already on the next day', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-19T05:59:59Z'));
    expect(isFinancialDateNotInFuture('2026-11-18')).toBe(true);
    expect(isFinancialDateNotInFuture('2026-11-19')).toBe(false);
    jest.setSystemTime(new Date('2026-11-19T06:00:00Z'));
    expect(isFinancialDateNotInFuture('2026-11-19')).toBe(true);
    expect(isFinancialDateNotInFuture('2026-11-20')).toBe(false);
  });

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
