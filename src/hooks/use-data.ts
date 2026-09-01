import { useData as useSupabaseData } from '@/contexts/data-provider-supabase';
import { offboardClientWithWriteOff } from '@/lib/client-offboarding';

export function useData() {
  const data = useSupabaseData();

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
    deleteClient,
    deleteCredit,
    deleteCreditWithCleanup,
  };
}
