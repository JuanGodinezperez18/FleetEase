'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Eye, EyeOff, GripVertical, Save, X, Filter, AreaChart, Loader2, BarChart3, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AVAILABLE_KPIS, CHART_WIDGETS, IconMap } from '@/types/dashboard';
import type { DashboardWidget } from '@/types/dashboard';
import { toast } from 'sonner';
import { dashboardService } from '@/lib/dashboard-service';
import { useAuth } from '@/contexts/auth-provider';
import { cn } from '@/lib/utils';

interface DashboardConfiguratorProps {
  isOpen: boolean;
  onClose: () => void;
  currentWidgets: DashboardWidget[];
  onSave: (widgets: DashboardWidget[]) => void;
}

export function DashboardConfigurator({ isOpen, onClose, currentWidgets, onSave }: DashboardConfiguratorProps) {
  const { currentUser } = useAuth();
  const [widgets, setWidgets] = useState<DashboardWidget[]>(currentWidgets);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => { setWidgets(currentWidgets); }, [currentWidgets]);

  const categories = ['all', 'CLIENTES', 'FLOTA', 'FINANZAS', 'CREDITOS', 'SOCIOS', 'KILOMETRAJE', 'MULTAS'];
  const categoryTranslations: Record<string, string> = {
    all: 'Todos', CLIENTES: 'Clientes', FLOTA: 'Flota', FINANZAS: 'Finanzas',
    CREDITOS: 'Créditos', SOCIOS: 'Socios', KILOMETRAJE: 'Kilometraje', MULTAS: 'Multas',
  };

  const availableKPIs = Object.entries(AVAILABLE_KPIS).flatMap(([category, kpis]) => kpis.map(kpi => ({ ...kpi, category })));
  const availableWidgets = [...availableKPIs.map(kpi => ({ ...kpi, type: 'metric' as const })), ...CHART_WIDGETS];
  const filteredWidgets = selectedCategory === 'all' ? availableWidgets : availableWidgets.filter(widget => widget.category === selectedCategory);

  const handleToggleWidget = (widgetId: string) => {
    const existingWidget = widgets.find(w => w.id === widgetId);
    if (existingWidget) {
      setWidgets(widgets.map(w => w.id === widgetId ? { ...w, enabled: !w.enabled } : w));
      return;
    }
    const item = availableWidgets.find(w => w.id === widgetId);
    if (item) {
      setWidgets([...widgets, {
        id: item.id,
        type: item.type,
        title: item.label ?? item.title,
        category: item.category as DashboardWidget['category'],
        dataKey: item.dataKey ?? item.id,
        enabled: true,
        order: widgets.length,
        ...(item.size ? { size: item.size } : {}),
      }]);
    }
  };

  const handleDragStart = (e: React.DragEvent, widgetId: string) => { setDraggedId(widgetId); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent, widgetId: string) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOverId(widgetId); };
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) { setDraggedId(null); setOverId(null); return; }
    const draggedIndex = widgets.findIndex(w => w.id === draggedId);
    const targetIndex = widgets.findIndex(w => w.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) { setDraggedId(null); setOverId(null); return; }
    const newWidgets = [...widgets];
    const [removed] = newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, removed);
    setWidgets(newWidgets.map((w, index) => ({ ...w, order: index })));
    setDraggedId(null); setOverId(null);
  };
  const handleDragEnd = () => { setDraggedId(null); setOverId(null); };

  const handleSave = async () => {
    if (!currentUser) { toast.error('Usuario no autenticado'); return; }
    setIsSaving(true);
    try {
      await dashboardService.updateDashboard(currentUser.uid, { widgets });
      onSave(widgets); toast.success('Dashboard actualizado correctamente'); onClose();
    } catch (error) {
      console.error('Error al guardar dashboard:', error); toast.error('Error al guardar la configuración');
    } finally { setIsSaving(false); }
  };

  if (!isOpen) return null;
  const enabledCount = widgets.filter(w => w.enabled).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-5"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.98, y: 14, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, y: -8, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-config-title"
            className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] border border-white/[0.09] bg-[#0e1117] text-white shadow-[0_32px_100px_rgba(0,0,0,.55)]"
          >
            <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-[#d7ff3f]/[0.06] blur-[90px]" />

            <div className="relative flex items-center justify-between border-b border-white/[0.07] px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.07]">
                  <Settings className="h-5 w-5 text-[#d7ff3f]" />
                </div>
                <div className="min-w-0">
                  <h2 id="dashboard-config-title" className="truncate text-base font-semibold tracking-[-0.02em] sm:text-lg">Personalizar dashboard</h2>
                  <p className="mt-0.5 text-[11px] text-white/35">Elige qué ves y arrastra para ordenar.</p>
                </div>
              </div>
              <button type="button" onClick={onClose} className="ml-3 rounded-xl p-2 text-white/35 transition-colors hover:bg-white/[0.05] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#d7ff3f]/40" aria-label="Cerrar personalización">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative border-b border-white/[0.07] px-5 py-4 sm:px-6">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                  <Filter className="h-3.5 w-3.5 text-[#d7ff3f]" />
                  Categoría
                </div>
                <span className="text-[10px] text-white/25">{enabledCount} activos</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {categories.map(cat => {
                  const count = cat === 'all' ? availableWidgets.length : availableWidgets.filter(k => k.category === cat).length;
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        'shrink-0 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#d7ff3f]/30',
                        selectedCategory === cat
                          ? 'border-[#d7ff3f]/30 bg-[#d7ff3f]/10 text-[#d7ff3f]'
                          : 'border-white/[0.07] bg-white/[0.025] text-white/40 hover:border-white/[0.13] hover:bg-white/[0.045] hover:text-white/70'
                      )}
                    >
                      {categoryTranslations[cat]} <span className="ml-0.5 opacity-45">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="relative flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {filteredWidgets.map(item => {
                  const widget = widgets.find(w => w.id === item.id);
                  const isEnabled = widget?.enabled || false;
                  const isChart = item.type === 'chart';
                  const Icon = isChart ? (item.id === 'finance-summary-chart' ? BarChart3 : PieChart) : (item.icon ? IconMap[item.icon as keyof typeof IconMap] : AreaChart);
                  return (
                    <div
                      key={item.id}
                      draggable={isEnabled}
                      onDragStart={e => handleDragStart(e, item.id)}
                      onDragOver={e => handleDragOver(e, item.id)}
                      onDrop={e => handleDrop(e, item.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'group flex items-center gap-3 rounded-2xl border p-3 transition-all',
                        isEnabled ? 'border-[#d7ff3f]/12 bg-[#d7ff3f]/[0.035]' : 'border-white/[0.06] bg-white/[0.018] hover:border-white/[0.11] hover:bg-white/[0.03]',
                        draggedId === item.id && 'scale-[0.98] opacity-40',
                        overId === item.id && 'border-dashed border-[#d7ff3f]/60'
                      )}
                    >
                      {isEnabled && <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-white/20 transition-colors group-hover:text-white/40 active:cursor-grabbing" aria-hidden="true" />}
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', isEnabled ? 'border-[#d7ff3f]/12 bg-[#d7ff3f]/[0.07]' : 'border-white/[0.07] bg-white/[0.03]')}>
                        <Icon className={cn('h-4 w-4', isEnabled ? 'text-[#d7ff3f]' : 'text-white/30')} />
                      </div>
                      <button type="button" onClick={() => handleToggleWidget(item.id)} className="min-w-0 flex-1 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#d7ff3f]/30">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-white/80">{item.label ?? item.title}</span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/30">
                              {isChart && <AreaChart className="h-3 w-3" />}
                              {isChart ? 'Gráfico interactivo' : categoryTranslations[item.category]}
                            </span>
                          </div>
                          <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors', isEnabled ? 'border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.06]' : 'border-white/[0.06] bg-white/[0.02]')}>
                            {isEnabled ? <Eye className="h-3.5 w-3.5 text-[#d7ff3f]" /> : <EyeOff className="h-3.5 w-3.5 text-white/25" />}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative flex flex-col gap-3 border-t border-white/[0.07] bg-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="text-[10px] text-white/30">
                <span className="font-semibold text-[#d7ff3f]">{enabledCount}</span> de <span className="font-semibold text-white/55">{availableWidgets.length}</span> elementos visibles
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={onClose} variant="outline" disabled={isSaving} className="h-9 rounded-xl border-white/[0.08] bg-white/[0.025] px-4 text-xs text-white/55 hover:bg-white/[0.05] hover:text-white">
                  Cancelar
                </Button>
                <Button type="button" onClick={handleSave} disabled={isSaving} className="h-9 rounded-xl bg-[#d7ff3f] px-4 text-xs font-bold text-black hover:bg-[#d7ff3f]/90 shadow-[0_0_22px_rgba(215,255,63,.12)]">
                  {isSaving ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Guardando</> : <><Save className="mr-2 h-3.5 w-3.5" />Guardar cambios</>}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
