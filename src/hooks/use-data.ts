import { useData as useSupabaseData } from '@/contexts/data-provider-supabase';
import { offboardClientWithWriteOff } from '@/lib/client-offboarding';

function getSupabaseErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;

  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>;
    const message = typeof value.message === 'string' ? value.message : '';
    const details = typeof value.details === 'string' ? value.details : '';
    const hint = typeof value.hint === 'string' ? value.hint : '';
    const code = typeof value.code === 'string' ? value.code : '';

    const parts = [message, details, hint].filter(Boolean);
    if (code && parts.length > 0) return `${parts.join(' ')} (código ${code})`;
    if (parts.length > 0) return parts.join(' ');
  }

  if (typeof error === 'string' && error.trim()) return error;
  return 'Error desconocido al guardar el cliente. Revisa los datos e inténtalo nuevamente.';
}

export function useData() {
  const data = useSupabaseData();

  const addClient = async (payload: Parameters<typeof data.addClient>[0]) => {
    try {
      return await data.addClient(payload);
    } catch (error) {
      const message = getSupabaseErrorMessage(error);
      console.error('[Clients] Error al crear cliente:', {
        message,
        error,
        payloadKeys: Object.keys(payload ?? {}),
      });
      throw new Error(message);
    }
  };

  const deleteClient = async (id: string) => {
    return offboardClientWithWriteOff(
      id,
      'Baja de cliente solicitada desde la gestión de clientes. Motivo no especificado en la interfaz actual.',
    );
  };

  const deleteCredit = async (id: string) => {
    await data.cancelCreditWithAdjustment(
      id,
      'Cancelación de crédito solicitada desde la gestión de créditos. Motivo no especificado en la interfaz actual.',
    );
  };

  const deleteCreditWithCleanup = async (id: string) => {
    await data.cancelCreditWithAdjustment(
      id,
      'Cancelación de crédito solicitada desde la gestión de créditos. Se conserva el historial y no se eliminan registros financieros.',
    );
  };

  return {
    ...data,
    addClient,
    deleteClient,
    deleteCredit,
    deleteCreditWithCleanup,
  };
}
