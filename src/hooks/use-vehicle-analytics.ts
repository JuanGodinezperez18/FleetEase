"use client";

import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Vehicle, FinancialRecord, VehicleAssignmentLog, Company } from '@/types';
import { infallibleNormalizeDate } from '@/lib/date-utils';
import { differenceInDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { sumRentalIncome, sumExpense } from '@/lib/financial-metrics';

const DEFAULT_MAINTENANCE_INTERVAL_KM = 10000;

export type VehicleMetric = {
  vehicleId: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  utilizationRate: number;
  maintenanceScore: number;
  documentScore: number;
  performanceRating: 'Excelente' | 'Bueno' | 'Promedio' | 'Pobre' | 'Crítico';
  kmToNextMaintenance: number;
  currentMileage: number;
  dailyAverageKm: number;
};

function calculateVehicleMetrics(
  vehicle: Vehicle,
  financialRecords: FinancialRecord[],
  assignmentLogs: VehicleAssignmentLog[],
  hydrated: boolean,
  companyIntervals: Map<string, number>
): VehicleMetric {
  const recordsForVehicle = financialRecords.filter(r => r.vehicleId === vehicle.id && !r.isDeleted);
  const totalIncome = sumRentalIncome(recordsForVehicle);
  const totalExpenses = sumExpense(recordsForVehicle);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : (netProfit < 0 ? -100 : 0);

  const logsForVehicle = assignmentLogs.filter(log => log.vehicleId === vehicle.id);
  const acquisitionDate = infallibleNormalizeDate(vehicle.acquisitionDate);
  let totalDaysInFleet = 0;
  if (hydrated && acquisitionDate) totalDaysInFleet = differenceInDays(new Date(), acquisitionDate);

  const daysAssigned = logsForVehicle.reduce((sum, log) => {
    const start = infallibleNormalizeDate(log.startDate);
    const end = log.endDate ? infallibleNormalizeDate(log.endDate) : (hydrated ? new Date() : null);
    if (start && end) return sum + differenceInDays(end, start);
    return sum;
  }, 0);
  const utilizationRate = totalDaysInFleet > 0 ? (daysAssigned / totalDaysInFleet) * 100 : 0;

  // La configuración vigente de la empresa es la fuente de verdad.
  const maintenanceInterval = companyIntervals.get(vehicle.companyId || '')
    ?? vehicle.maintenanceInterval
    ?? DEFAULT_MAINTENANCE_INTERVAL_KM;
  const kmToNextMaint = (vehicle.lastMaintenanceMileage || 0) + maintenanceInterval - (vehicle.currentMileage || 0);
  const maintenanceScore = Math.max(0, Math.min(100, (kmToNextMaint / maintenanceInterval) * 100));

  let documentScore = 0;
  if (vehicle.imageUrl) documentScore += 34;
  if (vehicle.circulationCardUrl) documentScore += 33;
  if (vehicle.insurancePolicyDocumentUrl) documentScore += 33;

  const dailyAverageKm = totalDaysInFleet > 0 ? vehicle.currentMileage / totalDaysInFleet : 0;
  const performanceScore = (profitMargin * 0.4) + (utilizationRate * 0.3) + (maintenanceScore * 0.2) + (documentScore * 0.1);

  let performanceRating: VehicleMetric['performanceRating'];
  if (performanceScore >= 85) performanceRating = 'Excelente';
  else if (performanceScore >= 70) performanceRating = 'Bueno';
  else if (performanceScore >= 50) performanceRating = 'Promedio';
  else if (performanceScore >= 30) performanceRating = 'Pobre';
  else performanceRating = 'Crítico';
  if (vehicle.status === 'sold' || vehicle.isDeleted) performanceRating = 'Crítico';

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
    kmToNextMaintenance: kmToNextMaint,
    dailyAverageKm,
    currentMileage: vehicle.currentMileage,
  };
}

export const useVehicleAnalytics = (
  vehicles: Vehicle[],
  financialRecords: FinancialRecord[],
  assignmentLogs: VehicleAssignmentLog[]
) => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  // Consulta la configuración actual de cada empresa para que el cálculo no
  // dependa de una copia antigua del intervalo guardada en el vehículo.
  const { data: companyIntervals = {} } = useQuery<Record<string, number>>({
    queryKey: ['vehicle-analytics-company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, maintenance_interval')
        .eq('is_deleted', false);
      if (error) throw error;
      return Object.fromEntries(
        (data || [])
          .filter(row => typeof row.maintenance_interval === 'number' && row.maintenance_interval > 0)
          .map(row => [row.id, row.maintenance_interval as number])
      );
    },
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const intervalMap = useMemo(() => new Map(Object.entries(companyIntervals)), [companyIntervals]);

  const vehicleMetrics = useMemo(() => {
    if (!vehicles || !financialRecords || !assignmentLogs) return [];
    return vehicles.map(vehicle => calculateVehicleMetrics(vehicle, financialRecords, assignmentLogs, hydrated, intervalMap));
  }, [vehicles, financialRecords, assignmentLogs, hydrated, intervalMap]);

  return { vehicleMetrics };
};