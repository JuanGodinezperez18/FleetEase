"use client";

import React, { createContext, useContext, useMemo, useState, useEffect, useCallback, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vehicleService, mileageLogService, vehicleAssignmentLogService, db } from '@/lib/firestore-services';
import type { Vehicle, MileageLog, VehicleAssignmentLog } from '@/types';
import { logger } from '@/lib/logger';
import { collection, doc, runTransaction, getDocs, query, where, orderBy } from 'firebase/firestore';

interface VehicleInput extends Omit<Vehicle, 'id'> {}

interface VehiclesContextValue {
  vehicles: Vehicle[];
  vehiclesLoading: boolean;
  refreshVehicles: () => Promise<void>;
  mileageLogs: MileageLog[];
  vehicleAssignmentLogs: VehicleAssignmentLog[];
  addVehicle: (data: VehicleInput) => Promise<Vehicle>;
  updateVehicle: (data: Partial<Vehicle> & { id: string }) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
  addMileageLog: (log: Omit<MileageLog, 'id' | 'uid' | 'createdAt'>) => Promise<void>;
  updateMileageLog: (data: Partial<MileageLog> & { id: string }) => Promise<void>;
  deleteMileageLog: (id: string) => Promise<void>;
}

const VehiclesContext = createContext<VehiclesContextValue | undefined>(undefined);

interface Props {
  children: ReactNode;
  companyId: string | null;
  isSuperAdmin: boolean;
}

