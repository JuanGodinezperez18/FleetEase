import { softDeleteTenantRecord } from './soft-delete';

jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
const { supabase } = require('./supabase');

describe('tenant soft delete', () => {
  function prepare(result: unknown) {
    const filters: Record<string, unknown> = {};
    const builder: { update: jest.Mock; eq: jest.Mock; then: (resolve: (value: unknown) => unknown) => Promise<unknown> } = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn((key, value) => { filters[key] = value; return builder; }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    };
    supabase.from.mockReturnValue(builder);
    return { filters, builder };
  }

  it('rejects invisible, missing or already deleted rows instead of reporting success', async () => {
    prepare({ count: 0, error: null });
    await expect(softDeleteTenantRecord('vehicles', 'vehicle-a', 'company-a')).rejects.toThrow(/No se pudo eliminar/);
  });

  it('confirms a changed row without requesting a representation hidden by SELECT RLS', async () => {
    const { filters, builder } = prepare({ count: 1, error: null });
    await expect(softDeleteTenantRecord('financial_records', 'record-a', 'company-a')).resolves.toBeUndefined();
    expect(filters).toEqual({ id: 'record-a', company_id: 'company-a', is_deleted: false });
    expect(builder.update).toHaveBeenCalledWith({ is_deleted: true }, { count: 'exact' });
  });

  it('propagates a database permission failure', async () => {
    prepare({ count: null, error: new Error('permission denied') });
    await expect(softDeleteTenantRecord('vehicles', 'v', 'a')).rejects.toThrow('permission denied');
  });

  it('requires an explicit company before attempting a write', async () => {
    supabase.from.mockClear();
    await expect(softDeleteTenantRecord('vehicles', 'v', null)).rejects.toThrow(/empresa/);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
