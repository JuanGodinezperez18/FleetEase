"use client";

import React from 'react';
import type { FinancialAnalytics } from '@/hooks/use-financial-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Car,
  AlertTriangle,
  BarChart as BarChartIcon,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMemo } from 'react';

interface FinancialDashboardProps {
  analytics: FinancialAnalytics;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background border rounded-lg shadow-sm">
        <p className="font-bold">{label}</p>
        {payload.map((p: any, index: number) => (
            <p key={index} style={{ color: p.fill || p.stroke }}>{`${p.name}: ${formatCurrency(p.value)}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

const TrendChart = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const trendData = analytics.cashFlowAnalysis.map(month => ({
    month: month.period,
    Ingresos: month.income,
    Gastos: month.expenses,
    Beneficio: month.netFlow,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia de Flujo de Caja</CardTitle>
        <CardDescription>Evolución mensual de ingresos, gastos y beneficio neto.</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${new Intl.NumberFormat('es-MX', { notation: 'compact' }).format(value as number)}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Line
              type="monotone"
              dataKey="Ingresos"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={3}
              dot={{ r: 5, strokeWidth: 2 }}
              activeDot={{ r: 8 }}
            />
            <Line
              type="monotone"
              dataKey="Gastos"
              stroke="hsl(0, 84%, 60%)"
              strokeWidth={3}
              dot={{ r: 5, strokeWidth: 2 }}
              activeDot={{ r: 8 }}
            />
            <Line
              type="monotone"
              dataKey="Beneficio"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={3}
              dot={{ r: 5, strokeWidth: 2 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const COLORS = [
  'hsl(142, 76%, 36%)', // green
  'hsl(0, 84%, 60%)',   // red
  'hsl(217, 91%, 60%)', // blue
  'hsl(45, 93%, 47%)',  // yellow
  'hsl(262, 83%, 58%)', // purple
  'hsl(339, 82%, 52%)', // pink
  'hsl(24, 95%, 53%)',  // orange
  'hsl(173, 58%, 39%)', // teal
];

const ExpenseCategoriesChart = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const topCategories = analytics.expenseCategories.slice(0, 8);
  const chartData = topCategories.map(cat => ({
    name: cat.name,
    value: cat.value,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución de Gastos por Categoría</CardTitle>
        <CardDescription>Top 8 categorías con mayor gasto en el período.</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const IncomeCategoriesBarChart = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const topCategories = analytics.incomeCategories.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Categorías de Ingresos</CardTitle>
        <CardDescription>Las 10 categorías que generan más ingresos.</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topCategories} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${new Intl.NumberFormat('es-MX', { notation: 'compact' }).format(value as number)}`}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={120}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
            <Bar
              dataKey="value"
              fill="hsl(142, 76%, 36%)"
              radius={[0, 8, 8, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

const FinancialAlerts = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const alerts = useMemo(() => {
    const alertList: Array<{ type: 'warning' | 'error'; message: string }> = [];
    
    // Alerta de margen bajo
    if (analytics.profitMargin < 10) {
      alertList.push({
        type: 'error',
        message: `Margen de beneficio crítico: ${analytics.profitMargin.toFixed(1)}%`
      });
    }
    
    // Alerta de gastos altos
    const highExpenses = analytics.expenseCategories.filter(cat => cat.value > 50000);
    if (highExpenses.length > 0) {
      alertList.push({
        type: 'warning',
        message: `${highExpenses.length} categoría(s) con gastos >$50,000`
      });
    }
    
    return alertList;
  }, [analytics]);
  
  if (alerts.length === 0) return null;
  
  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <Alert key={i} variant={alert.type === 'error' ? 'destructive' : 'default'}>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
};


export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ analytics }) => {
  const {
    totalIncome,
    totalExpenses,
    netProfit,
    profitMargin,
    monthlyGrowth,
    topClients,
    topVehicles,
  } = analytics;
  
  const getGrowthBadge = (value: number) => {
      if (value > 5) return <Badge className="bg-emerald-500 hover:bg-emerald-600">+{value.toFixed(1)}%</Badge>;
      if (value > -5) return <Badge variant="secondary"> {value > 0 ? '+' : ''}{value.toFixed(1)}%</Badge>;
      return <Badge variant="destructive">{value.toFixed(1)}%</Badge>;
  }

  return (
    <div className="space-y-6">
      <FinancialAlerts analytics={analytics} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
                Crecimiento mensual: {getGrowthBadge(monthlyGrowth.income)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">En el período analizado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beneficio Neto</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(netProfit)}
            </div>
             <div className="text-xs text-muted-foreground flex items-center gap-1">
                Crecimiento mensual: {getGrowthBadge(monthlyGrowth.profit)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen de Beneficio</CardTitle>
            <BarChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profitMargin >= 20 ? 'text-emerald-600' : profitMargin >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                {profitMargin.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Beneficio neto / Ingresos</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <TrendChart analytics={analytics} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ExpenseCategoriesChart analytics={analytics} />
        <IncomeCategoriesBarChart analytics={analytics} />
      </div>

       <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Users className="mr-2"/> Clientes más Rentables</CardTitle>
            <CardDescription>Clientes que generan el mayor beneficio neto.</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Beneficio Neto</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {topClients.map(c => (
                        <TableRow key={c.id}>
                            <TableCell><Link href={`/dashboard/clients/${c.id}/transactions`} className="font-medium text-primary hover:underline">{c.name}</Link></TableCell>
                            <TableCell className="text-right font-mono text-emerald-600">{formatCurrency(c.netValue)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Car className="mr-2"/> Vehículos más Productivos</CardTitle>
            <CardDescription>Vehículos que generan el mayor beneficio neto.</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Vehículo</TableHead>
                        <TableHead className="text-right">Beneficio Neto</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {topVehicles.map(v => (
                        <TableRow key={v.id}>
                            <TableCell><Link href={`/dashboard/vehicles/${v.id}`} className="font-medium text-primary hover:underline">{v.name}</Link></TableCell>
                            <TableCell className="text-right font-mono text-emerald-600">{formatCurrency(v.netValue)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};