export const VehiclesProvider = ({ children, companyId, isSuperAdmin }: Props) => {
  const queryClient = useQueryClient();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Vehículos
  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', companyId, isSuperAdmin],
    queryFn: () => {
      if (isSuperAdmin && !companyId) {
        return vehicleService.getAll();
      }
      if (!companyId) return Promise.resolve<Vehicle[]>([]);
      return vehicleService.getAll(
        // filter by companyId when provided
        // vehicleService.getAll accepts optional Query; we use getAll and filter here for simplicity
      ).then(list => list.filter(v => v.companyId === companyId));
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (vehiclesQuery.data) {
      setVehicles(vehiclesQuery.data);
    }
  }, [vehiclesQuery.data]);

  // Mileage logs
  const mileageLogsQuery = useQuery({
    queryKey: ['mileageLogs', companyId, isSuperAdmin],
    queryFn: () => mileageLogService.getAll().then(logs => {
      if (isSuperAdmin && !companyId) return logs;
      if (!companyId) return [];
      return logs.filter(log => (log as any).companyId === companyId);
    }),
    staleTime: 5 * 60 * 1000,
  });

  // Assignment logs
  const assignmentLogsQuery = useQuery({
    queryKey: ['vehicleAssignmentLogs', companyId, isSuperAdmin],
    queryFn: () => vehicleAssignmentLogService.getAll().then(logs => {
      if (isSuperAdmin && !companyId) return logs;
      if (!companyId) return [];
      return logs.filter(log => (log as any).companyId === companyId);
    }),
    staleTime: 5 * 60 * 1000,
  });

  const refreshVehicles = useCallback(async () => {
    try {
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    } catch (error) {
      logger.error('[VehiclesProvider] Error refrescando vehículos', error as Error);
    }
  }, [queryClient]);

  const addVehicle = useMutation({
    mutationFn: (data: VehicleInput) => vehicleService.add(data),
    onSuccess: () => refreshVehicles(),
    onError: (error) => logger.error('[VehiclesProvider] Error al crear vehículo', error as Error),
  });

  const updateVehicle = useMutation({
    mutationFn: (data: Partial<Vehicle> & { id: string }) => vehicleService.update(data.id, data),
    onSuccess: () => refreshVehicles(),
    onError: (error) => logger.error('[VehiclesProvider] Error al actualizar vehículo', error as Error),
  });

  const deleteVehicle = useMutation({
    mutationFn: (id: string) => vehicleService.softDelete(id),
    onSuccess: () => refreshVehicles(),
    onError: (error) => logger.error('[VehiclesProvider] Error al eliminar vehículo', error as Error),
  });

  const addMileageLog = useCallback(
    async (log: Omit<MileageLog, 'id' | 'uid' | 'createdAt'>) => {
      await runTransaction(db, async (transaction) => {
        const vehicleRef = doc(db, 'vehicles', log.vehicleId);
        const vehicleDoc = await transaction.get(vehicleRef);

        if (!vehicleDoc.exists()) {
          throw new Error('El vehículo especificado no existe.');
        }

        const vehicleData = vehicleDoc.data() as Vehicle;
        if (log.mileage < (vehicleData.currentMileage || 0)) {
          throw new Error('El nuevo kilometraje no puede ser menor al actual.');
        }

        const newLogRef = doc(collection(db, 'mileageLogs'));
        const logData: Omit<MileageLog, 'id'> = {
          ...log,
          companyId: vehicleData.companyId,
          createdAt: new Date().toISOString(),
          createdBy: log.createdBy || 'system',
          isDeleted: false,
          source: 'manual',
          kind: 'odometer',
        };
        transaction.set(newLogRef, logData);

        transaction.update(vehicleRef, { currentMileage: log.mileage });
      });

      await queryClient.invalidateQueries({ queryKey: ['mileageLogs'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    [queryClient],
  );

  const updateMileageLog = useMutation({
    mutationFn: (data: Partial<MileageLog> & { id: string }) => mileageLogService.update(data.id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mileageLogs'] });
    },
    onError: (error) => logger.error('[VehiclesProvider] Error al actualizar mileage log', error as Error),
  });

  const deleteMileageLog = useMutation({
    mutationFn: (id: string) => mileageLogService.hardDelete(id),
    onSuccess: async (_, id) => {
      // Recalcular estado del vehículo desde los logs restantes
      await runTransaction(db, async (transaction) => {
        const recordRef = doc(db, 'mileageLogs', id);
        const recordSnap = await transaction.get(recordRef);
        if (!recordSnap.exists()) return;
        const recordData = recordSnap.data() as MileageLog;

        if (recordData.vehicleId) {
          const vehicleRef = doc(db, 'vehicles', recordData.vehicleId);
          const allLogsQuery = query(
            collection(db, 'mileageLogs'),
            where('vehicleId', '==', recordData.vehicleId),
            orderBy('date', 'desc')
          );
          const allLogsSnapshot = await getDocs(allLogsQuery);
          const remainingLogs = allLogsSnapshot.docs
            .map(d => d.data() as MileageLog)
            .filter(l => l.id !== id && !l.isDeleted);

          const lastOdometerLog = remainingLogs.find(l => l.kind === 'odometer' || !l.kind);
          const lastMaintenanceLog = remainingLogs.find(l => l.kind === 'maintenance');

          const updatePayload: Partial<Vehicle> = {
            currentMileage: lastOdometerLog?.mileage || 0,
            lastMaintenanceMileage: lastMaintenanceLog?.mileage || 0,
          };

          const vehicleDoc = await transaction.get(vehicleRef);
          if (vehicleDoc.exists()) {
            transaction.update(vehicleRef, updatePayload);
          }
        }
      });

      await queryClient.invalidateQueries({ queryKey: ['mileageLogs'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (error) => logger.error('[VehiclesProvider] Error al eliminar mileage log', error as Error),
  });

  const value = useMemo(() => ({
    vehicles: vehiclesQuery.data || [],
    vehiclesLoading: vehiclesQuery.isLoading,
    refreshVehicles,
    mileageLogs: mileageLogsQuery.data || [],
    vehicleAssignmentLogs: assignmentLogsQuery.data || [],
    addVehicle: (data: VehicleInput) => addVehicle.mutateAsync(data),
    updateVehicle: (data: Partial<Vehicle> & { id: string }) => updateVehicle.mutateAsync(data),
    deleteVehicle: (id: string) => deleteVehicle.mutateAsync(id),
    addMileageLog,
    updateMileageLog: (data: Partial<MileageLog> & { id: string }) => updateMileageLog.mutateAsync(data),
    deleteMileageLog: (id: string) => deleteMileageLog.mutateAsync(id),
  }), [
    vehiclesQuery.data,
    vehiclesQuery.isLoading,
    refreshVehicles,
    mileageLogsQuery.data,
    assignmentLogsQuery.data,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    addMileageLog,
    updateMileageLog,
    deleteMileageLog,
  ]);

  if (vehiclesQuery.isLoading) return null;

  return (
    <VehiclesContext.Provider value={value}>
      {children}
    </VehiclesContext.Provider>
  );
};

export const useVehicles = () => {
  const ctx = useContext(VehiclesContext);
  if (!ctx) throw new Error('useVehicles debe usarse dentro de VehiclesProvider');
  return ctx;
};
