// src/app/dashboard/hooks/use-dashboard-page.ts
'use client';

import React, { useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-provider';
import { useDashboardConfig, useSaveWidgetOrder } from '@/hooks/use-dashboard-config';
import { useDashboardKPIs } from '@/hooks/use-dashboard-kpis';
import { useDashboardData } from './use-dashboard-data';
import { useDashboardModals } from './use-dashboard-modals';
import { useDashboardActions } from './use-dashboard-actions';
import { AVAILABLE_KPIS, type DashboardWidget, type MetricKPIData, type KPIConfig } from '@/types/dashboard';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { arrayMove } from '@dnd-kit/sortable';
import type { DateFilterPreset } from '../types';
import { usePerformanceMonitor } from '@/hooks/use-performance-monitor';

export type QuickActionModal = 'expense' | 'income' | 'credit' | 'client' | 'vehicle' | 'mileage' | 'vehicle-inspection' | null;

/**
 * Hook principal del Dashboard refactorizado
 * Compuesto por hooks especializados para mejor organización y rendimiento
 */
export function useDashboardPage() {
  // Performance monitoring
  const { mountTime, renderCount } = usePerformanceMonitor({
    componentName: 'useDashboardPage',
    logOnUnmount: true,
    warnThreshold: 2000,
  });

  // Auth
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Datos (nuevo hook especializado)
  const data = useDashboardData();

  // Modales (nuevo hook especializado)
  const modals = useDashboardModals();

  // Acciones de formulario (nuevo hook especializado)
  const actions = useDashboardActions({
    addIncome: data.dataContext?.addIncome,
    addExpense: data.dataContext?.addExpense,
    addCredit: data.dataContext?.addCredit,
    addClient: data.dataContext?.addClient,
    addVehicle: data.dataContext?.addVehicle,
    addMileageLog: data.dataContext?.addMileageLog,
    currentUser: currentUser || undefined,
    handleCloseQuickAction: modals.handleCloseQuickAction,
  });

  // Configuración del dashboard
  const { data: dashboardConfig, isLoading: isLoadingConfig, error: configError } = useDashboardConfig(currentUser?.uid);
  const { mutate: saveWidgetOrder } = useSaveWidgetOrder(currentUser?.uid);

  // Estado para filtro de fechas
  const [customDateRange, setCustomDateRange] = React.useState<DateRange | undefined>(undefined);
  const [dateFilterType, setDateFilterType] = React.useState<DateFilterPreset>('month');

  // Inicializar date range
  useEffect(() => {
    const today = new Date();
    setCustomDateRange({
      from: startOfMonth(today),
      to: endOfMonth(today),
    });
  }, []);

  // Effective date range
  const effectiveDateRange = useMemo(() => customDateRange || {
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  }, [customDateRange]);

  // KPIs habilitados
  const enabledKPIIds = useMemo(() =>
    dashboardConfig?.widgets
      .filter(w => w.enabled)
      .map(w => w.id) || [],
    [dashboardConfig]
  );

  // KPIs (hook existente)
  const allKPIs = useDashboardKPIs(effectiveDateRange);

  // Mapeo de KPIs
  const KPI_MAP = useMemo(() => {
    return Object.values(AVAILABLE_KPIS).flat().reduce((acc, kpi) => {
      acc[kpi.id] = kpi;
      return acc;
    }, {} as Record<string, KPIConfig>);
  }, []);

  // Widgets habilitados ordenados
  const enabledWidgets = useMemo(() =>
    dashboardConfig?.widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order) || [],
    [dashboardConfig]
  );

  // Handlers para abrir modales de lista con KPI details
  const openClientListModal = React.useCallback((kpiKey: string, title: string) => {
    const kpiDetails = (allKPIs[kpiKey] as any)?.details;
    if (kpiDetails) {
      modals.handleOpenListModal('clients', title, kpiDetails);
    }
  }, [allKPIs, modals]);

  const openVehicleListModal = React.useCallback((kpiKey: string, title: string) => {
    const kpiDetails = (allKPIs[kpiKey] as any)?.details;
    if (kpiDetails) {
      modals.handleOpenListModal('vehicles', title, kpiDetails);
    }
  }, [allKPIs, modals]);

  const openPartnerBalancesModal = React.useCallback(() => {
    const kpiDetails = (allKPIs['total-partner-balance'] as any)?.details;
    if (kpiDetails) {
      modals.handleOpenListModal('partners', 'Balances de Socios', kpiDetails);
    }
  }, [allKPIs, modals]);

  const openCreditListModal = React.useCallback((kpiKey: string, title: string) => {
    const kpiDetails = (allKPIs[kpiKey] as any)?.details;
    if (kpiDetails) {
      modals.handleOpenListModal('credits', title, kpiDetails);
    }
  }, [allKPIs, modals]);

  const openLicenseExpiringModal = React.useCallback((kpiKey: string, title: string) => {
    const kpiDetails = (allKPIs[kpiKey] as any)?.details;
    if (kpiDetails) {
      modals.handleOpenListModal('licenses', title, kpiDetails);
    }
  }, [allKPIs, modals]);

  const openInsuranceExpiringModal = React.useCallback((kpiKey: string, title: string) => {
    const kpiDetails = (allKPIs[kpiKey] as any)?.details;
    if (kpiDetails) {
      modals.handleOpenListModal('insurance', title, kpiDetails);
    }
  }, [allKPIs, modals]);

  const openIncomeListModal = React.useCallback((kpiKey: string, title: string) => {
    const kpiDetails = (allKPIs[kpiKey] as any)?.details;
    if (kpiDetails) {
      modals.handleOpenListModal('incomes', title, kpiDetails);
    }
  }, [allKPIs, modals]);

  const openExpenseListModal = React.useCallback((kpiKey: string, title: string) => {
    const kpiDetails = (allKPIs[kpiKey] as any)?.details;
    if (kpiDetails) {
      modals.handleOpenListModal('expenses', title, kpiDetails);
    }
  }, [allKPIs, modals]);

  // Acciones de KPI
  const kpiActions: Record<string, () => void> = useMemo(() => ({
    'client-balance-total': () => openClientListModal('client-balance-total', 'Balance Total de Clientes'),
    'clients-with-debt': () => openClientListModal('clients-with-debt', 'Clientes con Deuda'),
    'critical-clients': () => openClientListModal('critical-clients', 'Clientes Críticos (Deuda > $6,000)'),
    'licenses-expiring': () => openLicenseExpiringModal('licenses-expiring', 'Licencias por Vencer'),
    'insurance-expiring': () => openInsuranceExpiringModal('insurance-expiring', 'Seguros por Vencer'),
    'vehicles-available': () => openVehicleListModal('vehicles-available', 'Vehículos Disponibles'),
    'maintenance-overdue': () => openVehicleListModal('maintenance-overdue', 'Vehículos con Mantenimiento Vencido'),
    'income-month': () => openIncomeListModal('income-month', 'Ingresos del Mes'),
    'income-today': () => { /* toast.info ya no disponible aquí */ },
    'expenses-month': () => openExpenseListModal('expenses-month', 'Gastos del Mes'),
    'expenses-today': () => { /* toast.info ya no disponible aquí */ },
    'top-expense-category': () => { /* toast.info ya no disponible aquí */ },
    'active-credits': () => openCreditListModal('active-credits', 'Créditos Activos'),
    'overdue-credits': () => openCreditListModal('overdue-credits', 'Créditos con Pagos Vencidos'),
    'total-partner-balance': openPartnerBalancesModal,
    'partners-positive-balance': () => openPartnerBalancesModal(),
    'partners-negative-balance': () => openPartnerBalancesModal(),
    'maintenance-soon': () => openVehicleListModal('maintenance-soon', 'Mantenimiento Próximo'),
    'high-mileage-vehicles': () => openVehicleListModal('high-mileage-vehicles', 'Vehículos con Alto Kilometraje'),
  }), [openClientListModal, openVehicleListModal, openPartnerBalancesModal, openCreditListModal, openLicenseExpiringModal, openInsuranceExpiringModal, openIncomeListModal, openExpenseListModal, modals]);

  const handleKpiClick = React.useCallback((widget: DashboardWidget) => {
    const action = kpiActions[widget.id];
    if (action) action();
  }, [kpiActions]);

  const handleDatePresetChange = React.useCallback((preset: DateFilterPreset) => {
    const now = new Date();
    setDateFilterType(preset);
    if (preset === 'week') setCustomDateRange({ from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) });
    if (preset === 'month') setCustomDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
    if (preset === 'year') setCustomDateRange({ from: startOfYear(now), to: endOfYear(now) });
  }, []);

  const handleDragEnd = React.useCallback(async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !dashboardConfig) return;

    const oldIndex = dashboardConfig.widgets.findIndex((item) => item.id === active.id);
    const newIndex = dashboardConfig.widgets.findIndex((item) => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(dashboardConfig.widgets, oldIndex, newIndex);
    saveWidgetOrder(newOrder.map((w: DashboardWidget, index: number) => ({ ...w, order: index })));
  }, [dashboardConfig, saveWidgetOrder]);

  // Log de rendimiento en desarrollo
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Dashboard] Render #${renderCount}, Mount time: ${mountTime}ms`);
    }
  }, [renderCount, mountTime]);

  return {
    // Estado
    currentUser,
    dashboardConfig,
    isLoadingConfig,
    configError,
    isConfigOpen: modals.isConfigOpen,
    activeModal: modals.activeModal,
    modalData: modals.modalData,
    quickActionModal: modals.quickActionModal,
    isSubmittingForm: actions.isSubmittingForm,
    dateFilterType,
    customDateRange,

    // Data
    vehicles: data.vehicles,
    clients: data.clients,
    partners: data.partners,
    companies: data.companies,
    incomeAndPaymentCategories: data.incomeAndPaymentCategories,
    expenseCategories: data.expenseCategories,
    allKPIs,
    KPI_MAP,
    enabledWidgets,

    // Actions
    setIsConfigOpen: modals.setIsConfigOpen,
    setActiveModal: modals.setActiveModal,
    setQuickActionModal: modals.setQuickActionModal,
    handleQuickAction: modals.handleOpenQuickAction,
    handleDatePresetChange,
    handleDragEnd,
    handleKpiClick,
    handleIncomeSubmit: actions.handleIncomeSubmit,
    handleExpenseSubmit: actions.handleExpenseSubmit,
    handleCreditSubmit: actions.handleCreditSubmit,
    handleClientSubmit: actions.handleClientSubmit,
    handleVehicleSubmit: actions.handleVehicleSubmit,
    handleMileageSubmit: actions.handleMileageSubmit,
    saveWidgetOrder,
    modalTitles: modals.modalTitles,
  };
}
