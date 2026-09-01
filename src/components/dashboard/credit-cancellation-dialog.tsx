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

export type CreditCancellationResult = {
  creditId: string;
  creditReferenceCode: string | null;
  status: string;
  remainingBalance: number;
  vehicleReleased: boolean;
  clientReleased: boolean;
};

type CreditCancellationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  creditReferenceCode?: string | null;
  vehicleLabel?: string | null;
  outstandingBalance: number;
  creditStatus?: string | null;
  onConfirm: (reason: string) => Promise<CreditCancellationResult>;
};

export function CreditCancellationDialog({
  open,
  onOpenChange,
  clientName,
  creditReferenceCode,
  vehicleLabel,
  outstandingBalance,
  creditStatus,
  onConfirm,
}: CreditCancellationDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreditCancellationResult | null>(null);

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
                Cancelar crédito
              </DialogTitle>
              <DialogDescription>
                Cancelar el crédito no elimina el historial. El crédito quedará
                como cancelado, se liberará el vehículo asociado y el saldo
                pendiente se ajustará con trazabilidad financiera.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-lg border p-4 text-sm space-y-2">
                <div className="font-medium">{clientName}</div>
                {creditReferenceCode && (
                  <div className="text-muted-foreground">
                    Referencia: {creditReferenceCode}
                  </div>
                )}
                {vehicleLabel && (
                  <div className="flex justify-between">
                    <span>Vehículo</span>
                    <strong>{vehicleLabel}</strong>
                  </div>
                )}
                {creditStatus && (
                  <div className="flex justify-between">
                    <span>Estado actual</span>
                    <strong className="capitalize">{creditStatus}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Saldo pendiente</span>
                  <strong>{formatCurrency(outstandingBalance)}</strong>
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                El historial de pagos y registros financieros se conserva. No se
                realiza eliminación física de datos.
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="credit-cancellation-reason"
                  className="text-sm font-medium"
                >
                  Motivo de la cancelación{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Textarea
                  id="credit-cancellation-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Ej. Cliente devolvió el vehículo y se cancela el saldo restante..."
                  maxLength={500}
                  disabled={submitting}
                />
                <div className="text-right text-xs text-muted-foreground">
                  {reason.length}/500
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Volver
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirm}
                disabled={!reason.trim() || submitting}
              >
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Cancelar crédito
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Crédito cancelado correctamente</DialogTitle>
              <DialogDescription>
                La operación quedó registrada sin eliminar el historial.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 rounded-lg border p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span>Referencia</span>
                <strong>
                  {result.creditReferenceCode || creditReferenceCode || "—"}
                </strong>
              </div>
              <div className="flex justify-between gap-4">
                <span>Estado</span>
                <strong className="capitalize">{result.status}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span>Saldo al cancelar</span>
                <strong>{formatCurrency(result.remainingBalance)}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span>Vehículo liberado</span>
                <strong>{result.vehicleReleased ? "Sí" : "No"}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span>Cliente liberado</span>
                <strong>{result.clientReleased ? "Sí" : "No"}</strong>
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
