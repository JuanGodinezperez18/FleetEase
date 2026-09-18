
"use client";

import React, { useMemo } from 'react';
import type { Client } from '@/types';
import type { ClientMetric } from '@/hooks/use-client-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, TrendingDown, UserX, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { StaggerContainer, StaggerItem } from '@/components/animations/modern-transitions';
import { infallibleNormalizeDate } from '@/lib/date-utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  MetricCard,
  InteractiveMetricCard,
} from '@/components/dashboard/components/MetricCard';
import {
  PaymentRiskBadge,
  LicenseStatusBadge,
} from '@/components/clients/client-status-badges';

interface ClientDashboardProps {
  clients: Client[];
  clientMetrics: ClientMetric[];
  onCardClick: (cardType: 'debtors' | 'criticalClients') => void;
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

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ clients, clientMetrics, onCardClick }) => {
  const overallStats = useMemo(() => {
    const activeClients = clients.filter(c => c.status === 'active' && !c.isDeleted);
    const activeClientIds = new Set(activeClients.map(c => c.id));
    const activeClientMetrics = clientMetrics.filter(m => activeClientIds.has(m.clientId));

    const debtors = activeClientMetrics.filter(m => m.currentBalance > 0);
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
      .sort((a, b) => (a.daysUntilLicenseExpiry || Infinity) - (b.daysUntilLicenseExpiry || Infinity))
      .slice(0, 5);

    return {
      activeClientCount: activeClients.length,
      totalDebt,
      debtorsCount: debtors.length,
      criticalClientsCount: criticalClients.length,
      expiringLicensesCount: licensesToExpire.length,
      behaviorDistribution: Object.entries(behaviorCounts).map(([name, value]) => ({
        name,
        Clientes: value,
      })),
      topDebtors,
      licensesToExpire,
    };
  }, [clients, clientMetrics]);

  const getClientName = (clientId: string): string => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.firstname} ${client.lastname}` : 'Desconocido';
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <MetricCard
            title="Clientes activos"
            value={overallStats.activeClientCount}
            description="Con estado activo"
            icon={<Users className="h-5 w-5" strokeWidth={1.75} />}
          />
        </StaggerItem>
        <StaggerItem>
          <InteractiveMetricCard
            title="Saldo por cobrar"
            value={formatCurrency(overallStats.totalDebt)}
            description={`De ${overallStats.debtorsCount} deudores`}
            icon={<TrendingDown className="h-5 w-5" strokeWidth={1.75} />}
            variant={overallStats.totalDebt > 0 ? 'danger' : 'default'}
            onClick={() => onCardClick('debtors')}
          />
        </StaggerItem>
        <StaggerItem>
          <InteractiveMetricCard
            title="Clientes críticos"
            value={overallStats.criticalClientsCount}
            description="Deuda superior a $6,000"
            icon={<UserX className="h-5 w-5" strokeWidth={1.75} />}
            variant={overallStats.criticalClientsCount > 0 ? 'warning' : 'default'}
            onClick={() => onCardClick('criticalClients')}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Licencias por vencer"
            value={overallStats.expiringLicensesCount}
            description="En menos de 30 días"
            icon={<AlertTriangle className="h-5 w-5" strokeWidth={1.75} />}
            variant={overallStats.expiringLicensesCount > 0 ? 'warning' : 'default'}
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Analytics secundarios: en móvil quedan debajo de la lista vía orden del padre;
          aquí se mantienen para desktop. */}
      <div className="hidden gap-4 md:grid md:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-[20px] border-white/[0.07] bg-[#0e1117] text-white shadow-[0_18px_50px_rgba(0,0,0,.22)] lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Comportamiento de pago
            </CardTitle>
            <CardDescription className="text-xs text-white/40">
              Distribución por historial
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overallStats.behaviorDistribution} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={80}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="Clientes" fill="#d7ff3f" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border-white/[0.07] bg-[#0e1117] text-white shadow-[0_18px_50px_rgba(0,0,0,.22)] lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Top 5 deudores
            </CardTitle>
            <CardDescription className="text-xs text-white/40">
              Mayores saldos pendientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overallStats.topDebtors.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/35">Sin deudores activos</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/40">Cliente</TableHead>
                    <TableHead className="text-white/40">Riesgo</TableHead>
                    <TableHead className="text-right text-white/40">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overallStats.topDebtors.map(metric => (
                    <TableRow key={metric.clientId} className="border-white/[0.06] hover:bg-white/[0.03]">
                      <TableCell>
                        <Link
                          href={`/dashboard/clients/${metric.clientId}/transactions`}
                          className="font-medium text-white/90 hover:text-[#d7ff3f]"
                        >
                          {getClientName(metric.clientId)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <PaymentRiskBadge level={metric.paymentBehavior} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-rose-300">
                        {formatCurrency(metric.currentBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border-white/[0.07] bg-[#0e1117] text-white shadow-[0_18px_50px_rgba(0,0,0,.22)] lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Licencias próximas a vencer
            </CardTitle>
            <CardDescription className="text-xs text-white/40">
              Requieren atención pronto
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overallStats.licensesToExpire.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/35">Sin licencias por vencer</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/40">Cliente</TableHead>
                    <TableHead className="text-white/40">Estado</TableHead>
                    <TableHead className="text-right text-white/40">Vencimiento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overallStats.licensesToExpire.map(metric => {
                    const client = clients.find(c => c.id === metric.clientId);
                    const expiryDate = client ? infallibleNormalizeDate(client.licenseExpiry) : null;
                    return (
                      <TableRow key={metric.clientId} className="border-white/[0.06] hover:bg-white/[0.03]">
                        <TableCell>
                          <Link
                            href={`/dashboard/clients/${metric.clientId}/documents`}
                            className="font-medium text-white/90 hover:text-[#d7ff3f]"
                          >
                            {getClientName(metric.clientId)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <LicenseStatusBadge status={metric.licenseStatus} />
                        </TableCell>
                        <TableCell className="text-right font-mono text-white/70">
                          {expiryDate ? format(expiryDate, 'dd MMM yyyy', { locale: es }) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
