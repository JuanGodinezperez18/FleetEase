'use client';

import { useCallback, useState } from 'react';
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
  /** Clic en un segmento del pie (nombre legible: Disponibles, Rentados, …) */
  onSegmentClick?: (segmentName: string) => void;
}

const money = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const moneyText = (value: number) =>
  value < 0 ? `-${money.format(Math.abs(value))}` : `${money.format(value)}`;

function valueOf(allKPIs: Record<string, MetricKPIData>, id: string) {
  const value = allKPIs[id]?.value;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

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

/** Tooltip con contraste correcto en tema claro y oscuro. */
function ChartTooltip({
  active,
  payload,
  label,
  isMoney,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; name?: string; color?: string }>;
  label?: string;
  isMoney: boolean;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const value = Number(item?.value ?? 0);
  const name = item?.name || label || '';

  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2 text-xs shadow-lg',
        'border-black/10 bg-white text-[#0a0c12]',
        'dark:border-white/15 dark:bg-[#12151c] dark:text-white'
      )}
    >
      <p className="font-semibold tracking-tight">{name}</p>
      <p className="mt-0.5 tabular-nums text-black/60 dark:text-white/70">
        {isMoney ? moneyText(value) : `${value} unidad${value === 1 ? '' : 'es'}`}
      </p>
    </div>
  );
}

/** Palette shared by series fills and legend swatches — never diverge. */
const SERIES_COLORS = {
  finance: ['#34d399', '#fb7185', '#60a5fa'], // ingresos / gastos / neto
  fines: ['#f59e0b', '#34d399'], // pendientes / pagadas
  fleet: ['#22d3ee', '#d7ff3f', '#f59e0b', '#94a3b8'],
  credit: ['#d7ff3f', '#f59e0b'],
  maintenance: ['#d7ff3f', '#f59e0b', '#ef4444'],
  clientRisk: ['#d7ff3f', '#f59e0b', '#ef4444'],
} as const;

