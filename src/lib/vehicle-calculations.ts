
"use client";

import type { Vehicle, VehicleWithMileage, MileageLog } from '@/types';
import { infallibleNormalizeDate } from './date-utils';

const MAINTENANCE_INTERVAL = 10000;

export const calculateVehicleMileageInfo = (
  vehicle: Vehicle,
  mileageLogs: MileageLog[]
): VehicleWithMileage => {
  const currentMileage = vehicle.currentMileage || 0;
  const lastMaintMileage = vehicle.lastMaintenanceMileage || 0;
  const kmToNextMaintenance = (lastMaintMileage + MAINTENANCE_INTERVAL) - currentMileage;

  return {
    ...vehicle,
    displayCurrentMileage: `${currentMileage.toLocaleString()} km`,
    displayLastMaintMileage: `${lastMaintMileage.toLocaleString()} km`,
    displayNextMaintDueAt: `${(lastMaintMileage + MAINTENANCE_INTERVAL).toLocaleString()} km`,
    displayKmToNextMaintenance: kmToNextMaintenance > 0
      ? `${kmToNextMaintenance.toLocaleString()} km restantes`
      : `${Math.abs(kmToNextMaintenance).toLocaleString()} km vencido`,
    kmToNextMaintenance: kmToNextMaintenance,
    dailyAveragekm: 0, // Se calcula en otro lugar si se necesita
  };
};
