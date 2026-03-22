// components/dashboard/draggable-metric-card.tsx
'use client';

import React, { memo } from 'react';
import { GripHorizontal, TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react';
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

// ✅ Función para formatear números grandes
function formatNumber(value: string | number): string {
  if (typeof value === 'string') {
    // Si ya es string formateado (ej: "$1,234"), retornar tal cual
    if (value.includes('$') || value.includes('%')) return value;
    
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    value = num;
  }
  
  if (typeof value === 'number') {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
    return value.toLocaleString('es-MX');
  }
  
  return String(value);
}

// ✅ Skeleton específico para la card
function MetricCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900/80 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <Skeleton className="w-8 h-8 rounded" />
        </div>
      </div>
    </div>
  );
}

function DraggableMetricCardBase({
  widget,
  kpiData,
  kpiConfig,
  onRemove,
  onClick,
  handleProps,
  isLoading = false,
}: DraggableMetricCardProps) {
  // ✅ Mostrar skeleton si está cargando
  if (isLoading || kpiData?.loading) {
    return <MetricCardSkeleton />;
  }

  const IconComponent = kpiConfig?.icon 
    ? IconMap[kpiConfig.icon as keyof typeof IconMap] 
    : null;
  
  if (!IconComponent) {
    console.warn(`Widget ${widget.title} no tiene icono válido: ${kpiConfig?.icon}`);
    return null;
  }

  // ✅ Formatear el valor principal
  const displayValue = kpiData?.value !== undefined 
    ? formatNumber(kpiData.value) 
    : 'N/A';

  // ✅ Calcular cambio porcentual si existe
  const changePercent = kpiData?.changePercent ?? (
    kpiData?.previousValue && kpiData?.value
      ? ((Number(kpiData.value) - Number(kpiData.previousValue)) / Number(kpiData.previousValue)) * 100
      : undefined
  );

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
        'bg-white dark:bg-slate-900/80 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800/50',
        'select-none backdrop-blur-sm transition-all duration-200',
        'hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        onClick && 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1 truncate">
            {widget.title}
          </p>
          
          {/* ✅ Valor principal con animación */}
          <h3
            className="text-3xl font-bold text-gray-900 dark:text-white transition-all duration-300 tabular-nums"
            aria-live="polite"
          >
            {displayValue}
          </h3>

          {/* ✅ Subtítulo (para mostrar valores adicionales) */}
          {kpiData?.subtitle && (
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-1">
              {kpiData.subtitle}
            </p>
          )}

          {/* ✅ Indicador de tendencia mejorado */}
          {kpiData?.trend !== undefined && changePercent !== undefined && (
            <div className="flex items-center gap-1.5 mt-2">
              <div
                className={cn(
                  'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
                  kpiData.trend
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                )}
              >
                {kpiData.trend ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{Math.abs(changePercent).toFixed(1)}%</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                vs período anterior
              </span>
            </div>
          )}

          {/* ✨ Sparkline - Mini gráfico de tendencia */}
          {kpiData?.trendData && kpiData.trendData.length > 2 && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <Sparkline
                data={kpiData.trendData}
                height={32}
                color={kpiData.trend ? 'green' : kpiData.trend === false ? 'red' : 'blue'}
                showDots={false}
                animate={true}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* ✅ Iconos y handle */}
        <div className="flex items-center gap-2">
          <IconComponent className="w-6 h-6 text-blue-600 dark:text-blue-400 transition-transform hover:scale-110" aria-hidden="true" />

          {/* ✅ Drag handle mejorado */}
          <button
            type="button"
            {...handleProps}
            className={cn(
              'p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
              'cursor-grab active:cursor-grabbing rounded transition-all',
              'hover:bg-gray-100 dark:hover:bg-slate-800',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
            )}
            aria-label="Arrastrar para reordenar métrica"
            tabIndex={0}
          >
            <GripHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>
    </article>
  );
}

// React 19: No memo() or custom comparator needed - compiler handles optimization automatically
export const DraggableMetricCard = DraggableMetricCardBase;
