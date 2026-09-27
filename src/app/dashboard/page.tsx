// app/dashboard/page.tsx
'use client';

import { toast } from 'sonner';
import { useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { generatePDFReport, downloadPDF, type KpiFormat } from '@/lib/reports/pdf-generator';
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
} from './components/dashboard-modals-bundle';

const COUNT_KPI_IDS = new Set([
  'licenses-expiring',
  'insurance-expiring',
  'total-vehicles',
  'vehicles-rented',
  'vehicles-available',
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
        (kpi): kpi is {
          label: string;
          value: string | number;
          subtitle?: string;
          format: KpiFormat;
        } => Boolean(kpi)
      );

    if (selectedKpis.length === 0) {
      toast.error('Configura al menos un KPI para generar el PDF');
      setIsConfigOpen(true);
      return;
    }

    setIsExportingPdf(true);
    try {
      const from = customDateRange?.from ?? startOfMonth(new Date());
      const to = customDateRange?.to ?? endOfMonth(new Date());

      const income = kpiNumber(allKPIs, 'income-month');
      const expenses = kpiNumber(allKPIs, 'expenses-month');
      const netProfit = kpiNumber(allKPIs, 'net-income');

      const company =
        companies?.find(c => c.id === currentUser?.companyId) || companies?.[0];

      const licenseDetails = (allKPIs['licenses-expiring']?.details || [])
        .slice(0, 15)
        .map((c: any) => ({
          name: `${c.firstname || ''} ${c.lastname || ''}`.trim() || 'Cliente',
          detail: c.licenseNumber || '',
          expiry: c.licenseExpiry
            ? format(new Date(c.licenseExpiry), 'dd/MM/yyyy')
            : '',
          status: c.licenseStatus || '',
        }));

      const insuranceDetails = (allKPIs['insurance-expiring']?.details || [])
        .slice(0, 15)
        .map((v: any) => ({
          name: v.alias || `${v.make || ''} ${v.model || ''}`.trim(),
          plate: v.plate || '',
          company: v.insuranceCompany || '',
          policy: v.insurancePolicyNumber || '',
          expiry: v.insuranceExpiryDate
            ? format(new Date(v.insuranceExpiryDate), 'dd/MM/yyyy')
            : '',
        }));

      const maintOverdue = (allKPIs['maintenance-overdue']?.details || []).map((v: any) => ({
        name: v.alias || `${v.make || ''} ${v.model || ''}`.trim(),
        plate: v.plate || '',
        kmToNext: v.kmToNextMaintenance,
        currentKm: v.currentMileage,
        status: 'Vencido',
      }));
      const maintSoon = (allKPIs['maintenance-soon']?.details || []).map((v: any) => ({
        name: v.alias || `${v.make || ''} ${v.model || ''}`.trim(),
        plate: v.plate || '',
        kmToNext: v.kmToNextMaintenance,
        currentKm: v.currentMileage,
        status: 'Proximo',
      }));
      const maintenanceDetails = [...maintOverdue, ...maintSoon].slice(0, 20);

      const blob = await generatePDFReport({
        type: 'financial',
        title: 'Reporte de KPIs del Dashboard',
        subtitle: 'Indicadores seleccionados por el usuario',
        dateRange: { from, to },
        companyName: company?.name || 'FleetEase Manager',
        companyInfo: company
          ? {
              name: company.name,
              email: company.email,
              phone: company.phone,
              street: company.street,
              city: company.city,
              state: company.state,
              zipCode: company.zipCode,
              country: company.country,
              logoUrl: company.logoUrl || undefined,
            }
          : undefined,
        generatedBy: currentUser?.name || undefined,
        kpis: selectedKpis,
        income,
        expenses,
        netProfit,
        profitMargin:
          income !== undefined && income !== 0 && netProfit !== undefined
            ? (netProfit / income) * 100
            : undefined,
        alertDetails: {
          licenses: licenseDetails,
          insurance: insuranceDetails,
          maintenance: maintenanceDetails,
        },
      });
      downloadPDF(blob, `dashboard_kpis_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`);
      toast.success('PDF generado con los KPIs seleccionados');
    } catch (error) {
      console.error('Error generating dashboard PDF:', error);
      toast.error('No se pudo generar el PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const effectiveDashboardConfig = currentUser
    ? (dashboardConfig ?? {
        userId: currentUser.uid,
        ...DEFAULT_DASHBOARD_CONFIG,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    : null;

  if (!currentUser) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#080a0f] p-6 text-white">
        <section className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8 text-center shadow-2xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d7ff3f]/10 text-2xl">
            ⚠️
          </div>
          <h1 className="text-xl font-semibold">No pudimos cargar tu sesión</h1>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Tu sesión de acceso existe, pero no pudimos recuperar el perfil de FleetEase. Esto evita
            que el dashboard se quede cargando indefinidamente.
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
  if (isLoadingConfig)
    console.log('⏳ [Dashboard] Configuración aún cargando; renderizando con fallback local.');

  return (
    <>
      <a
        href="#main-content"
        className="sr-only absolute left-4 top-4 z-50 rounded bg-[#d7ff3f] px-4 py-2 text-[#080a0f] focus:not-sr-only"
      >
        Ir al contenido principal
      </a>

      <LiveRegion message={announcementMessage} politeness="polite" clearAfter={5000} />

      <div
        id="main-content"
        className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="pointer-events-none absolute -right-48 top-[-220px] h-[520px] w-[520px] rounded-full bg-[#d7ff3f]/[0.055] blur-[120px]" />

        <div className="relative z-10 space-y-5 sm:space-y-6">
          <DashboardHeader
            userName={currentUser.name}
            isConfigOpen={isConfigOpen}
            onOpenConfig={() => canConfigureDashboard && setIsConfigOpen(true)}
            onDateChange={handleDateChange}
            onExportPdf={handleExportPdf}
            isExportingPdf={isExportingPdf}
          />

          <section aria-label="Indicadores principales" className="space-y-3">
            <div className="flex items-end justify-between gap-4 px-1">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  Resumen
                </p>
                <h2 className="mt-1 text-sm font-semibold text-white/80">
                  Estado actual de la operación
                </h2>
              </div>
              <span className="hidden text-[10px] text-white/25 sm:inline">
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

          <section
            aria-label="Acciones rápidas"
            className="border-t border-white/[0.06] pt-6 sm:pt-7"
          >
            <div className="mb-3 flex items-end justify-between gap-4 px-1">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                  Operación
                </p>
                <h2 className="mt-1 text-sm font-semibold text-white/80">Acciones rápidas</h2>
              </div>
            </div>
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

          {isConfigOpen && effectiveDashboardConfig && canConfigureDashboard && (\n            <DashboardConfigurator
              isOpen={isConfigOpen}
              onClose={() => setIsConfigOpen(false)}
              currentWidgets={effectiveDashboardConfig.widgets}
              onSave={widgets => {
                saveWidgetOrder(widgets);
                setIsConfigOpen(false);
                announce('Configuración guardada exitosamente');
              }}
            />\n          )}

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
          {activeModal === 'multas' && (
            <MultaVehiclesListModal
              isOpen={true}
              onClose={() => setActiveModal(null)}
              title={modalData.title}
              vehicles={modalData.data}
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
      </div>
    </>
  );
}
