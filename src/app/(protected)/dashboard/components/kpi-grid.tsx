'use client';

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { EmptyState } from '@/components/common/empty-state';
import { Settings } from 'lucide-react';
import { DraggableMetricCard } from '@/components/dashboard/draggrable-metric-card';
import { UnreadNotificationsCard } from '@/components/dashboard/unread-notifications-card';
import { DashboardChartCard } from '@/components/dashboard/dashboard-chart-card';
import type { DashboardWidget, MetricKPIData, KPIConfig } from '@/types/dashboard';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface KpiGridProps {
  enabledWidgets: DashboardWidget[];
  kpiMap: Record<string, KPIConfig>;
  allKPIs: Record<string, any>;
  onKpiClick: (widget: DashboardWidget) => void;
  onDragEnd: (event: DragEndEvent) => void;
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

/**
 * Map DashboardWidget.size → grid col-span.
 * Dense packing (`grid-flow-dense`) fills holes left by larger spans.
 * Tablet (md): 2 cols · Desktop (lg): 3 · XL: 4.
 */
function sizeClass(size?: DashboardWidget['size'], isChart?: boolean): string {
  if (isChart) {
    // Charts: prefer 2 cols so they sit beside a metric instead of leaving a void.
    if (size === 'small') return 'min-w-0 col-span-1';
    if (size === 'large') return 'min-w-0 col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2';
    // medium | default
    return 'min-w-0 col-span-1 md:col-span-2';
  }
  if (size === 'large') return 'min-w-0 col-span-1 md:col-span-2';
  // small | medium | undefined → single cell (fills residual holes via dense)
  return 'min-w-0 col-span-1';
}

/** Drag listeners/attributes for the card surface — no ref (ref stays on the shell). */
type DragHandleProps = Omit<HTMLAttributes<HTMLElement>, 'ref'>;

function SortableWidgetShell({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: (handleProps: DragHandleProps) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    opacity: isDragging ? 0.92 : undefined,
  };

  // Listeners only — transform + ref live on the outer shell (avoids double-offset and ref mismatch).
  // TouchSensor delay (220ms) keeps vertical scroll usable on mobile/tablet.
  const handleProps: DragHandleProps = {
    ...attributes,
    ...listeners,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(className, isDragging && 'relative z-20')}
      data-dragging={isDragging ? 'true' : undefined}
    >
      {children(handleProps)}
    </div>
  );
}

export function KpiGrid({
  enabledWidgets,
  kpiMap,
  allKPIs,
  onKpiClick,
  onDragEnd,
  onOpenConfig,
}: KpiGridProps) {
  const isEmpty = enabledWidgets.length === 0;
  const alwaysInteractive = new Set(['total-clients', 'total-vehicles', 'vehicles-rented']);

  // Pointer: small distance so desktop drag feels immediate.
  // Touch: 220ms delay + 8px tolerance → vertical scroll still works; long-press starts drag.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortableIds = enabledWidgets.map(w => w.id);

  if (isEmpty) {
    return (
      <EmptyState
        icon={Settings}
        title="No tienes KPIs configurados"
        description="Personaliza tu dashboard agregando los indicadores que más te interesen."
        actionLabel="Configurar Dashboard"
        onAction={onOpenConfig}
      />
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={sortableIds} strategy={rectSortingStrategy}>
        <div
          className={cn(
            'min-w-0 grid grid-flow-dense gap-3 sm:gap-4',
            // 1 → 2 → 3 → 4 columns; dense fills holes left by multi-span charts
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          )}
        >
          {enabledWidgets.map(widget => {
            if (widget.id === 'unread-notifications') {
              return (
                <SortableWidgetShell
                  key={widget.id}
                  id={widget.id}
                  className={sizeClass(widget.size ?? 'large')}
                >
                  {() => <UnreadNotificationsCard />}
                </SortableWidgetShell>
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
                          'Próximo': 'maintenance-soon',
                        };
                        const kpiId = map[segmentName];
                        if (kpiId) onKpiClick({ ...widget, id: kpiId } as DashboardWidget);
                      }
                    : undefined;

              return (
                <SortableWidgetShell
                  key={widget.id}
                  id={widget.id}
                  className={sizeClass(widget.size, true)}
                >
                  {handleProps => (
                    <div {...handleProps} className="h-full touch-manipulation">
                      <DashboardChartCard
                        widget={widget}
                        allKPIs={allKPIs as Record<string, MetricKPIData>}
                        onClick={chartAction ? () => onKpiClick(chartAction) : undefined}
                        onSegmentClick={handleSegmentClick}
                      />
                    </div>
                  )}
                </SortableWidgetShell>
              );
            }

            const kpiConfig = kpiMap[widget.id];
            const kpiData = allKPIs[widget.id as keyof typeof allKPIs];
            const isInteractive = Boolean(
              kpiConfig?.isInteractive || alwaysInteractive.has(widget.id)
            );

            return (
              <SortableWidgetShell
                key={widget.id}
                id={widget.id}
                className={sizeClass(widget.size)}
              >
                {handleProps => (
                  <DraggableMetricCard
                    widget={widget}
                    kpiData={kpiData as MetricKPIData}
                    kpiConfig={kpiConfig}
                    onClick={isInteractive ? () => onKpiClick(widget) : undefined}
                    handleProps={handleProps}
                  />
                )}
              </SortableWidgetShell>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
