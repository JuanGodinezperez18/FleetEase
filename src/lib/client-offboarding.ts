import { supabase } from "@/lib/supabase";
import type { ClientOffboardingResult } from "@/components/dashboard/client-offboarding-dialog";

export async function offboardClientWithWriteOff(
  clientId: string,
  reason: string,
): Promise<ClientOffboardingResult> {
  const normalizedReason = reason.trim();
  if (!normalizedReason) {
    throw new Error("El motivo de la baja es obligatorio.");
  }

  const { data, error } = await supabase.rpc("offboard_client_with_writeoff", {
    p_client_id: clientId,
    p_reason: normalizedReason,
  });

  if (error) throw error;
  if (!data) throw new Error("La baja del cliente no devolvió información de trazabilidad.");

  return {
    status: data.status,
    clientId: data.client_id,
    clientReferenceCode: data.client_reference_code ?? null,
    writeOffId: data.write_off_id ?? null,
    financialRecordId: data.financial_record_id ?? null,
    financialReferenceCode: data.financial_reference_code ?? null,
    amountWrittenOff: Number(data.amount_written_off ?? 0),
  };
}
