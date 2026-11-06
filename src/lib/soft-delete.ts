import { supabase } from '@/lib/supabase';

type SoftDeleteClient = {
  rpc: (name: 'soft_delete_tenant_record', args: {
    p_table: 'vehicles' | 'financial_records'; p_id: string; p_company_id: string;
  }) => PromiseLike<{ data: number | null; error: unknown }>;
};

export async function softDeleteTenantRecord(
  table: 'vehicles' | 'financial_records',
  id: string,
  companyId: string | null | undefined,
): Promise<void> {
  if (!companyId) throw new Error('Selecciona una empresa antes de eliminar.');
  const { error, data } = await (supabase as unknown as SoftDeleteClient).rpc('soft_delete_tenant_record', {
    p_table: table, p_id: id, p_company_id: companyId,
  });
  if (error) throw error;
  if (data !== 1) {
    throw new Error('No se pudo eliminar: el registro no existe, ya fue eliminado o no tienes permisos.');
  }
}
