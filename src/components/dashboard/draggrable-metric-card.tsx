// components/dashboard/draggable-metric-card.tsx
'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  IconMap,
  type KPIConfig,
  type MetricKPIData,
  type KPISeverity,
  type TrendPolarity,
} from '@/types/dashboard';
import type { DashboardWidget } from '@/types/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkline } from '@/components/ui/sparkline';

interface DraggableMetricCardProps {
  widget: DashboardWidget;
  kpiData: MetricKPIData;
  kpiConfig: KPIConfig;
  onRemove?: () => void;
  onClick?: () => void;
  /**
   * dnd-kit listeners / attributes for the whole card.
   * When provided, the entire card is the drag surface (no separate grip).
   */
  handleProps?: React.HTMLAttributes<HTMLElement>;
  isLoading?: boolean;
}

/** Compact currency for dense KPI cards — avoids mid-digit wrap on mobile. */
function formatCardCurrency(value: number): string {
  if (!Number.isFinite(value)) return '$0';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toLocaleString('es-MX', { maximumFractionDigits: 1 })}M`;
  }
  // Full pesos, no forced decimals (134050 → $134,050)
  return `${sign}$${abs.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
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
    if (value >= 1_000) return value.toLocaleString('es-MX');
    return value.toLocaleString('es-MX');
  }
  return String(value);
}

const MONETARY_KPI_IDS = new Set([
  'client-balance-total', 'avg-client-balance', 'income-month', 'income-today', 'expenses-month',
  'expenses-today', 'net-income', 'cash-flow-month', 'projected-income', 'total-lent', 'total-pending',
  'total-partner-balance', 'avg-partner-balance', 'monto-pendiente-multas',
]);

/** Resolve presentation severity from config + live value (presentation only). */
function resolveSeverity(
  config: KPIConfig | undefined,
  numericValue: number
): KPISeverity {
  const base = config?.severity ?? 'neutral';
  if (base === 'neutral' || base === 'info') return base;

  const threshold = config?.criticalThreshold;
  const isActive = Number.isFinite(numericValue) && (
    threshold === undefined ? numericValue !== 0 : numericValue >= threshold
  );

  if (!isActive) return 'neutral';

  // Escalate to critical when threshold is met and base is already danger
  if (threshold !== undefined && numericValue >= threshold && base === 'danger') {
    return 'critical';
  }
  return base;
}

/** Trend badge color from declared polarity (F-08). */
function isTrendPositive(
  trendUp: boolean,
  polarity: TrendPolarity | undefined
): boolean {
  if (!polarity || polarity === 'upIsGood') return trendUp;
  return !trendUp; // downIsGood: rising is bad
}

const SEVERITY_STYLES: Record<
  KPISeverity,
  { bar: string; card: string; spark: 'green' | 'red' | 'lime' | 'amber' }
> = {
  neutral: {
    bar: 'bg-transparent',
    card: '',
    spark: 'lime',
  },
  info: {
    bar: 'bg-[var(--fe-info)]',
    card: 'border-[color-mix(in_srgb,var(--fe-info)_28%,transparent)]',
    spark: 'lime',
  },
  warning: {
    bar: 'bg-[var(--fe-warning)]',
    card: 'border-[color-mix(in_srgb,var(--fe-warning)_32%,transparent)] bg-[color-mix(in_srgb,var(--fe-warning)_4%,var(--fe-surface))]',
    spark: 'amber',
  },
  danger: {
    bar: 'bg-[var(--fe-danger)]',
    card: 'border-[color-mix(in_srgb,var(--fe-danger)_36%,transparent)] bg-[color-mix(in_srgb,var(--fe-danger)_5%,var(--fe-surface))]',
    spark: 'red',
  },
  critical: {
    bar: 'bg-[var(--fe-danger)]',
    card: 'border-[color-mix(in_srgb,var(--fe-danger)_48%,transparent)] bg-[color-mix(in_srgb,var(--fe-danger)_8%,var(--fe-surface))] shadow-[0_0_0_1px_color-mix(in_srgb,var(--fe-danger)_20%,transparent)]',
    spark: 'red',
  },
};

function MetricCardSkeleton() {
  return (
    <div className="fe-metric-card">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3 pr-12">
          <Skeleton className="h-3 w-28 bg-white/[0.08]" />
          <Skeleton className="h-9 w-40 bg-white/[0.08]" />
          <Skeleton className="h-3 w-20 bg-white/[0.08]" />
        </div>
        <Skeleton className="absolute right-4 top-4 h-9 w-9 rounded-xl bg-white/[0.08]" />
      </div>
    </div>
  );
}

