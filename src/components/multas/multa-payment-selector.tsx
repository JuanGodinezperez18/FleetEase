"use client";

import React, { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Info, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Multa } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MultaPaymentSelectorProps {
  clientId: string | null | undefined;
  multas: Multa[];
  selectedMultaId?: string | null;
  onMultaSelect: (multaId: string | null) => void;
  disabled?: boolean;
}

export function MultaPaymentSelector({
  clientId,
  multas,
  selectedMultaId,
  onMultaSelect,
  disabled = false,
}: MultaPaymentSelectorProps) {
  // Filtrar multas pendientes del cliente seleccionado
  const clientPendingMultas = useMemo(() => {
    if (!clientId) return [];

    return multas.filter(
      (m) =>
        m.clientId === clientId &&
        (m.status === 'pendiente' || m.status === 'en_proceso') &&
        !m.isDeleted
    ).sort((a, b) => new Date(b.fechaInfraccion).getTime() - new Date(a.fechaInfraccion).getTime());
  }, [clientId, multas]);

  // Calcular total adeudado
  const totalAdeudado = useMemo(() => {
    return clientPendingMultas.reduce((sum, m) => sum + m.total, 0);
  }, [clientPendingMultas]);

  // Si no hay cliente seleccionado
  if (!clientId) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Selecciona primero un cliente para ver sus multas pendientes.
        </AlertDescription>
      </Alert>
    );
  }

  // Si el cliente no tiene multas pendientes
  if (clientPendingMultas.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Este cliente no tiene multas pendientes.
        </AlertDescription>
      </Alert>
    );
  }

  // Si tiene solo una multa, mostrar info y auto-seleccionar
  if (clientPendingMultas.length === 1) {
    const multa = clientPendingMultas[0];

    // Auto-seleccionar si no hay selección previa
    if (!selectedMultaId) {
      onMultaSelect(multa.id);
    }

    return (
      <div className="space-y-3">
        <Alert className="border-blue-500">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Multa pendiente automáticamente seleccionada:</p>
              <div className="text-sm space-y-1">
                <p>
                  <span className="font-medium">Folio:</span>{' '}
                  {multa.folio || 'Sin folio'}
                </p>
                <p>
                  <span className="font-medium">Fecha:</span>{' '}
                  {format(new Date(multa.fechaInfraccion), 'PPP', { locale: es })}
                </p>
                <p>
                  <span className="font-medium">Descripción:</span> {multa.descripcion}
                </p>
                <p>
                  <span className="font-medium">Importe:</span>{' '}
                  {formatCurrency(multa.importe)}
                  {(multa.recargos || 0) > 0 && ` + ${formatCurrency(multa.recargos || 0)} recargos`}
                </p>
                <p className="text-lg font-bold text-blue-600">
                  Total: {formatCurrency(multa.total)}
                </p>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Si tiene múltiples multas, mostrar selector
  return (
    <div className="space-y-3">
      <Alert className="border-yellow-500">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span>
              Este cliente tiene <strong>{clientPendingMultas.length} multas pendientes</strong>
            </span>
            <Badge variant="destructive">
              Total: {formatCurrency(totalAdeudado)}
            </Badge>
          </div>
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <label className="text-sm font-medium">Selecciona la multa a pagar:</label>
        <Select
          value={selectedMultaId || ''}
          onValueChange={onMultaSelect}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una multa..." />
          </SelectTrigger>
          <SelectContent>
            {clientPendingMultas.map((multa) => (
              <SelectItem key={multa.id} value={multa.id}>
                <div className="flex items-center justify-between w-full gap-4">
                  <div className="flex-1">
                    <div className="font-medium">
                      {multa.folio ? `Folio: ${multa.folio}` : 'Sin folio'} -{' '}
                      {format(new Date(multa.fechaInfraccion), 'dd/MM/yyyy')}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                      {multa.descripcion}
                    </div>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {formatCurrency(multa.total)}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedMultaId && (
        <div className="p-3 bg-muted rounded-lg space-y-2">
          <p className="text-sm font-semibold">Detalle de la multa seleccionada:</p>
          {(() => {
            const multa = clientPendingMultas.find((m) => m.id === selectedMultaId);
            if (!multa) return null;

            return (
              <div className="text-sm space-y-1">
                <p>
                  <span className="font-medium">Descripción:</span> {multa.descripcion}
                </p>
                <p>
                  <span className="font-medium">Dirección:</span> {multa.direccion}
                </p>
                <p>
                  <span className="font-medium">Importe:</span> {formatCurrency(multa.importe)}
                </p>
                {(multa.recargos || 0) > 0 && (
                  <p>
                    <span className="font-medium">Recargos:</span>{' '}
                    {formatCurrency(multa.recargos || 0)}
                  </p>
                )}
                <p className="text-lg font-bold text-green-600 pt-2 border-t">
                  Total a pagar: {formatCurrency(multa.total)}
                </p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
