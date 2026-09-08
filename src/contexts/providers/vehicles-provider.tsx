"use client";

/**
 * @fileoverview Wrapper del Data Provider de Supabase.
 * Compatibilidad con las páginas que usan useVehicles().
 */

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useData } from '@/contexts/data-provider-supabase';
import type { Vehicle, MileageLog, VehicleAssignmentLog } from '@/types';

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

export const VehiclesProvider = ({ children }: Props) => {
  const data = useData();

  // La configuración de mantenimiento pertenece a la empresa. Todas las
  // páginas que usan el wrapper useVehicles() reciben el intervalo vigente,
  // aunque el vehículo conserve un valor histórico.
  const vehicles = useMemo(() => {
    const companyIntervals = new Map(
      data.companies
        .filter(company => typeof company.maintenanceInterval === 'number' && company.maintenanceInterval > 0)
        .map(company => [company.id, company.maintenanceInterval as number])
    );

    return data.allVehicles.map(vehicle => {
      const companyInterval = companyIntervals.get(vehicle.companyId || '');
      return companyInterval ? { ...vehicle, maintenanceInterval: companyInterval } : vehicle;
    });
  }, [data.allVehicles, data.companies]);

  const value: VehiclesContextValue = {
    vehicles,
    vehiclesLoading: data.loadingData,
    refreshVehicles: data.refreshData,
    mileageLogs: data.mileageLogs,
    vehicleAssignmentLogs: data.vehicleAssignmentLogs,
    addVehicle: data.addVehicle,
    updateVehicle: ({ id, ...rest }) => data.updateVehicle(id, rest),
    deleteVehicle: data.deleteVehicle,
    addMileageLog: data.addMileageLog,
    updateMileageLog: ({ id, ...rest }) => data.updateMileageLog(id, rest),
    deleteMileageLog: data.deleteMileageLog,
  };

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