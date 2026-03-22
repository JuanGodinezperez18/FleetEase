
"use client";

import React, { useMemo } from 'react';
import type { Credit } from '@/types';
import type { CreditMetric, PortfolioAnalytics } from '@/hooks/use-credits-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingDown, AlertTriangle, BarChart as BarChartIcon, Target, TrendingUp, Siren } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useData } from '@/hooks/use-data';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


interface CreditPortfolioDashboardProps {
  creditMetrics: CreditMetric[];
  portfolioAnalytics: PortfolioAnalytics;
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

const HealthScoreGauge = ({ score }: { score: number }) => {
  const scoreColor =
    score >= 80 ? 'text-emerald-500' : score >= 60 ? 'text-green-500' : score >= 40 ? 'text-amber-500' : 'text-red-500';

  return (
    <Card className="flex flex-col items-center justify-center text-center">
      <CardHeader>
        <CardTitle>Salud del Portafolio</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-6xl font-bold ${scoreColor}`}>
          {score}
          <span className="text-2xl text-muted-foreground">/100</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Basado en puntualidad de pagos.</p>
      </CardContent>
    </Card>
  );
};


export const CreditPortfolioDashboard: React.FC<CreditPortfolioDashboardProps> = ({ creditMetrics, portfolioAnalytics }) => {
  const { clients, credits } = useData();

  const {
    totalPortfolioValue,
    totalPaid,
    totalRemaining,
    portfolioHealthScore,
    behaviorDistribution
  } = portfolioAnalytics;
  
  const portfolioMetrics = useMemo(() => {
    const activeCreditMetrics = creditMetrics.filter(m => {
        const credit = credits.find(c => c.id === m.creditId);
        return credit?.status === 'active';
    });
    const totalActive = activeCreditMetrics.length;

    const delinquentCredits = activeCreditMetrics.filter(m => m.weeksOverdue && m.weeksOverdue > 2);
    const delinquencyRate = totalActive > 0 ? (delinquentCredits.length / totalActive) * 100 : 0;
    
    const highRiskCredits = activeCreditMetrics.filter(m => m.weeksOverdue && m.weeksOverdue > 3);
    
    const expectedWeeklyIncome = activeCreditMetrics.reduce((sum, m) => {
        const credit = credits.find(c => c.id === m.creditId);
        return sum + (credit?.weeklyPayment || 0);
    }, 0);
    
    return {
        totalActive,
        delinquentCredits: delinquentCredits.length,
        delinquencyRate,
        highRiskCredits: highRiskCredits.length,
        expectedWeeklyIncome
    };
  }, [creditMetrics, credits]);
  
  const chartData = useMemo(() => [
      { name: 'Puntual', créditos: behaviorDistribution.puntual },
      { name: 'Retraso Ligero', créditos: behaviorDistribution.ligeroRetraso },
      { name: 'Retraso Severo', créditos: behaviorDistribution.retrasoSevero },
  ], [behaviorDistribution]);

  const highRiskCredits = useMemo(() => {
    return creditMetrics.filter(m => m.paymentBehavior === 'Retraso Severo' || m.paymentBehavior === 'Ligero Retraso')
      .sort((a,b) => b.weeksOverdue - a.weeksOverdue)
      .slice(0, 5);
  }, [creditMetrics]);

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, `${c.firstname} ${c.lastname}`])), [clients]);


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo por Cobrar</CardTitle>
                <DollarSign className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalRemaining)}</div>
                <p className="text-xs text-muted-foreground">De {portfolioMetrics.totalActive} créditos activos.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingreso Semanal Esperado</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(portfolioMetrics.expectedWeeklyIncome)}
              </div>
              <p className="text-xs text-muted-foreground">
                De {portfolioMetrics.totalActive} créditos activos
              </p>
            </CardContent>
          </Card>

          <Card className={cn(
            "cursor-pointer hover:shadow-lg transition-shadow",
            portfolioMetrics.delinquencyRate > 20 && "border-red-500"
          )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Morosidad</CardTitle>
              <AlertTriangle className={cn(
                "h-4 w-4",
                portfolioMetrics.delinquencyRate > 20 ? "text-red-500" : "text-orange-500"
              )} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {portfolioMetrics.delinquencyRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {portfolioMetrics.delinquentCredits} créditos con +2 semanas de atraso
              </p>
              <Progress 
                value={portfolioMetrics.delinquencyRate} 
                className="mt-2 bg-red-100" 
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Salud del Portafolio</CardTitle>
                <Target className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{portfolioHealthScore}/100</div>
                <p className="text-xs text-muted-foreground">Basado en puntualidad de pagos.</p>
            </CardContent>
          </Card>
      </div>
      
      {portfolioMetrics.highRiskCredits > 0 && (
        <Alert variant="destructive" className="mt-4">
          <Siren className="h-4 w-4" />
          <AlertTitle>¡Atención Requerida!</AlertTitle>
          <AlertDescription>
            {portfolioMetrics.highRiskCredits} crédito(s) con más de 3 semanas de atraso. 
            Requieren seguimiento urgente.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle>Distribución de Comportamiento de Pago</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={100} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }}/>
                      <Bar dataKey="créditos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><AlertTriangle className="mr-2 text-destructive"/> Top 5 Créditos de Alto Riesgo</CardTitle>
                <CardDescription>Créditos con retraso que requieren atención inmediata.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Semanas de Atraso</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {highRiskCredits.length > 0 ? highRiskCredits.map(metric => (
                            <TableRow key={metric.creditId}>
                                <TableCell>
                                    <Link href={`/dashboard/clients/${metric.clientId}/transactions`} className="font-medium hover:underline text-primary">
                                        {clientMap.get(metric.clientId) || `ID: ${metric.clientId.substring(0,6)}...`}
                                    </Link>
                                </TableCell>
                                <TableCell className="text-right font-mono text-destructive">{metric.weeksOverdue} sem.</TableCell>
                            </TableRow>
                         )) : (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center h-24">No hay créditos de alto riesgo.</TableCell>
                            </TableRow>
                         )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};
