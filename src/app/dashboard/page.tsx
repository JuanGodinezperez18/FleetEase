// app/dashboard/page.tsx
'use client';

import { toast } from 'sonner';
import { useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { KpiFormat } from '@/lib/reports/pdf-generator';
import { useDashboardPage } from './hooks/use-dashboard-page';
import { DashboardHeader } from './components/dashboard-header';
import { KpiGrid } from './components/kpi-grid';
import { QuickActions } from './components/quick-actions';
import { DashboardConfigurator } from '@/components/dashboard/dashboard-configurator';
import { LiveRegion, useAnnounce } from '@/components/accessibility/live-region';
import { DEFAULT_DASHBOARD_CONFIG } from '@/types/dashboard';
import { useSubscription } from '@/hooks/use-subscription';
import { isFeatureEnabled } from '@/config/feature-flags';

import {
  ClientListModal,
  LicenseExpiringModal,
  InsuranceExpiringModal,
  VehicleListModal,
  PartnerBalancesModal,
  CreditListModal,
  IncomeListModal,
  ExpenseListModal,
  MultaVehiclesListModal,
  VehicleInspectionModal,
  VehicleProfitabilityModal,
} from './components/dashboard-modals-bundle';

const COUNT_KPI_IDS = new Set([
  'licenses-expiring',
  'insurance-expiring',
  'total-vehicles',
  'vehicles-rented',
  'vehicles-available',
  'vehicles-without-income',
  'total-clients',
  'clients-with-debt',
  'critical-clients',
  'active-credits',
  'overdue-credits',
  'total-partners',
  'partners-positive-balance',
  'partners-negative-balance',
  'vehicles-by-partners',
  'maintenance-overdue',
  'maintenance-soon',
  'high-mileage-vehicles',
  'total-mileage-logs',
  'total-multas',
  'multas-pendientes',
  'multas-pagadas',
  'vehiculos-con-multas',
  'vehiculos-limpios',
]);

function kpiFormatForId(id: string): KpiFormat {
  if (COUNT_KPI_IDS.has(id)) return 'number';
  if (id.includes('margin') || id.includes('rate') || id.includes('percent') || id === 'recovery-rate') {
    return 'percent';
  }
  if (id.startsWith('top-')) return 'text';
  return 'currency';
}

function kpiNumber(
  allKPIs: Record<string, { value?: string | number }>,
  id: string
): number | undefined {
  const raw = allKPIs[id]?.value;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = parseFloat(raw.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export default function DashboardPage() {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const { announce, message: announcementMessage } = useAnnounce();
  const { subscription } = useSubscription();
  const canUseAdvancedDashboard = isFeatureEnabled(subscription?.plan ?? 'free', 'dashboard_advanced');
  const canConfigureDashboard = isFeatureEnabled(subscription?.plan ?? 'free', 'dashboard_config');

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
    customDateRange,
    setIsConfigOpen,
    setActiveModal,
    setQuickActionModal,
    handleQuickAction,
    handleDragEnd,
    handleDateChange,
    handleKpiClick,
    handleCloseListModal,
    handleIncomeSubmit,
    handleExpenseSubmit,
    handleCreditSubmit,
    handleClientSubmit,
    handleVehicleSubmit,
    handleMileageSubmit,
    saveWidgetOrder,
    modalTitles,
  } = useDashboardPage();

  const handleExportPdf = async () => {
    const selectedKpis = enabledWidgets
      .filter(widget => widget.type === 'metric')
      .map(widget => {
        const data = allKPIs[widget.id];
        if (!data || data.value === undefined) return null;
        return {
          label: widget.title,
          value: data.value,
          subtitle: data.subtitle,
          format: kpiFormatForId(widget.id),
        };
      })
      .filter(
        (kpi): kpi is NonNullable<typeof kpi> => Boolean(kpi)
      );

    if (selectedKpis.length === 0) {
      toast.error('Configura al menos un KPI para generar el PDF');
      setIsConfigOpen(true);
      return;
    }

    setIsExportingPdf(true);
    try {
      const { generatePDFReport, downloadPDF } = await import('@/lib/reports/pdf-generator');
      const from = customDateRange?.from ?? startOfMonth(new Date());
      const to = customDateRange?.to ?? endOfMonth(new Date());
      const periodLabel = `${format(from, 'dd/MM/yyyy')} - ${format(to, 'dd/MM/yyyy')}`;
      const blob = await generatePDFReport({
        companyName: currentUser?.companyName || 'FleetEase',
        periodLabel,
        kpis: selectedKpis,
      });
      downloadPDF(blob, `dashboard-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      announce('Reporte PDF generado');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo generar el PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (isLoadingConfig) {
    return (
      <div className="fe-page-shell flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-[var(--fe-text-muted)]">Cargando dashboard…</p>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="fe-page-shell flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-red-500">Error al cargar la configuración del dashboard</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="fe-page-shell flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-[var(--fe-text-muted)]">Inicia sesión para ver el dashboard</p>
      </div>
    );
  }

  const effectiveDashboardConfig = dashboardConfig ?? DEFAULT_DASHBOARD_CONFIG;

  return (
    <>
      <LiveRegion message={announcementMessage} />
      {/*
        relative + overflow-x-hidden + min-w-0: the decorative glow blob
        (-right-48 w-[520px]) must not expand the scrollable width on mobile.
        Without this, the page gains horizontal scroll and content sits on the
        left with empty black space on the right (FAB appears stranded).
      */}
      <div
        id="main-content"
        className="fe-page-shell relative min-w-0 w-full overflow-x-hidden space-y-5 sm:space-y-6"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="pointer-events-none absolute -right-48 top-[-220px] h-[520px] w-[520px] rounded-full bg-[var(--fe-lime)]/[0.055] blur-[120px]" />

        <div className="relative z-10 min-w-0 space-y-5 sm:space-y-6">
          <DashboardHeader
            userName={currentUser.name}
            isConfigOpen={isConfigOpen}
            onOpenConfig={() => canConfigureDashboard && setIsConfigOpen(true)}
            onDateChange={handleDateChange}
            onExportPdf={handleExportPdf}
            isExportingPdf={isExportingPdf}
          />

          <section aria-label="Indicadores principales" className="min-w-0 space-y-3">
            <div className="flex items-end justify-between gap-4 px-1">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--fe-text-faint)]">
                  Resumen
                </p>
                <h2 className="mt-1 text-sm font-semibold text-[var(--fe-text)]">
                  Estado actual de la operación
                </h2>
              </div>
              <span className="hidden text-[10px] text-[var(--fe-text-faint)] sm:inline">
                Arrastra para personalizar
              </span>
            </div>
            <KpiGrid
              enabledWidgets={(enabledWidgets.length > 0
                ? enabledWidgets
                : (effectiveDashboardConfig?.widgets.filter(w => w.enabled).sort((a, b) => a.order - b.order) ?? [])
              ).filter(widget => canUseAdvancedDashboard || widget.type === 'metric')}
              kpiMap={KPI_MAP}
              allKPIs={allKPIs}
              onKpiClick={handleKpiClick}
              onDragEnd={handleDragEnd}
              onOpenConfig={() => setIsConfigOpen(true)}
            />
          </section>

          <section aria-label="Acciones rápidas">
            <QuickActions
              onAction={handleQuickAction}
              quickActionModal={quickActionModal}
              isSubmittingForm={isSubmittingForm}
              vehicles={vehicles}
              clients={clients}
              companies={companies}
              incomeAndPaymentCategories={incomeAndPaymentCategories}
              expenseCategories={expenseCategories}
              onIncomeSubmit={handleIncomeSubmit}
              onExpenseSubmit={handleExpenseSubmit}
              onCreditSubmit={handleCreditSubmit}
              onClientSubmit={handleClientSubmit}
              onVehicleSubmit={handleVehicleSubmit}
              onMileageSubmit={handleMileageSubmit}
              modalTitles={modalTitles}
            />
          </section>

          {isConfigOpen && effectiveDashboardConfig && canConfigureDashboard && (
            <DashboardConfigurator
              isOpen={isConfigOpen}
              onClose={() => setIsConfigOpen(false)}
              currentWidgets={effectiveDashboardConfig.widgets}
              onSave={widgets => {
                saveWidgetOrder(widgets);
                setIsConfigOpen(false);
                announce('Configuración guardada exitosamente');
              }}
            />
          )}

          {activeModal === 'clients' && (
            <ClientListModal
              isOpen={true}
              onClose={handleCloseListModal}
              title={modalData.title}
              clients={modalData.data}
            />
          )}
          {activeModal === 'licenses' && (
            <LicenseExpiringModal
              isOpen={true}
              onClose={handleCloseListModal}
              title={modalData.title}
              clients={modalData.data}
            />
          )}
          {activeModal === 'insurance' && (
            <InsuranceExpiringModal
              isOpen={true}
              onClose={handleCloseListModal}
              title={modalData.title}
              vehicles={modalData.data}
            />
          )}
          {activeModal === 'vehicles' && (
            <VehicleListModal
              isOpen={true}
              onClose={handleCloseListModal}
              title={modalData.title}
              vehicles={modalData.data}
            />
          )}
          {activeModal === 'partners' && (
            <PartnerBalancesModal
              isOpen={true}
              onClose={handleCloseListModal}
              balances={modalData.data}
            />
          )}
          {activeModal === 'credits' && (
            <CreditListModal
              isOpen={true}
              onClose={handleCloseListModal}
              title={modalData.title}
              credits={modalData.data}
            />
          )}
          {activeModal === 'incomes' && (
            <IncomeListModal
              isOpen={true}
              onClose={handleCloseListModal}
              title={modalData.title}
              incomes={modalData.data}
            />
          )}
          {activeModal === 'expenses' && (
            <ExpenseListModal
              isOpen={true}
              onClose={handleCloseListModal}
              title={modalData.title}
              expenses={modalData.data}
            />
          )}
          {activeModal === 'multas' && (
            <MultaVehiclesListModal
              isOpen={true}
              onClose={handleCloseListModal}
              title={modalData.title}
              vehicles={modalData.data}
            />
          )}
          {activeModal === 'vehicle-profitability' && (
            <VehicleProfitabilityModal
              isOpen={true}
              onClose={handleCloseListModal}
              title={modalData.title}
              vehicles={modalData.data}
            />
          )}

          {quickActionModal === 'vehicle-inspection' && (
            <VehicleInspectionModal
              isOpen={true}
              onClose={() => setQuickActionModal(null)}
            />
          )}
        </div>
      </div>
    </>
  );
}
