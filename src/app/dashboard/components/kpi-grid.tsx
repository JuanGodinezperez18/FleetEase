'use client';

import { useMemo } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { Settings } from 'lucide-react';
import { DraggableMetricCard } from '@/components/dashboard/draggrable-metric-card';
import type { DashboardWidget, MetricKPIData, KPIConfig } from '@/types/dashboard';

interface KpiGridProps {
  enabledWidgets: DashboardWidget[];
  kpiMap: Record<string, KPIConfig>;
  allKPIs: Record<string, any>;
  onKpiClick: (widget: DashboardWidget) => void;
  onDragEnd: (event: any) => void;
}

export function KpiGrid({
  enabledWidgets,
  kpiMap,
  allKPIs,
  onKpiClick,
  onDragEnd,
}: KpiGridProps) {
  // ✅ Empty state - sin return temprano para evitar problemas de hooks
  const isEmpty = enabledWidgets.length === 0;

  return (
    <>
      {isEmpty ? (
        <EmptyState
          icon={Settings}
          title="No tienes KPIs configurados"
          description="Personaliza tu dashboard agregando los indicadores que más te interesen."
          actionLabel="Configurar Dashboard"
          onAction={() => {}}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {enabledWidgets.map((widget) => {
            const kpiConfig = kpiMap[widget.id];
            const kpiData = allKPIs[widget.id as keyof typeof allKPIs];

            return (
              <DraggableMetricCard
                key={widget.id}
                widget={widget}
                kpiData={kpiData as MetricKPIData}
                kpiConfig={kpiConfig}
                onClick={kpiConfig?.isInteractive ? () => onKpiClick(widget) : undefined}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
