import { useState, useCallback } from 'react';
import type { DashboardWidget } from '@/types/dashboard';

/**
 * Hook para gestionar la lógica de arrastrar y soltar (drag and drop)
 * para una lista de widgets, sin manejar el estado de la lista en sí.
 * Devuelve manejadores de eventos y el estado del arrastre.
 */
export function useSortableWidgets() {
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [overWidget, setOverWidget] = useState<string | null>(null);

  const handleDragStart = useCallback((id: string) => {
    setDraggedWidget(id);
  }, []);

  const handleDragOver = useCallback((id: string) => {
    setOverWidget(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedWidget(null);
    setOverWidget(null);
  }, []);

  /**
   * Calcula el nuevo orden de los widgets después de soltar.
   * No modifica el estado, solo devuelve la nueva lista ordenada.
   * @param currentWidgets - La lista actual de widgets.
   * @param targetId - El ID del widget sobre el cual se soltó el arrastrado.
   * @returns La nueva lista de widgets reordenada.
   */
  const handleDrop = useCallback((currentWidgets: DashboardWidget[], targetId: string): DashboardWidget[] | undefined => {
    if (!draggedWidget || draggedWidget === targetId) {
      return undefined;
    }

    const draggedIndex = currentWidgets.findIndex(w => w.id === draggedWidget);
    const targetIndex = currentWidgets.findIndex(w => w.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      return currentWidgets;
    }

    const newWidgets = [...currentWidgets];
    const [removed] = newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, removed);

    // Asignar el nuevo orden
    return newWidgets.map((w, idx) => ({ ...w, order: idx }));
  }, [draggedWidget]);

  return {
    draggedWidget,
    overWidget,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  };
}
