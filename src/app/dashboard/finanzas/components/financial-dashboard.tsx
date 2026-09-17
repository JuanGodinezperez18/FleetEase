"use client";

import React, { useMemo } from 'react';
import type { FinancialAnalytics } from '@/hooks/use-financial-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, TrendingUp, TrendingDown, Users, Car, BarChart as BarChartIcon, AlertCircle, WalletCards, ArrowDownToLine } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, CartesianGrid } from 'recharts';

interface FinancialDashboardProps { analytics: FinancialAnalytics; }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) return <div className="p-2 bg-background border rounded-lg shadow-sm"><p className="font-bold">{label}</p>{payload.map((p: any, index: number) => <p key={index} style={{ color: p.fill || p.stroke }}>{`${p.name}: ${formatCurrency(p.value)}`}</p>)}</div>;
  return null;
};

const TrendChart = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const trendData = analytics.cashFlowAnalysis.map(month => ({ month: month.period, Ingresos: month.income, Gastos: month.expenses, Flujo: month.netFlow }));
  return <Card><CardHeader><CardTitle>Tendencia financiera</CardTitle><CardDescription>Ingresos reconocidos, gastos y flujo de efectivo mensual.</CardDescription></CardHeader><CardContent className="h-[350px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" /><XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${new Intl.NumberFormat('es-MX', { notation: 'compact' }).format(value as number)}`} /><Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} /><Legend /><Line type="monotone" dataKey="Ingresos" stroke="hsl(142, 76%, 36%)" strokeWidth={3} dot={{ r: 5, strokeWidth: 2 }} activeDot={{ r: 8 }} /><Line type="monotone" dataKey="Gastos" stroke="hsl(0, 84%, 60%)" strokeWidth={3} dot={{ r: 5, strokeWidth: 2 }} activeDot={{ r: 8 }} /><Line type="monotone" dataKey="Flujo" stroke="hsl(217, 91%, 60%)" strokeWidth={3} dot={{ r: 5, strokeWidth: 2 }} activeDot={{ r: 8 }} /></LineChart></ResponsiveContainer></CardContent></Card>;
};

const COLORS = ['hsl(142, 76%, 36%)','hsl(0, 84%, 60%)','hsl(217, 91%, 60%)','hsl(45, 93%, 47%)','hsl(262, 83%, 58%)','hsl(339, 82%, 52%)','hsl(24, 95%, 53%)','hsl(173, 58%, 39%)'];

const ExpenseCategoriesChart = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const chartData = analytics.expenseCategories.slice(0, 8).map(cat => ({ name: cat.name, value: cat.value }));
  return <Card><CardHeader><CardTitle>Distribución de Gastos por Categoría</CardTitle><CardDescription>Top 8 categorías con mayor gasto en el período.</CardDescription></CardHeader><CardContent className="h-[350px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">{chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip content={<CustomTooltip />} /></PieChart></ResponsiveContainer></CardContent></Card>;
};

const IncomeCategoriesBarChart = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const topCategories = analytics.incomeCategories.slice(0, 10);
  return <Card><CardHeader><CardTitle>Ingresos por categoría</CardTitle><CardDescription>Incluye ventas financiadas y excluye depósitos en garantía.</CardDescription></CardHeader><CardContent className="h-[350px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={topCategories} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" /><XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${new Intl.NumberFormat('es-MX', { notation: 'compact' }).format(value as number)}`} /><YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={150} /><Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} /><Bar dataKey="value" fill="hsl(142, 76%, 36%)" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>;
};

const Reconciliation = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const rows = [
    ['Ingresos operativos', analytics.operationalIncome, 'Rentas/servicios que generan utilidad'],
    ['Ventas de vehículos financiadas', analytics.vehicleSales, 'Venta reconocida; genera cartera, no efectivo inmediato'],
    ['Costo de vehículos vendidos', -analytics.vehicleSalesCost, 'Costo de adquisición asociado a las ventas financiadas'],
    ['Utilidad bruta de ventas financiadas', analytics.vehicleSalesGrossProfit, 'Venta financiada menos costo del vehículo'],
    ['Cobros de clientes', analytics.customerCollections, 'Cobranza, no nuevo ingreso'],
    ['Recuperación de créditos', analytics.creditCollections, 'Recuperación de cartera, no nueva venta'],
    ['Depósitos en garantía', analytics.securityDeposits, 'Entrada de efectivo, no utilidad'],
    ['Gastos', -analytics.totalExpenses, 'Reducen utilidad'],
    ['Pagos a socios', -analytics.partnerPayments, 'Salida de efectivo'],
    ['Pagos a proveedores', -analytics.supplierPayments, 'Salida de efectivo'],
    ['Otros pagos', -analytics.otherPayments, 'Salida de efectivo'],
  ];
  return <Card><CardHeader><CardTitle className="flex items-center gap-2"><WalletCards className="h-5 w-5" /> Conciliación financiera</CardTitle><CardDescription>Separa ventas, cartera, cobranza, utilidad y flujo de efectivo para evitar doble conteo.</CardDescription></CardHeader><CardContent><div className="grid gap-3 md:grid-cols-2"><div className="rounded-lg border p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4" /> Utilidad</div><div className={`mt-1 text-2xl font-bold ${analytics.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(analytics.netProfit)}</div><p className="mt-1 text-xs text-muted-foreground">Ingresos {formatCurrency(analytics.totalIncome)} − costo de ventas {formatCurrency(analytics.vehicleSalesCost)} − gastos {formatCurrency(analytics.totalExpenses)}</p></div><div className="rounded-lg border p-4"><div className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowDownToLine className="h-4 w-4" /> Flujo neto</div><div className={`mt-1 text-2xl font-bold ${analytics.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(analytics.netCashFlow)}</div><p className="mt-1 text-xs text-muted-foreground">Entradas {formatCurrency(analytics.cashInflow)} − salidas {formatCurrency(analytics.cashOutflow)}</p></div></div><div className="mt-4 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead className="text-right">Importe</TableHead><TableHead>Tratamiento</TableHead></TableRow></TableHeader><TableBody>{rows.map(([label, value, treatment]) => <TableRow key={label}><TableCell>{label}</TableCell><TableCell className={`text-right font-mono ${Number(value) < 0 ? 'text-red-600' : ''}`}>{formatCurrency(Number(value))}</TableCell><TableCell className="text-muted-foreground text-sm">{treatment}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>;
};