export function DashboardChartCard({
  widget,
  allKPIs,
  onClick,
  onSegmentClick,
}: DashboardChartCardProps) {
  const income = valueOf(allKPIs, 'income-month');
  const expenses = valueOf(allKPIs, 'expenses-month');
  const net = valueOf(allKPIs, 'net-income');
  const totalVehicles = valueOf(allKPIs, 'total-vehicles');
  const rentedVehicles = valueOf(allKPIs, 'vehicles-rented');
  const availableVehicles = valueOf(allKPIs, 'vehicles-available');
  const maintenanceVehicles = valueOf(allKPIs, 'vehicles-maintenance');
  const inactiveVehicles = valueOf(allKPIs, 'vehicles-inactive');
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
          colors: SERIES_COLORS.finance as readonly string[],
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
          description: 'Distribución por asignación de cliente y estado operativo',
          colors: SERIES_COLORS.fleet as readonly string[],
          data: [
            { name: 'Rentados', value: rentedVehicles },
            { name: 'Disponibles', value: availableVehicles },
            { name: 'Mantenimiento', value: maintenanceVehicles },
            { name: 'Inactivos', value: inactiveVehicles },
          ].filter((d) => d.value > 0),
        };
      case 'credit-portfolio-chart':
        return {
          kind: 'pie' as const,
          icon: CreditCard,
          description: 'Capital recuperado frente al saldo todavía pendiente',
          colors: SERIES_COLORS.credit as readonly string[],
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
          colors: SERIES_COLORS.maintenance as readonly string[],
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
          colors: SERIES_COLORS.fines as readonly string[],
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
          colors: SERIES_COLORS.clientRisk as readonly string[],
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

  const onLegendToggle = useCallback(
    (index: number, name: string) => {
      setActiveIndex(prev => (prev === index ? undefined : index));
      onSegmentClick?.(name);
    },
    [onSegmentClick]
  );

  if (!chart) return null;

  const total = chart.data.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
  const hasData = chart.data.some(item => item.value !== 0);
  const Icon = chart.icon;
  const isMoney =
    widget.dataKey === 'finance-summary-chart' || widget.dataKey === 'credit-portfolio-chart';
  const seriesColors = chart.colors;

  const chartKey = `${widget.dataKey}-${chart.data.map(d => d.value).join('-')}`;

  const activeItem =
    activeIndex !== undefined && chart.data[activeIndex] ? chart.data[activeIndex] : null;
  const centerValue = activeItem ? activeItem.value : total;
  const centerLabel = activeItem ? activeItem.name : 'total';

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
        'group relative min-h-[292px] min-w-0 overflow-hidden rounded-[18px] border border-black/[0.08] bg-white p-3 text-[#0a0c12] shadow-[0_6px_22px_rgba(8,10,15,.05)] sm:p-5',
        'transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-black/[0.14] hover:shadow-[0_10px_28px_rgba(8,10,15,.08)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-lime)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f7f2]',
        'dark:border-white/[0.08] dark:bg-[#0d1016] dark:text-white dark:shadow-[0_12px_40px_rgba(0,0,0,.18)] dark:hover:border-white/[0.15] dark:hover:shadow-[0_18px_48px_rgba(0,0,0,.28)] dark:focus-visible:ring-offset-[#080a0f]',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--fe-lime)]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/50 dark:text-white/55">
              Analítica
            </p>
          </div>
          <h3 className="truncate font-heading text-[15px] font-semibold tracking-[-0.02em] text-[#0a0c12] dark:text-white">
            {widget.title}
          </h3>
          <p className="mt-1 max-w-[42rem] text-xs leading-5 text-black/55 dark:text-white/55">
            {chart.description}
            {widget.dataKey === 'fleet-status-chart' && (
              <span className="mt-0.5 block text-[11px] text-black/45 dark:text-white/45">
                Toca un segmento o la leyenda para ver el detalle.
              </span>
            )}
          </p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/[0.08] bg-black/[0.03] transition-all duration-200 group-hover:border-[var(--fe-lime)]/35 group-hover:bg-[var(--fe-lime)]/[0.1] group-hover:scale-105 dark:border-white/[0.07] dark:bg-white/[0.025] dark:group-hover:border-[var(--fe-lime)]/25 dark:group-hover:bg-[var(--fe-lime)]/[0.08]">
          <Icon
            className="h-[17px] w-[17px] text-black/50 transition-colors duration-200 group-hover:text-[#5c6d08] dark:text-white/55 dark:group-hover:text-[var(--fe-lime)]"
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
                tick={{ fill: 'currentColor', fontSize: 11, opacity: 0.55 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'currentColor', fontSize: 10, opacity: 0.45 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={value => (isMoney ? moneyText(Number(value)) : String(value))}
              />
              <Tooltip content={<ChartTooltip isMoney={isMoney} />} cursor={{ fill: 'rgba(215,255,63,0.12)', radius: 6 }} />
              <Bar
                dataKey="value"
                radius={[6, 6, 2, 2]}
                isAnimationActive
                animationDuration={900}
                animationEasing="ease-out"
                animationBegin={80}
                maxBarSize={52}
              >
                {chart.data.map((item, index) => (
                  <Cell
                    key={item.name}
                    fill={seriesColors[index % seriesColors.length]}
                  />
                ))}
              </Bar>
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
                  onClick={(data: any, index: number, event: any) => {
                    event?.stopPropagation?.();
                    const name = data?.name ?? chart.data[index]?.name;
                    setActiveIndex(index);
                    if (name) onSegmentClick?.(name);
                  }}
                >
                  {chart.data.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={seriesColors[index % seriesColors.length]}
                      style={{
                        cursor: onSegmentClick || chart.kind === 'pie' ? 'pointer' : 'default',
                        outline: 'none',
                        opacity:
                          activeIndex === undefined || activeIndex === index ? 1 : 0.45,
                        transition: 'opacity 0.2s ease',
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip isMoney={isMoney} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6">
              <span className="font-heading text-[clamp(1.25rem,5vw,1.75rem)] font-semibold tabular-nums tracking-tight text-[#0a0c12] dark:text-white">
                {isMoney ? moneyText(centerValue) : centerValue}
              </span>
              <span className="mt-0.5 max-w-[100px] truncate text-center text-[10px] font-medium uppercase tracking-[0.12em] text-black/50 dark:text-white/55">
                {centerLabel}
              </span>
            </div>
          </div>
        )}
      </div>

      {hasData && (
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1.5 border-t border-black/[0.06] pt-3 text-[11px] text-black/55 dark:border-white/[0.05] dark:text-white/55">
          {chart.data.map((item, index) => {
            const isActive = activeIndex === index;
            const isDimmed = chart.kind === 'pie' && activeIndex !== undefined && !isActive;
            const swatch = seriesColors[index % seriesColors.length];
            return (
              <button
                key={item.name}
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (chart.kind === 'pie') onLegendToggle(index, item.name);
                }}
                className={cn(
                  'flex min-h-11 min-w-0 max-w-full flex-wrap items-center gap-1.5 rounded-md px-2 py-1.5 transition-all duration-150',
                  chart.kind === 'pie' &&
                    'cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
                  isActive && 'bg-black/[0.06] dark:bg-white/[0.1]',
                  isDimmed && 'opacity-40'
                )}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: swatch }}
                  aria-hidden
                />
                <span>{item.name}</span>
                <strong
                  className={cn(
                    'break-words font-medium tabular-nums',
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
