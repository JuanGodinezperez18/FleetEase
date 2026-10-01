import { supabase } from "@/lib/supabase";
import type { ClientOffboardingResult } from "@/components/dashboard/client-offboarding-dialog";
import { isJsonObject } from "@/lib/json-guards";

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
  if (!isJsonObject(data)) throw new Error("La baja del cliente no devolvió información de trazabilidad.");

  const status = data.status;
  const returnedClientId = data.client_id;
  if (typeof status !== "string" || typeof returnedClientId !== "string") {
    throw new Error("La baja del cliente devolvió información de trazabilidad inválida.");
  }

  return {
    status,
    clientId: returnedClientId,
    clientReferenceCode: typeof data.client_reference_code === "string" ? data.client_reference_code : null,
    writeOffId: typeof data.write_off_id === "string" ? data.write_off_id : null,
    financialRecordId: typeof data.financial_record_id === "string" ? data.financial_record_id : null,
    financialReferenceCode: typeof data.financial_reference_code === "string" ? data.financial_reference_code : null,
    amountWrittenOff: Number(data.amount_written_off ?? 0),
  };
}