/**
 * Canonical KPI card for the Dashboard grid.
 * - Full content width (no grip column)
 * - Drag: entire card via handleProps (dnd-kit listeners)
 * - Value never wraps mid-number
 * - Severity bar + trendPolarity (Phase 1 triage)
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

  const rawNumericValue = kpiData?.value !== undefined && kpiData?.value !== null
    ? Number(String(kpiData.value).replace(/[$,\s]/g, ''))
    : (kpiData ? 0 : NaN);
  const isProfitabilityPercent = widget.id === 'vehicle-gross-profitability' || widget.dataKey === 'vehicle-gross-profitability';
  const isMonetary = MONETARY_KPI_IDS.has(widget.id) || MONETARY_KPI_IDS.has(widget.dataKey);
  const isNegativeMoney = isMonetary && Number.isFinite(rawNumericValue) && rawNumericValue < 0;

  const displayValue = !kpiData
    ? 'N/A'
    : isProfitabilityPercent
      ? (kpiData.value === null || kpiData.value === undefined || kpiData.value === '—'
          ? '—'
          : `${Number.isFinite(rawNumericValue) ? rawNumericValue.toFixed(1) : '—'}%`)
      : isMonetary
        ? formatCardCurrency(Number.isFinite(rawNumericValue) ? rawNumericValue : 0)
        : (kpiData.value !== undefined && kpiData.value !== null
            ? formatNumber(kpiData.value)
            : 'N/A');

  const changePercent = kpiData?.changePercent ?? (
    kpiData?.previousValue && kpiData?.value
      ? ((Number(kpiData.value) - Number(kpiData.previousValue)) / Number(kpiData.previousValue)) * 100
      : undefined
  );

  const severity = resolveSeverity(kpiConfig, Number.isFinite(rawNumericValue) ? rawNumericValue : 0);
  const severityStyle = SEVERITY_STYLES[severity];
  const polarity = kpiConfig?.trendPolarity;
  const trendUp = kpiData?.trend === true;
  const trendIsGood =
    kpiData?.trend !== undefined ? isTrendPositive(trendUp, polarity) : undefined;

  const sparkColor =
    severity !== 'neutral'
      ? severityStyle.spark
      : trendIsGood === true
        ? 'green'
        : trendIsGood === false
          ? 'red'
          : 'lime';

  const isDraggable = Boolean(handleProps);

  return (
    <article
      data-interactive={onClick ? 'true' : 'false'}
      data-severity={severity}
      {...handleProps}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
        handleProps?.onKeyDown?.(e as React.KeyboardEvent<HTMLElement>);
      }}
      tabIndex={onClick || isDraggable ? 0 : undefined}
      role={onClick ? 'button' : 'article'}
      aria-label={`${widget.title}: ${displayValue}${severity !== 'neutral' ? ` · ${severity}` : ''}${isDraggable ? '. Mantén pulsado para reordenar.' : ''}`}
      className={cn(
        'fe-metric-card relative overflow-hidden',
        severityStyle.card,
        (onClick || isDraggable) && 'cursor-pointer active:translate-y-0',
        isDraggable && 'cursor-grab active:cursor-grabbing touch-manipulation'
      )}
    >
      {/* Severity bar — pre-attentive triage cue (Gestalt figure-ground) */}
      {severity !== 'neutral' && (
        <span
          aria-hidden
          className={cn('absolute inset-y-0 left-0 w-[3px] rounded-l-[20px]', severityStyle.bar)}
        />
      )}

      {/* Icon — top-right float so the value uses full width */}
      <div className="fe-metric-icon absolute right-3.5 top-3.5 z-[1]">
        <IconComponent className="h-5 w-5" aria-hidden="true" strokeWidth={1.75} />
      </div>

      <div className="relative min-w-0 pr-12">
        <div className="mb-3 flex items-center gap-2">
          {/* Decorative dot only when neutral; severity bar replaces it for anomalies */}
          {severity === 'neutral' ? (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--fe-lime)]/80" />
          ) : (
            <span
              className={cn('h-1.5 w-1.5 shrink-0 rounded-full', severityStyle.bar)}
              aria-hidden
            />
          )}
          <p className="fe-metric-title truncate">{widget.title}</p>
        </div>

        <h3
          className={cn(
            'fe-metric-value font-heading',
            (isNegativeMoney || severity === 'critical' || severity === 'danger') && 'text-rose-400'
          )}
          aria-live="polite"
        >
          {displayValue}
        </h3>

        {kpiData?.subtitle && (
          <p className="fe-metric-description mt-2">{kpiData.subtitle}</p>
        )}

        {kpiData?.trend !== undefined && changePercent !== undefined && (
          <div className="mt-4 flex items-center gap-2">
            <div
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                trendIsGood
                  ? 'border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300'
                  : 'border-rose-400/15 bg-rose-400/[0.07] text-rose-300'
              )}
            >
              {trendUp ? (
                <TrendingUp className="h-3 w-3" strokeWidth={1.8} />
              ) : (
                <TrendingDown className="h-3 w-3" strokeWidth={1.8} />
              )}
              <span>{Math.abs(changePercent).toFixed(1)}%</span>
            </div>
            <span className="text-[10px] text-[color:var(--fe-text-faint)]">vs período anterior</span>
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
    </article>
  );
}

export const DraggableMetricCard = DraggableMetricCardBase;
