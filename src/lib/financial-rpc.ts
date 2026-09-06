import { supabase } from '@/lib/supabase-browser';

/** Authoritative financial write gateway. Sensitive fields are validated again in PostgreSQL. */
export async function createFinancialRecord(record: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('create_financial_record', {
    p_record: record,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

/** Updates metadata only. PostgreSQL rejects tenant/accounting fields. */
export async function updateFinancialRecordMetadata(
  id: string,
  patch: Record<string, unknown>,
) {
  const { data, error } = await supabase.rpc('update_financial_record_metadata', {
    p_id: id,
    p_patch: patch,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}
