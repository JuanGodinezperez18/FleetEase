// src/app/dashboard/hooks/use-dashboard-modals.ts
'use client';

import { useState, useCallback, useMemo } from 'react';
import type { QuickActionModal } from './use-dashboard-page';

type ActiveModal =
  | 'clients'
  | 'vehicles'
  | 'partners'
  | 'credits'
  | 'licenses'
  | 'insurance'
  | 'incomes'
  | 'expenses'
  | 'multas'
  | null;

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

  const modalTitles: Record<Exclude<QuickActionModal, null>, string> = useMemo(
    () => ({
      expense: 'Registrar Gasto',
      income: 'Registrar Ingreso',
      credit: 'Registrar Crédito',
      client: 'Registrar Cliente',
      vehicle: 'Registrar Vehículo',
      mileage: 'Registrar Kilometraje',
      'vehicle-inspection': 'Registrar Inspección',
    }),
    []
  );

  const handleOpenConfig = useCallback(() => setIsConfigOpen(true), []);
  const handleCloseConfig = useCallback(() => setIsConfigOpen(false), []);

  const handleOpenQuickAction = useCallback((action: string) => {
    setQuickActionModal(action as QuickActionModal);
  }, []);

  const handleCloseQuickAction = useCallback(() => {
    setQuickActionModal(null);
  }, []);

  const handleOpenListModal = useCallback(
    (modalType: ActiveModal, title: string, data: any[]) => {
      setModalData({ title, data });
      setActiveModal(modalType);
    },
    []
  );

  const handleCloseListModal = useCallback(() => {
    setActiveModal(null);
    setModalData({ title: '', data: [] });
  }, []);

  return {
    isConfigOpen,
    activeModal,
    modalData,
    quickActionModal,
    handleOpenConfig,
    handleCloseConfig,
    setIsConfigOpen,
    handleOpenQuickAction,
    handleCloseQuickAction,
    setQuickActionModal,
    handleOpenListModal,
    handleCloseListModal,
    setActiveModal,
    setModalData,
    modalTitles,
  };
}
