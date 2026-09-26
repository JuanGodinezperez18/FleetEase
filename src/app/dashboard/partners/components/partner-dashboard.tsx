"use client";

import React, { useMemo } from 'react';
import type { Partner } from '@/types';
import type { PartnerMetric } from '@/hooks/use-partner-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Briefcase, DollarSign, Award, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useData } from '@/hooks/use-data';
import { useAuth } from '@/contexts/auth-provider';
import { MetricCard, InteractiveMetricCard } from '@/components/dashboard/components/MetricCard';
import { calculateNetProfit, sumRentalIncome } from '@/lib/financial-metrics';
import { PartnerPerformanceBadge } from '@/components/partners/partner-status-badges';

interface PartnerDashboardProps {
  partners: Partner[];
  partnerMetrics: PartnerMetric[];
  onBalanceCardClick: () => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0e1117] p-3 text-xs text-white shadow-xl">
        <p className="mb-1 font-semibold text-white/80">{label}</p>
        {payload.map((p: any, index: number) => (
          <p key={index} className="text-white/60">
            {p.name}: <span className="font-semibold text-white">{formatCurrency(p.value)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CompanyComparisonDashboard = () => {
  const { companies, financialRecords, clients, vehicles, partners } = useData();
  const analyticsByCompany = useMemo(() => {
    return companies
      .map(company => {
        const companyRecords = financialRecords.filter(r => r.companyId === company.id && !r.isDeleted);
        const totalIncome = sumRentalIncome(companyRecords);
        const beneficio = calculateNetProfit(companyRecords);
        const totalExpenses = totalIncome - beneficio;
        return {
          name: company.name.trim(),
          ingresos: totalIncome,
          gastos: totalExpenses,
          beneficio,
        };
      })
      .sort((a, b) => b.beneficio - a.beneficio);
  }, [companies, financialRecords, clients, vehicles, partners]);

  if (companies.length <= 1) return null;

  return (
    <Card className="hidden rounded-[20px] border-white/[0.07] bg-[#0e1117] text-white shadow-[0_18px_50px_rgba(0,0,0,.22)] md:block">
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          Comparativa de empresas
        </CardTitle>
        <CardDescription className="text-xs text-white/40">
          Ingresos, gastos y beneficio por empresa
        </CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={analyticsByCompany} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
            <Bar dataKey="ingresos" fill="#34d399" name="Ingresos" radius={[4, 4, 0, 0]} />
            <Bar dataKey="gastos" fill="#fb7185" name="Gastos" radius={[4, 4, 0, 0]} />
            <Bar dataKey="beneficio" fill="#d7ff3f" name="Beneficio" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export const PartnerDashboard: React.FC<PartnerDashboardProps> = ({
  partners,
  partnerMetrics,
  onBalanceCardClick,
}) => {
  const { currentUser } = useAuth();
  const { partnerBalances } = useData();

  const totalPartnerBalance = useMemo(
    () => partnerBalances.reduce((sum, b) => sum + b.balance, 0),
    [partnerBalances]
  );

  const overallStats = useMemo(() => {
    const activePartners = partners.filter(p => !p.isDeleted);
    const totalPartners = activePartners.length;
    const totalNetProfit = partnerMetrics.reduce((sum, metric) => sum + metric.netProfit, 0);
    const topMetric = partnerMetrics.length > 0 ? partnerMetrics[0] : null;
    // A "top performer" is only meaningful when there is a non-negative result and a real comparison set.
    const topPerformer =
      partnerMetrics.length > 1 && topMetric && topMetric.netProfit >= 0 ? topMetric : null;

    const performanceDistribution = {
      Excelente: partnerMetrics.filter(p => p.performanceLevel === 'Excelente').length,
      Bueno: partnerMetrics.filter(p => p.performanceLevel === 'Bueno').length,
      Regular: partnerMetrics.filter(p => p.performanceLevel === 'Regular').length,
      Bajo: partnerMetrics.filter(p => p.performanceLevel === 'Bajo').length,
    };

    return { totalPartners, totalNetProfit, topPerformer, performanceDistribution };
  }, [partners, partnerMetrics]);

  const chartData = Object.entries(overallStats.performanceDistribution).map(([name, value]) => ({
    name,
    Socios: value,
  }));

  const topFivePartners = useMemo(() => partnerMetrics.slice(0, 5), [partnerMetrics]);
  const lowPerformancePartners = useMemo(
    () => partnerMetrics.filter(p => p.performanceLevel === 'Bajo'),
    [partnerMetrics]
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Socios activos"
          value={overallStats.totalPartners}
          description="Total de socios en el sistema"
          icon={<Briefcase className="h-5 w-5" strokeWidth={1.75} />}
        />

        <InteractiveMetricCard
          title="Saldo con socios"
          value={formatCurrency(totalPartnerBalance)}
          description={`${partnerBalances.length} socios con saldo`}
          icon={<DollarSign className="h-5 w-5" strokeWidth={1.75} />}
          onClick={onBalanceCardClick}
          variant={totalPartnerBalance >= 0 ? 'success' : 'danger'}
          valueClassName="text-[26px] sm:text-[30px]"
        />

        <MetricCard
          title="Rentabilidad total"
          value={formatCurrency(overallStats.totalNetProfit)}
          description="Beneficio neto combinado"
          icon={<DollarSign className="h-5 w-5" strokeWidth={1.75} />}
          variant={overallStats.totalNetProfit >= 0 ? 'success' : 'danger'}
          valueClassName="text-[26px] sm:text-[30px]"
        />

        <MetricCard
          title="Top performer"
          value={overallStats.topPerformer?.partnerName || 'Sin comparación'}
          description={
            overallStats.topPerformer
              ? `Beneficio: ${formatCurrency(overallStats.topPerformer.netProfit)}`
              : 'Sin datos suficientes para comparar'
          }
          icon={<Award className="h-5 w-5" strokeWidth={1.75} />}
          valueClassName="text-[25px] sm:text-[30px]"
        />
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-2">
        <Card className="rounded-[20px] border-white/[0.07] bg-[#0e1117] text-white shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Distribución de rendimiento
            </CardTitle>
            <CardDescription className="text-xs text-white/40">
              Clasificación por rentabilidad
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="Socios" fill="#d7ff3f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border-white/[0.07] bg-[#0e1117] text-white shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Top 5 por rentabilidad
            </CardTitle>
            <CardDescription className="text-xs text-white/40">
              Mayores beneficios netos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topFivePartners.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/35">Sin datos de rentabilidad</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/40">Socio</TableHead>
                    <TableHead className="text-white/40">Vehículos</TableHead>
                    <TableHead className="text-right text-white/40">Beneficio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topFivePartners.map(p => (
                    <TableRow key={p.partnerId} className="border-white/[0.06] hover:bg-white/[0.03]">
                      <TableCell>
                        <div className="font-medium text-white/90">{p.partnerName}</div>
                        <div className="mt-0.5">
                          <PartnerPerformanceBadge level={p.performanceLevel} />
                        </div>
                      </TableCell>
                      <TableCell className="text-white/60">{p.vehicleCount}</TableCell>
                      <TableCell className="text-right font-mono text-emerald-300">
                        {formatCurrency(p.netProfit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {currentUser?.role === 'superAdmin' && <CompanyComparisonDashboard />}

      {lowPerformancePartners.length > 0 && (
        <div className="hidden rounded-[20px] border border-amber-400/20 bg-amber-400/[0.06] p-4 md:block">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-300">
            <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
            Bajo rendimiento
          </div>
          <ul className="space-y-1 text-sm text-white/60">
            {lowPerformancePartners.slice(0, 5).map(p => (
              <li key={p.partnerId}>
                {p.partnerName}
                <span className="text-white/35"> · {formatCurrency(p.netProfit)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};