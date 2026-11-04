"use client";

import React, { useMemo } from "react";
import type { FinancialAnalytics } from "@/hooks/use-financial-analytics";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Car,
  BarChart as BarChartIcon,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";
import { MetricCard } from "@/components/dashboard/components/MetricCard";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animations";
import {
  TrendChart,
  ExpenseCategoriesChart,
  IncomeCategoriesBarChart,
} from "./financial-dashboard-charts";
import { Reconciliation, FinancialAlerts } from "./financial-dashboard-recon";
import { Section } from "./financial-dashboard-shared";

interface FinancialDashboardProps {
  analytics: FinancialAnalytics;
}

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

  return (
    <motion.div
      className="min-w-0 w-full max-w-full space-y-5 overflow-x-hidden sm:space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <FinancialAlerts analytics={analytics} />

      <motion.div
        variants={fadeInUp}
        className="grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6"
      >
        <MetricCard
          title="Ingresos"
          value={formatCurrencyCompact(totalIncome)}
          description={
            monthlyGrowth.income !== undefined
              ? `Crec. ${monthlyGrowth.income > 0 ? "+" : ""}${monthlyGrowth.income.toFixed(1)}%`
              : undefined
          }
          icon={<TrendingUp className="h-5 w-5" strokeWidth={1.75} />}
          variant="success"
          trend={monthlyGrowth.income}
        />
        <MetricCard
          title="Ventas financiadas"
          value={formatCurrencyCompact(analytics.vehicleSales)}
          description="Reconocidas, no cobradas"
          icon={<Car className="h-5 w-5" strokeWidth={1.75} />}
        />
        <MetricCard
          title="Gastos"
          value={formatCurrencyCompact(totalExpenses)}
          description="Período filtrado"
          icon={<TrendingDown className="h-5 w-5" strokeWidth={1.75} />}
          variant="danger"
          trend={monthlyGrowth.expenses}
        />
        <MetricCard
          title="Utilidad neta"
          value={formatCurrencyCompact(netProfit)}
          description={`Margen ${profitMargin.toFixed(1)}%`}
          icon={<DollarSign className="h-5 w-5" strokeWidth={1.75} />}
          variant={netProfit >= 0 ? "success" : "danger"}
          trend={monthlyGrowth.profit}
        />
        <MetricCard
          title="Flujo neto"
          value={formatCurrencyCompact(analytics.netCashFlow)}
          description={`In ${formatCurrencyCompact(analytics.cashInflow)} \u00b7 Out ${formatCurrencyCompact(
            analytics.cashOutflow
          )}`}
          icon={<BarChartIcon className="h-5 w-5" strokeWidth={1.75} />}
          variant={analytics.netCashFlow >= 0 ? "success" : "danger"}
        />
        <MetricCard
          title="Clientes activos"
          value={String(analytics.activeClients ?? topClients.length)}
          description="Con actividad en el período"
          icon={<Users className="h-5 w-5" strokeWidth={1.75} />}
        />
      </motion.div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <TrendChart analytics={analytics} />
        <ExpenseCategoriesChart analytics={analytics} />
      </div>

      <IncomeCategoriesBarChart analytics={analytics} />

      <Reconciliation analytics={analytics} />

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Section
          title={
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
              Clientes top
            </span>
          }
          description="Mayor valor neto"
        >
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                  Cliente
                </TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wide text-white/35">
                  Valor neto
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topClients.length === 0 ? (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell colSpan={2} className="py-6 text-center text-sm text-white/35">
                    Sin datos en el período
                  </TableCell>
                </TableRow>
              ) : (
                topClients.map(c => (
                  <TableRow key={c.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell>
                      <Link
                        href={`/dashboard/clients/${c.id}/transactions`}
                        className="font-medium text-[#d7ff3f] hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-emerald-300">
                      {formatCurrency(c.netValue)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Section>

        <Section
          title={
            <span className="inline-flex items-center gap-2">
              <Car className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
              Vehículos más productivos
            </span>
          }
          description="Mayor beneficio neto"
        >
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                  Vehículo
                </TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wide text-white/35">
                  Beneficio
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topVehicles.length === 0 ? (
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell colSpan={2} className="py-6 text-center text-sm text-white/35">
                    Sin datos en el período
                  </TableCell>
                </TableRow>
              ) : (
                topVehicles.map(v => (
                  <TableRow key={v.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                    <TableCell>
                      <Link
                        href={`/dashboard/vehicles/${v.id}`}
                        className="font-medium text-[#d7ff3f] hover:underline"
                      >
                        {v.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-emerald-300">
                      {formatCurrency(v.netValue)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Section>
      </div>
    </motion.div>
  );
};
