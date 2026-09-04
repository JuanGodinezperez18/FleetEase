'use client';

import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DashboardWidget, MetricKPIData } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface DashboardChartCardProps {
  widget: DashboardWidget;
  allKPIs: Record<string, MetricKPIData>;
  onClick?: () => void;
}

const money = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

export function DashboardChartCard({ widget, allKPIs, onClick }: DashboardChartCardProps) {
  const income = Number(allKPIs['income-month']?.value ?? 0);
  const expenses = Number(allKPIs['expenses-month']?.value ?? 0);
  const net = Number(allKPIs['net-income']?.value ?? income - expenses);
  const totalVehicles = Number(allKPIs['total-vehicles']?.value ?? 0);
  const rentedVehicles = Number(allKPIs['vehicles-rented']?.value ?? 0);
  const availableVehicles = Number(allKPIs['vehicles-available']?.value ?? Math.max(totalVehicles - rentedVehicles, 0));

  const isFinance = widget.dataKey === 'finance-summary-chart';
  const data = isFinance
    ? [
        { name: 'Ingresos', value: income },
        { name: 'Gastos', value: expenses },
        { name: 'Neto', value: net },
      ]
    : [
        { name: 'Rentados', value: rentedVehicles },
        { name: 'Disponibles', value: availableVehicles },
      ];

  const total = data.reduce((sum, item) => sum + Math.max(item.value, 0), 0);
  const hasData = data.some(item => item.value !== 0);

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
          <p className="mt-1 text-xs text-white/35">
            {isFinance ? 'Comparativo del período seleccionado' : 'Distribución actual de la flota'}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7ff3f]/10 bg-[#d7ff3f]/[0.07]">
          {isFinance ? <BarChart3 className="h-5 w-5 text-[#d7ff3f]" /> : <PieChartIcon className="h-5 w-5 text-[#d7ff3f]" />}
        </div>
      </div>

      {!hasData ? (
        <div className="flex h-[210px] items-center justify-center text-sm text-white/35">Sin datos para mostrar</div>
      ) : isFinance ? (
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'rgba(255,255,255,.35)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={value => `$${money.format(value)}`} />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,.04)' }}
              contentStyle={{ background: '#11151d', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12 }}
              formatter={(value: number | undefined) => [`$${money.format(value ?? 0)}`, 'Monto']}
              labelStyle={{ color: 'rgba(255,255,255,.65)' }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#d7ff3f" isAnimationActive animationDuration={700} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="relative h-[210px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={82} paddingAngle={4} stroke="none" isAnimationActive animationDuration={700}>
                <Cell fill="#d7ff3f" />
                <Cell fill="#5f6675" />
              </Pie>
              <Tooltip
                contentStyle={{ background: '#11151d', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12 }}
                formatter={(value: number | undefined) => [value ?? 0, 'Vehículos']}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums text-white">{totalVehicles}</span>
            <span className="text-[10px] uppercase tracking-wider text-white/30">vehículos</span>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/45">
        {data.map(item => (
          <div key={item.name} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#d7ff3f]" />
            <span>{item.name}: <strong className="text-white/70">{isFinance ? `$${money.format(item.value)}` : item.value}</strong></span>
          </div>
        ))}
      </div>
    </article>
  );
}
