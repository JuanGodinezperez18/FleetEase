
"use client";

import React, { useMemo } from 'react';
import type { Client } from '@/types';
import type { ClientMetric } from '@/hooks/use-client-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, TrendingDown, UserX, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { StaggerContainer, StaggerItem } from '@/components/animations/modern-transitions';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { infallibleNormalizeDate } from '@/lib/date-utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ClientDashboardProps {
  clients: Client[];
  clientMetrics: ClientMetric[];
  onCardClick: (cardType: 'debtors' | 'criticalClients') => void;
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


export const ClientDashboard: React.FC<ClientDashboardProps> = ({ clients, clientMetrics, onCardClick }) => {
  const { toast } = useToast();
  
  const overallStats = useMemo(() => {
    const activeClients = clients.filter(c => c.status === 'active' && !c.isDeleted);
    const activeClientIds = new Set(activeClients.map(c => c.id));
    const activeClientMetrics = clientMetrics.filter(m => activeClientIds.has(m.clientId));

    const debtors = activeClientMetrics
      .filter(m => m.currentBalance > 0);
    
    const totalDebt = debtors.reduce((sum, m) => sum + m.currentBalance, 0);

    const behaviorCounts = activeClientMetrics.reduce((acc, metric) => {
      acc[metric.paymentBehavior] = (acc[metric.paymentBehavior] || 0) + 1;
      return acc;
    }, {} as Record<ClientMetric['paymentBehavior'], number>);
    
    const criticalClients = activeClientMetrics.filter(m => m.currentBalance > 6000);
      
    const topDebtors = [...debtors]
      .sort((a, b) => b.currentBalance - a.currentBalance)
      .slice(0, 5);
      
    const licensesToExpire = activeClientMetrics
        .filter(m => m.licenseStatus === 'Próxima a Vencer' || m.licenseStatus === 'Vencida')
        .sort((a,b) => (a.daysUntilLicenseExpiry || Infinity) - (b.daysUntilLicenseExpiry || Infinity))
        .slice(0, 5);

    return {
      activeClientCount: activeClients.length,
      totalDebt,
      debtorsCount: debtors.length,
      criticalClientsCount: criticalClients.length,
      expiringLicensesCount: licensesToExpire.length,
      behaviorDistribution: Object.entries(behaviorCounts).map(([name, value]) => ({ name, Clientes: value })),
      topDebtors,
      licensesToExpire,
    };
  }, [clients, clientMetrics]);
  
  const getBehaviorBadge = (level: ClientMetric['paymentBehavior']) => {
    switch (level) {
      case 'Excelente': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Excelente</Badge>;
      case 'Bueno': return <Badge className="bg-green-500 hover:bg-green-600">Bueno</Badge>;
      case 'Regular': return <Badge variant="secondary">Regular</Badge>;
      case 'Malo': return <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600">Malo</Badge>;
      case 'Crítico': return <Badge variant="destructive">Crítico</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getClientName = (clientId: string): string => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstname} ${client.lastname}` : 'Desconocido';
  };

  return (
    <div className="space-y-6">
      {/* React 19: StaggerContainer for animated card entrance */}
      <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.activeClientCount}</div>
              <p className="text-xs text-muted-foreground">Clientes con estado activo.</p>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onCardClick('debtors')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo por Cobrar</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(overallStats.totalDebt)}</div>
              <div className="text-xs text-muted-foreground flex justify-between items-center">
                <span>De {overallStats.debtorsCount} clientes deudores.</span>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onCardClick('criticalClients')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Críticos</CardTitle>
              <UserX className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.criticalClientsCount}</div>
              <p className="text-xs text-muted-foreground">Con deuda superior a $6,000.</p>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Licencias por Vencer</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.expiringLicensesCount}</div>
              <p className="text-xs text-muted-foreground">Vencen en menos de 30 días.</p>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Comportamiento de Pago</CardTitle>
            <CardDescription>Distribución de clientes por su historial de pagos.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overallStats.behaviorDistribution} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
                <Bar dataKey="Clientes" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top 5 Deudores</CardTitle>
            <CardDescription>Clientes con los saldos deudores más altos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Comportamiento</TableHead>
                        <TableHead className="text-right">Saldo Actual</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {overallStats.topDebtors.map(metric => (
                        <TableRow key={metric.clientId}>
                            <TableCell>
                                <Link href={`/dashboard/clients/${metric.clientId}/transactions`} className="font-medium text-primary hover:underline">{getClientName(metric.clientId)}</Link>
                            </TableCell>
                            <TableCell>{getBehaviorBadge(metric.paymentBehavior)}</TableCell>
                            <TableCell className="text-right font-mono text-destructive">{formatCurrency(metric.currentBalance)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Licencias Próximas a Vencer</CardTitle>
            <CardDescription>Clientes cuyas licencias requieren atención pronto.</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Fecha de Vencimiento</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                   {overallStats.licensesToExpire.map(metric => {
                        const client = clients.find(c => c.id === metric.clientId);
                        const expiryDate = client ? infallibleNormalizeDate(client.licenseExpiry) : null;
                        return (
                            <TableRow key={metric.clientId}>
                                <TableCell>
                                    <Link href={`/dashboard/clients/${metric.clientId}/documents`} className="font-medium text-primary hover:underline">{getClientName(metric.clientId)}</Link>
                                </TableCell>
                                <TableCell><Badge variant={metric.licenseStatus === 'Vencida' ? 'destructive' : 'secondary'}>{metric.licenseStatus}</Badge></TableCell>
                                <TableCell className="text-right font-mono">
                                    {expiryDate ? format(expiryDate, 'dd MMMM, yyyy', {locale: es}) : 'N/A'}
                                </TableCell>
                            </TableRow>
                        );
                   })}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
