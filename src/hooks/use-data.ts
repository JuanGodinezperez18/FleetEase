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

  return {
    ...data,
    deleteClient,
  };
}
