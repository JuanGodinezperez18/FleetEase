"use client";

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Vehicle, MileageLog, FinancialRecord, Company } from '@/types';
import { infallibleNormalizeDate } from '@/lib/date-utils';
import { differenceInDays, addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

const DEFAULT_MAINTENANCE_INTERVAL_KM = 10000;
const MAINTENANCE_CATEGORY = "Mantenimiento";
const MAINTENANCE_SOON_KM = 1500;

export type VehicleMileageMetric = {
  vehicleId: string;
  currentMileage: number;
  lastMaintenanceMileage: number;
  kmSinceLastMaintenance: number;
  nextMaintenanceDue: number;
  kmToNextMaintenance: number;
  estimatedMaintenanceDate: Date | null;
  dailyAverageKm: number;
  totalMaintenanceCosts: number;
  costPerKm: number;
  maintenanceScore: number;
  efficiencyRating: 'Eficiente' | 'Promedio' | 'Costoso';
  alerts: string[];
  recommendations: string[];
};

export const useMileageAnalytics = (
  vehicles: Vehicle[],
  mileageLogs: MileageLog[],
  financialRecords: FinancialRecord[],
  companies: Company[] = []
) => {
  const { data: companySettings = [] } = useQuery<{ id: string; maintenanceInterval: number }[]>({
    queryKey: ['mileage-analytics-company-maintenance-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, maintenance_interval')
        .eq('is_deleted', false);
      if (error) throw error;
      return (data || [])
        .filter(row => typeof row.maintenance_interval === 'number' && row.maintenance_interval > 0)
        .map(row => ({ id: row.id, maintenanceInterval: row.maintenance_interval as number }));
    },
    enabled: companies.length === 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const effectiveCompanies = companies.length > 0
    ? companies
    : companySettings.map(company => ({
        id: company.id,
        maintenanceInterval: company.maintenanceInterval,
      } as Company));

  const vehicleMetrics = useMemo(() => {
    if (!vehicles.length) return [];

    const companyIntervals = new Map(
      effectiveCompanies
        .filter(company => typeof company.maintenanceInterval === 'number' && company.maintenanceInterval > 0)
        .map(company => [company.id, company.maintenanceInterval as number])
    );

    return vehicles.map(vehicle => {
      const logsForVehicle = mileageLogs
        .filter(log => log.vehicleId === vehicle.id && !log.isDeleted)
        .sort((a, b) => (infallibleNormalizeDate(a.date)?.getTime() || 0) - (infallibleNormalizeDate(b.date)?.getTime() || 0));

      // El registro de kilometraje es la fuente operativa de verdad.
      // El trigger de Supabase sincroniza vehicles.current_mileage con el máximo
      // de mileage_logs, pero usamos los logs aquí para evitar analítica obsoleta
      // mientras React Query aún conserva una copia anterior de vehicles.
      const mileageFromLogs = logsForVehicle.reduce((max, log) => Math.max(max, Number(log.mileage) || 0), 0);
      const currentMileage = Math.max(mileageFromLogs, vehicle.currentMileage || 0);

      const maintenanceLogs = logsForVehicle.filter(log => log.kind === 'maintenance');
      const maintenanceMileageFromLogs = maintenanceLogs.reduce(
        (max, log) => Math.max(max, Number(log.mileage) || 0),
        0
      );
      const lastMaintenanceMileage = Math.max(
        maintenanceMileageFromLogs,
        vehicle.lastMaintenanceMileage || 0
      );

      const maintenanceInterval = companyIntervals.get(vehicle.companyId || '')
        ?? vehicle.maintenanceInterval
        ?? DEFAULT_MAINTENANCE_INTERVAL_KM;

      const kmSinceLastMaintenance = Math.max(0, currentMileage - lastMaintenanceMileage);
      const nextMaintenanceDue = lastMaintenanceMileage + maintenanceInterval;
      const kmToNextMaintenance = nextMaintenanceDue - currentMileage;

      let dailyAverageKm = 150;
      if (logsForVehicle.length > 1) {
        const recentLogs = logsForVehicle.slice(-10);
        let totalKmPerDay = 0;
        let validPairs = 0;

        for (let i = 1; i < recentLogs.length; i++) {
          const prevLog = recentLogs[i - 1];
          const currentLog = recentLogs[i];
          const prevDate = infallibleNormalizeDate(prevLog.date);
          const currentDate = infallibleNormalizeDate(currentLog.date);
          if (!prevDate || !currentDate) continue;

          const daysDiff = differenceInDays(currentDate, prevDate);
          const kmDiff = currentLog.mileage - prevLog.mileage;
          if (daysDiff > 0 && kmDiff >= 0) {
            totalKmPerDay += kmDiff / daysDiff;
            validPairs++;
          }
        }

        if (validPairs > 0) dailyAverageKm = totalKmPerDay / validPairs;
      }

      const estimatedMaintenanceDate = dailyAverageKm > 0
        ? addDays(new Date(), Math.max(0, kmToNextMaintenance / dailyAverageKm))
        : null;

      const maintenanceRecords = financialRecords.filter(
        r => r.vehicleId === vehicle.id && r.category === MAINTENANCE_CATEGORY && !r.isDeleted
      );
      const totalMaintenanceCosts = maintenanceRecords.reduce((sum, r) => sum + r.amount, 0);
      const costPerKm = currentMileage > 0 ? totalMaintenanceCosts / currentMileage : 0;
      const maintenanceScore = maintenanceInterval > 0
        ? Math.max(0, Math.min(100, (kmToNextMaintenance / maintenanceInterval) * 100))
        : 0;

      let efficiencyRating: VehicleMileageMetric['efficiencyRating'];
      if (costPerKm < 0.5) efficiencyRating = 'Eficiente';
      else if (costPerKm < 1.5) efficiencyRating = 'Promedio';
      else efficiencyRating = 'Costoso';

      const alerts: string[] = [];
      const recommendations: string[] = [];

      if (kmToNextMaintenance <= 0) {
        alerts.push("Mantenimiento Urgente Requerido");
        recommendations.push("Realizar servicio de mantenimiento inmediatamente para evitar daños mayores.");
      } else if (kmToNextMaintenance <= MAINTENANCE_SOON_KM) {
        alerts.push("Mantenimiento Próximo");
        if (estimatedMaintenanceDate) {
          recommendations.push(`Agendar servicio alrededor del ${format(estimatedMaintenanceDate, 'dd MMM yyyy', { locale: es })}.`);
        } else {
          recommendations.push(`Agendar servicio en los próximos ${Math.round(kmToNextMaintenance / Math.max(dailyAverageKm, 1))} días.`);
        }
      }

      if (costPerKm > 2) {
        alerts.push("Costo por Kilómetro Elevado");
        recommendations.push("Revisar historial de gastos para identificar costos atípicos o recurrentes.");
      }

      return {
        vehicleId: vehicle.id,
        currentMileage,
        lastMaintenanceMileage,
        kmSinceLastMaintenance,
        nextMaintenanceDue,
        kmToNextMaintenance,
        estimatedMaintenanceDate,
        dailyAverageKm,
        totalMaintenanceCosts,
        costPerKm,
        maintenanceScore,
        efficiencyRating,
        alerts,
        recommendations,
      };
    });
  }, [vehicles, mileageLogs, financialRecords, effectiveCompanies]);

  return { vehicleMetrics };
};
