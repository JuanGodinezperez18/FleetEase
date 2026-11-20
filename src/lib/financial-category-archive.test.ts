import { archiveFinancialCategory } from './financial-category-archive';
import { supabase } from './supabase';
jest.mock('@/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));
const rpc = supabase.rpc as jest.Mock;

describe('category archive confirmation', () => {
  beforeEach(() => jest.clearAllMocks());
  it('requires an explicit tenant before any write', async () => {
    await expect(archiveFinancialCategory('category', null)).rejects.toThrow(/empresa/);
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([0, null, 2])('does not report success for %s changed rows', async count => {
    rpc.mockResolvedValue({ data: count, error: null });
    await expect(archiveFinancialCategory('category', 'company')).rejects.toThrow(/No se pudo eliminar/);
  });
  it('uses the scoped atomic archive and requires exactly one changed row', async () => {
    rpc.mockResolvedValue({ data: 1, error: null });
    await expect(archiveFinancialCategory('category', 'company')).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('archive_financial_category', { p_id: 'category', p_company_id: 'company' });
  });
  it('propagates protected-category failures', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('La categoría tiene movimientos') });
    await expect(archiveFinancialCategory('category', 'company')).rejects.toThrow(/movimientos/);
  });
});
