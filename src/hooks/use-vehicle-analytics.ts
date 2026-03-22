"use client";

import { useMemo, useRef, useState, useEffect } from 'react';
import type { Vehicle, FinancialRecord, VehicleAssignmentLog } from '@/types';
import { infallibleNormalizeDate } from '@/lib/date-utils';
import { differenceInDays } from 'date-fns';

const MAINTENANCE_INTERVAL_KM = 10000;

export type VehicleMetric = {
  vehicleId: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number; // Percentage
  utilizationRate: number; // Percentage of time assigned
  maintenanceScore: number; // 0-100, 100 is best
  documentScore: number; // 0-100, 100 is complete
  performanceRating: 'Excelente' | 'Bueno' | 'Promedio' | 'Pobre' | 'Crítico';
  kmToNextMaintenance: number; // Added this field
  currentMileage: number; // ✅ Added
  dailyAverageKm: number; // ✅ Added
};

function calculateVehicleMetrics(
  vehicle: Vehicle,
  financialRecords: FinancialRecord[],
  assignmentLogs: VehicleAssignmentLog[],
  hydrated: boolean
): VehicleMetric {
    // 1. Financial Analysis
    const recordsForVehicle = financialRecords.filter(r => r.vehicleId === vehicle.id && !r.isDeleted);
    const totalIncome = recordsForVehicle.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = recordsForVehicle.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : (netProfit < 0 ? -100 : 0);

    // 2. Utilization Analysis
    const logsForVehicle = assignmentLogs.filter(log => log.vehicleId === vehicle.id);
    const acquisitionDate = infallibleNormalizeDate(vehicle.acquisitionDate);
    
    let totalDaysInFleet = 0;
    if (hydrated && acquisitionDate) {
      totalDaysInFleet = differenceInDays(new Date(), acquisitionDate);
    }
    
    const daysAssigned = logsForVehicle.reduce((sum, log) => {
      const start = infallibleNormalizeDate(log.startDate);
      const end = log.endDate ? infallibleNormalizeDate(log.endDate) : (hydrated ? new Date() : null);
      if (start && end) {
        return sum + differenceInDays(end, start);
      }
      return sum;
    }, 0);
    const utilizationRate = totalDaysInFleet > 0 ? (daysAssigned / totalDaysInFleet) * 100 : 0;

    // 3. Maintenance Score
    const kmToNextMaint = (vehicle.lastMaintenanceMileage || 0) + MAINTENANCE_INTERVAL_KM - (vehicle.currentMileage || 0);
    // Score is 100 if just maintained, drops to 0 when maintenance is due. Capped at 0-100.
    const maintenanceScore = Math.max(0, Math.min(100, (kmToNextMaint / MAINTENANCE_INTERVAL_KM) * 100));

    // 4. Document Score
    let documentScore = 0;
    if (vehicle.imageUrl) documentScore += 34;
    if (vehicle.circulationCardUrl) documentScore += 33;
    if (vehicle.insurancePolicyDocumentUrl) documentScore += 33;

    // 5. Daily Average KM
    const dailyAverageKm = totalDaysInFleet > 0 ? vehicle.currentMileage / totalDaysInFleet : 0;
    
    // 6. Performance Rating
    let performanceRating: VehicleMetric['performanceRating'];
    const performanceScore = (profitMargin * 0.4) + (utilizationRate * 0.3) + (maintenanceScore * 0.2) + (documentScore * 0.1);
    
    if (performanceScore >= 85) performanceRating = 'Excelente';
    else if (performanceScore >= 70) performanceRating = 'Bueno';
    else if (performanceScore >= 50) performanceRating = 'Promedio';
    else if (performanceScore >= 30) performanceRating = 'Pobre';
    else performanceRating = 'Crítico';

    // Special override for sold/deleted vehicles
    if (vehicle.status === 'sold' || vehicle.isDeleted) {
      performanceRating = 'Crítico'; 
    }
    
    return {
      vehicleId: vehicle.id,
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin,
      utilizationRate,
      maintenanceScore,
      documentScore,
      performanceRating,
      kmToNextMaintenance: kmToNextMaint, // Add the new field
      dailyAverageKm, // ✅ Added
      currentMileage: vehicle.currentMileage // ✅ Added
    };
}


const useMemoDeep = <T,>(factory: () => T, deps: any[]): T => {
    const ref = useRef<{ deps: any[], value: T } | undefined>(undefined);
    const depsString = JSON.stringify(deps);

    if (!ref.current || JSON.stringify(ref.current.deps) !== depsString) {
      ref.current = { deps, value: factory() };
    }

    return ref.current.value;
};


export const useVehicleAnalytics = (
  vehicles: Vehicle[],
  financialRecords: FinancialRecord[],
  assignmentLogs: VehicleAssignmentLog[]
) => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const vehicleMetrics = useMemoDeep(() => {
    if (!vehicles || !financialRecords || !assignmentLogs) {
      return [];
    }

    return vehicles.map(vehicle => {
      return calculateVehicleMetrics(vehicle, financialRecords, assignmentLogs, hydrated);
    });
    
  }, [vehicles, financialRecords, assignmentLogs, hydrated]);

  return { vehicleMetrics };
};
