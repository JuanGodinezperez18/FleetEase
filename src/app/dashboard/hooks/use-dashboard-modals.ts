// src/app/dashboard/hooks/use-dashboard-modals.ts
'use client';

import { useState, useCallback, useMemo } from 'react';
import type { QuickActionModal } from './use-dashboard-page';

type ActiveModal = 'clients' | 'vehicles' | 'partners' | 'credits' | 'licenses' | 'insurance' | 'incomes' | 'expenses' | null;

interface ModalData {
  title: string;
  data: any[];
  columns?: any[];
}

/**
 * Hook especializado para gestión de modales del dashboard
 * Centraliza el estado y acciones relacionadas con modales
 */
export function useDashboardModals() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [modalData, setModalData] = useState<ModalData>({ title: '', data: [] });
  const [quickActionModal, setQuickActionModal] = useState<QuickActionModal>(null);

  // Títulos de modales centralizados
  const modalTitles: Record<Exclude<QuickActionModal, null>, string> = useMemo(() => ({
    expense: 'Registrar Gasto',
    income: 'Registrar Ingreso',
    credit: 'Registrar Crédito',
    client: 'Registrar Cliente',
    vehicle: 'Registrar Vehículo',
    mileage: 'Registrar Kilometraje',
    'vehicle-inspection': 'Registrar Inspección',
  }), []);

  // Handlers para modal de configuración
  const handleOpenConfig = useCallback(() => setIsConfigOpen(true), []);
  const handleCloseConfig = useCallback(() => setIsConfigOpen(false), []);

  // Handlers para modal de acción rápida
  const handleOpenQuickAction = useCallback((action: string) => {
    setQuickActionModal(action as QuickActionModal);
  }, []);

  const handleCloseQuickAction = useCallback(() => {
    setQuickActionModal(null);
  }, []);

  // Handlers para modales de lista
  const handleOpenListModal = useCallback((modalType: ActiveModal, title: string, data: any[]) => {
    setModalData({ title, data });
    setActiveModal(modalType);
  }, []);

  const handleCloseListModal = useCallback(() => {
    setActiveModal(null);
    setModalData({ title: '', data: [] });
  }, []);

  return {
    // Estado
    isConfigOpen,
    activeModal,
    modalData,
    quickActionModal,
    
    // Handlers de configuración
    handleOpenConfig,
    handleCloseConfig,
    setIsConfigOpen,
    
    // Handlers de acción rápida
    handleOpenQuickAction,
    handleCloseQuickAction,
    setQuickActionModal,
    
    // Handlers de lista
    handleOpenListModal,
    handleCloseListModal,
    setActiveModal,
    setModalData,
    
    // Datos
    modalTitles,
  };
}
