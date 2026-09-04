'use client';

import { Activity, BarChart3, Car, CreditCard, ShieldAlert, Users } from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardWidget, MetricKPIData } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface DashboardChartCardProps {
  widget: DashboardWidget;
  allKPIs: Record<string, MetricKPIData>;
  onClick?: () => void;
}

const money = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

function valueOf(allKPIs: Record<string, MetricKPIData>, id: string) {
  const value = allKPIs[id]?.value;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
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
          description: 'Clientes con deuda frente al resto de clientes activos',
          data: [
            { name: 'Sin deuda', value: healthyClients },
            { name: 'Con deuda', value: clientsDebt },
            { name: 'Críticos', value: criticalClients },
          ],
        };
      default:
        return null;
    }
  })();

  if (!chart) return null;

  const total = chart.data.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
  const hasData = chart.data.some(item => item.value !== 0);
  const Icon = chart.icon;
  const isMoney = widget.dataKey === 'finance-summary-chart' || widget.dataKey === 'credit-portfolio-chart';
  const pieLabels = widget.dataKey === 'fleet-status-chart'
    ? ['#d7ff3f', '#5f6675']
    : widget.dataKey === 'credit-portfolio-chart'
      ? ['#d7ff3f', '#f59e0b']
      : widget.dataKey === 'maintenance-chart'
        ? ['#d7ff3f', '#f59e0b', '#ef4444']
        : ['#d7ff3f', '#f59e0b', '#ef4444'];

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
        'group relative min-h-[300px] overflow-hidden rounded-[22px] border border-white/[0.07] bg-[#0e1117] p-5 shadow-[0_18px_50px_rgba(0,0,0,.22)] backdrop-blur-xl',
        'transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-[0_24px_65px_rgba(0,0,0,.34)]',
        onClick && 'cursor-pointer'
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">Analítica</p>
          <h3 className="mt-1 text-base font-semibold text-white">{widget.title}</h3>
          <p className="mt-1 text-xs text-white/35">{chart.description}</p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/10 bg-[#d7ff3f]/[0.07]">
          <Icon className="h-5 w-5 text-[#d7ff3f]" />
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-[210px] items-center justify-center text-sm text-white/35">Sin datos para mostrar</div>
      ) : chart.kind === 'bar' ? (
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={chart.data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,.35)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={value => isMoney ? `$${money.format(value)}` : String(value)}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,.04)' }}
              contentStyle={{ background: '#11151d', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12 }}
              formatter={(value: number | undefined) => [isMoney ? `$${money.format(value ?? 0)}` : value ?? 0, isMoney ? 'Monto' : 'Cantidad']}
              labelStyle={{ color: 'rgba(255,255,255,.65)' }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#d7ff3f" isAnimationActive animationDuration={700} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="relative h-[210px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chart.data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={82}
                paddingAngle={4}
                stroke="none"
                isAnimationActive
                animationDuration={700}
              >
                {chart.data.map((item, index) => <Cell key={item.name} fill={pieLabels[index % pieLabels.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#11151d', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12 }}
                formatter={(value: number | undefined) => [isMoney ? `$${money.format(value ?? 0)}` : value ?? 0, isMoney ? 'Monto' : 'Vehículos']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums text-white">{isMoney ? `$${money.format(total)}` : total}</span>
            <span className="text-[10px] uppercase tracking-wider text-white/30">{isMoney ? 'capital' : 'elementos'}</span>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/45">
        {chart.data.map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: pieLabels[index % pieLabels.length] }} />
            <span>{item.name}: <strong className="text-white/70">{isMoney ? `$${money.format(item.value)}` : item.value}</strong></span>
          </div>
        ))}
      </div>
    </article>
  );
}
