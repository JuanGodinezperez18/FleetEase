// src/components/dashboard/components/MetricCard.tsx

"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-destructive',
  default: ''
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
        "flex items-center text-xs font-semibold",
        isPositive ? "text-emerald-600" : "text-destructive"
      )}>
        {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {Math.abs(trend).toFixed(1)}%
      </div>
    );
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{trendContent}</TooltipTrigger>
          <TooltipContent>
            <p>vs. período anterior</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  
  const cardContent = (
    <Card 
      tabIndex={onDoubleClick ? 0 : undefined}
      role={onDoubleClick ? "button" : undefined}
      onDoubleClick={onDoubleClick}
      onKeyDown={onDoubleClick ? handleKeyDown : undefined}
      aria-label={`${title}: ${value}`}
      className={cn(
        "relative transition-transform transform-gpu hover:scale-[1.02] active:scale-[0.98]",
        onDoubleClick && "cursor-pointer focus:ring-2 focus:ring-primary",
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
                className="absolute top-1 right-1 h-7 w-7"
                onClick={handleShareClick}
                aria-label={`Compartir ${title}`}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Compartir Resumen</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <div className={cn(
                  "text-2xl font-bold", 
                  getVariantClass(variant),
                  valueClassName
                )}>
                  {value}
                </div>
                <TrendIndicator />
              </div>
              {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
              {progress !== undefined && (
                <Progress value={progress} className="mt-2" />
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
          <TooltipContent>
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
};

// React 19: No memo() needed - compiler handles optimization
export const MetricCard = MetricCardComponent;

interface InteractiveMetricCardProps extends MetricCardProps {
  onClick: () => void;
}

// React 19: No memo() needed - compiler handles optimization
export function InteractiveMetricCard({ onClick, ...props }: InteractiveMetricCardProps) {
  return (
    <div onClick={onClick} className="cursor-pointer">
      <MetricCard {...props} />
    </div>
  );
}
