// src/components/dashboard/components/MetricCard.tsx

"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Share2, ArrowUp, ArrowDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type MetricCardVariant = "default" | "success" | "warning" | "danger";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  tooltipText?: string;
  onDoubleClick?: () => void;
  onShare?: () => void;
  isLoading?: boolean;
  className?: string;
  valueClassName?: string;
  variant?: MetricCardVariant;
  trend?: number;
  progress?: number;
}

const VARIANT_CLASSES: Record<MetricCardVariant, string> = {
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  danger: 'text-red-400',
  default: 'text-white'
};

const getVariantClass = (variant: MetricCardVariant) => VARIANT_CLASSES[variant];

const MetricCardComponent: React.FC<MetricCardProps> = ({
  title,
  value,
  description,
  icon,
  tooltipText,
  onDoubleClick,
  onShare,
  isLoading,
  className,
  valueClassName,
  variant = 'default',
  trend,
  progress
}) => {
  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDoubleClick?.();
    }
  };

  const TrendIndicator = () => {
    if (trend === undefined || !isFinite(trend)) return null;
    const isPositive = trend >= 0;
    const trendContent = (
      <div className={cn(
        'inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums',
        isPositive
          ? 'border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-400'
          : 'border-red-400/15 bg-red-400/[0.07] text-red-400'
      )}>
        {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {Math.abs(trend).toFixed(1)}%
      </div>
    );
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{trendContent}</TooltipTrigger>
          <TooltipContent><p>vs. período anterior</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const cardContent = (
    <Card
      tabIndex={onDoubleClick ? 0 : undefined}
      role={onDoubleClick ? 'button' : undefined}
      onDoubleClick={onDoubleClick}
      onKeyDown={onDoubleClick ? handleKeyDown : undefined}
      aria-label={`${title}: ${value}`}
      className={cn(
        'group relative overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] text-white shadow-[0_14px_40px_rgba(0,0,0,.18)] transition-all duration-200',
        onDoubleClick && 'cursor-pointer hover:-translate-y-0.5 hover:border-white/[0.13] hover:shadow-[0_18px_48px_rgba(0,0,0,.28)] focus:outline-none focus:ring-2 focus:ring-[#d7ff3f]/40',
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
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Compartir resumen</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <CardHeader className="flex flex-row items-start justify-between space-y-0 px-5 pb-1 pt-5">
        <div className="min-w-0 pr-8">
          <CardTitle className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-white/45">
            {title}
          </CardTitle>
        </div>
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/10 bg-[#d7ff3f]/[0.06] text-[#d7ff3f] transition-colors group-hover:bg-[#d7ff3f]/[0.1]">
            {icon}
          </div>
        )}
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-28 bg-white/[0.07]" />
            <Skeleton className="h-3 w-36 bg-white/[0.05]" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-2">
              <div className={cn('text-[30px] font-semibold leading-none tracking-[-0.035em] tabular-nums', getVariantClass(variant), valueClassName)}>
                {value}
              </div>
              <TrendIndicator />
            </div>
            {description && <p className="mt-2 max-w-[90%] text-xs leading-5 text-white/35">{description}</p>}
            {progress !== undefined && (
              <Progress value={progress} className="mt-4 h-1 bg-white/[0.06]" />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  if (tooltipText) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
          <TooltipContent><p>{tooltipText}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return cardContent;
};

export const MetricCard = MetricCardComponent;

interface InteractiveMetricCardProps extends MetricCardProps { onClick: () => void; }

export function InteractiveMetricCard({ onClick, ...props }: InteractiveMetricCardProps) {
  return <div onClick={onClick} className="cursor-pointer"> <MetricCard {...props} /> </div>;
}
