// components/dashboard/dashboard-configurator.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Eye, EyeOff, GripVertical, Save, X, Filter, AreaChart, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AVAILABLE_KPIS, IconMap } from '@/types/dashboard';
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

export function DashboardConfigurator({
  isOpen,
  onClose,
  currentWidgets,
  onSave
}: DashboardConfiguratorProps) {
  const { currentUser } = useAuth();
  const [widgets, setWidgets] = useState<DashboardWidget[]>(currentWidgets);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  
  // ✅ Estado para drag & drop
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    setWidgets(currentWidgets);
  }, [currentWidgets]);

  // ✅ Categorías que coinciden con AVAILABLE_KPIS
  const categories = ['all', 'CLIENTES', 'FLOTA', 'FINANZAS', 'CREDITOS', 'SOCIOS', 'KILOMETRAJE'];
  
  const categoryTranslations: Record<string, string> = {
    all: 'Todos',
    CLIENTES: 'Clientes',
    FLOTA: 'Flota',
    FINANZAS: 'Finanzas',
    CREDITOS: 'Créditos',
    SOCIOS: 'Socios',
    KILOMETRAJE: 'Kilometraje',
  };

  // ✅ Obtener KPIs disponibles
  const availableKPIs = Object.entries(AVAILABLE_KPIS).flatMap(([category, kpis]) =>
    kpis.map(kpi => ({ ...kpi, category }))
  );

  const filteredKPIs = selectedCategory === 'all'
    ? availableKPIs
    : availableKPIs.filter(kpi => kpi.category === selectedCategory);

  // Debug logs
  useEffect(() => {
    if (isOpen) {
      console.log('📊 [DashboardConfigurator] ===== MODAL ABIERTO =====');
      console.log('📊 [DashboardConfigurator] AVAILABLE_KPIS keys:', Object.keys(AVAILABLE_KPIS));
      console.log('📊 [DashboardConfigurator] availableKPIs count:', availableKPIs.length);
      console.log('📊 [DashboardConfigurator] currentWidgets:', currentWidgets);
      console.log('📊 [DashboardConfigurator] filteredKPIs count:', filteredKPIs.length);
      console.log('📊 [DashboardConfigurator] selectedCategory:', selectedCategory);
    }
  }, [isOpen, availableKPIs.length, filteredKPIs.length, currentWidgets, selectedCategory]);

  // ✅ Toggle widget
  const handleToggleWidget = (kpiId: string) => {
    const existingWidget = widgets.find(w => w.id === kpiId);
    
    if (existingWidget) {
      // Cambiar estado enabled
      setWidgets(widgets.map(w =>
        w.id === kpiId ? { ...w, enabled: !w.enabled } : w
      ));
    } else {
      // Agregar nuevo widget
      const kpi = availableKPIs.find(k => k.id === kpiId);
      if (kpi) {
        const newWidget: DashboardWidget = {
          id: kpi.id,
          type: 'metric',
          title: kpi.label,
          category: kpi.category as any,
          dataKey: kpi.id,
          enabled: true,
          order: widgets.length,
        };
        setWidgets([...widgets, newWidget]);
      }
    }
  };

  // ✅ Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, kpiId: string) => {
    setDraggedId(kpiId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, kpiId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverId(kpiId);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setOverId(null);
      return;
    }

    const draggedIndex = widgets.findIndex(w => w.id === draggedId);
    const targetIndex = widgets.findIndex(w => w.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      setOverId(null);
      return;
    }

    const newWidgets = [...widgets];
    const [removed] = newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, removed);

    // Actualizar order
    const reorderedWidgets = newWidgets.map((w, index) => ({ ...w, order: index }));
    setWidgets(reorderedWidgets);
    
    setDraggedId(null);
    setOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setOverId(null);
  };

  // ✅ Guardar configuración
  const handleSave = async () => {
    if (!currentUser) {
      toast.error('Usuario no autenticado');
      return;
    }

    setIsSaving(true);
    try {
      await dashboardService.updateDashboard(currentUser.uid, { widgets });
      onSave(widgets);
      toast.success('Dashboard actualizado correctamente');
      onClose();
    } catch (error) {
      console.error('Error al guardar dashboard:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -20, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Personalizar Dashboard
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {enabledCount} KPI{enabledCount !== 1 ? 's' : ''} activo{enabledCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Filtros de categoría */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filtrar por categoría:
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {categories.map(cat => {
                  const count = cat === 'all' 
                    ? availableKPIs.length 
                    : availableKPIs.filter(k => k.category === cat).length;
                  
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white shadow-md scale-105'
                          : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700'
                      )}
                    >
                      {categoryTranslations[cat]} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista de KPIs */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredKPIs.map(kpi => {
                  const widget = widgets.find(w => w.id === kpi.id);
                  const isEnabled = widget?.enabled || false;
                  const Icon = kpi.icon ? IconMap[kpi.icon as keyof typeof IconMap] : AreaChart;
                  
                  return (
                    <div
                      key={kpi.id}
                      draggable={isEnabled}
                      onDragStart={(e) => handleDragStart(e, kpi.id)}
                      onDragOver={(e) => handleDragOver(e, kpi.id)}
                      onDrop={(e) => handleDrop(e, kpi.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'p-4 rounded-lg border-2 transition-all flex items-center gap-3 group',
                        isEnabled
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800 shadow-sm'
                          : 'bg-white dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600',
                        draggedId === kpi.id && 'opacity-40 scale-95',
                        overId === kpi.id && 'border-dashed border-blue-500'
                      )}
                    >
                      {/* Drag handle - solo visible si está enabled */}
                      {isEnabled && (
                        <GripVertical className="h-5 w-5 text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0" />
                      )}
                      
                      {/* Icono del KPI */}
                      <div className={cn(
                        'p-2 rounded-lg flex-shrink-0',
                        isEnabled 
                          ? 'bg-blue-100 dark:bg-blue-900/50' 
                          : 'bg-gray-100 dark:bg-slate-700'
                      )}>
                        {Icon && <Icon className={cn(
                          'w-5 h-5',
                          isEnabled 
                            ? 'text-blue-600 dark:text-blue-400' 
                            : 'text-gray-500 dark:text-gray-400'
                        )} />}
                      </div>

                      {/* Contenido */}
                      <button
                        onClick={() => handleToggleWidget(kpi.id)}
                        className="flex-1 text-left"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="font-semibold text-sm text-gray-900 dark:text-white block">
                              {kpi.label}
                            </span>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                              {'type' in kpi && kpi.type === 'chart' && <AreaChart className="w-3 h-3" />}
                              {categoryTranslations[kpi.category as keyof typeof categoryTranslations]}
                            </p>
                          </div>
                          
                          {/* Toggle visual */}
                          <div className="flex-shrink-0">
                            {isEnabled ? (
                              <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <EyeOff className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
              
              {filteredKPIs.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay KPIs disponibles en esta categoría</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-slate-400">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {enabledCount}
                </span>
                {' '}de{' '}
                <span className="font-semibold">
                  {availableKPIs.length}
                </span>
                {' '}KPIs activos
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={onClose} 
                  variant="outline"
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
