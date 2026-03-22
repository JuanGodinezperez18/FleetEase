// components/dashboards/EnhancedMetricCard.tsx - TARJETA MÉTRICA VISUAL
"use client";

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedMetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'primary' | 'success' | 'warning' | 'destructive';
  loading?: boolean;
}

export function EnhancedMetricCard({
  title,
  value,
  change,
  changeLabel = 'vs mes anterior',
  icon: Icon,
  trend = 'neutral',
  color = 'primary',
  loading,
}: EnhancedMetricCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  if (loading) {
    return (
      <div className="card-fleetease">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-24 skeleton" />
            <div className="h-8 w-32 skeleton" />
            <div className="h-4 w-28 skeleton" />
          </div>
          <div className="h-12 w-12 rounded-xl skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="card-fleetease-interactive group">
      <div className="flex items-start justify-between">
        {/* Content */}
        <div className="space-y-2 flex-1">
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>
          
          <h3 className="text-3xl font-bold tracking-tight">
            {value}
          </h3>
          
          {typeof change !== 'undefined' && (
            <div className="flex items-center gap-1.5 text-sm">
              {trend === 'up' && (
                <>
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="font-medium text-success">
                    +{Math.abs(change)}%
                  </span>
                </>
              )}
              {trend === 'down' && (
                <>
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">
                    {change}%
                  </span>
                </>
              )}
              {trend === 'neutral' && (
                <span className="font-medium text-muted-foreground">
                  {change}%
                </span>
              )}
              <span className="text-muted-foreground">
                {changeLabel}
              </span>
            </div>
          )}
        </div>

        {/* Icon */}
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl border-2',
            'transition-transform duration-300 group-hover:scale-110',
            colorClasses[color]
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
