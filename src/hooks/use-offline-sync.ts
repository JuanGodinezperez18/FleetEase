"use client";

import { useEffect, useState } from 'react';
import { useNetworkState } from '@uidotdev/usehooks';
import { useLocalStorage } from './use-local-storage';
import { toast } from 'sonner';

// Define la estructura de una operación pendiente
export interface PendingOperation {
  id: string; // ID único para la operación
  type: 'mutation'; // Por ahora solo manejamos mutaciones
  payload: {
    entity: string; // ej: 'vehicle', 'client'
    operation: 'add' | 'update' | 'delete' | 'softDelete';
    data: any;
  };
  timestamp: number;
  retries: number;
  execute: () => Promise<any>; // La función real que se ejecutará
}

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(true);
  const { online: networkOnline } = useNetworkState();
  const [pendingOperations, setPendingOperations] = useLocalStorage<PendingOperation[]>('pending-ops', []);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Sincroniza el estado de la red solo en el cliente
    setIsOnline(networkOnline === undefined ? true : networkOnline);
  }, [networkOnline]);

  // Función para ejecutar y limpiar la cola de operaciones pendientes
  const syncPendingOperations = async () => {
    if (isSyncing || pendingOperations.length === 0) return;

    setIsSyncing(true);
    const toastId = toast.loading(`Sincronizando ${pendingOperations.length} operación(es) pendiente(s)...`);

    const results = await Promise.allSettled(
      pendingOperations.map(op => op.execute())
    );

    const failedOps = results.reduce<PendingOperation[]>((acc, result, index) => {
      if (result.status === 'rejected') {
        console.error(`Falló la operación sincronizada [${pendingOperations[index].id}]:`, result.reason);
        acc.push({ ...pendingOperations[index], retries: pendingOperations[index].retries + 1 });
      }
      return acc;
    }, []);

    if (failedOps.length > 0) {
      toast.error(`${failedOps.length} operaciones no pudieron sincronizarse.`, { id: toastId });
      // Mantener las operaciones fallidas para reintentar después
      setPendingOperations(failedOps.filter(op => op.retries < 3)); // Limitar reintentos
    } else {
      toast.success("Sincronización completada.", { id: toastId });
      setPendingOperations([]); // Limpiar cola si todo fue exitoso
    }

    setIsSyncing(false);
  };

  // Efecto para sincronizar cuando se recupera la conexión
  useEffect(() => {
    if (isOnline && pendingOperations.length > 0) {
      syncPendingOperations();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Función para encolar o ejecutar una operación
  const queueOperation = async (operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retries'>) => {
    if (!isOnline) {
      const opWithMeta: PendingOperation = {
        ...operation,
        id: `op_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        retries: 0,
      };
      setPendingOperations(prev => [...prev, opWithMeta]);
      toast.info('Modo sin conexión: La operación se sincronizará cuando vuelvas a estar en línea.');
      // Devuelve una promesa que se resolverá con éxito para la actualización optimista
      return Promise.resolve();
    } else {
      // Si está en línea, ejecuta la operación inmediatamente
      return operation.execute();
    }
  };

  return { queueOperation, isOnline, isSyncing, pendingCount: pendingOperations.length };
};
