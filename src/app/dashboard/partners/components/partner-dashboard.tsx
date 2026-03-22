
"use client";

import React, { useMemo } from 'react';
import type { Partner, Company, FinancialRecord, Client, Vehicle } from '@/types';
import type { PartnerMetric } from '@/hooks/use-partner-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Briefcase,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useData } from '@/hooks/use-data';
import { useFinancialAnalytics } from '@/hooks/use-financial-analytics';
import { useAuth } from '@/contexts/auth-provider';
import { InteractiveMetricCard } from '@/components/dashboard/components/MetricCard';

interface PartnerDashboardProps {
  partners: Partner[];
  partnerMetrics: PartnerMetric[];
  onBalanceCardClick: () => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background border rounded-lg shadow-sm">
        <p className="font-bold">{label}</p>
        {payload.map((p: any, index: number) => (
            <p key={index} style={{ color: p.fill }}>{`${p.name}: ${formatCurrency(p.value)}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

const CompanyComparisonDashboard = () => {
    const { companies, financialRecords, clients, vehicles, partners } = useData();
    const analyticsByCompany = useMemo(() => {
        return companies.map(company => {
            const companyRecords = financialRecords.filter(r => r.companyId === company.id);
            const companyClients = clients.filter(c => c.companyId === company.id);
            const companyVehicles = vehicles.filter(v => v.companyId === company.id);
            const companyPartners = partners.filter(p => p.companyId === company.id);
            
            // This logic is simplified; a full-blown useFinancialAnalytics hook call here would be incorrect.
            // We are performing the aggregation directly.
            const totalIncome = companyRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
            const totalExpenses = companyRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
            
            return {
                name: company.name,
                ingresos: totalIncome,
                gastos: totalExpenses,
                beneficio: totalIncome - totalExpenses,
            };
        }).sort((a, b) => b.beneficio - a.beneficio);
    }, [companies, financialRecords, clients, vehicles, partners]);

    if (companies.length <= 1) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Comparativa de Empresas</CardTitle>
                <CardDescription>Análisis de ingresos, gastos y beneficio neto por empresa.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={analyticsByCompany} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(value)}`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: 'hsl(var(--muted))' }}/>
                        <Legend />
                        <Bar dataKey="ingresos" fill="#10b981" name="Ingresos" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="gastos" fill="#ef4444" name="Gastos" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="beneficio" fill="#3b82f6" name="Beneficio" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};


export const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ partners, partnerMetrics, onBalanceCardClick }) => {
  const { currentUser } = useAuth();
  const { partnerBalances } = useData();

  const totalPartnerBalance = useMemo(() => {
    return partnerBalances.reduce((sum, b) => sum + b.balance, 0);
  }, [partnerBalances]);

  const overallStats = useMemo(() => {
    const totalPartners = partners.filter(p => !p.isDeleted).length;
    const totalNetProfit = partnerMetrics.reduce((sum, metric) => sum + metric.netProfit, 0);
    const topPerformer = partnerMetrics.length > 0 ? partnerMetrics[0] : null;
    
    const performanceDistribution = {
      Excelente: partnerMetrics.filter(p => p.performanceLevel === 'Excelente').length,
      Bueno: partnerMetrics.filter(p => p.performanceLevel === 'Bueno').length,
      Regular: partnerMetrics.filter(p => p.performanceLevel === 'Regular').length,
      Bajo: partnerMetrics.filter(p => p.performanceLevel === 'Bajo').length,
    };

    return {
      totalPartners,
      totalNetProfit,
      topPerformer,
      performanceDistribution
    };
  }, [partners, partnerMetrics]);
  
  const chartData = Object.entries(overallStats.performanceDistribution).map(([name, value]) => ({ name, Socios: value }));

  const topFivePartners = useMemo(() => {
    return partnerMetrics.slice(0, 5);
  }, [partnerMetrics]);

  const lowPerformancePartners = useMemo(() => {
    return partnerMetrics.filter(p => p.performanceLevel === 'Bajo');
  }, [partnerMetrics]);

  const getPerformanceBadge = (level: PartnerMetric['performanceLevel']) => {
    switch (level) {
      case 'Excelente': return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Excelente</Badge>;
      case 'Bueno': return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Bueno</Badge>;
      case 'Regular': return <Badge variant="secondary">Regular</Badge>;
      case 'Bajo': return <Badge variant="destructive">Bajo</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Socios Activos</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStats.totalPartners}</div>
            <p className="text-xs text-muted-foreground">Total de socios en el sistema.</p>
          </CardContent>
        </Card>
        
        <InteractiveMetricCard
          title="Saldo Total con Socios"
          value={formatCurrency(totalPartnerBalance)}
          description={`${partnerBalances.length} socios con saldo`}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          onClick={onBalanceCardClick}
          variant={totalPartnerBalance >= 0 ? "success" : "danger"}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rentabilidad Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overallStats.totalNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(overallStats.totalNetProfit)}
            </div>
            <p className="text-xs text-muted-foreground">Beneficio neto combinado.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Award className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{overallStats.topPerformer?.partnerName || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {overallStats.topPerformer ? `Beneficio: ${formatCurrency(overallStats.topPerformer.netProfit)}` : 'No hay datos'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Rendimiento</CardTitle>
            <CardDescription>Clasificación de socios según su rentabilidad.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false}/>
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'hsl(var(--muted))'}}/>
                    <Bar dataKey="Socios" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Socios por Rentabilidad</CardTitle>
            <CardDescription>Los socios más rentables del período.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Socio</TableHead>
                  <TableHead>Vehículos</TableHead>
                  <TableHead className="text-right">Beneficio Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topFivePartners.map(p => (
                  <TableRow key={p.partnerId}>
                    <TableCell className="font-medium">{p.partnerName}</TableCell>
                    <TableCell>{p.vehicleCount}</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600">{formatCurrency(p.netProfit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      {currentUser?.role === 'superAdmin' && <CompanyComparisonDashboard />}

      {/* Low Performance Alerts */}
      {lowPerformancePartners.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Socios con Bajo Rendimiento</AlertTitle>
          <AlertDescription>
            <p>Los siguientes socios tienen una rentabilidad negativa. Se recomienda revisar los gastos de sus vehículos.</p>
            <ul className="mt-2 list-disc list-inside">
              {lowPerformancePartners.map(p => (
                <li key={p.partnerId}>
                  {p.partnerName}: <span className="font-semibold">{formatCurrency(p.netProfit)}</span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
