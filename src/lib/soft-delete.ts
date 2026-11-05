import { supabase } from '@/lib/supabase';

export async function softDeleteTenantRecord(
  table: 'vehicles' | 'financial_records',
  id: string,
  companyId: string | null | undefined,
): Promise<void> {
  if (!companyId) throw new Error('Selecciona una empresa antes de eliminar.');
  const { error, count } = await supabase.from(table)
    .update({ is_deleted: true }, { count: 'exact' })
    .eq('id', id)
    .eq('company_id', companyId)
    .eq('is_deleted', false);
  if (error) throw error;
  if (count !== 1) {
    throw new Error('No se pudo eliminar: el registro no existe, ya fue eliminado o no tienes permisos.');
  }
}
