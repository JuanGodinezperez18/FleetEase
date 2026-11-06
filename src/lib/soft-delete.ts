import { supabase } from '@/lib/supabase';

export async function softDeleteTenantRecord(
  table: 'vehicles' | 'financial_records',
  id: string,
  companyId: string | null | undefined,
): Promise<void> {
  if (!companyId) throw new Error('Selecciona una empresa antes de eliminar.');
  const { error, data } = await supabase.rpc('soft_delete_tenant_record', {
    p_table: table, p_id: id, p_company_id: companyId,
  });
  if (error) throw error;
  if (data !== 1) {
    throw new Error('No se pudo eliminar: el registro no existe, ya fue eliminado o no tienes permisos.');
  }
}
