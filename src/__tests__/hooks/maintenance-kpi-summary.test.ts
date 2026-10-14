import { getMaintenanceKpiSummary } from '@/hooks/use-dashboard-kpis';
import type { Vehicle } from '@/types';
import type { VehicleMileageMetric } from '@/hooks/use-mileage-analytics';

describe('getMaintenanceKpiSummary', () => {
  const vehicles = [
    { id: 'overdue', status: 'active', isDeleted: false, alias: 'Vencido' },
    { id: 'soon', status: 'active', isDeleted: false, alias: 'Próximo' },
    { id: 'healthy', status: 'active', isDeleted: false, alias: 'Al día' },
    { id: 'sold', status: 'sold', isDeleted: false, alias: 'Vendido' },
    { id: 'deleted', status: 'active', isDeleted: true, alias: 'Eliminado' },
  ] as unknown as Vehicle[];

  const metrics = [
    { vehicleId: 'overdue', kmToNextMaintenance: -250, currentMileage: 50000, nextMaintenanceDue: 49750, maintenanceScore: 0 },
    { vehicleId: 'soon', kmToNextMaintenance: 900, currentMileage: 50900, nextMaintenanceDue: 51800, maintenanceScore: 9 },
    { vehicleId: 'healthy', kmToNextMaintenance: 4000, currentMileage: 46000, nextMaintenanceDue: 50000, maintenanceScore: 40 },
    { vehicleId: 'sold', kmToNextMaintenance: -10, currentMileage: 60000, nextMaintenanceDue: 59990, maintenanceScore: 0 },
    { vehicleId: 'deleted', kmToNextMaintenance: 100, currentMileage: 10000, nextMaintenanceDue: 10100, maintenanceScore: 1 },
  ] as VehicleMileageMetric[];

  it('counts overdue and upcoming maintenance from mileage metrics', () => {
    const result = getMaintenanceKpiSummary(vehicles, metrics);

    expect(result.overdueCount).toBe(1);
    expect(result.soonCount).toBe(1);
    expect(result.overdueDetails.map(vehicle => vehicle.id)).toEqual(['overdue']);
    expect(result.soonDetails.map(vehicle => vehicle.id)).toEqual(['soon']);
  });

  it('does not classify sold or deleted vehicles in the maintenance chart', () => {
    const result = getMaintenanceKpiSummary(vehicles, metrics);
    const classifiedIds = [
      ...result.overdueDetails.map(vehicle => vehicle.id),
      ...result.soonDetails.map(vehicle => vehicle.id),
    ];

    expect(classifiedIds).not.toContain('sold');
    expect(classifiedIds).not.toContain('deleted');
  });
});
