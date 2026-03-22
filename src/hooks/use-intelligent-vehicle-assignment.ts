"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { VehicleAssignmentLog } from '@/types';

export interface IntelligentAssignmentResult {
  assignmentDate: string | null;
  isDateLocked: boolean;
  assignmentHistory: VehicleAssignmentLog[];
  isCurrentAssignment: boolean;
  isReassignment: boolean;
  previousAssignmentsCount: number;
}

/**
 * Hook para manejar la lógica inteligente del campo de fecha de asignación de vehículo
 *
 * Detecta:
 * - Si ya existe una asignación actual (bloquea el campo)
 * - Si es una reasignación del mismo vehículo al mismo cliente
 * - Historial completo de asignaciones
 *
 * @param clientId - ID del cliente (puede ser null si es nuevo)
 * @param selectedVehicleId - ID del vehículo seleccionado
 * @param vehicleAssignmentLogs - Array de logs de asignación
 * @param currentAssignmentDate - Fecha actual de asignación del cliente (si existe)
 */
export function useIntelligentVehicleAssignment(
  clientId: string | undefined | null,
  selectedVehicleId: string | undefined | null,
  vehicleAssignmentLogs: VehicleAssignmentLog[],
  currentAssignmentDate?: string | null
): IntelligentAssignmentResult {
  const [assignmentDate, setAssignmentDate] = useState<string | null>(currentAssignmentDate || null);
  const [isDateLocked, setIsDateLocked] = useState(false);
  const [assignmentHistory, setAssignmentHistory] = useState<VehicleAssignmentLog[]>([]);
  const [isCurrentAssignment, setIsCurrentAssignment] = useState(false);
  const [isReassignment, setIsReassignment] = useState(false);
  const [hasShownToast, setHasShownToast] = useState(false);

  useEffect(() => {
    // Reset al cambiar vehículo o cliente
    if (!selectedVehicleId) {
      setAssignmentDate(null);
      setIsDateLocked(false);
      setAssignmentHistory([]);
      setIsCurrentAssignment(false);
      setIsReassignment(false);
      setHasShownToast(false);
      return;
    }

    // Si no hay clientId (cliente nuevo), permitir fecha manual
    if (!clientId) {
      setAssignmentDate(null);
      setIsDateLocked(false);
      setAssignmentHistory([]);
      setIsCurrentAssignment(false);
      setIsReassignment(false);
      setHasShownToast(false);
      return;
    }

    // Buscar historial de asignaciones de ESTE cliente con ESTE vehículo
    const history = vehicleAssignmentLogs
      .filter((log) => log.vehicleId === selectedVehicleId && log.clientId === clientId)
      .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());

    setAssignmentHistory(history);
    
    // Caso 1: No hay historial - Primera asignación
    if (history.length === 0) {
      setAssignmentDate(currentAssignmentDate || null);
      setIsDateLocked(false);
      setIsCurrentAssignment(false);
      setIsReassignment(false);
    } else {
      // Caso 2: Existe historial - Analizar la situación
      const currentLog = history.find((h) => !h.unassignedAt);

      if (currentLog) {
        // Es la asignación actual (activa en este momento)
        setAssignmentDate(currentLog.assignedAt);
        setIsDateLocked(true); // Bloquear para evitar modificar fecha histórica
        setIsCurrentAssignment(true);
        setIsReassignment(false);
      } else {
        // Es una REASIGNACIÓN (ya estuvo asignado antes pero ahora está desasignado)
        setAssignmentDate(null);
        setIsDateLocked(false);
        setIsCurrentAssignment(false);
        setIsReassignment(true);

        // Mostrar alerta al usuario (solo una vez por cambio de vehículo)
        if (!hasShownToast) {
          toast.info('Reasignación detectada', {
            description: `Este vehículo ya fue asignado a este cliente ${history.length} vez/veces anteriormente.`,
            duration: 6000,
          });
          setHasShownToast(true);
        }
      }
    }
  }, [clientId, selectedVehicleId, vehicleAssignmentLogs, currentAssignmentDate, hasShownToast]);

  return {
    assignmentDate,
    isDateLocked,
    assignmentHistory,
    isCurrentAssignment,
    isReassignment,
    previousAssignmentsCount: assignmentHistory.length,
  };
}
