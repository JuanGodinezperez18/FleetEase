"use client";

import React, { useMemo } from 'react';
import { Building2, Users, Car, FileWarning, AlertCircle } from 'lucide-react';
import type { Company } from '@/types';
import { formatNumber } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  subMonths,
  startOfMonth,
  endOfMonth,
  format,
  isWithinInterval,
} from 'date-fns';
import { es } from 'date-fns/locale';

interface CompanyMetrics {
  vehicleCount: number;
  userCount: number;
}

interface CompanyStatsProps {
  companies: Company[];
  companyMetrics: Record<string, CompanyMetrics>;
  onCardClick?: (filterKey: 'contractStatus' | 'status', filterValue: any) => void;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  onClick,
  accent,
}: {
  label: string;
  value: string | number;
  hint: string;
  icon: React.ElementType;
  onClick?: () => void;
  accent?: 'amber' | 'rose' | 'lime';
}) {
  const iconBorder =
    accent === 'amber'
      ? 'border-amber-400/20 bg-amber-400/[0.08] text-amber-300'
      : accent === 'rose'
        ? 'border-rose-400/20 bg-rose-400/[0.08] text-rose-300'
        : 'border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 text-left shadow-[0_14px_40px_rgba(0,0,0,.18)] transition-colors hover:border-white/[0.12] disabled:cursor-default"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/40">
            {label}
          </p>
          <p className="mt-1.5 font-heading text-2xl font-semibold tabular-nums tracking-[-0.03em] text-white">
            {value}
          </p>
          <p className="mt-1 text-xs text-white/40">{hint}</p>
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconBorder}`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>
    </button>
  );
}

export const CompanyStats: React.FC<CompanyStatsProps> = ({
  companies,
  companyMetrics,
  onCardClick,
}) => {
  const stats = useMemo(() => {
    const activeCompanies = companies.filter(c => !c.isDeleted);
    const totalUsers = Object.values(companyMetrics).reduce(
      (sum, metric) => sum + metric.userCount,
      0
    );
    const totalVehicles = Object.values(companyMetrics).reduce(
      (sum, metric) => sum + metric.vehicleCount,
      0
    );
    const companiesWithoutContract = activeCompanies.filter(
      c => !c.contractTemplateUrl
    ).length;

    const companiesNearingLimit = activeCompanies
      .map(c => {
        const metrics = companyMetrics[c.id];
        if (!metrics || typeof c.vehicleLimit !== 'number' || c.vehicleLimit === 0) {
          return null;
        }
        const usage = (metrics.vehicleCount / c.vehicleLimit) * 100;
        if (usage >= 80) {
          return {
            ...c,
            usage,
            vehicleCount: metrics.vehicleCount,
          };
        }
        return null;
      })
      .filter((c): c is Company & { usage: number; vehicleCount: number } => c !== null)
      .sort((a, b) => b.usage - a.usage);

    const avgVehiclesPerCompany =
      activeCompanies.length > 0 ? totalVehicles / activeCompanies.length : 0;

    const inactiveCompanies = activeCompanies.filter(c => {
      const metrics = companyMetrics[c.id];
      return metrics && metrics.vehicleCount === 0 && metrics.userCount === 0;
    });

    const byState = activeCompanies.reduce(
      (acc, c) => {
        const state = c.state || 'Sin estado';
        acc[state] = (acc[state] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const stateDistribution = Object.entries(byState)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      activeCompanyCount: activeCompanies.length,
      totalUsers,
      totalVehicles,
      companiesWithoutContract,
      companiesNearingLimit,
      avgVehiclesPerCompany,
      inactiveCompanyCount: inactiveCompanies.length,
      stateDistribution,
    };
  }, [companies, companyMetrics]);

  const growthData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      const addedThisMonth = companies.filter(
        c =>
          !c.isDeleted &&
          c.createdAt &&
          isWithinInterval(new Date(c.createdAt), {
            start: monthStart,
            end: monthEnd,
          })
      ).length;

      return {
        month: format(date, 'MMM', { locale: es }),
        empresas: addedThisMonth,
      };
    });
  }, [companies]);

  const tooltipStyle = {
    backgroundColor: '#0e1117',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 12,
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Empresas activas"
          value={stats.activeCompanyCount}
          hint="Total en el sistema"
          icon={Building2}
          onClick={() => onCardClick?.('status', 'all')}
        />
        <StatCard
          label="Usuarios"
          value={stats.totalUsers}
          hint="En todas las empresas"
          icon={Users}
        />
        <StatCard
          label="Vehículos"
          value={formatNumber(stats.totalVehicles)}
          hint="Flota total"
          icon={Car}
        />
        <StatCard
          label="Sin contrato"
          value={stats.companiesWithoutContract}
          hint="Plantilla pendiente"
          icon={FileWarning}
          accent="amber"
          onClick={() => onCardClick?.('contractStatus', 'without_template')}
        />
        <StatCard
          label="Promedio flota"
          value={stats.avgVehiclesPerCompany.toFixed(1)}
          hint="Vehículos por empresa"
          icon={Car}
        />
        {stats.inactiveCompanyCount > 0 && (
          <StatCard
            label="Inactivas"
            value={stats.inactiveCompanyCount}
            hint="Sin usuarios ni vehículos"
            icon={AlertCircle}
            accent="amber"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 sm:p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#d7ff3f]/80">
            Tendencia
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-white">
            Crecimiento de empresas
          </h3>
          <p className="mb-4 text-xs text-white/40">Últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={growthData}>
              <XAxis
                dataKey="month"
                stroke="rgba(255,255,255,0.35)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.35)"
                fontSize={11}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="empresas"
                stroke="#d7ff3f"
                strokeWidth={2}
                dot={{ r: 3, fill: '#d7ff3f' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {stats.stateDistribution.length > 0 && (
          <div className="rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 sm:p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#d7ff3f]/80">
              Geografía
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-white">
              Distribución por estado
            </h3>
            <p className="mb-4 text-xs text-white/40">Top 5</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.stateDistribution} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="state"
                  type="category"
                  width={88}
                  tickLine={false}
                  axisLine={false}
                  stroke="rgba(255,255,255,0.45)"
                  fontSize={11}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar
                  dataKey="count"
                  name="Empresas"
                  fill="#d7ff3f"
                  radius={[0, 6, 6, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {stats.companiesNearingLimit.length > 0 && (
        <div className="rounded-[20px] border border-amber-400/20 bg-amber-400/[0.06] p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-300" strokeWidth={1.75} />
            <h3 className="text-sm font-semibold text-amber-200">
              Límite de vehículos cerca o excedido
            </h3>
          </div>
          <div className="space-y-3">
            {stats.companiesNearingLimit.map(c => (
              <div key={c.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-white/85">{c.name}</span>
                  <span className="font-mono text-xs tabular-nums text-white/50">
                    {c.vehicleCount} / {c.vehicleLimit}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${Math.min(c.usage, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-[10px] text-white/40">
                  {c.usage.toFixed(0)}% utilizado
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
