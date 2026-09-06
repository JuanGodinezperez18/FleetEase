import { supabase } from '@/lib/supabase-browser';

export async function createCreditAtomic(credit: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('create_credit_atomic', {
    p_credit: credit,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function processCreditPaymentAtomic(params: {
  companyId: string;
  creditId: string;
  clientId: string;
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  reference?: string;
}) {
  const { data, error } = await supabase.rpc('process_credit_payment_atomic', {
    p_company_id: params.companyId,
    p_credit_id: params.creditId,
    p_client_id: params.clientId,
    p_amount: params.amount,
    p_payment_date: params.paymentDate ?? new Date().toISOString().slice(0, 10),
    p_payment_method: params.paymentMethod ?? null,
    p_reference: params.reference ?? null,
    p_created_by: null,
  });
  if (error) throw error;
  return data;
}
