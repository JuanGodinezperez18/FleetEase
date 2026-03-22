

"use client";

import React, { useMemo } from 'react';
import type { Vehicle } from '@/types';
import type { VehicleMileageMetric } from '@/hooks/use-mileage-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Wrench,
  Gauge,
  CalendarClock,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface MaintenanceDashboardProps {
  vehicles: Vehicle[];
  vehicleMetrics: VehicleMileageMetric[];
}

export const MaintenanceDashboard: React.FC<MaintenanceDashboardProps> = ({ vehicles, vehicleMetrics }) => {
  const overallStats = useMemo(() => {
    if (vehicleMetrics.length === 0) {
      return {
        urgentCount: 0,
        upcomingCount: 0,
        avgMaintenanceScore: 0,
        mostEfficient: null,
        leastEfficient: null,
        predictiveSchedule: { next30: [], next60: [], next90: [] },
      };
    }

    const urgentVehicles = vehicleMetrics.filter(m => m.kmToNextMaintenance <= 0);
    const upcomingVehicles = vehicleMetrics.filter(m => m.kmToNextMaintenance > 0 && m.kmToNextMaintenance <= 1500);
    const avgMaintenanceScore = vehicleMetrics.reduce((sum, m) => sum + m.maintenanceScore, 0) / vehicleMetrics.length;

    const sortedByEfficiency = [...vehicleMetrics].sort((a, b) => a.costPerKm - b.costPerKm);
    
    const now = new Date();
    const predictiveSchedule = {
      next30: vehicleMetrics.filter(m => m.estimatedMaintenanceDate && m.estimatedMaintenanceDate > now && m.estimatedMaintenanceDate <= addDays(now, 30)),
      next60: vehicleMetrics.filter(m => m.estimatedMaintenanceDate && m.estimatedMaintenanceDate > addDays(now, 30) && m.estimatedMaintenanceDate <= addDays(now, 60)),
      next90: vehicleMetrics.filter(m => m.estimatedMaintenanceDate && m.estimatedMaintenanceDate > addDays(now, 60) && m.estimatedMaintenanceDate <= addDays(now, 90)),
    };

    return {
      urgentCount: urgentVehicles.length,
      upcomingCount: upcomingVehicles.length,
      avgMaintenanceScore,
      mostEfficient: sortedByEfficiency[0],
      leastEfficient: sortedByEfficiency[sortedByEfficiency.length - 1],
      predictiveSchedule,
    };
  }, [vehicleMetrics]);
  
  const getVehicleDetails = (metric: VehicleMileageMetric | null) => {
    if (!metric) return null;
    return vehicles.find(v => v.id === metric.vehicleId);
  };

  const mostEfficientVehicle = getVehicleDetails(overallStats.mostEfficient);
  const leastEfficientVehicle = getVehicleDetails(overallStats.leastEfficient);

  const renderScheduleList = (metrics: VehicleMileageMetric[]) => (
    <ul className="space-y-1 text-sm">
      {metrics.map(m => {
        const v = getVehicleDetails(m);
        return (
          <li key={m.vehicleId} className="flex justify-between items-center">
            <Link href={`/dashboard/vehicles/${m.vehicleId}`} className="hover:underline text-primary">
              {v?.plate || 'N/A'}
            </Link>
            <span className="text-muted-foreground">{m.estimatedMaintenanceDate ? format(m.estimatedMaintenanceDate, 'dd MMM', {locale: es}) : 'N/A'}</span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mantenimiento Urgente</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overallStats.urgentCount}</div>
            <p className="text-xs text-muted-foreground">Vehículos con servicio vencido.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mantenimiento Próximo</CardTitle>
            <Wrench className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{overallStats.upcomingCount}</div>
            <p className="text-xs text-muted-foreground">Servicio requerido en &lt;1,500 km.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salud General de Flota</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{overallStats.avgMaintenanceScore.toFixed(0)} / 100</div>
            <p className="text-xs text-muted-foreground">Puntaje promedio de mantenimiento.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos 30 Días</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.predictiveSchedule.next30.length}</div>
            <p className="text-xs text-muted-foreground">Servicios estimados.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
         <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Calendario Predictivo</CardTitle>
            <CardDescription>Mantenimientos estimados por fecha.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div>
                <h4 className="font-semibold text-sm mb-2">Próximos 30 días</h4>
                {overallStats.predictiveSchedule.next30.length > 0 ? renderScheduleList(overallStats.predictiveSchedule.next30) : <p className="text-xs text-muted-foreground">Sin mantenimientos estimados.</p>}
            </div>
            <div>
                <h4 className="font-semibold text-sm mb-2">31-60 días</h4>
                {overallStats.predictiveSchedule.next60.length > 0 ? renderScheduleList(overallStats.predictiveSchedule.next60) : <p className="text-xs text-muted-foreground">Sin mantenimientos estimados.</p>}
            </div>
            <div>
                <h4 className="font-semibold text-sm mb-2">61-90 días</h4>
                {overallStats.predictiveSchedule.next90.length > 0 ? renderScheduleList(overallStats.predictiveSchedule.next90) : <p className="text-xs text-muted-foreground">Sin mantenimientos estimados.</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Análisis de Eficiencia Operativa</CardTitle>
            <CardDescription>Costo de mantenimiento por kilómetro recorrido.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-6">
            <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><TrendingUp className="text-emerald-500" /> Más Eficiente</h4>
                {mostEfficientVehicle && overallStats.mostEfficient ? (
                    <div className="space-y-1">
                        <Link href={`/dashboard/vehicles/${mostEfficientVehicle.id}`} className="hover:underline font-medium text-primary">{mostEfficientVehicle.plate}</Link>
                        <p className="text-xl font-bold">{formatCurrency(overallStats.mostEfficient.costPerKm)} / km</p>
                        <p className="text-xs text-muted-foreground">{mostEfficientVehicle.make} {mostEfficientVehicle.model}</p>
                    </div>
                ) : <p className="text-xs text-muted-foreground">No hay datos.</p>}
            </div>
            <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><TrendingDown className="text-destructive" /> Menos Eficiente</h4>
                 {leastEfficientVehicle && overallStats.leastEfficient ? (
                    <div className="space-y-1">
                        <Link href={`/dashboard/vehicles/${leastEfficientVehicle.id}`} className="hover:underline font-medium text-primary">{leastEfficientVehicle.plate}</Link>
                        <p className="text-xl font-bold">{formatCurrency(overallStats.leastEfficient.costPerKm)} / km</p>
                        <p className="text-xs text-muted-foreground">{leastEfficientVehicle.make} {leastEfficientVehicle.model}</p>
                    </div>
                ) : <p className="text-xs text-muted-foreground">No hay datos.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};
