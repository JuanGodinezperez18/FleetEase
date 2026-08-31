// app/dashboard/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useDashboardPage } from './hooks/use-dashboard-page';
import { DashboardHeader } from './components/dashboard-header';
import { KpiGrid } from './components/kpi-grid';
import { QuickActions } from './components/quick-actions';
import { GlobalLoader } from '@/components/common/GlobalLoader';
import { DashboardConfigurator } from '@/components/dashboard/dashboard-configurator';
import { LiveRegion, useAnnounce } from '@/components/accessibility/live-region';
import type { QuickActionModal } from './hooks/use-dashboard-page';
import { DEFAULT_DASHBOARD_CONFIG } from '@/types/dashboard';

import {
  ClientListModal,
  LicenseExpiringModal,
  InsuranceExpiringModal,
  VehicleListModal,
  PartnerBalancesModal,
  CreditListModal,
  IncomeListModal,
  ExpenseListModal,
  VehicleInspectionModal,
} from './components/dashboard-modals-bundle';

export default function DashboardPage() {
  const { announce, message: announcementMessage } = useAnnounce();

  const {
    currentUser,
    dashboardConfig,
    isLoadingConfig,
    configError,
    isConfigOpen,
    activeModal,
    modalData,
    quickActionModal,
    isSubmittingForm,
    dateFilterType,
    vehicles,
    clients,
    partners,
    companies,
    incomeAndPaymentCategories,
    expenseCategories,
    allKPIs,
    KPI_MAP,
    enabledWidgets,
    setIsConfigOpen,
    setActiveModal,
    setQuickActionModal,
    handleQuickAction,
    handleDatePresetChange,
    handleDragEnd,
    handleKpiClick,
    handleIncomeSubmit,
    handleExpenseSubmit,
    handleCreditSubmit,
    handleClientSubmit,
    handleVehicleSubmit,
    handleMileageSubmit,
    saveWidgetOrder,
    modalTitles,
  } = useDashboardPage();

  // La configuración del dashboard es local/opcional. Nunca debe bloquear
  // el render de toda la página mientras React Query la resuelve.
  const effectiveDashboardConfig = currentUser
    ? (dashboardConfig ?? {
        userId: currentUser.uid,
        ...DEFAULT_DASHBOARD_CONFIG,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    : null;

  if (!currentUser) {
    return <GlobalLoader />;
  }

  if (configError) {
    console.error('🔴 [Dashboard] Error cargando configuración:', configError);
    // La configuración no es crítica para mostrar el dashboard. Continuamos
    // con la configuración por defecto y dejamos el error en consola.
  }

  if (isLoadingConfig) {
    console.log('⏳ [Dashboard] Configuración aún cargando; renderizando con fallback local.');
  }

  return (
    <>
      <a
        href="#main-content"
        className="skip-to-content sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
      >
        Ir al contenido principal
      </a>

      <LiveRegion message={announcementMessage} politeness="polite" clearAfter={5000} />

      <div className="space-y-6" id="main-content">
        <DashboardHeader
          userName={currentUser.name}
          isConfigOpen={isConfigOpen}
          onOpenConfig={() => setIsConfigOpen(true)}
          onDateChange={() => undefined}
        />

        <KpiGrid
          enabledWidgets={enabledWidgets.length > 0 ? enabledWidgets : effectiveDashboardConfig?.widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order) ?? []}
          kpiMap={KPI_MAP}
          allKPIs={allKPIs}
          onKpiClick={handleKpiClick}
          onDragEnd={handleDragEnd}
        />

        <QuickActions
          quickActionModal={quickActionModal}
          isSubmittingForm={isSubmittingForm}
          companies={companies}
          expenseCategories={expenseCategories}
          incomeAndPaymentCategories={incomeAndPaymentCategories}
          vehicles={vehicles}
          clients={clients}
          onOpenModal={handleQuickAction}
          onCloseModal={() => setQuickActionModal(null)}
          onIncomeSubmit={handleIncomeSubmit}
          onExpenseSubmit={handleExpenseSubmit}
          onCreditSubmit={handleCreditSubmit}
          onClientSubmit={handleClientSubmit}
          onVehicleSubmit={handleVehicleSubmit}
          onMileageSubmit={handleMileageSubmit}
          modalTitles={modalTitles}
        />

        {isConfigOpen && effectiveDashboardConfig && (
          <DashboardConfigurator
            isOpen={isConfigOpen}
            onClose={() => setIsConfigOpen(false)}
            currentWidgets={effectiveDashboardConfig.widgets}
            onSave={(widgets) => {
              saveWidgetOrder(widgets);
              setIsConfigOpen(false);
              announce('Configuración guardada exitosamente');
            }}
          />
        )}

        {activeModal === 'clients' && (
          <ClientListModal isOpen={true} onClose={() => setActiveModal(null)} title={modalData.title} clients={modalData.data} />
        )}
        {activeModal === 'licenses' && (
          <LicenseExpiringModal isOpen={true} onClose={() => setActiveModal(null)} title={modalData.title} clients={modalData.data} />
        )}
        {activeModal === 'insurance' && (
          <InsuranceExpiringModal isOpen={true} onClose={() => setActiveModal(null)} title={modalData.title} vehicles={modalData.data} />
        )}
        {activeModal === 'vehicles' && (
          <VehicleListModal isOpen={true} onClose={() => setActiveModal(null)} title={modalData.title} vehicles={modalData.data} />
        )}
        {activeModal === 'partners' && (
          <PartnerBalancesModal isOpen={true} onClose={() => setActiveModal(null)} balances={modalData.data} />
        )}
        {activeModal === 'credits' && (
          <CreditListModal isOpen={true} onClose={() => setActiveModal(null)} title={modalData.title} credits={modalData.data} />
        )}
        {activeModal === 'incomes' && (
          <IncomeListModal isOpen={true} onClose={() => setActiveModal(null)} title={modalData.title} incomes={modalData.data} />
        )}
        {activeModal === 'expenses' && (
          <ExpenseListModal isOpen={true} onClose={() => setActiveModal(null)} title={modalData.title} expenses={modalData.data} />
        )}

        {quickActionModal === 'vehicle-inspection' && (
          <VehicleInspectionModal
            isOpen={true}
            onClose={() => setQuickActionModal(null)}
            vehicleId=""
            onSuccess={() => {
              setQuickActionModal(null);
              toast.success('Inspección registrada exitosamente');
              announce('Inspección registrada exitosamente');
            }}
          />
        )}
      </div>
    </>
  );
}
