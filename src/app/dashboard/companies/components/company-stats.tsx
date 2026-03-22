

"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Building, Users, Car, FileWarning, AlertCircle, TrendingUp } from 'lucide-react';
import type { Company } from '@/types';
import { formatNumber } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { subMonths, startOfMonth, endOfMonth, format, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface CompanyMetrics {
  vehicleCount: number;
  userCount: number;
}

interface CompanyStatsProps {
  companies: Company[];
  companyMetrics: Record<string, CompanyMetrics>;
  onCardClick?: (filterKey: 'contractStatus' | 'status', filterValue: any) => void;
}

export const CompanyStats: React.FC<CompanyStatsProps> = ({ companies, companyMetrics, onCardClick }) => {
  
  const stats = useMemo(() => {
    const activeCompanies = companies.filter(c => !c.isDeleted);
    const totalUsers = Object.values(companyMetrics).reduce((sum, metric) => sum + metric.userCount, 0);
    const totalVehicles = Object.values(companyMetrics).reduce((sum, metric) => sum + metric.vehicleCount, 0);
    const companiesWithoutContract = activeCompanies.filter(c => !c.contractTemplateUrl).length;

    const companiesNearingLimit = activeCompanies
      .map(c => {
        const metrics = companyMetrics[c.id];
        if (!metrics || typeof c.vehicleLimit !== 'number' || c.vehicleLimit === 0) {
          return null;
        }
        const usage = (metrics.vehicleCount / c.vehicleLimit) * 100;
        if (usage >= 80) {
          return {
            ...c,
            usage,
            vehicleCount: metrics.vehicleCount,
          };
        }
        return null;
      })
      .filter((c): c is Company & { usage: number; vehicleCount: number } => c !== null)
      .sort((a,b) => b.usage - a.usage);

    const avgVehiclesPerCompany = activeCompanies.length > 0
      ? totalVehicles / activeCompanies.length
      : 0;

    const inactiveCompanies = activeCompanies.filter(c => {
        const metrics = companyMetrics[c.id];
        return metrics && metrics.vehicleCount === 0 && metrics.userCount === 0;
    });

    const byState = activeCompanies.reduce((acc, c) => {
        const state = c.state || 'Sin Estado';
        acc[state] = (acc[state] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const stateDistribution = Object.entries(byState)
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return {
      activeCompanyCount: activeCompanies.length,
      totalUsers,
      totalVehicles,
      companiesWithoutContract,
      companiesNearingLimit,
      avgVehiclesPerCompany,
      inactiveCompanyCount: inactiveCompanies.length,
      stateDistribution
    };
  }, [companies, companyMetrics]);
  
  const growthData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const addedThisMonth = companies.filter(c => 
        !c.isDeleted && 
        c.createdAt &&
        isWithinInterval(new Date(c.createdAt), { start: monthStart, end: monthEnd })
      ).length;
      
      return {
        month: format(date, 'MMM', { locale: es }),
        empresas: addedThisMonth
      };
    });
  }, [companies]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="cursor-pointer hover:bg-muted/50"
          onClick={() => onCardClick?.('status', 'all')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Activas</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCompanyCount}</div>
            <p className="text-xs text-muted-foreground">Total de empresas en el sistema.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">En todas las empresas.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vehículos</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalVehicles)}</div>
            <p className="text-xs text-muted-foreground">Flota total gestionada.</p>
          </CardContent>
        </Card>
        <Card
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onCardClick?.('contractStatus', 'without_template')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos Pendientes</CardTitle>
            <FileWarning className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.companiesWithoutContract}</div>
            <p className="text-xs text-muted-foreground">Empresas sin plantilla de contrato.</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vehículos Promedio</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgVehiclesPerCompany.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Por empresa activa
            </p>
          </CardContent>
        </Card>
        {stats.inactiveCompanyCount > 0 && (
          <Card className="border-yellow-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empresas Inactivas</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {stats.inactiveCompanyCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Sin usuarios ni vehículos
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Crecimiento de Empresas</CardTitle>
            <CardDescription>Nuevas empresas en los últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={growthData}>
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} />
                <Line 
                  type="monotone" 
                  dataKey="empresas" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {stats.stateDistribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Distribución Geográfica</CardTitle>
              <CardDescription>Top 5 estados con más empresas</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.stateDistribution} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="state" type="category" width={80} tickLine={false} axisLine={false} stroke="hsl(var(--muted-foreground))" fontSize={12}/>
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Bar dataKey="count" name="Empresas" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {stats.companiesNearingLimit.length > 0 && (
        <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
           <AlertCircle className="h-4 w-4 !text-amber-600" />
          <AlertTitle className="font-semibold !text-amber-800">Alerta de Límite de Vehículos</AlertTitle>
          <AlertDescription>
            <div className="space-y-3 mt-2">
                {stats.companiesNearingLimit.map(c => (
                    <div key={c.id}>
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{c.name}</span>
                            <span className="text-xs font-mono">{c.vehicleCount} / {c.vehicleLimit}</span>
                        </div>
                        <Progress value={c.usage} className="h-2 mt-1" />
                        <p className="text-xs text-right mt-1">{c.usage.toFixed(0)}% utilizado</p>
                    </div>
                ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
