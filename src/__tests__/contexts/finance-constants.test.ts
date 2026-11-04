import { isPartnerPaymentCategory } from '@/contexts/finance-constants';

describe('financial category semantics', () => {
  it('identifies partner payments without relying on a tenant-specific ID', () => {
    expect(isPartnerPaymentCategory({ type: 'payment', affects: 'partner_balance' })).toBe(true);
  });

  it('does not treat partner expenses as partner payment categories', () => {
    expect(isPartnerPaymentCategory({ type: 'expense', affects: 'partner_balance' })).toBe(false);
  });

  it('does not classify client payments as partner payments', () => {
    expect(isPartnerPaymentCategory({ type: 'payment', affects: 'client_balance' })).toBe(false);
  });

  it('handles missing categories safely', () => {
    expect(isPartnerPaymentCategory(undefined)).toBe(false);
    expect(isPartnerPaymentCategory(null)).toBe(false);
  });
});
