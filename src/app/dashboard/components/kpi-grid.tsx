'use client';

import { EmptyState } from '@/components/common/empty-state';
import { Settings } from 'lucide-react';
import { DraggableMetricCard } from '@/components/dashboard/draggrable-metric-card';
import { UnreadNotificationsCard } from '@/components/dashboard/unread-notifications-card';
import { DashboardChartCard } from '@/components/dashboard/dashboard-chart-card';
import type { DashboardWidget, MetricKPIData, KPIConfig } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface KpiGridProps {
  enabledWidgets: DashboardWidget[];
  kpiMap: Record<string, KPIConfig>;
  allKPIs: Record<string, any>;
  onKpiClick: (widget: DashboardWidget) => void;
  onDragEnd: (event: any) => void;
  onOpenConfig?: () => void;
}

/** Clic en la tarjeta completa (fallback). */
const chartActionMap: Record<string, string> = {
  'finance-summary-chart': 'income-month',
  'fleet-status-chart': 'vehicles-available',
  'credit-portfolio-chart': 'active-credits',
  'maintenance-chart': 'maintenance-overdue',
  'fines-chart': 'multas-pendientes',
  'client-risk-chart': 'clients-with-debt',
};

/**
 * Clic en un segmento concreto del pie "Estado de la Flota".
 * Disponibles = sin cliente asignado (clientId null).
 */
const fleetSegmentActionMap: Record<string, string> = {
  Rentados: 'vehicles-rented',
  Disponibles: 'vehicles-available',
  Mantenimiento: 'maintenance-overdue',
};

/** Map DashboardWidget.size → grid col-span (already persisted by configurator). */
function sizeClass(size?: DashboardWidget['size'], isChart?: boolean): string {
  if (isChart) {
    // Charts default to full-width on xl; size can still narrow on md+
    if (size === 'small') return 'min-w-0 md:col-span-1 xl:col-span-2';
    if (size === 'medium') return 'min-w-0 md:col-span-2 xl:col-span-2';
    return 'min-w-0 md:col-span-2 xl:col-span-4'; // large | undefined
  }
  if (size === 'large') return 'min-w-0 md:col-span-2 xl:col-span-2';
  if (size === 'small') return 'min-w-0';
  return 'min-w-0'; // medium | undefined → 1 col
}

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
        <div className="min-w-0 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {enabledWidgets.map(widget => {
            if (widget.id === 'unread-notifications') {
              return (
                <div
                  key={widget.id}
                  className={cn(sizeClass(widget.size ?? 'large'))}
                >
                  <UnreadNotificationsCard />
                </div>
              );
            }
            if (widget.type === 'chart') {
              const actionId = chartActionMap[widget.id];
              const chartAction = actionId
                ? ({ ...widget, id: actionId } as DashboardWidget)
                : undefined;

              const handleSegmentClick =
                widget.id === 'fleet-status-chart' || widget.dataKey === 'fleet-status-chart'
                  ? (segmentName: string) => {
                      const kpiId = fleetSegmentActionMap[segmentName];
                      if (!kpiId) return;
                      onKpiClick({ ...widget, id: kpiId } as DashboardWidget);
                    }
                  : widget.id === 'maintenance-chart' || widget.dataKey === 'maintenance-chart'
                    ? (segmentName: string) => {
                        const map: Record<string, string> = {
                          Vencido: 'maintenance-overdue',
                          Próximo: 'maintenance-soon',
                        };
                        const kpiId = map[segmentName];
                        if (kpiId) onKpiClick({ ...widget, id: kpiId } as DashboardWidget);
                      }
                    : undefined;

              return (
                <div key={widget.id} className={sizeClass(widget.size, true)}>
                  <DashboardChartCard
                    widget={widget}
                    allKPIs={allKPIs as Record<string, MetricKPIData>}
                    onClick={chartAction ? () => onKpiClick(chartAction) : undefined}
                    onSegmentClick={handleSegmentClick}
                  />
                </div>
              );
            }

            const kpiConfig = kpiMap[widget.id];
            const kpiData = allKPIs[widget.id as keyof typeof allKPIs];
            const isInteractive = Boolean(kpiConfig?.isInteractive || alwaysInteractive.has(widget.id));
            return (
              <div key={widget.id} className={sizeClass(widget.size)}>
                <DraggableMetricCard
                  widget={widget}
                  kpiData={kpiData as MetricKPIData}
                  kpiConfig={kpiConfig}
                  onClick={isInteractive ? () => onKpiClick(widget) : undefined}
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
