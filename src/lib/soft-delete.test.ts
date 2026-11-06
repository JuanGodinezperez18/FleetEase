import { softDeleteTenantRecord } from './soft-delete';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
const { supabase } = require('./supabase');

describe('tenant soft delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const query = {
      update: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({
        count: null, error: new Error('new row violates row-level security policy'),
      }).then(resolve),
    };
    supabase.from.mockReturnValue(query);
  });

  it('rejects invisible, missing or already deleted rows instead of reporting success', async () => {
    supabase.rpc.mockResolvedValue({ data: 0, error: null });
    await expect(softDeleteTenantRecord('vehicles', 'vehicle-a', 'company-a')).rejects.toThrow(/No se pudo eliminar/);
  });

  it('confirms a changed row without requesting a representation hidden by SELECT RLS', async () => {
    supabase.rpc.mockResolvedValue({ data: 1, error: null });
    await expect(softDeleteTenantRecord('financial_records', 'record-a', 'company-a')).resolves.toBeUndefined();
    expect(supabase.rpc).toHaveBeenCalledWith('soft_delete_tenant_record', {
      p_table: 'financial_records', p_id: 'record-a', p_company_id: 'company-a',
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('propagates a database permission failure', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: new Error('permission denied') });
    await expect(softDeleteTenantRecord('vehicles', 'v', 'a')).rejects.toThrow('permission denied');
  });

  it('requires an explicit company before attempting a write', async () => {
    await expect(softDeleteTenantRecord('vehicles', 'v', null)).rejects.toThrow(/empresa/);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
