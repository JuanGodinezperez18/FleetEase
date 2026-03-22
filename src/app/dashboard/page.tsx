// app/dashboard/page.tsx
'use client';

import { Suspense, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useDashboardPage } from './hooks/use-dashboard-page';
import { DashboardHeader } from './components/dashboard-header';
import { KpiGrid } from './components/kpi-grid';
import { QuickActions } from './components/quick-actions';
import { GlobalLoader } from '@/components/common/GlobalLoader';
import { DashboardConfigurator } from '@/components/dashboard/dashboard-configurator';
import { ErrorBoundary } from '@/components/error-boundary';
import { LiveRegion, useAnnounce } from '@/components/accessibility/live-region';
import { FirebasePermissionErrorAlert } from './components/firebase-permission-error-alert';
import type { QuickActionModal } from './hooks/use-dashboard-page';

// Bundle de modales (todos en un solo import dinámico)
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
  ModalSkeleton,
} from './components/dashboard-modals-bundle';

import dynamic from 'next/dynamic';

export default function DashboardPage() {
  // ✅ IMPORTANT: All hooks MUST be called at the top level, before any conditional returns
  // Accessibility announcements - MUST be at top level
  const { announce, message: announcementMessage } = useAnnounce();

  const {
    // State
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

    // Data
    vehicles,
    clients,
    partners,
    companies,
    incomeAndPaymentCategories,
    expenseCategories,
    allKPIs,
    KPI_MAP,
    enabledWidgets,

    // Actions
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

  // Prefetch data cuando el usuario se autentica
  useEffect(() => {
    if (currentUser) {
      // Anunciar carga a screen readers
      announce('Cargando dashboard, por favor espere');

      // Prefetch de datos críticos en background
      const prefetchPromises = [
        import('@/lib/firestore-services').then(({ financialRecordService }) => financialRecordService.getAll()),
        import('@/lib/firestore-services').then(({ vehicleService }) => vehicleService.getAll()),
        import('@/lib/firestore-services').then(({ clientService }) => clientService.getAll()),
      ];

      Promise.all(prefetchPromises).catch((error) => {
        console.error('Error prefetching data:', error);
      });
    }
  }, [currentUser, announce]);

  // ✅ Conditional returns AFTER all hooks
  if (configError) {
    console.error('🔴 [Dashboard] Error cargando configuración:', configError);
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <p className="text-xl font-semibold mb-2 text-red-600">Error al cargar la configuración</p>
        <p className="text-muted-foreground mb-4">Detalles del error:</p>
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-w-2xl mb-4">
          {JSON.stringify(configError, null, 2)}
        </pre>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()} variant="outline">Recargar Página</Button>
        </div>
      </div>
    );
  }

  if (isLoadingConfig || !currentUser) {
    console.log('🔄 [Dashboard] Mostrando GlobalLoader. Razones:', {
      isLoadingConfig,
      currentUser: !!currentUser,
    });
    return <GlobalLoader />;
  }

  return (
    <>
      <a
        href="#main-content"
        className="skip-to-content sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded"
      >
        Ir al contenido principal
      </a>

      {/* Live region para anuncios de accesibilidad */}
      <LiveRegion message={announcementMessage} politeness="polite" clearAfter={5000} />

      <div className="space-y-6" id="main-content">
        {/* Alerta de error de permisos de Firebase */}
        {configError && (
          <FirebasePermissionErrorAlert
            error={configError}
            onDismiss={() => {
              // Opcional: permitir descartar la alerta
              console.log('[Dashboard] Descartando alerta de permisos');
            }}
          />
        )}

        <DashboardHeader
          userName={currentUser?.name}
          isConfigOpen={isConfigOpen}
          onOpenConfig={() => setIsConfigOpen(true)}
          onDateChange={(range) => {
            // The DashboardDateFilter handles its own state internally
            // and calls onDateChange with the computed range
          }}
        />

        <KpiGrid
          enabledWidgets={enabledWidgets}
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

        {isConfigOpen && dashboardConfig && (
          <DashboardConfigurator
            isOpen={isConfigOpen}
            onClose={() => setIsConfigOpen(false)}
            currentWidgets={dashboardConfig.widgets}
            onSave={(widgets) => {
              saveWidgetOrder(widgets);
              setIsConfigOpen(false);
              announce('Configuración guardada exitosamente');
            }}
          />
        )}

        {/* Modales agrupados */}
        {activeModal === 'clients' && (
          <ClientListModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            title={modalData.title}
            clients={modalData.data}
          />
        )}
        {activeModal === 'licenses' && (
          <LicenseExpiringModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            title={modalData.title}
            clients={modalData.data}
          />
        )}
        {activeModal === 'insurance' && (
          <InsuranceExpiringModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            title={modalData.title}
            vehicles={modalData.data}
          />
        )}
        {activeModal === 'vehicles' && (
          <VehicleListModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            title={modalData.title}
            vehicles={modalData.data}
          />
        )}
        {activeModal === 'partners' && (
          <PartnerBalancesModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            balances={modalData.data}
          />
        )}
        {activeModal === 'credits' && (
          <CreditListModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            title={modalData.title}
            credits={modalData.data}
          />
        )}
        {activeModal === 'incomes' && (
          <IncomeListModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            title={modalData.title}
            incomes={modalData.data}
          />
        )}
        {activeModal === 'expenses' && (
          <ExpenseListModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            title={modalData.title}
            expenses={modalData.data}
          />
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
