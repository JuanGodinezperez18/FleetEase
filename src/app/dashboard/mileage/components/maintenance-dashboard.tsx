"use client";

import React, { useMemo } from "react";
import type { Vehicle } from "@/types";
import type { VehicleMileageMetric } from "@/hooks/use-mileage-analytics";
import { Wrench, CalendarClock, AlertTriangle, ShieldCheck, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { MetricCard } from "@/components/dashboard/components/MetricCard";

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
        mostEfficient: null as VehicleMileageMetric | null,
        leastEfficient: null as VehicleMileageMetric | null,
        predictiveSchedule: { next30: [] as VehicleMileageMetric[], next60: [] as VehicleMileageMetric[], next90: [] as VehicleMileageMetric[] },
      };
    }

    const urgentVehicles = vehicleMetrics.filter(m => m.kmToNextMaintenance <= 0);
    const upcomingVehicles = vehicleMetrics.filter(m => m.kmToNextMaintenance > 0 && m.kmToNextMaintenance <= 1500);
    const avgMaintenanceScore =
      vehicleMetrics.reduce((sum, m) => sum + m.maintenanceScore, 0) / vehicleMetrics.length;

    const sortedByEfficiency = [...vehicleMetrics].sort((a, b) => a.costPerKm - b.costPerKm);

    const now = new Date();
    const predictiveSchedule = {
      next30: vehicleMetrics.filter(
        m => m.estimatedMaintenanceDate && m.estimatedMaintenanceDate > now && m.estimatedMaintenanceDate <= addDays(now, 30)
      ),
      next60: vehicleMetrics.filter(
        m =>
          m.estimatedMaintenanceDate &&
          m.estimatedMaintenanceDate > addDays(now, 30) &&
          m.estimatedMaintenanceDate <= addDays(now, 60)
      ),
      next90: vehicleMetrics.filter(
        m =>
          m.estimatedMaintenanceDate &&
          m.estimatedMaintenanceDate > addDays(now, 60) &&
          m.estimatedMaintenanceDate <= addDays(now, 90)
      ),
    };

    return {
      urgentCount: urgentVehicles.length,
      upcomingCount: upcomingVehicles.length,
      avgMaintenanceScore,
      mostEfficient: sortedByEfficiency[0] ?? null,
      leastEfficient: sortedByEfficiency[sortedByEfficiency.length - 1] ?? null,
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
    <ul className="space-y-1.5 text-sm">
      {metrics.map(m => {
        const v = getVehicleDetails(m);
        return (
          <li key={m.vehicleId} className="flex items-center justify-between">
            <Link href={`/dashboard/vehicles/${m.vehicleId}`} className="font-medium text-[#d7ff3f] hover:underline">
              {v?.plate || "N/A"}
            </Link>
            <span className="text-xs text-white/40">
              {m.estimatedMaintenanceDate ? format(m.estimatedMaintenanceDate, "dd MMM", { locale: es }) : "N/A"}
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Urgente"
          value={String(overallStats.urgentCount)}
          description="Servicio vencido"
          icon={<AlertTriangle className="h-5 w-5" strokeWidth={1.75} />}
          variant="danger"
        />
        <MetricCard
          title="Próximo"
          value={String(overallStats.upcomingCount)}
          description="En menos de 1,500 km"
          icon={<Wrench className="h-5 w-5" strokeWidth={1.75} />}
          variant="warning"
        />
        <MetricCard
          title="Salud de flota"
          value={`${overallStats.avgMaintenanceScore.toFixed(0)}/100`}
          description="Puntaje promedio"
          icon={<ShieldCheck className="h-5 w-5" strokeWidth={1.75} />}
          variant={overallStats.avgMaintenanceScore >= 70 ? "success" : overallStats.avgMaintenanceScore >= 40 ? "warning" : "danger"}
        />
        <MetricCard
          title="Próximos 30 días"
          value={String(overallStats.predictiveSchedule.next30.length)}
          description="Servicios estimados"
          icon={<CalendarClock className="h-5 w-5" strokeWidth={1.75} />}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)] lg:col-span-1">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-heading text-base font-semibold text-white">Calendario predictivo</h2>
            <p className="mt-0.5 text-xs text-white/40">Mantenimientos estimados</p>
          </div>
          <div className="space-y-4 p-4 sm:p-5">
            {(
              [
                ["Próximos 30 días", overallStats.predictiveSchedule.next30],
                ["31–60 días", overallStats.predictiveSchedule.next60],
                ["61–90 días", overallStats.predictiveSchedule.next90],
              ] as const
            ).map(([label, list]) => (
              <div key={label}>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">{label}</h4>
                {list.length > 0 ? (
                  renderScheduleList(list)
                ) : (
                  <p className="text-xs text-white/30">Sin estimaciones</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)] lg:col-span-2">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-heading text-base font-semibold text-white">Eficiencia operativa</h2>
            <p className="mt-0.5 text-xs text-white/40">Costo de mantenimiento por km</p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-4">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                Más eficiente
              </h4>
              {mostEfficientVehicle && overallStats.mostEfficient ? (
                <div className="space-y-1">
                  <Link
                    href={`/dashboard/vehicles/${mostEfficientVehicle.id}`}
                    className="font-medium text-[#d7ff3f] hover:underline"
                  >
                    {mostEfficientVehicle.plate}
                  </Link>
                  <p className="font-heading text-xl font-semibold tabular-nums text-white">
                    {formatCurrency(overallStats.mostEfficient.costPerKm)} / km
                  </p>
                  <p className="text-xs text-white/40">
                    {mostEfficientVehicle.make} {mostEfficientVehicle.model}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-white/35">Sin datos</p>
              )}
            </div>
            <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-4">
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-rose-300">
                <TrendingDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                Menos eficiente
              </h4>
              {leastEfficientVehicle && overallStats.leastEfficient ? (
                <div className="space-y-1">
                  <Link
                    href={`/dashboard/vehicles/${leastEfficientVehicle.id}`}
                    className="font-medium text-[#d7ff3f] hover:underline"
                  >
                    {leastEfficientVehicle.plate}
                  </Link>
                  <p className="font-heading text-xl font-semibold tabular-nums text-white">
                    {formatCurrency(overallStats.leastEfficient.costPerKm)} / km
                  </p>
                  <p className="text-xs text-white/40">
                    {leastEfficientVehicle.make} {leastEfficientVehicle.model}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-white/35">Sin datos</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
