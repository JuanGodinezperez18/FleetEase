// app/dashboard/page.tsx
'use client';

import { toast } from 'sonner';
import { useDashboardPage } from './hooks/use-dashboard-page';
import { DashboardHeader } from './components/dashboard-header';
import { KpiGrid } from './components/kpi-grid';
import { QuickActions } from './components/quick-actions';
import { DashboardConfigurator } from '@/components/dashboard/dashboard-configurator';
import { LiveRegion, useAnnounce } from '@/components/accessibility/live-region';
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
    vehicles,
    clients,
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

  const effectiveDashboardConfig = currentUser
    ? (dashboardConfig ?? {
        userId: currentUser.uid,
        ...DEFAULT_DASHBOARD_CONFIG,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    : null;

  // AuthProvider ya bloquea mientras restaura la sesión. Si después de eso no
  // existe perfil, nunca debemos dejar al usuario atrapado en un loader infinito.
  if (!currentUser) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#080a0f] p-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d7ff3f]/10 text-2xl">⚠️</div>
          <h1 className="text-xl font-semibold">No pudimos cargar tu sesión</h1>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Tu sesión de acceso existe, pero no pudimos recuperar el perfil de FleetEase. Esto evita que el dashboard se quede cargando indefinidamente.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl bg-[#d7ff3f] px-5 py-3 text-sm font-semibold text-[#080a0f] transition-opacity hover:opacity-90"
            >
              Reintentar
            </button>
            <a
              href="/login?callbackUrl=%2Fdashboard"
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/5"
            >
              Volver a iniciar sesión
            </a>
          </div>
        </section>
      </main>
    );
  }

  if (configError) console.error('🔴 [Dashboard] Error cargando configuración:', configError);
  if (isLoadingConfig) console.log('⏳ [Dashboard] Configuración aún cargando; renderizando con fallback local.');

  return (
    <>
      <a href="#main-content" className="sr-only absolute left-4 top-4 z-50 rounded bg-[#d7ff3f] px-4 py-2 text-[#080a0f] focus:not-sr-only">
        Ir al contenido principal
      </a>

      <LiveRegion message={announcementMessage} politeness="polite" clearAfter={5000} />

      {/* pb-24: espacio seguro para el FAB en móvil (safe-area + botón 56px) */}
      <div id="main-content" className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="pointer-events-none absolute -right-48 top-[-220px] h-[520px] w-[520px] rounded-full bg-[#d7ff3f]/[0.055] blur-[120px]" />

        <div className="relative z-10 space-y-5 sm:space-y-6">
          <DashboardHeader
            userName={currentUser.name}
            isConfigOpen={isConfigOpen}
            onOpenConfig={() => setIsConfigOpen(true)}
            onDateChange={() => undefined}
          />

          <section aria-label="Indicadores principales">
            <KpiGrid
              enabledWidgets={enabledWidgets.length > 0 ? enabledWidgets : effectiveDashboardConfig?.widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order) ?? []}
              kpiMap={KPI_MAP}
              allKPIs={allKPIs}
              onKpiClick={handleKpiClick}
              onDragEnd={handleDragEnd}
              onOpenConfig={() => setIsConfigOpen(true)}
            />
          </section>

          <section aria-label="Acciones rápidas" className="border-t border-white/[0.06] pt-5 sm:pt-6">
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
          </section>

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

          {activeModal === 'clients' && <ClientListModal isOpen={true} onClose={() => setActiveModal(null)} title={modalData.title} clients={modalData.data} />}
          {activeModal === 'licenses' && <LicenseExpiringModal isOpen={true} onClose={() => setActiveModal(null)} title={modalData.title} clients={modalData.data} />}
          {activeModal === 'insurance' && <InsuranceExpiringModal isOpen={true} onClose={() => setActiveModal(null)} title={modalData.title} vehicles={modalData.data} />}
          {activeModal === 'vehicles' && <VehicleListModal isOpen={true} onClose={() => setActiveModal(null)} title={modalData.title} vehicles={modalData.data} />}
          {activeModal === 'partners' && <PartnerBalancesModal isOpen={true} onClose={() => setActiveModal(null)} balances={modalData.data} />}
          {activeModal === 'credits' && <CreditListModal isOpen={true} onClose={() => setActiveModal(null)} title={modalData.title} credits={modalData.data} />}
          {activeModal === 'incomes' && <IncomeListModal isOpen={true} onClose={() => setActiveModal(null)} title={modalData.title} incomes={modalData.data} />}
          {activeModal === 'expenses' && <ExpenseListModal isOpen={true} onClose={() => setActiveModal(null)} title={modalData.title} expenses={modalData.data} />}

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
      </div>
    </>
  );
}
