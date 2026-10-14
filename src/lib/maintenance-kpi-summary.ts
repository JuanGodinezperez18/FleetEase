import type { Vehicle } from '@/types';
import type { VehicleMileageMetric } from '@/hooks/use-mileage-analytics';

/**
 * Calcula el estado de mantenimiento usando la misma métrica de kilometraje
 * que consume el módulo de analíticas y excluyendo vehículos no operativos.
 */
export function getMaintenanceKpiSummary(
  vehicles: Vehicle[],
  mileageMetrics: VehicleMileageMetric[],
) {
  const operationalVehicles = vehicles.filter(vehicle => vehicle.status !== 'sold' && !vehicle.isDeleted);
  const metricsByVehicleId = new Map(mileageMetrics.map(metric => [metric.vehicleId, metric]));
  const overdueVehicles = operationalVehicles.filter(vehicle => {
    const metric = metricsByVehicleId.get(vehicle.id);
    return metric !== undefined && metric.kmToNextMaintenance <= 0;
  });
  const soonVehicles = operationalVehicles.filter(vehicle => {
    const kmToNext = metricsByVehicleId.get(vehicle.id)?.kmToNextMaintenance;
    return kmToNext !== undefined && kmToNext > 0 && kmToNext <= 1500;
  });
  const withMetricDetails = (vehicle: Vehicle) => {
    const metric = metricsByVehicleId.get(vehicle.id);
    return {
      ...vehicle,
      currentMileage: metric?.currentMileage,
      nextMaintenanceAt: metric?.nextMaintenanceDue,
      kmToNextMaintenance: metric?.kmToNextMaintenance,
      maintenanceScore: metric?.maintenanceScore,
    };
  };

  return {
    overdueCount: overdueVehicles.length,
    soonCount: soonVehicles.length,
    overdueDetails: overdueVehicles.map(withMetricDetails),
    soonDetails: soonVehicles.map(withMetricDetails),
  };
}
