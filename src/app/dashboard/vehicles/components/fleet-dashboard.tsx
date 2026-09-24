
"use client";

import React, { useMemo } from 'react';
import type { Vehicle } from '@/types';
import type { VehicleMetric } from '@/hooks/use-vehicle-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Car, DollarSign, Award, AlertTriangle } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '@/components/animations/modern-transitions';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MetricCard } from '@/components/dashboard/components/MetricCard';
import { PerformanceBadge } from '@/components/vehicles/vehicle-status-badges';

interface FleetDashboardProps {
  vehicles: Vehicle[];
  vehicleMetrics: VehicleMetric[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0e1117] p-3 text-xs text-white shadow-xl">
        <p className="mb-1 font-semibold text-white/80">{label}</p>
        {payload.map((p: any, index: number) => (
          <p key={index} className="text-white/60">
            {p.name}: <span className="font-semibold text-white">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const FleetDashboard: React.FC<FleetDashboardProps> = ({ vehicles, vehicleMetrics }) => {
  const overallStats = useMemo(() => {
    const activeVehicles = vehicles.filter(v => v.status !== 'sold' && !v.isDeleted);
    const totalNetProfit = vehicleMetrics.reduce((sum, metric) => sum + metric.netProfit, 0);

    const topPerformerMetric = [...vehicleMetrics].sort((a, b) => b.netProfit - a.netProfit)[0];
    const topPerformer = topPerformerMetric
      ? vehicles.find(v => v.id === topPerformerMetric.vehicleId)
      : null;

    const performanceDistribution: Record<VehicleMetric['performanceRating'], number> = {
      Excelente: 0,
      Bueno: 0,
      Promedio: 0,
      Pobre: 0,
      Crítico: 0,
    };
    vehicleMetrics.forEach(metric => {
      performanceDistribution[metric.performanceRating]++;
    });

    return {
      totalVehicles: vehicles.length,
      activeVehicles: activeVehicles.length,
      totalNetProfit,
      topPerformer: topPerformer
        ? { ...topPerformer, netProfit: topPerformerMetric.netProfit }
        : null,
      performanceDistribution,
    };
  }, [vehicles, vehicleMetrics]);

  const chartData = Object.entries(overallStats.performanceDistribution).map(([name, value]) => ({
    name,
    Vehículos: value,
  }));

  const topFiveVehicles = useMemo(() => {
    return vehicleMetrics
      .sort((a, b) => b.netProfit - a.netProfit)
      .slice(0, 5)
      .map(metric => {
        const vehicle = vehicles.find(v => v.id === metric.vehicleId);
        return vehicle ? { ...vehicle, ...metric } : null;
      })
      .filter((v): v is Vehicle & VehicleMetric => v !== null);
  }, [vehicleMetrics, vehicles]);

  const attentionRequiredVehicles = useMemo(() => {
    return vehicleMetrics
      .filter(m => m.performanceRating === 'Crítico' || m.performanceRating === 'Pobre')
      .sort((a, b) => a.netProfit - b.netProfit)
      .map(metric => {
        const vehicle = vehicles.find(v => v.id === metric.vehicleId);
        return vehicle ? { ...vehicle, ...metric } : null;
      })
      .filter((v): v is Vehicle & VehicleMetric => v !== null);
  }, [vehicleMetrics, vehicles]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <MetricCard
            title="Vehículos totales"
            value={overallStats.totalVehicles}
            description={`${overallStats.activeVehicles} activos / rentados`}
            icon={<Car className="h-5 w-5" strokeWidth={1.75} />}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Rentabilidad total"
            value={formatCurrency(overallStats.totalNetProfit)}
            description="Beneficio neto de la flota"
            icon={<DollarSign className="h-5 w-5" strokeWidth={1.75} />}
            variant={overallStats.totalNetProfit >= 0 ? 'success' : 'danger'}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Top performer"
            value={overallStats.topPerformer?.plate || 'N/A'}
            description={
              overallStats.topPerformer
                ? `Beneficio: ${formatCurrency(overallStats.topPerformer.netProfit)}`
                : 'Sin datos'
            }
            icon={<Award className="h-5 w-5" strokeWidth={1.75} />}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Requieren atención"
            value={attentionRequiredVehicles.length}
            description="Rendimiento pobre o crítico"
            icon={<AlertTriangle className="h-5 w-5" strokeWidth={1.75} />}
            variant={attentionRequiredVehicles.length > 0 ? 'warning' : 'default'}
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Analytics: desktop only — reduce mobile noise */}
      <div className="hidden gap-4 md:grid md:grid-cols-2">
        <Card className="rounded-[14px] border-white/[0.07] bg-[#0e1117] text-white shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Rendimiento de la flota
            </CardTitle>
            <CardDescription className="text-xs text-white/40">
              Distribución por clasificación
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="Vehículos" fill="#d7ff3f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[14px] border-white/[0.07] bg-[#0e1117] text-white shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Top 5 por rentabilidad
            </CardTitle>
            <CardDescription className="text-xs text-white/40">
              Mayores beneficios netos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topFiveVehicles.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/35">Sin datos de rentabilidad</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/40">Vehículo</TableHead>
                    <TableHead className="text-white/40">Rendimiento</TableHead>
                    <TableHead className="text-right text-white/40">Beneficio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topFiveVehicles.map(v => (
                    <TableRow key={v.id} className="border-white/[0.06] hover:bg-white/[0.03]">
                      <TableCell>
                        <Link
                          href={`/dashboard/vehicles/${v.id}`}
                          className="font-medium text-white/90 hover:text-[#d7ff3f]"
                        >
                          {v.plate}
                          <span className="mt-0.5 block text-xs text-white/40">
                            {v.make} {v.model}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <PerformanceBadge level={v.performanceRating} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-300">
                        {formatCurrency(v.netProfit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {attentionRequiredVehicles.length > 0 && (
        <div className="hidden rounded-[14px] border border-amber-400/20 bg-amber-400/[0.06] p-4 md:block">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-300">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
            Requieren atención
          </div>
          <ul className="space-y-1 text-sm text-white/60">
            {attentionRequiredVehicles.slice(0, 5).map(v => (
              <li key={v.id}>
                <Link href={`/dashboard/vehicles/${v.id}`} className="hover:text-[#d7ff3f]">
                  {v.plate}
                </Link>
                <span className="text-white/35"> · {formatCurrency(v.netProfit)} · {v.performanceRating}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
