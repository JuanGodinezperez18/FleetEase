/**
 * Dashboard de Rentabilidad por Vehículo
 * Feature estrella de FleetEase - Muestra qué vehículo gana y cuál pierde dinero
 */

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Vehicle, FinancialRecord } from '@/types';
import {
  filterRecordsSince,
  filterRecordsByVehicle,
  sumRentalIncome,
  sumExpense,
  calculateProfitMargin,
  daysBetweenInclusive,
} from '@/lib/financial-metrics';

interface VehicleProfitability {
  vehicle: Vehicle;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  occupancyRate: number;
  status: 'profitable' | 'breaking-even' | 'loss';
}

interface VehicleProfitabilityDashboardProps {
  vehicles: Vehicle[];
  financialRecords: FinancialRecord[];
  periodDays?: number;
  dateRange?: { from?: Date; to?: Date };
}

export function VehicleProfitabilityDashboard({
  vehicles,
  financialRecords,
  periodDays = 30,
  dateRange,
}: VehicleProfitabilityDashboardProps) {
  
  // Calcular rentabilidad por vehículo
  const profitabilityData: VehicleProfitability[] = useMemo(() => {
    const effectiveDays =
      dateRange?.from && dateRange?.to
        ? daysBetweenInclusive(dateRange.from, dateRange.to)
        : periodDays;
    const cutoffDate = dateRange?.from
      ? dateRange.from
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() - periodDays);
          return d;
        })();

    return vehicles
      .filter(v => !v.isDeleted && v.status !== 'sold')
      .map(vehicle => {
        // Filtrar registros del período
        const vehicleRecords = filterRecordsSince(
          filterRecordsByVehicle(financialRecords, vehicle.id),
          cutoffDate
        );

        // Calcular ingresos (rentas)
        const totalIncome = sumRentalIncome(vehicleRecords);

        // Calcular gastos (mantenimiento, seguros, multas, operativos)
        const totalExpenses = sumExpense(vehicleRecords);

        // Calcular utilidad neta
        const netProfit = totalIncome - totalExpenses;

        // Calcular margen de utilidad
        const profitMargin = calculateProfitMargin(totalIncome, totalExpenses);

        // Calcular tasa de ocupación (días rentado / 30 días)
        const rentalDays = vehicleRecords
          .filter(r => r.type === 'income')
          .reduce((days, r) => days + 1, 0); // Simplificado: 1 registro = 1 día
        
        const occupancyRate = (rentalDays / effectiveDays) * 100;

        // Determinar estado
        let status: 'profitable' | 'breaking-even' | 'loss';
        if (netProfit > 0) {
          status = 'profitable';
        } else if (netProfit < -1000) { // Pérdida significativa
          status = 'loss';
        } else {
          status = 'breaking-even';
        }

        return {
          vehicle,
          totalIncome,
          totalExpenses,
          netProfit,
          profitMargin,
          occupancyRate,
          status,
        };
      })
      .sort((a, b) => b.netProfit - a.netProfit); // Ordenar por rentabilidad
  }, [vehicles, financialRecords, periodDays, dateRange]);

  // Métricas generales
  const metrics = useMemo(() => {
    const totalVehicles = profitabilityData.length;
    const profitableVehicles = profitabilityData.filter(v => v.status === 'profitable').length;
    const lossVehicles = profitabilityData.filter(v => v.status === 'loss').length;
    const totalIncome = profitabilityData.reduce((sum, v) => sum + v.totalIncome, 0);
    const totalExpenses = profitabilityData.reduce((sum, v) => sum + v.totalExpenses, 0);
    const totalNetProfit = profitabilityData.reduce((sum, v) => sum + v.netProfit, 0);
    const avgProfitMargin = totalIncome > 0 ? (totalNetProfit / totalIncome) * 100 : 0;
    const avgOccupancyRate = profitabilityData.reduce((sum, v) => sum + v.occupancyRate, 0) / (totalVehicles || 1);

    return {
      totalVehicles,
      profitableVehicles,
      lossVehicles,
      totalIncome,
      totalExpenses,
      totalNetProfit,
      avgProfitMargin,
      avgOccupancyRate,
    };
  }, [profitabilityData]);

  return (
    <div className="space-y-6">
      {/* Métricas Generales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vehículos Rentables</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.profitableVehicles}/{metrics.totalVehicles}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalVehicles > 0 ? Math.round((metrics.profitableVehicles / metrics.totalVehicles) * 100) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vehículos en Pérdida</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.lossVehicles}/{metrics.totalVehicles}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención inmediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad Neta</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.totalNetProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${metrics.totalNetProfit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos {periodDays} días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${metrics.avgProfitMargin >= 30 ? 'text-green-600' : metrics.avgProfitMargin >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
              {metrics.avgProfitMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Ocupación: {metrics.avgOccupancyRate.toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Vehículos por Rentabilidad */}
      <Card>
        <CardHeader>
          <CardTitle>Rentabilidad por Vehículo</CardTitle>
          <CardDescription>
            Ordenado de más a menos rentable (últimos {periodDays} días)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profitabilityData.map((data, index) => (
              <React.Fragment key={data.vehicle.id}>
                {index > 0 && <Separator />}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                  {/* Información del Vehículo */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold text-sm">
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{data.vehicle.alias || `${data.vehicle.make} ${data.vehicle.model}`}</p>
                        <StatusBadge status={data.status} />
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {data.vehicle.plate} • {data.vehicle.status}
                      </p>
                    </div>
                  </div>

                  {/* Métricas */}
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Ingresos</p>
                      <p className="font-medium text-green-600">
                        ${data.totalIncome.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Gastos</p>
                      <p className="font-medium text-red-600">
                        ${data.totalExpenses.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className="text-xs text-muted-foreground">Utilidad</p>
                      <p className={`font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${data.netProfit.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                      </p>
                      <p className={`text-xs ${data.profitMargin >= 30 ? 'text-green-600' : data.profitMargin >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {data.profitMargin.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-xs text-muted-foreground">Ocupación</p>
                      <p className="font-medium">{data.occupancyRate.toFixed(0)}%</p>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}

            {profitabilityData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay vehículos con datos en este período</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recomendaciones */}
      {metrics.lossVehicles > 0 && (
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-red-900 dark:text-red-100 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Vehículos que Pierden Dinero
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-800 dark:text-red-200 mb-4">
              Los siguientes vehículos están generando pérdidas. Considera estas acciones:
            </p>
            <ul className="space-y-2">
              {profitabilityData
                .filter(v => v.status === 'loss')
                .map(vehicle => (
                  <li key={vehicle.vehicle.id} className="flex items-start gap-2 text-sm text-red-800 dark:text-red-200">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      <strong>{vehicle.vehicle.alias || vehicle.vehicle.plate}</strong>: 
                      Pérdida de ${Math.abs(vehicle.netProfit).toLocaleString('es-MX', { minimumFractionDigits: 0 })}. 
                      Sugerencia: Revisar gastos de mantenimiento o aumentar precio de renta.
                    </span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: 'profitable' | 'breaking-even' | 'loss' }) {
  const config = {
    profitable: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: CheckCircle, label: 'Rentable' },
    'breaking-even': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: DollarSign, label: 'Tablas' },
    loss: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: TrendingDown, label: 'Pérdida' },
  };

  const Config = config[status];
  const Icon = Config.icon;

  return (
    <Badge className={`${Config.color} gap-1`}>
      <Icon className="h-3 w-3" />
      {Config.label}
    </Badge>
  );
}
