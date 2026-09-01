"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

export type ClientOffboardingResult = {
  status: string;
  clientId: string;
  clientReferenceCode: string | null;
  writeOffId: string | null;
  financialRecordId: string | null;
  financialReferenceCode: string | null;
  amountWrittenOff: number;
};

type ClientOffboardingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  clientReferenceCode?: string | null;
  outstandingBalance: number;
  onConfirm: (reason: string) => Promise<ClientOffboardingResult>;
};

export function ClientOffboardingDialog({
  open,
  onOpenChange,
  clientName,
  clientReferenceCode,
  outstandingBalance,
  onConfirm,
}: ClientOffboardingDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ClientOffboardingResult | null>(null);

  useEffect(() => {
    if (!open) {
      setReason("");
      setSubmitting(false);
      setResult(null);
    }
  }, [open]);

  const handleConfirm = async () => {
    const normalizedReason = reason.trim();
    if (!normalizedReason || submitting) return;

    setSubmitting(true);
    try {
      const response = await onConfirm(normalizedReason);
      setResult(response);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={submitting ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {!result ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Dar de baja al cliente
              </DialogTitle>
              <DialogDescription>
                Esta operación no elimina el historial. El cliente quedará inactivo y cualquier saldo pendiente se registrará como pérdida por incobrable.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border p-4 text-sm">
                <div className="font-medium">{clientName}</div>
                {clientReferenceCode && (
                  <div className="text-muted-foreground">Referencia: {clientReferenceCode}</div>
                )}
                <div className="mt-2 flex justify-between">
                  <span>Saldo pendiente</span>
                  <strong>{formatCurrency(outstandingBalance)}</strong>
                </div>
              </div>

              {outstandingBalance > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                  Se generará automáticamente un registro financiero de pérdida por <strong>{formatCurrency(outstandingBalance)}</strong> y quedará vinculado al expediente del cliente.
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="client-offboarding-reason" className="text-sm font-medium">
                  Motivo de la baja <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="client-offboarding-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Ej. Cliente dejó de operar y la deuda restante se considera incobrable..."
                  maxLength={500}
                  disabled={submitting}
                />
                <div className="text-right text-xs text-muted-foreground">{reason.length}/500</div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={!reason.trim() || submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Dar de baja y registrar pérdida
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Cliente dado de baja correctamente</DialogTitle>
              <DialogDescription>
                La operación quedó registrada sin eliminar el historial financiero.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-lg border p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span>Cliente</span>
                <strong>{result.clientReferenceCode || clientReferenceCode || "—"}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span>Pérdida registrada</span>
                <strong>{formatCurrency(result.amountWrittenOff)}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span>Registro financiero</span>
                <strong>{result.financialReferenceCode || "—"}</strong>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
