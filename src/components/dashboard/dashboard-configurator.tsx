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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/70 backdrop-blur-md z-[60] flex items-center justify-center p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.97, y: 16, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.97, y: -12, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }} onClick={e => e.stopPropagation()} className="fe-surface rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl border border-[color:var(--fe-lime)]/20 bg-[color:var(--fe-lime)]/10"><Settings className="w-5 h-5 text-[color:var(--fe-lime)]" /></div>
                <div><h2 className="font-heading text-xl font-semibold text-foreground">Personalizar Dashboard</h2><p className="text-sm text-muted-foreground">{enabledCount} elemento{enabledCount !== 1 ? 's' : ''} activo{enabledCount !== 1 ? 's' : ''}</p></div>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors" aria-label="Cerrar"><X className="w-5 h-5" /></button>
            </div>

            <div className="px-6 py-4 border-b border-white/10 bg-black/5">
              <div className="flex items-center gap-2 mb-3"><Filter className="w-4 h-4 text-[color:var(--fe-lime)]" /><span className="text-sm font-medium text-foreground">Filtrar por categoría:</span></div>
              <div className="flex gap-2 flex-wrap">
                {categories.map(cat => {
                  const count = cat === 'all' ? availableWidgets.length : availableWidgets.filter(k => k.category === cat).length;
                  return <button type="button" key={cat} onClick={() => setSelectedCategory(cat)} className={cn('px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border', selectedCategory === cat ? 'bg-[color:var(--fe-lime)] text-black border-[color:var(--fe-lime)] shadow-[0_0_18px_rgba(215,255,63,0.18)]' : 'bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:text-foreground')}>{categoryTranslations[cat]} ({count})</button>;
                })}
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredWidgets.map(item => {
                  const widget = widgets.find(w => w.id === item.id);
                  const isEnabled = widget?.enabled || false;
                  const isChart = item.type === 'chart';
                  const Icon = isChart ? (item.id === 'finance-summary-chart' ? BarChart3 : PieChart) : (item.icon ? IconMap[item.icon as keyof typeof IconMap] : AreaChart);
                  return (
                    <div key={item.id} draggable={isEnabled} onDragStart={e => handleDragStart(e, item.id)} onDragOver={e => handleDragOver(e, item.id)} onDrop={e => handleDrop(e, item.id)} onDragEnd={handleDragEnd} className={cn('p-4 rounded-xl border transition-all flex items-center gap-3 group', isEnabled ? 'bg-[color:var(--fe-lime)]/5 border-[color:var(--fe-lime)]/20 shadow-sm' : 'bg-white/[0.02] border-white/10 hover:border-white/20', draggedId === item.id && 'opacity-40 scale-95', overId === item.id && 'border-dashed border-[color:var(--fe-lime)]')}>
                      {isEnabled && <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0" />}
                      <div className={cn('p-2 rounded-lg flex-shrink-0 border', isEnabled ? 'bg-[color:var(--fe-lime)]/10 border-[color:var(--fe-lime)]/15' : 'bg-white/5 border-white/10')}><Icon className={cn('w-5 h-5', isEnabled ? 'text-[color:var(--fe-lime)]' : 'text-muted-foreground')} /></div>
                      <button type="button" onClick={() => handleToggleWidget(item.id)} className="flex-1 text-left">
                        <div className="flex justify-between items-start gap-2">
                          <div><span className="font-semibold text-sm text-foreground block">{item.label ?? item.title}</span><p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">{isChart && <AreaChart className="w-3 h-3" />}{isChart ? 'Gráfico interactivo' : categoryTranslations[item.category]}</p></div>
                          {isEnabled ? <Eye className="w-5 h-5 text-[color:var(--fe-lime)]" /> : <EyeOff className="w-5 h-5 text-muted-foreground" />}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/10 bg-black/10 flex justify-between items-center gap-4">
              <div className="text-sm text-muted-foreground"><span className="font-semibold text-[color:var(--fe-lime)]">{enabledCount}</span>{' '}de{' '}<span className="font-semibold text-foreground">{availableWidgets.length}</span>{' '}elementos activos</div>
              <div className="flex gap-3"><Button type="button" onClick={onClose} variant="outline" disabled={isSaving}>Cancelar</Button><Button type="button" onClick={handleSave} disabled={isSaving} className="bg-[color:var(--fe-lime)] text-black hover:bg-[color:var(--fe-lime)]/90 shadow-[0_0_20px_rgba(215,255,63,0.16)]">{isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</> : <><Save className="w-4 h-4 mr-2" />Guardar Cambios</>}</Button></div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
