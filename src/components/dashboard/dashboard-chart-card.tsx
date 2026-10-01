'use client';

import { useCallback, useMemo, useState } from 'react';
import { Activity, BarChart3, Car, CreditCard, ShieldAlert, Users } from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardWidget, MetricKPIData } from '@/types/dashboard';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';

interface DashboardChartCardProps {
  widget: DashboardWidget;
  allKPIs: Record<string, MetricKPIData>;
  onClick?: () => void;
}

const money = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const moneyText = (value: number) =>
  value < 0 ? `-${money.format(Math.abs(value))}` : `${money.format(value)}`;

function valueOf(allKPIs: Record<string, MetricKPIData>, id: string) {
  const value = allKPIs[id]?.value;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

/** Active sector expands + soft outer ring */
function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 7}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'brightness(1.1)', transition: 'all 0.2s ease-out' }}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 9}
        outerRadius={outerRadius + 13}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.32}
      />
    </g>
  );
}

export function DashboardChartCard({ widget, allKPIs, onClick }: DashboardChartCardProps) {
  const income = valueOf(allKPIs, 'income-month');
  const expenses = valueOf(allKPIs, 'expenses-month');
  const net = valueOf(allKPIs, 'net-income');
  const totalVehicles = valueOf(allKPIs, 'total-vehicles');
  const rentedVehicles = valueOf(allKPIs, 'vehicles-rented');
  const availableVehicles = valueOf(allKPIs, 'vehicles-available');
  const lent = valueOf(allKPIs, 'total-lent');
  const pending = valueOf(allKPIs, 'total-pending');
  const recovered = Math.max(lent - pending, 0);
  const overdueMaintenance = valueOf(allKPIs, 'maintenance-overdue');
  const soonMaintenance = valueOf(allKPIs, 'maintenance-soon');
  const healthyMaintenance = Math.max(totalVehicles - overdueMaintenance - soonMaintenance, 0);
  const totalFines = valueOf(allKPIs, 'total-multas');
  const pendingFines = valueOf(allKPIs, 'multas-pendientes');
  const paidFines = valueOf(allKPIs, 'multas-pagadas');
  const clients = valueOf(allKPIs, 'total-clients');
  const clientsDebt = valueOf(allKPIs, 'clients-with-debt');
  const criticalClients = valueOf(allKPIs, 'critical-clients');
  const debtNonCritical = Math.max(clientsDebt - criticalClients, 0);
  const healthyClients = Math.max(clients - clientsDebt, 0);

  const chart = (() => {
    switch (widget.dataKey) {
      case 'finance-summary-chart':
        return {
          kind: 'bar' as const,
          icon: BarChart3,
          description: 'Ingresos, gastos e ingreso neto del período seleccionado',
          data: [
            { name: 'Ingresos', value: income },
            { name: 'Gastos', value: expenses },
            { name: 'Neto', value: net },
          ],
        };
      case 'fleet-status-chart':
        return {
          kind: 'pie' as const,
          icon: Car,
          description: 'Distribución actual de vehículos operativos',
          data: [
            { name: 'Rentados', value: rentedVehicles },
            { name: 'Disponibles', value: availableVehicles },
          ],
        };
      case 'credit-portfolio-chart':
        return {
          kind: 'pie' as const,
          icon: CreditCard,
          description: 'Capital recuperado frente al saldo todavía pendiente',
          data: [
            { name: 'Recuperado', value: recovered },
            { name: 'Pendiente', value: pending },
          ],
        };
      case 'maintenance-chart':
        return {
          kind: 'pie' as const,
          icon: Activity,
          description: 'Estado de mantenimiento calculado con el kilometraje de la flota',
          data: [
            { name: 'Al día', value: healthyMaintenance },
            { name: 'Próximo', value: soonMaintenance },
            { name: 'Vencido', value: overdueMaintenance },
          ],
        };
      case 'fines-chart':
        return {
          kind: 'bar' as const,
          icon: ShieldAlert,
          description: `${totalFines} multas registradas: pendientes y pagadas`,
          data: [
            { name: 'Pendientes', value: pendingFines },
            { name: 'Pagadas', value: paidFines },
          ],
        };
      case 'client-risk-chart':
        return {
          kind: 'pie' as const,
          icon: Users,
          description: 'Clientes sin deuda, con deuda y deuda crítica',
          data: [
            { name: 'Sin deuda', value: healthyClients },
            { name: 'Deuda', value: debtNonCritical },
            { name: 'Críticos', value: criticalClients },
          ],
        };
      default:
        return null;
    }
  })();

  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const onPieEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

  const onPieLeave = useCallback(() => {
    setActiveIndex(undefined);
  }, []);

  const onLegendToggle = useCallback((index: number) => {
    setActiveIndex(prev => (prev === index ? undefined : index));
  }, []);

  if (!chart) return null;

  const total = chart.data.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
  const hasData = chart.data.some(item => item.value !== 0);
  const Icon = chart.icon;
  const isMoney =
    widget.dataKey === 'finance-summary-chart' || widget.dataKey === 'credit-portfolio-chart';

  const pieLabels =
    widget.dataKey === 'fleet-status-chart'
      ? ['#d7ff3f', '#667085']
      : widget.dataKey === 'credit-portfolio-chart'
        ? ['#d7ff3f', '#f59e0b']
        : ['#d7ff3f', '#f59e0b', '#ef4444'];

  const chartKey = `${widget.dataKey}-${chart.data.map(d => d.value).join('-')}`;

  const activeItem =
    activeIndex !== undefined && chart.data[activeIndex] ? chart.data[activeIndex] : null;
  const centerValue = activeItem ? activeItem.value : total;
  const centerLabel = activeItem
    ? activeItem.name
    : isMoney
      ? 'capital'
      : 'elementos';

  return (
    <article
      onClick={onClick}
      onKeyDown={event => {
        if (onClick && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick();
        }
      }}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : 'article'}
      className={cn(
        'group relative min-h-[292px] overflow-hidden rounded-[18px] border border-black/[0.08] bg-white p-5 text-[#0a0c12] shadow-[0_6px_22px_rgba(8,10,15,.05)]',
        'transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-black/[0.14] hover:shadow-[0_10px_28px_rgba(8,10,15,.08)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d7ff3f]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f7f2]',
        'dark:border-white/[0.08] dark:bg-[#0d1016] dark:text-white dark:shadow-[0_12px_40px_rgba(0,0,0,.18)] dark:hover:border-white/[0.15] dark:hover:shadow-[0_18px_48px_rgba(0,0,0,.28)] dark:focus-visible:ring-offset-[#080a0f]',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/40 dark:text-white/35">
              Analítica
            </p>
          </div>
          <h3 className="truncate font-heading text-[15px] font-semibold tracking-[-0.02em] text-[#0a0c12] dark:text-white">
            {widget.title}
          </h3>
          <p className="mt-1 max-w-[42rem] text-xs leading-5 text-black/45 dark:text-white/40">
            {chart.description}
          </p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/[0.08] bg-black/[0.03] transition-all duration-200 group-hover:border-[#d7ff3f]/35 group-hover:bg-[#d7ff3f]/[0.1] group-hover:scale-105 dark:border-white/[0.07] dark:bg-white/[0.025] dark:group-hover:border-[#d7ff3f]/25 dark:group-hover:bg-[#d7ff3f]/[0.08]">
          <Icon
            className="h-[17px] w-[17px] text-black/50 transition-colors duration-200 group-hover:text-[#5c6d08] dark:text-white/55 dark:group-hover:text-[#d7ff3f]"
            strokeWidth={1.7}
          />
        </div>
      </div>

      <div className="border-t border-black/[0.06] pt-2 dark:border-white/[0.05]">
        {!hasData ? (
          <EmptyState
            icon={Icon}
            title="Sin datos para mostrar"
            description="Prueba otro período o agrega registros para ver esta gráfica."
            compact
            className="h-[205px]"
          />
        ) : chart.kind === 'bar' ? (
          <ResponsiveContainer width="100%" height={205}>
            <BarChart
              key={chartKey}
              data={chart.data}
              margin={{ top: 14, right: 8, left: -18, bottom: 0 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fill: 'rgba(8,10,15,.45)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(8,10,15,.3)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={value => (isMoney ? moneyText(Number(value)) : String(value))}
              />
              <Tooltip
                cursor={{ fill: 'rgba(215,255,63,0.12)', radius: 6 }}
                contentStyle={{
                  background: 'var(--fe-surface, #fff)',
                  border: '1px solid rgba(8,10,15,.1)',
                  borderRadius: 10,
                  boxShadow: '0 12px 30px rgba(0,0,0,.12)',
                  color: 'var(--fe-text, #0a0c12)',
                }}
                formatter={value => [
                  isMoney ? moneyText(Number(value ?? 0)) : Number(value ?? 0),
                  isMoney ? 'Monto' : 'Cantidad',
                ]}
                labelStyle={{ color: 'inherit' }}
              />
              <Bar
                dataKey="value"
                radius={[6, 6, 2, 2]}
                fill="#d7ff3f"
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
                animationBegin={80}
                maxBarSize={52}
                activeBar={{
                  fill: '#c4eb2a',
                  stroke: '#a8c91f',
                  strokeWidth: 1.5,
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="relative h-[205px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart key={chartKey}>
                <Pie
                  data={chart.data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={57}
                  outerRadius={79}
                  paddingAngle={3}
                  stroke="none"
                  isAnimationActive
                  animationDuration={950}
                  animationEasing="ease-out"
                  animationBegin={60}
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  onClick={(_: unknown, index: number) => {
                    // Stop card onClick when interacting with the pie
                    setActiveIndex(prev => (prev === index ? undefined : index));
                  }}
                >
                  {chart.data.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={pieLabels[index % pieLabels.length]}
                      style={{
                        cursor: 'pointer',
                        outline: 'none',
                        opacity:
                          activeIndex === undefined || activeIndex === index ? 1 : 0.45,
                        transition: 'opacity 0.2s ease',
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--fe-surface, #fff)',
                    border: '1px solid rgba(8,10,15,.1)',
                    borderRadius: 10,
                    boxShadow: '0 12px 30px rgba(0,0,0,.12)',
                    color: 'var(--fe-text, #0a0c12)',
                  }}
                  formatter={value => [
                    isMoney ? `$${money.format(Number(value ?? 0))}` : Number(value ?? 0),
                    isMoney ? 'Monto' : 'Cantidad',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading text-[25px] font-semibold tabular-nums tracking-tight text-[#0a0c12] transition-all duration-200 dark:text-white">
                {isMoney ? moneyText(centerValue) : centerValue}
              </span>
              <span className="mt-0.5 max-w-[90px] truncate text-[9px] font-medium uppercase tracking-[0.14em] text-black/35 dark:text-white/25">
                {centerLabel}
              </span>
            </div>
          </div>
        )}
      </div>

      {hasData && (
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1.5 border-t border-black/[0.06] pt-3 text-[11px] text-black/50 dark:border-white/[0.05] dark:text-white/45">
          {chart.data.map((item, index) => {
            const isActive = activeIndex === index;
            const isDimmed = chart.kind === 'pie' && activeIndex !== undefined && !isActive;
            return (
              <button
                key={item.name}
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (chart.kind === 'pie') onLegendToggle(index);
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-all duration-150',
                  chart.kind === 'pie' && 'cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
                  isActive && 'bg-black/[0.06] dark:bg-white/[0.1]',
                  isDimmed && 'opacity-40'
                )}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: pieLabels[index % pieLabels.length] }}
                />
                <span>{item.name}</span>
                <strong
                  className={cn(
                    'font-medium tabular-nums',
                    isMoney && item.value < 0
                      ? 'text-rose-500 dark:text-rose-400'
                      : 'text-black/70 dark:text-white/70'
                  )}
                >
                  {isMoney ? moneyText(item.value) : item.value}
                </strong>
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}
