// components/dashboard/draggable-metric-card.tsx
'use client';

import React from 'react';
import { GripHorizontal, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconMap, type KPIConfig, type MetricKPIData } from '@/types/dashboard';
import type { DashboardWidget } from '@/types/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkline } from '@/components/ui/sparkline';

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

function MetricCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[22px] border border-white/[0.07] bg-[#0e1117] p-5 shadow-[0_18px_50px_rgba(0,0,0,.22)]">
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

  const displayValue = kpiData?.value !== undefined ? formatNumber(kpiData.value) : 'N/A';
  const changePercent = kpiData?.changePercent ?? (
    kpiData?.previousValue && kpiData?.value
      ? ((Number(kpiData.value) - Number(kpiData.previousValue)) / Number(kpiData.previousValue)) * 100
      : undefined
  );

  const sparkColor =
    kpiData?.trend === true ? 'green' : kpiData?.trend === false ? 'red' : 'lime';

  return (
    <article
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
        'group relative overflow-hidden rounded-[22px] border border-white/[0.07] bg-[#0e1117] p-5 shadow-[0_18px_50px_rgba(0,0,0,.22)]',
        'select-none backdrop-blur-xl transition-all duration-300',
        'before:pointer-events-none before:absolute before:-right-12 before:-top-12 before:h-32 before:w-32 before:rounded-full before:bg-[#d7ff3f]/[0.045] before:blur-3xl before:transition-opacity',
        'hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-[0_24px_65px_rgba(0,0,0,.34)]',
        onClick && 'cursor-pointer active:translate-y-0'
      )}
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] opacity-70 shadow-[0_0_10px_#d7ff3f]" />
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              {widget.title}
            </p>
          </div>

          <h3 className="font-heading text-[34px] font-semibold leading-none tracking-[-0.045em] text-white tabular-nums" aria-live="polite">
            {displayValue}
          </h3>

          {kpiData?.subtitle && (
            <p className="mt-2 text-xs font-medium text-white/45">{kpiData.subtitle}</p>
          )}

          {kpiData?.trend !== undefined && changePercent !== undefined && (
            <div className="mt-4 flex items-center gap-2">
              <div className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold',
                kpiData.trend
                  ? 'bg-[#d7ff3f]/10 text-[#d7ff3f]'
                  : 'bg-red-400/10 text-red-300'
              )}>
                {kpiData.trend ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{Math.abs(changePercent).toFixed(1)}%</span>
              </div>
              <span className="text-[10px] text-white/25">vs período anterior</span>
            </div>
          )}

          {kpiData?.trendData && kpiData.trendData.length >= 2 && (
            <div className="mt-4 border-t border-white/[0.06] pt-3 opacity-80 transition-opacity group-hover:opacity-100">
              <Sparkline
                data={kpiData.trendData}
                height={34}
                color={sparkColor}
                animate
                className="w-full"
              />
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-start gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d7ff3f]/10 bg-[#d7ff3f]/[0.07] transition-transform duration-300 group-hover:scale-105">
            <IconComponent className="h-5 w-5 text-[#d7ff3f]" aria-hidden="true" strokeWidth={1.75} />
          </div>
          <button
            type="button"
            {...handleProps}
            className="rounded-lg p-1.5 text-white/20 transition hover:bg-white/[0.05] hover:text-white/50 active:cursor-grabbing"
            aria-label="Arrastrar para reordenar métrica"
            tabIndex={0}
          >
            <GripHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

export const DraggableMetricCard = DraggableMetricCardBase;