const FinancialAlerts = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const alerts = useMemo(() => {
    const alertList: Array<{ type: 'warning' | 'error'; message: string }> = [];
    if (analytics.totalIncome > 0 && analytics.profitMargin < 10) alertList.push({ type: 'error', message: `Margen de beneficio bajo: ${analytics.profitMargin.toFixed(1)}%` });
    const highExpenses = analytics.expenseCategories.filter(cat => cat.value > 50000);
    if (highExpenses.length > 0) alertList.push({ type: 'warning', message: `${highExpenses.length} categoría(s) con gastos >$50,000` });
    return alertList;
  }, [analytics]);
  if (alerts.length === 0) return null;
  return <div className="space-y-2">{alerts.map((alert, i) => <Alert key={i} variant={alert.type === 'error' ? 'destructive' : 'default'}><AlertCircle className="w-4 h-4" /><AlertDescription>{alert.message}</AlertDescription></Alert>)}</div>;
};

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ analytics }) => {
  const { totalIncome, totalExpenses, netProfit, profitMargin, monthlyGrowth, topClients, topVehicles } = analytics;
  const getGrowthBadge = (value: number) => value > 5 ? <Badge className="bg-emerald-500 hover:bg-emerald-600">+{value.toFixed(1)}%</Badge> : value > -5 ? <Badge variant="secondary"> {value > 0 ? '+' : ''}{value.toFixed(1)}%</Badge> : <Badge variant="destructive">{value.toFixed(1)}%</Badge>;
  return <div className="space-y-6"><FinancialAlerts analytics={analytics} /><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6"><Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle><TrendingUp className="h-4 w-4 text-emerald-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div><div className="text-xs text-muted-foreground flex items-center gap-1">Crecimiento mensual: {getGrowthBadge(monthlyGrowth.income)}</div></CardContent></Card><Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Ventas Financiadas</CardTitle><Car className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(analytics.vehicleSales)}</div><p className="text-xs text-muted-foreground">Venta reconocida, no efectivo cobrado</p></CardContent></Card><Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Gastos Totales</CardTitle><TrendingDown className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div><p className="text-xs text-muted-foreground">En el período analizado</p></CardContent></Card><Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Utilidad</CardTitle><DollarSign className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(netProfit)}</div><div className="text-xs text-muted-foreground flex items-center gap-1">Crecimiento mensual: {getGrowthBadge(monthlyGrowth.profit)}</div></CardContent></Card><Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Flujo de efectivo</CardTitle><ArrowDownToLine className="h-4 w-4 text-violet-500" /></CardHeader><CardContent><div className={`text-2xl font-bold ${analytics.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(analytics.netCashFlow)}</div><p className="text-xs text-muted-foreground">Entradas {formatCurrency(analytics.cashInflow)} · Salidas {formatCurrency(analytics.cashOutflow)}</p></CardContent></Card><Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Margen</CardTitle><BarChartIcon className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className={`text-2xl font-bold ${profitMargin >= 20 ? 'text-emerald-600' : profitMargin >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{profitMargin.toFixed(1)}%</div><p className="text-xs text-muted-foreground">Utilidad / ingresos totales</p></CardContent></Card></div><Reconciliation analytics={analytics} /><div className="grid gap-6 lg:grid-cols-1"><TrendChart analytics={analytics} /></div><div className="grid gap-6 lg:grid-cols-2"><ExpenseCategoriesChart analytics={analytics} /><IncomeCategoriesBarChart analytics={analytics} /></div><div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle className="flex items-center"><Users className="mr-2"/> Clientes más Rentables</CardTitle><CardDescription>Clientes que generan el mayor beneficio neto.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead className="text-right">Beneficio Neto</TableHead></TableRow></TableHeader><TableBody>{topClients.map(c => <TableRow key={c.id}><TableCell><Link href={`/dashboard/clients/${c.id}/transactions`} className="font-medium text-primary hover:underline">{c.name}</Link></TableCell><TableCell className="text-right font-mono text-emerald-600">{formatCurrency(c.netValue)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center"><Car className="mr-2"/> Vehículos más Productivos</CardTitle><CardDescription>Vehículos que generan el mayor beneficio neto.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Vehículo</TableHead><TableHead className="text-right">Beneficio Neto</TableHead></TableRow></TableHeader><TableBody>{topVehicles.map(v => <TableRow key={v.id}><TableCell><Link href={`/dashboard/vehicles/${v.id}`} className="font-medium text-primary hover:underline">{v.name}</Link></TableCell><TableCell className="text-right font-mono text-emerald-600">{formatCurrency(v.netValue)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></div></div>;
};
