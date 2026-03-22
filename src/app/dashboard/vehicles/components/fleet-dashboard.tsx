
"use client";

import React, { useMemo } from 'react';
import type { Vehicle } from '@/types';
import type { VehicleMetric } from '@/hooks/use-vehicle-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Car, DollarSign, Award, AlertTriangle, BarChart as BarChartIcon } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '@/components/animations/modern-transitions';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Legend } from 'recharts';

interface FleetDashboardProps {
  vehicles: Vehicle[];
  vehicleMetrics: VehicleMetric[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background border rounded-lg shadow-sm">
        <p className="font-bold">{label}</p>
        {payload.map((p: any, index: number) => (
            <p key={index} style={{ color: p.fill }}>{`${p.name}: ${p.value}`}</p>
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
    
    const topPerformerMetric = [...vehicleMetrics].sort((a,b) => b.netProfit - a.netProfit)[0];
    const topPerformer = topPerformerMetric ? vehicles.find(v => v.id === topPerformerMetric.vehicleId) : null;
    
    const performanceDistribution: Record<VehicleMetric['performanceRating'], number> = {
      'Excelente': 0, 'Bueno': 0, 'Promedio': 0, 'Pobre': 0, 'Crítico': 0,
    };
    vehicleMetrics.forEach(metric => {
        performanceDistribution[metric.performanceRating]++;
    });

    return {
      totalVehicles: vehicles.length,
      activeVehicles: activeVehicles.length,
      totalNetProfit,
      topPerformer: topPerformer ? { ...topPerformer, netProfit: topPerformerMetric.netProfit } : null,
      performanceDistribution
    };
  }, [vehicles, vehicleMetrics]);
  
  const chartData = Object.entries(overallStats.performanceDistribution).map(([name, value]) => ({ name, Vehículos: value }));

  const topFiveVehicles = useMemo(() => {
    return vehicleMetrics
        .sort((a,b) => b.netProfit - a.netProfit)
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
        .sort((a,b) => a.netProfit - b.netProfit)
        .map(metric => {
            const vehicle = vehicles.find(v => v.id === metric.vehicleId);
            return vehicle ? { ...vehicle, ...metric } : null;
        })
        .filter((v): v is Vehicle & VehicleMetric => v !== null);
  }, [vehicleMetrics, vehicles]);

  const getPerformanceBadge = (level: VehicleMetric['performanceRating']) => {
    switch (level) {
      case 'Excelente': return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Excelente</Badge>;
      case 'Bueno': return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Bueno</Badge>;
      case 'Promedio': return <Badge variant="secondary">Promedio</Badge>;
      case 'Pobre': return <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600">Pobre</Badge>;
      case 'Crítico': return <Badge variant="destructive">Crítico</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
  };
  
  const scatterData = useMemo(() => {
    return vehicles.map(v => {
      const metrics = vehicleMetrics.find(m => m.vehicleId === v.id);
      return {
        cost: v.cost || 0,
        netProfit: metrics?.netProfit || 0,
        totalIncome: metrics?.totalIncome || 0,
        performance: metrics?.performanceRating || 'Promedio',
        name: v.plate,
      };
    }).filter(v => v.cost > 0);
  }, [vehicles, vehicleMetrics]);
  
  const performanceColors = {
    'Excelente': '#10b981',
    'Bueno': '#22c55e',
    'Promedio': '#64748b',
    'Pobre': '#f59e0b',
    'Crítico': '#ef4444',
  };

  return (
    <div className="space-y-6">
      {/* React 19: StaggerContainer for animated card entrance */}
      <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vehículos Totales</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalVehicles}</div>
              <p className="text-xs text-muted-foreground">{overallStats.activeVehicles} activos / rentados</p>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rentabilidad Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${overallStats.totalNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(overallStats.totalNetProfit)}
              </div>
              <p className="text-xs text-muted-foreground">Beneficio neto de toda la flota</p>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
              <Award className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{overallStats.topPerformer?.plate || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">
                {overallStats.topPerformer ? `Beneficio: ${formatCurrency(overallStats.topPerformer.netProfit)}` : 'No hay datos'}
              </p>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atención Requerida</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attentionRequiredVehicles.length}</div>
              <p className="text-xs text-muted-foreground">Vehículos con rendimiento pobre o crítico</p>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento de la Flota</CardTitle>
            <CardDescription>Distribución de vehículos por su clasificación de rendimiento.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                  <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--muted))'}}/>
                  <Bar dataKey="Vehículos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Vehículos por Rentabilidad</CardTitle>
            <CardDescription>Los vehículos más rentables de la flota.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Rendimiento</TableHead>
                  <TableHead className="text-right">Beneficio Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topFiveVehicles.map(v => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                        <Link href={`/dashboard/vehicles/${v.id}`} className="hover:underline">{v.make} {v.model} ({v.plate})</Link>
                    </TableCell>
                    <TableCell>{getPerformanceBadge(v.performanceRating)}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">{formatCurrency(v.netProfit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

       <Card>
          <CardHeader>
            <CardTitle>Análisis de Rentabilidad por Vehículo (ROI)</CardTitle>
            <CardDescription>Visualiza el beneficio neto en relación con el costo de adquisición de cada vehículo.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <XAxis 
                      type="number" 
                      dataKey="cost" 
                      name="Costo de Adquisición" 
                      tickFormatter={(value) => formatCurrency(value)}
                      domain={['dataMin', 'dataMax']}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="netProfit" 
                      name="Beneficio Neto" 
                      tickFormatter={(value) => formatCurrency(value)}
                      domain={['auto', 'auto']}
                    />
                    <ZAxis type="number" dataKey="totalIncome" range={[100, 1000]} name="Ingresos Totales" unit=" USD" />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }} 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-2 bg-background border rounded-lg shadow-sm text-sm">
                              <p className="font-bold">{data.name}</p>
                              <p>Costo: {formatCurrency(data.cost)}</p>
                              <p>Beneficio Neto: {formatCurrency(data.netProfit)}</p>
                              <p>Ingresos: {formatCurrency(data.totalIncome)}</p>
                              <p>Rendimiento: {data.performance}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    {Object.entries(performanceColors).map(([rating, color]) => (
                         <Scatter 
                            key={rating}
                            name={rating} 
                            data={scatterData.filter(d => d.performance === rating)} 
                            fill={color} 
                         />
                    ))}
                </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      {attentionRequiredVehicles.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Vehículos que Requieren Atención</AlertTitle>
          <AlertDescription>
            <p>Los siguientes vehículos tienen un rendimiento pobre o crítico. Se recomienda una revisión de sus gastos, asignaciones o estado general.</p>
            <ul className="mt-2 list-disc list-inside">
              {attentionRequiredVehicles.map(v => (
                <li key={v.id}>
                  <Link href={`/dashboard/vehicles/${v.id}`} className="hover:underline font-semibold">{v.make} {v.model} ({v.plate})</Link>: <span className="font-semibold">{formatCurrency(v.netProfit)}</span> ({v.performanceRating})
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
