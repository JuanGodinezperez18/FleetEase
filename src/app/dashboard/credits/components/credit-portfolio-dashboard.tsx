"use client";

import React, { useMemo } from "react";
import type { CreditMetric, PortfolioAnalytics } from "@/hooks/use-credits-analytics";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, AlertTriangle, Target, TrendingUp, Siren } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useData } from "@/hooks/use-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { MetricCard } from "@/components/dashboard/components/MetricCard";

interface CreditPortfolioDashboardProps {
  creditMetrics: CreditMetric[];
  portfolioAnalytics: PortfolioAnalytics;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0e1117] p-3 shadow-xl">
        <p className="mb-1 text-xs font-semibold text-white/80">{label}</p>
        {payload.map((p: any, index: number) => (
          <p key={index} className="text-xs tabular-nums text-white/70">
            {`${p.name}: ${p.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const CreditPortfolioDashboard: React.FC<CreditPortfolioDashboardProps> = ({
  creditMetrics,
  portfolioAnalytics,
}) => {
  const { clients, credits } = useData();

  const { totalRemaining, portfolioHealthScore, behaviorDistribution } = portfolioAnalytics;

  const portfolioMetrics = useMemo(() => {
    const activeCreditMetrics = creditMetrics.filter(m => {
      const credit = credits.find(c => c.id === m.creditId);
      return credit?.status === "active";
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
      expectedWeeklyIncome,
    };
  }, [creditMetrics, credits]);

  const chartData = useMemo(
    () => [
      { name: "Puntual", créditos: behaviorDistribution.puntual },
      { name: "Retraso ligero", créditos: behaviorDistribution.ligeroRetraso },
      { name: "Retraso severo", créditos: behaviorDistribution.retrasoSevero },
    ],
    [behaviorDistribution]
  );

  const highRiskCredits = useMemo(() => {
    return creditMetrics
      .filter(m => m.paymentBehavior === "Retraso Severo" || m.paymentBehavior === "Ligero Retraso")
      .sort((a, b) => b.weeksOverdue - a.weeksOverdue)
      .slice(0, 5);
  }, [creditMetrics]);

  const clientMap = useMemo(
    () => new Map(clients.map(c => [c.id, `${c.firstname} ${c.lastname}`])),
    [clients]
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Saldo por cobrar"
          value={formatCurrency(totalRemaining)}
          description={`${portfolioMetrics.totalActive} créditos activos`}
          icon={<DollarSign className="h-5 w-5" strokeWidth={1.75} />}
          variant="warning"
        />
        <MetricCard
          title="Ingreso semanal"
          value={formatCurrency(portfolioMetrics.expectedWeeklyIncome)}
          description="Esperado de activos"
          icon={<TrendingUp className="h-5 w-5" strokeWidth={1.75} />}
          variant="success"
        />
        <MetricCard
          title="Tasa de morosidad"
          value={`${portfolioMetrics.delinquencyRate.toFixed(1)}%`}
          description={`${portfolioMetrics.delinquentCredits} con +2 sem. atraso`}
          icon={<AlertTriangle className="h-5 w-5" strokeWidth={1.75} />}
          variant={portfolioMetrics.delinquencyRate > 20 ? "danger" : "warning"}
          progress={Math.min(100, portfolioMetrics.delinquencyRate)}
        />
        <MetricCard
          title="Salud del portafolio"
          value={`${portfolioHealthScore}/100`}
          description="Por puntualidad de pagos"
          icon={<Target className="h-5 w-5" strokeWidth={1.75} />}
          variant={portfolioHealthScore >= 70 ? "success" : portfolioHealthScore >= 40 ? "warning" : "danger"}
        />
      </div>

      {portfolioMetrics.highRiskCredits > 0 && (
        <div className="flex items-start gap-3 rounded-[16px] border border-rose-400/25 bg-rose-400/[0.06] p-3 text-sm text-rose-200">
          <Siren className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <div>
            <p className="font-semibold">Atención requerida</p>
            <p className="mt-0.5 text-rose-200/80">
              {portfolioMetrics.highRiskCredits} crédito(s) con más de 3 semanas de atraso.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-heading text-base font-semibold text-white">Comportamiento de pago</h2>
            <p className="mt-0.5 text-xs text-white/40">Distribución del portafolio</p>
          </div>
          <div className="h-[280px] p-4 sm:p-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={110}
                  tickLine={false}
                  axisLine={false}
                  stroke="rgba(255,255,255,0.35)"
                  fontSize={11}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="créditos" fill="#d7ff3f" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-white">
              <AlertTriangle className="h-4 w-4 text-rose-300" strokeWidth={1.75} />
              Top 5 alto riesgo
            </h2>
            <p className="mt-0.5 text-xs text-white/40">Requieren seguimiento</p>
          </div>
          <div className="p-4 sm:p-5">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Cliente</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wide text-white/35">Atraso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {highRiskCredits.length > 0 ? (
                  highRiskCredits.map(metric => (
                    <TableRow key={metric.creditId} className="border-white/[0.04] hover:bg-white/[0.02]">
                      <TableCell>
                        <Link
                          href={`/dashboard/clients/${metric.clientId}/transactions`}
                          className="font-medium text-[#d7ff3f] hover:underline"
                        >
                          {clientMap.get(metric.clientId) || `ID: ${metric.clientId.slice(0, 6)}…`}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-rose-300">
                        {metric.weeksOverdue} sem.
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableCell colSpan={2} className="py-8 text-center text-sm text-white/35">
                      No hay créditos de alto riesgo
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
};
