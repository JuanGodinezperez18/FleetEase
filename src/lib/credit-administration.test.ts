import { resolveCreditAdministrationCategory } from './credit-administration';
import type { FinancialCategory } from '@/types';

const category = (id: string, companyId?: string): FinancialCategory => ({
  id, companyId, name: 'Administración de Vehículo', type: 'expense',
} as FinancialCategory);

describe('credit administration category', () => {
  it('accepts a global expense category when the company has no override', () => {
    expect(resolveCreditAdministrationCategory([category('global')], 'a')?.id).toBe('global');
  });
  it('prefers the company override over global categories regardless of order', () => {
    expect(resolveCreditAdministrationCategory([category('global'), category('tenant', 'a')], 'a')?.id).toBe('tenant');
  });
  it('never uses another company category', () => {
    expect(resolveCreditAdministrationCategory([category('other', 'b')], 'a')).toBeUndefined();
  });
  it('does not use an income category as an expense', () => {
    expect(resolveCreditAdministrationCategory([{ ...category('wrong', 'a'), type: 'income' }], 'a')).toBeUndefined();
  });
});
