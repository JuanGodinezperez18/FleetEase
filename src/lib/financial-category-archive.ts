import { supabase } from '@/lib/supabase';

export async function archiveFinancialCategory(id: string, companyId: string | null | undefined): Promise<void> {
  if (!companyId) throw new Error('Selecciona una empresa antes de eliminar.');
  const { data, error } = await supabase.rpc('archive_financial_category', {
    p_id: id, p_company_id: companyId,
  });
  if (error) throw error;
  if (data !== 1) throw new Error('No se pudo eliminar: la categoría no existe, ya fue eliminada o no tienes permisos.');
}
