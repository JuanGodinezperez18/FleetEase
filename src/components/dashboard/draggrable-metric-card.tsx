// components/dashboard/draggable-metric-card.tsx
'use client';

import React from 'react';
import { GripHorizontal, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconMap, type KPIConfig, type MetricKPIData } from '@/types/dashboard';
import type { DashboardWidget } from '@/types/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkline } from '@/components/ui/sparkline';
import { formatCurrency } from '@/lib/utils';

interface DraggableMetricCardProps {
  widget: DashboardWidget;
  kpiData: MetricKPIData;
  kpiConfig: KPIConfig;
  onRemove?: () => void;
  onClick?: () => void;
  handleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isLoading?: boolean;
}

function formatNumber(value: string | number): string {
  if (typeof value === 'string') {
    if (value.includes('$') || value.includes('%')) return value;
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    value = num;
  }
  if (typeof value === 'number') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString('es-MX');
  }
  return String(value);
}

const MONETARY_KPI_IDS = new Set([
  'client-balance-total', 'avg-client-balance', 'income-month', 'income-today', 'expenses-month',
  'expenses-today', 'net-income', 'cash-flow-month', 'projected-income', 'total-lent', 'total-pending',
  'total-partner-balance', 'avg-partner-balance', 'monto-pendiente-multas',
]);

function MetricCardSkeleton() {
  return (
    <div className="fe-metric-card">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-3 w-28 bg-white/[0.08]" />
          <Skeleton className="h-9 w-32 bg-white/[0.08]" />
          <Skeleton className="h-3 w-20 bg-white/[0.08]" />
          <Skeleton className="h-8 w-full bg-white/[0.05]" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl bg-white/[0.08]" />
      </div>
    </div>
  );
}

/**
 * Canonical KPI card for the Dashboard grid.
 * Tokens (keep in sync across the system):
 * - radius: rounded-[20px]
 * - title: text-[10px] uppercase tracking-[0.14em] text-white/35
 * - value: text-[32px] sm:text-[34px] font-heading tracking-[-0.04em]
 * - icon box: h-10 w-10, lime border/bg, strokeWidth 1.75
 * - sparkline height: 32
 */
function DraggableMetricCardBase({
  widget,
  kpiData,
  kpiConfig,
  onClick,
  handleProps,
  isLoading = false,
}: DraggableMetricCardProps) {
  if (isLoading || kpiData?.loading) return <MetricCardSkeleton />;

  const IconComponent = kpiConfig?.icon
    ? IconMap[kpiConfig.icon as keyof typeof IconMap]
    : null;
  if (!IconComponent) return null;

  const rawNumericValue = kpiData?.value !== undefined
    ? Number(String(kpiData.value).replace(/[$,\s]/g, ''))
    : NaN;
  const isMonetary = MONETARY_KPI_IDS.has(widget.id) || MONETARY_KPI_IDS.has(widget.dataKey);
  const isNegativeMoney = isMonetary && Number.isFinite(rawNumericValue) && rawNumericValue < 0;
  const displayValue = kpiData?.value !== undefined
    ? (isMonetary && Number.isFinite(rawNumericValue) ? formatCurrency(rawNumericValue) : formatNumber(kpiData.value))
    : 'N/A';
  const changePercent = kpiData?.changePercent ?? (
    kpiData?.previousValue && kpiData?.value
      ? ((Number(kpiData.value) - Number(kpiData.previousValue)) / Number(kpiData.previousValue)) * 100
      : undefined
  );

  const sparkColor =
    kpiData?.trend === true ? 'green' : kpiData?.trend === false ? 'red' : 'lime';

  return (
    <article
      data-interactive={onClick ? 'true' : 'false'}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : 'article'}
      aria-label={`${widget.title}: ${displayValue}`}
      className={cn(
        'fe-metric-card',
        onClick && 'cursor-pointer active:translate-y-0'
      )}
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f]/80" />
            <p className="fe-metric-title truncate">
              {widget.title}
            </p>
          </div>

          <h3 className={cn(
            "fe-metric-value font-heading sm:text-[34px]",
            isNegativeMoney ? "text-rose-400" : "text-white"
          )} aria-live="polite">
            {displayValue}
          </h3>

          {kpiData?.subtitle && (
            <p className="fe-metric-description mt-2">{kpiData.subtitle}</p>
          )}

          {kpiData?.trend !== undefined && changePercent !== undefined && (
            <div className="mt-4 flex items-center gap-2">
              <div className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                kpiData.trend
                  ? 'border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300'
                  : 'border-rose-400/15 bg-rose-400/[0.07] text-rose-300'
              )}>
                {kpiData.trend ? <TrendingUp className="h-3 w-3" strokeWidth={1.8} /> : <TrendingDown className="h-3 w-3" strokeWidth={1.8} />}
                <span>{Math.abs(changePercent).toFixed(1)}%</span>
              </div>
              <span className="text-[10px] text-white/25">vs período anterior</span>
            </div>
          )}

          {kpiData?.trendData && kpiData.trendData.length >= 2 && (
            <div className="fe-metric-divider mt-4 border-t pt-3 opacity-80 transition-opacity group-hover:opacity-100">
              <Sparkline
                data={kpiData.trendData}
                height={32}
                color={sparkColor}
                animate
                className="w-full"
              />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <div className="fe-metric-icon transition-transform duration-200 group-hover:scale-105">
            <IconComponent className="h-5 w-5" aria-hidden="true" strokeWidth={1.75} />
          </div>
          <button
            type="button"
            {...handleProps}
            className="rounded-lg p-1.5 text-white/20 transition hover:bg-white/[0.05] hover:text-white/50 active:cursor-grabbing"
            aria-label="Arrastrar para reordenar métrica"
            tabIndex={0}
          >
            <GripHorizontal className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </article>
  );
}

export const DraggableMetricCard = DraggableMetricCardBase;
