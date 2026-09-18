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
  WalletCards,
  ArrowDownToLine,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";
import { MetricCard } from "@/components/dashboard/components/MetricCard";

interface FinancialDashboardProps {
  analytics: FinancialAnalytics;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0e1117] p-3 shadow-xl">
        <p className="mb-1 text-xs font-semibold text-white/80">{label}</p>
        {payload.map((p: any, index: number) => (
          <p key={index} className="text-xs tabular-nums" style={{ color: p.fill || p.stroke }}>
            {`${p.name}: ${formatCurrency(p.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CHART_COLORS = {
  income: "#34d399",
  expense: "#fb7185",
  flow: "#60a5fa",
  grid: "rgba(255,255,255,0.06)",
  axis: "rgba(255,255,255,0.35)",
};

const PIE_COLORS = [
  "#34d399",
  "#fb7185",
  "#60a5fa",
  "#fbbf24",
  "#a78bfa",
  "#f472b6",
  "#fb923c",
  "#2dd4bf",
];

const Section = ({
  title,
  description,
  children,
}: {
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) => (
  <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
    <div className="border-b border-white/[0.06] px-5 py-4">
      <h2 className="font-heading text-base font-semibold text-white">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-white/40">{description}</p>}
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </section>
);

const TrendChart = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const trendData = analytics.cashFlowAnalysis.map(month => ({
    month: month.period,
    Ingresos: month.income,
    Gastos: month.expenses,
    Flujo: month.netFlow,
  }));
  return (
    <Section title="Tendencia financiera" description="Ingresos, gastos y flujo de efectivo mensual">
      <div className="h-[320px] sm:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis dataKey="month" stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke={CHART_COLORS.axis}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={value =>
                `$${new Intl.NumberFormat("es-MX", { notation: "compact" }).format(value as number)}`
              }
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }} />
            <Line type="monotone" dataKey="Ingresos" stroke={CHART_COLORS.income} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Gastos" stroke={CHART_COLORS.expense} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Flujo" stroke={CHART_COLORS.flow} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Section>
  );
};

const ExpenseCategoriesChart = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const chartData = analytics.expenseCategories.slice(0, 8).map(cat => ({ name: cat.name, value: cat.value }));
  return (
    <Section title="Gastos por categoría" description="Top 8 del período">
      <div className="h-[320px] sm:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Section>
  );
};

const IncomeCategoriesBarChart = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const topCategories = analytics.incomeCategories.slice(0, 10);
  return (
    <Section title="Ingresos por categoría" description="Excluye depósitos en garantía">
      <div className="h-[320px] sm:h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topCategories} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
            <XAxis
              type="number"
              stroke={CHART_COLORS.axis}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={value =>
                `$${new Intl.NumberFormat("es-MX", { notation: "compact" }).format(value as number)}`
              }
            />
            <YAxis type="category" dataKey="name" stroke={CHART_COLORS.axis} fontSize={11} tickLine={false} axisLine={false} width={120} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="value" fill={CHART_COLORS.income} radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Section>
  );
};

const Reconciliation = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const rows: [string, number, string][] = [
    ["Ingresos operativos", analytics.operationalIncome, "Rentas/servicios"],
    ["Ventas financiadas", analytics.vehicleSales, "Cartera, no efectivo"],
    ["Costo de ventas", -analytics.vehicleSalesCost, "Costo de adquisición"],
    ["Utilidad bruta ventas", analytics.vehicleSalesGrossProfit, "Venta − costo"],
    ["Cobros de clientes", analytics.customerCollections, "Cobranza"],
    ["Recuperación de créditos", analytics.creditCollections, "Cartera"],
    ["Depósitos en garantía", analytics.securityDeposits, "Efectivo, no utilidad"],
    ["Gastos", -analytics.totalExpenses, "Reducen utilidad"],
    ["Pagos a socios", -analytics.partnerPayments, "Salida de efectivo"],
    ["Pagos a proveedores", -analytics.supplierPayments, "Salida de efectivo"],
    ["Otros pagos", -analytics.otherPayments, "Salida de efectivo"],
  ];
  return (
    <Section
      title={
        <span className="inline-flex items-center gap-2">
          <WalletCards className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
          Conciliación financiera
        </span>
      }
      description="Separa utilidad y flujo para evitar doble conteo"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.75} />
            Utilidad
          </div>
          <p className={`mt-1 font-heading text-2xl font-semibold tabular-nums ${analytics.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {formatCurrency(analytics.netProfit)}
          </p>
          <p className="mt-1 text-[11px] text-white/35">
            Ingresos {formatCurrency(analytics.totalIncome)} − costo {formatCurrency(analytics.vehicleSalesCost)} − gastos{" "}
            {formatCurrency(analytics.totalExpenses)}
          </p>
        </div>
        <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <ArrowDownToLine className="h-3.5 w-3.5" strokeWidth={1.75} />
            Flujo neto
          </div>
          <p className={`mt-1 font-heading text-2xl font-semibold tabular-nums ${analytics.netCashFlow >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
            {formatCurrency(analytics.netCashFlow)}
          </p>
          <p className="mt-1 text-[11px] text-white/35">
            Entradas {formatCurrency(analytics.cashInflow)} − salidas {formatCurrency(analytics.cashOutflow)}
          </p>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Concepto</TableHead>
              <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wide text-white/35">Importe</TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Tratamiento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(([label, value, treatment]) => (
              <TableRow key={label} className="border-white/[0.04] hover:bg-white/[0.02]">
                <TableCell className="text-white/80">{label}</TableCell>
                <TableCell className={`text-right font-mono tabular-nums ${Number(value) < 0 ? "text-rose-300" : "text-white"}`}>
                  {formatCurrency(Number(value))}
                </TableCell>
                <TableCell className="text-xs text-white/40">{treatment}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Section>
  );
};

const FinancialAlerts = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const alerts = useMemo(() => {
    const list: Array<{ type: "warning" | "error"; message: string }> = [];
    if (analytics.totalIncome > 0 && analytics.profitMargin < 10) {
      list.push({ type: "error", message: `Margen bajo: ${analytics.profitMargin.toFixed(1)}%` });
    }
    const highExpenses = analytics.expenseCategories.filter(cat => cat.value > 50000);
    if (highExpenses.length > 0) {
      list.push({ type: "warning", message: `${highExpenses.length} categoría(s) con gastos > $50,000` });
    }
    return list;
  }, [analytics]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 rounded-[16px] border p-3 text-sm ${
            alert.type === "error"
              ? "border-rose-400/25 bg-rose-400/[0.06] text-rose-200"
              : "border-amber-400/25 bg-amber-400/[0.06] text-amber-200"
          }`}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>{alert.message}</span>
        </div>
      ))}
    </div>
  );
};

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ analytics }) => {
  const { totalIncome, totalExpenses, netProfit, profitMargin, monthlyGrowth, topClients, topVehicles } = analytics;

  return (
    <div className="space-y-5 sm:space-y-6">
      <FinancialAlerts analytics={analytics} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Ingresos"
          value={formatCurrency(totalIncome)}
          description={monthlyGrowth.income !== undefined ? `Crec. ${monthlyGrowth.income > 0 ? "+" : ""}${monthlyGrowth.income.toFixed(1)}%` : undefined}
          icon={<TrendingUp className="h-5 w-5" strokeWidth={1.75} />}
          variant="success"
          trend={monthlyGrowth.income}
        />
        <MetricCard
          title="Ventas financiadas"
          value={formatCurrency(analytics.vehicleSales)}
          description="Reconocidas, no cobradas"
          icon={<Car className="h-5 w-5" strokeWidth={1.75} />}
        />
        <MetricCard
          title="Gastos"
          value={formatCurrency(totalExpenses)}
          description="Período filtrado"
          icon={<TrendingDown className="h-5 w-5" strokeWidth={1.75} />}
          variant="danger"
        />
        <MetricCard
          title="Utilidad"
          value={formatCurrency(netProfit)}
          description={monthlyGrowth.profit !== undefined ? `Crec. ${monthlyGrowth.profit > 0 ? "+" : ""}${monthlyGrowth.profit.toFixed(1)}%` : undefined}
          icon={<DollarSign className="h-5 w-5" strokeWidth={1.75} />}
          variant={netProfit >= 0 ? "success" : "danger"}
          trend={monthlyGrowth.profit}
        />
        <MetricCard
          title="Flujo de efectivo"
          value={formatCurrency(analytics.netCashFlow)}
          description={`In ${formatCurrency(analytics.cashInflow)} · Out ${formatCurrency(analytics.cashOutflow)}`}
          icon={<ArrowDownToLine className="h-5 w-5" strokeWidth={1.75} />}
          variant={analytics.netCashFlow >= 0 ? "success" : "danger"}
        />
        <MetricCard
          title="Margen"
          value={`${profitMargin.toFixed(1)}%`}
          description="Utilidad / ingresos"
          icon={<BarChartIcon className="h-5 w-5" strokeWidth={1.75} />}
          variant={profitMargin >= 20 ? "success" : profitMargin >= 0 ? "warning" : "danger"}
        />
      </div>

      <Reconciliation analytics={analytics} />
      <TrendChart analytics={analytics} />

      <div className="grid gap-5 lg:grid-cols-2">
        <ExpenseCategoriesChart analytics={analytics} />
        <IncomeCategoriesBarChart analytics={analytics} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section
          title={
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
              Clientes más rentables
            </span>
          }
          description="Mayor beneficio neto"
        >
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Cliente</TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wide text-white/35">Beneficio</TableHead>
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
                      <Link href={`/dashboard/clients/${c.id}/transactions`} className="font-medium text-[#d7ff3f] hover:underline">
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
                <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Vehículo</TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wide text-white/35">Beneficio</TableHead>
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
                      <Link href={`/dashboard/vehicles/${v.id}`} className="font-medium text-[#d7ff3f] hover:underline">
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
    </div>
  );
};
