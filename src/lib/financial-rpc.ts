import { supabase } from '@/lib/supabase-browser';
import { isJsonObject, toJsonObject } from '@/lib/json-guards';

/** Authoritative financial write gateway. Sensitive fields are validated again in PostgreSQL. */
export async function createFinancialRecord(record: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('create_financial_record', {
    p_record: toJsonObject(record),
  });
  if (error) throw error;
  if (!isJsonObject(data)) throw new Error('La creación del registro financiero devolvió una respuesta inválida.');
  return data;
}

/** Atomic expense gateway: financial record + mileage log + vehicle mileage update. */
export async function createExpenseAtomic(record: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('create_expense_atomic', {
    p_record: toJsonObject(record),
  });
  if (error) throw error;
  if (!isJsonObject(data)) throw new Error('La creación del gasto devolvió una respuesta inválida.');
  return data;
}

/** Updates metadata only. PostgreSQL rejects tenant/accounting fields. */
export async function updateFinancialRecordMetadata(
  id: string,
  patch: Record<string, unknown>,
) {
  const { data, error } = await supabase.rpc('update_financial_record_metadata', {
    p_id: id,
    p_patch: toJsonObject(patch),
  });
  if (error) throw error;
  if (!isJsonObject(data)) throw new Error('La actualización del registro financiero devolvió una respuesta inválida.');
  return data;
}
