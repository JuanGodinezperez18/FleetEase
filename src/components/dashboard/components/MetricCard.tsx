// src/components/dashboard/components/MetricCard.tsx
// Canonical FleetEase metric card — use this everywhere outside the KPI drag grid.

"use client";

import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Share2, ArrowUp, ArrowDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkline } from '@/components/ui/sparkline';

type MetricCardVariant = 'default' | 'success' | 'warning' | 'danger';

export interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  tooltipText?: string;
  onDoubleClick?: () => void;
  onClick?: () => void;
  onShare?: () => void;
  isLoading?: boolean;
  className?: string;
  valueClassName?: string;
  variant?: MetricCardVariant;
  /** Percent change vs previous period (e.g. 12.5 or -3.2) */
  trend?: number;
  progress?: number;
  /** Optional historical values for sparkline (oldest → newest) */
  sparklineData?: number[];
}

/**
 * Design tokens (keep in sync with DraggableMetricCard):
 * - radius: rounded-[20px]
 * - title: text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35
 * - value: text-[32px] sm:text-[34px] font-heading tracking-[-0.04em] tabular-nums
 * - icon box: h-10 w-10 rounded-xl lime border/bg
 * - sparkline height: 32
 * - strokeWidth icons: 1.75
 */
const VARIANT_CLASSES: Record<MetricCardVariant, string> = {
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-rose-400',
  default: 'text-white',
};

function TrendBadge({ trend }: { trend: number }) {
  if (!isFinite(trend)) return null;
  const isPositive = trend >= 0;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums',
              isPositive
                ? 'border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300'
                : 'border-rose-400/15 bg-rose-400/[0.07] text-rose-300'
            )}
          >
            {isPositive ? (
              <ArrowUp className="h-3 w-3" strokeWidth={1.8} />
            ) : (
              <ArrowDown className="h-3 w-3" strokeWidth={1.8} />
            )}
            {Math.abs(trend).toFixed(1)}%
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>vs. período anterior</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const MetricCardComponent: React.FC<MetricCardProps> = ({
  title,
  value,
  description,
  icon,
  tooltipText,
  onDoubleClick,
  onClick,
  onShare,
  isLoading,
  className,
  valueClassName,
  variant = 'default',
  trend,
  progress,
  sparklineData,
}) => {
  const isInteractive = Boolean(onClick || onDoubleClick);

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isInteractive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      (onClick || onDoubleClick)?.();
    }
  };

  const handleActivate = () => {
    onClick?.();
  };

  const cardContent = (
    <article
      data-interactive={isInteractive ? 'true' : 'false'}
      tabIndex={isInteractive ? 0 : undefined}
      role="group"
      onClick={onClick ? handleActivate : undefined}
      onDoubleClick={onDoubleClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      aria-label={isInteractive ? `${title}: ${value}` : undefined}
      className={cn(
        'fe-metric-card select-none',
        'before:pointer-events-none before:absolute before:-right-12 before:-top-12 before:h-32 before:w-32 before:rounded-full before:bg-[#d7ff3f]/[0.045] before:blur-3xl',
        isInteractive && 'active:translate-y-0',
        className
      )}
    >
      {onShare && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 z-10 h-7 w-7 rounded-lg text-white/30 hover:bg-white/[0.06] hover:text-white"
                onClick={handleShareClick}
                aria-label={`Compartir ${title}`}
              >
                <Share2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Compartir resumen</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] opacity-70 shadow-[0_0_10px_#d7ff3f]" />
            <p className="fe-metric-title truncate">
              {title}
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-28 bg-white/[0.08]" />
              <Skeleton className="h-3 w-36 bg-white/[0.05]" />
              <Skeleton className="h-8 w-full bg-white/[0.05]" />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-2">
                <div
                  className={cn(
                    'fe-metric-value font-heading sm:text-[34px]',
                    VARIANT_CLASSES[variant],
                    valueClassName
                  )}
                >
                  {value}
                </div>
                {trend !== undefined && <TrendBadge trend={trend} />}
              </div>

              {description && (
                <p className="fe-metric-description mt-2 max-w-[90%]">
                  {description}
                </p>
              )}

              {sparklineData && sparklineData.length >= 2 && (
                <div className="fe-metric-divider mt-4 border-t pt-3 opacity-80 transition-opacity group-hover:opacity-100">
                  <Sparkline
                    data={sparklineData}
                    height={32}
                    negative={trend !== undefined && trend < 0}
                  />
                </div>
              )}

              {progress !== undefined && (
                <Progress value={progress} className="mt-4 h-1 bg-white/[0.06]" />
              )}
            </>
          )}
        </div>

        {icon && (
          <div className="fe-metric-icon transition-transform duration-300 group-hover:scale-105">
            {icon}
          </div>
        )}
      </div>
    </article>
  );

  if (tooltipText) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
};

export const MetricCard = MetricCardComponent;

export interface InteractiveMetricCardProps extends MetricCardProps {
  onClick: () => void;
}

/** Clickable metric card — same visual system as MetricCard. */
export function InteractiveMetricCard({ onClick, ...props }: InteractiveMetricCardProps) {
  return <MetricCard {...props} onClick={onClick} />;
}
