"use client";

import React, { useMemo, useState, useCallback } from "react";
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
  AreaChart,
  Area,
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
  Brush,
  Sector,
} from "recharts";
import { motion } from "framer-motion";
import { MetricCard } from "@/components/dashboard/components/MetricCard";
import { fadeInUp, staggerContainer, staggerItem } from "@/lib/animations";

interface FinancialDashboardProps {
  analytics: FinancialAnalytics;
}

/* -------------------------------------------------------------------------- */
/*  Shared helpers                                                            */
/* -------------------------------------------------------------------------- */

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0e1117]/95 p-3 shadow-2xl backdrop-blur-md">
        <p className="mb-1.5 text-xs font-semibold text-white/80">{label}</p>
        {payload.map((p: any, index: number) => (
          <div key={index} className="flex items-center gap-2 py-0.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: p.fill || p.stroke || p.color }}
            />
            <span className="text-xs text-white/50">{p.name}</span>
            <span className="ml-auto text-xs font-medium tabular-nums text-white">
              {formatCurrency(p.value)}
            </span>
          </div>
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

/** Active sector expands + outer glow on hover/tap */
function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: "brightness(1.12)", transition: "all 0.25s ease-out" }}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 14}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
      />
      {/* Label on active slice – only on larger screens via CSS we hide on mobile */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        className="fill-white text-[11px] font-semibold"
        style={{ pointerEvents: "none" }}
      >
        {payload?.name}
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        className="fill-white/60 text-[10px]"
        style={{ pointerEvents: "none" }}
      >
        {`${((percent ?? 0) * 100).toFixed(0)}%`}
      </text>
    </g>
  );
}

const Section = ({
  title,
  description,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.section
    variants={staggerItem}
    className={`overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)] ${className ?? ""}`}
  >
    <div className="border-b border-white/[0.06] px-4 py-3.5 sm:px-5 sm:py-4">
      <h2 className="font-heading text-sm font-semibold text-white sm:text-base">{title}</h2>
      {description && <p className="mt-0.5 text-[11px] text-white/40 sm:text-xs">{description}</p>}
    </div>
    <div className="p-3 sm:p-4 md:p-5">{children}</div>
  </motion.section>
);

/* -------------------------------------------------------------------------- */
/*  Trend chart – Area + Brush                                                */
/* -------------------------------------------------------------------------- */

const TrendChart = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const trendData = useMemo(
    () =>
      analytics.cashFlowAnalysis.map(month => ({
        month: month.period,
        Ingresos: month.income,
        Gastos: month.expenses,
        Flujo: month.netFlow,
      })),
    [analytics.cashFlowAnalysis]
  );

  const chartKey = useMemo(
    () => trendData.map(d => `${d.Ingresos}-${d.Gastos}-${d.Flujo}`).join("|"),
    [trendData]
  );

  return (
    <Section title="Tendencia financiera" description="Ingresos, gastos y flujo de efectivo · arrastra para hacer zoom">
      <div className="h-[260px] xs:h-[280px] sm:h-[320px] md:h-[360px] lg:h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart key={chartKey} data={trendData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.income} stopOpacity={0.35} />
                <stop offset="95%" stopColor={CHART_COLORS.income} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.expense} stopOpacity={0.3} />
                <stop offset="95%" stopColor={CHART_COLORS.expense} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradFlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.flow} stopOpacity={0.25} />
                <stop offset="95%" stopColor={CHART_COLORS.flow} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
            <XAxis
              dataKey="month"
              stroke={CHART_COLORS.axis}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              stroke={CHART_COLORS.axis}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={value =>
                `$${new Intl.NumberFormat("es-MX", { notation: "compact" }).format(value as number)}`
              }
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)", paddingTop: 4 }}
              iconType="circle"
              iconSize={8}
            />
            <Area
              type="monotone"
              dataKey="Ingresos"
              stroke={CHART_COLORS.income}
              strokeWidth={2.25}
              fill="url(#gradIncome)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#0e1117" }}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
            />
            <Area
              type="monotone"
              dataKey="Gastos"
              stroke={CHART_COLORS.expense}
              strokeWidth={2.25}
              fill="url(#gradExpense)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#0e1117" }}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
              animationBegin={80}
            />
            <Area
              type="monotone"
              dataKey="Flujo"
              stroke={CHART_COLORS.flow}
              strokeWidth={2.25}
              fill="url(#gradFlow)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#0e1117" }}
              isAnimationActive
              animationDuration={900}
              animationEasing="ease-out"
              animationBegin={160}
            />
            {trendData.length > 4 && (
              <Brush
                dataKey="month"
                height={22}
                stroke="rgba(255,255,255,0.15)"
                fill="rgba(255,255,255,0.03)"
                travellerWidth={8}
                tickFormatter={() => ""}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Section>
  );
};

/* -------------------------------------------------------------------------- */
/*  Expense pie – interactive                                                 */
/* -------------------------------------------------------------------------- */

