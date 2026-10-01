import { supabase } from '@/lib/supabase-browser';
import { isJsonObject, toJsonObject } from '@/lib/json-guards';

/**
 * create_credit_atomic recibe un objeto JSON con claves del dominio (camelCase),
 * pero los mapeadores de persistencia producen snake_case para Supabase.
 *
 * Normalizamos aquí para que todas las rutas que reutilizan createCreditAtomic
 * envíen el contrato que espera la función RPC, sin cambiar el mapper global.
 */
function normalizeCreditRpcPayload(credit: Record<string, unknown>): Record<string, unknown> {
  const keyMap: Record<string, string> = {
    client_id: 'clientId',
    vehicle_id: 'vehicleId',
    company_id: 'companyId',
    total_amount: 'totalAmount',
    paid_amount: 'paidAmount',
    remaining_balance: 'remainingBalance',
    weekly_payment: 'weeklyPayment',
    number_of_payments: 'numberOfPayments',
    payments_made: 'paymentsMade',
    start_date: 'startDate',
    end_date: 'endDate',
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    is_deleted: 'isDeleted',
  };

  return Object.fromEntries(
    Object.entries(credit).map(([key, value]) => [keyMap[key] ?? key, value])
  );
}

type SupabaseRpcError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

function normalizeRpcError(error: unknown): Error {
  if (error instanceof Error) return error;

  if (error && typeof error === 'object') {
    const rpcError = error as SupabaseRpcError;
    const parts = [
      rpcError.message,
      rpcError.code ? `Código: ${rpcError.code}` : undefined,
      rpcError.details ? `Detalle: ${rpcError.details}` : undefined,
      rpcError.hint ? `Sugerencia: ${rpcError.hint}` : undefined,
    ].filter(Boolean);

    if (parts.length > 0) return new Error(parts.join(' · '));
  }

  return new Error('No fue posible crear el crédito. Revisa los datos e inténtalo nuevamente.');
}

export async function createCreditAtomic(credit: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('create_credit_atomic', {
    p_credit: toJsonObject(normalizeCreditRpcPayload(credit)),
  });

  if (error) {
    const normalizedError = normalizeRpcError(error);
    console.error('[Credits] create_credit_atomic failed', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw normalizedError;
  }

  if (!isJsonObject(data)) throw new Error('La creación del crédito devolvió una respuesta inválida.');
  return data;
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
    ...(params.paymentMethod !== undefined ? { p_payment_method: params.paymentMethod } : {}),
    ...(params.reference !== undefined ? { p_reference: params.reference } : {}),
  });
  if (error) throw normalizeRpcError(error);
  return data;
}
