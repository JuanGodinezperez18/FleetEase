'use client';

import { EmptyState } from '@/components/common/empty-state';
import { Settings } from 'lucide-react';
import { DraggableMetricCard } from '@/components/dashboard/draggrable-metric-card';
import { UnreadNotificationsCard } from '@/components/dashboard/unread-notifications-card';
import { DashboardChartCard } from '@/components/dashboard/dashboard-chart-card';
import type { DashboardWidget, MetricKPIData, KPIConfig } from '@/types/dashboard';

interface KpiGridProps {
  enabledWidgets: DashboardWidget[];
  kpiMap: Record<string, KPIConfig>;
  allKPIs: Record<string, any>;
  onKpiClick: (widget: DashboardWidget) => void;
  onDragEnd: (event: any) => void;
  onOpenConfig?: () => void;
}

const chartActionMap: Record<string, string> = {
  'finance-summary-chart': 'income-month',
  'fleet-status-chart': 'vehicles-rented',
  'credit-portfolio-chart': 'active-credits',
  'maintenance-chart': 'maintenance-overdue',
  'fines-chart': 'multas-pendientes',
  'client-risk-chart': 'clients-with-debt',
};

export function KpiGrid({ enabledWidgets, kpiMap, allKPIs, onKpiClick, onOpenConfig }: KpiGridProps) {
  const isEmpty = enabledWidgets.length === 0;
  const alwaysInteractive = new Set(['total-clients', 'total-vehicles', 'vehicles-rented']);

  return (
    <>
      {isEmpty ? (
        <EmptyState
          icon={Settings}
          title="No tienes KPIs configurados"
          description="Personaliza tu dashboard agregando los indicadores que más te interesen."
          actionLabel="Configurar Dashboard"
          onAction={onOpenConfig}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {enabledWidgets.map(widget => {
            if (widget.id === 'unread-notifications') {
              return (
                <div key={widget.id} className="md:col-span-2 xl:col-span-2">
                  <UnreadNotificationsCard />
                </div>
              );
            }
            if (widget.type === 'chart') {
              const actionId = chartActionMap[widget.id];
              const chartAction = actionId ? ({ ...widget, id: actionId } as DashboardWidget) : undefined;
              return (
                <div key={widget.id} className="md:col-span-2 xl:col-span-4">
                  <DashboardChartCard
                    widget={widget}
                    allKPIs={allKPIs as Record<string, MetricKPIData>}
                    onClick={chartAction ? () => onKpiClick(chartAction) : undefined}
                  />
                </div>
              );
            }

            const kpiConfig = kpiMap[widget.id];
            const kpiData = allKPIs[widget.id as keyof typeof allKPIs];
            const isInteractive = Boolean(kpiConfig?.isInteractive || alwaysInteractive.has(widget.id));
            return (
              <DraggableMetricCard
                key={widget.id}
                widget={widget}
                kpiData={kpiData as MetricKPIData}
                kpiConfig={kpiConfig}
                onClick={isInteractive ? () => onKpiClick(widget) : undefined}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