const ExpenseCategoriesChart = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const chartData = useMemo(
    () => analytics.expenseCategories.slice(0, 8).map(cat => ({ name: cat.name, value: cat.value })),
    [analytics.expenseCategories]
  );
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);
  const onEnter = useCallback((_: any, index: number) => setActiveIndex(index), []);
  const onLeave = useCallback(() => setActiveIndex(undefined), []);

  const chartKey = useMemo(() => chartData.map(d => d.value).join("-"), [chartData]);
  const total = useMemo(() => chartData.reduce((s, d) => s + d.value, 0), [chartData]);

  return (
    <Section title="Gastos por categoría" description="Top 8 del período · toca un segmento">
      <div className="relative h-[260px] sm:h-[300px] md:h-[320px]">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-white/35">Sin datos</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart key={chartKey}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="48%"
                outerRadius="72%"
                paddingAngle={2.5}
                dataKey="value"
                stroke="none"
                isAnimationActive
                animationDuration={950}
                animationEasing="ease-out"
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
                onClick={onEnter}
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                    style={{ cursor: "pointer", outline: "none" }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
        {/* Center total – only when no slice is active */}
        {activeIndex === undefined && chartData.length > 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-lg font-semibold tabular-nums text-white sm:text-xl">
              {formatCurrency(total)}
            </span>
            <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-white/30">
              total gastos
            </span>
          </div>
        )}
      </div>
      {/* Legend – touch friendly */}
      {chartData.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1.5 border-t border-white/[0.05] pt-3">
          {chartData.map((item, index) => (
            <button
              key={item.name}
              type="button"
              onClick={() => setActiveIndex(i => (i === index ? undefined : index))}
              className={`flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] transition-colors ${
                activeIndex === index ? "bg-white/10 text-white" : "text-white/45 hover:text-white/70"
              }`}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
              />
              <span className="max-w-[90px] truncate sm:max-w-none">{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </Section>
  );
};

/* -------------------------------------------------------------------------- */
/*  Income bar chart                                                          */
/* -------------------------------------------------------------------------- */

const IncomeCategoriesBarChart = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const topCategories = useMemo(
    () => analytics.incomeCategories.slice(0, 10),
    [analytics.incomeCategories]
  );
  const chartKey = useMemo(() => topCategories.map(c => c.value).join("-"), [topCategories]);

  return (
    <Section title="Ingresos por categoría" description="Excluye depósitos en garantía">
      <div className="h-[260px] sm:h-[300px] md:h-[320px]">
        {topCategories.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-white/35">Sin datos</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              key={chartKey}
              data={topCategories}
              layout="vertical"
              margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
              <XAxis
                type="number"
                stroke={CHART_COLORS.axis}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={value =>
                  `$${new Intl.NumberFormat("es-MX", { notation: "compact" }).format(value as number)}`
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke={CHART_COLORS.axis}
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={100}
                tick={{ width: 95 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar
                dataKey="value"
                fill={CHART_COLORS.income}
                radius={[0, 6, 6, 0]}
                maxBarSize={28}
                isAnimationActive
                animationDuration={850}
                animationEasing="ease-out"
                activeBar={{
                  fill: "#6ee7b7",
                  stroke: "#34d399",
                  strokeWidth: 1,
                  radius: [0, 8, 8, 0],
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Section>
  );
};

/* -------------------------------------------------------------------------- */
/*  Reconciliation + alerts (unchanged logic)                                 */
/* -------------------------------------------------------------------------- */

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
          <p
            className={`mt-1 font-heading text-2xl font-semibold tabular-nums ${
              analytics.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {formatCurrency(analytics.netProfit)}
          </p>
          <p className="mt-1 text-[11px] text-white/35">
            Ingresos {formatCurrency(analytics.totalIncome)} − costo{" "}
            {formatCurrency(analytics.vehicleSalesCost)} − gastos {formatCurrency(analytics.totalExpenses)}
          </p>
        </div>
        <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <ArrowDownToLine className="h-3.5 w-3.5" strokeWidth={1.75} />
            Flujo neto
          </div>
          <p
            className={`mt-1 font-heading text-2xl font-semibold tabular-nums ${
              analytics.netCashFlow >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {formatCurrency(analytics.netCashFlow)}
          </p>
          <p className="mt-1 text-[11px] text-white/35">
            Entradas {formatCurrency(analytics.cashInflow)} − salidas{" "}
            {formatCurrency(analytics.cashOutflow)}
          </p>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                Concepto
              </TableHead>
              <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wide text-white/35">
                Importe
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                Tratamiento
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(([label, value, treatment]) => (
              <TableRow key={label} className="border-white/[0.04] hover:bg-white/[0.02]">
                <TableCell className="text-white/80">{label}</TableCell>
                <TableCell
                  className={`text-right font-mono tabular-nums ${
                    Number(value) < 0 ? "text-rose-300" : "text-white"
                  }`}
                >
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
      list.push({
        type: "warning",
        message: `${highExpenses.length} categoría(s) con gastos > $50,000`,
      });
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

/* -------------------------------------------------------------------------- */
/*  Main export                                                               */
/* -------------------------------------------------------------------------- */

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
      className="space-y-5 sm:space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <FinancialAlerts analytics={analytics} />

      <motion.div
        variants={fadeInUp}
        className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <MetricCard
          title="Ingresos"
          value={formatCurrency(totalIncome)}
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
          description={
            monthlyGrowth.profit !== undefined
              ? `Crec. ${monthlyGrowth.profit > 0 ? "+" : ""}${monthlyGrowth.profit.toFixed(1)}%`
              : undefined
          }
          icon={<DollarSign className="h-5 w-5" strokeWidth={1.75} />}
          variant={netProfit >= 0 ? "success" : "danger"}
          trend={monthlyGrowth.profit}
        />
        <MetricCard
          title="Flujo de efectivo"
          value={formatCurrency(analytics.netCashFlow)}
          description={`In ${formatCurrency(analytics.cashInflow)} · Out ${formatCurrency(
            analytics.cashOutflow
          )}`}
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
      </motion.div>

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
                <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                  Cliente
                </TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wide text-white/35">
                  Beneficio
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
