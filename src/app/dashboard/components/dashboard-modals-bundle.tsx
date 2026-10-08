// src/app/dashboard/components/dashboard-modals-bundle.tsx
'use client';

import dynamic from 'next/dynamic';

// ============================================================================
// BUNDLE DE MODALES DEL DASHBOARD
// Agrupa todos los modales en un solo bundle para reducir requests HTTP
// ============================================================================

export const ClientListModal = dynamic(
  () =>
    import('@/components/dashboard/components/client-list-modal').then(mod => ({
      default: mod.ClientListModal,
    })),
  { ssr: false }
);
export const LicenseExpiringModal = dynamic(
  () =>
    import('@/components/dashboard/components/license-expiring-modal').then(mod => ({
      default: mod.LicenseExpiringModal,
    })),
  { ssr: false }
);
export const InsuranceExpiringModal = dynamic(
  () =>
    import('@/components/dashboard/components/insurance-expiring-modal').then(mod => ({
      default: mod.InsuranceExpiringModal,
    })),
  { ssr: false }
);
export const VehicleListModal = dynamic(
  () =>
    import('@/components/dashboard/components/vehicle-list-modal').then(mod => ({
      default: mod.VehicleListModal,
    })),
  { ssr: false }
);
export const PartnerBalancesModal = dynamic(
  () =>
    import('@/app/dashboard/partners/components/partner-balances-modal').then(mod => ({
      default: mod.PartnerBalancesModal,
    })),
  { ssr: false }
);
export const CreditListModal = dynamic(
  () =>
    import('@/components/dashboard/components/credit-list-modal').then(mod => ({
      default: mod.CreditListModal,
    })),
  { ssr: false }
);
export const IncomeListModal = dynamic(
  () =>
    import('@/components/dashboard/components/income-list-modal').then(mod => ({
      default: mod.IncomeListModal,
    })),
  { ssr: false }
);
export const ExpenseListModal = dynamic(
  () =>
    import('@/components/dashboard/components/expense-list-modal').then(mod => ({
      default: mod.ExpenseListModal,
    })),
  { ssr: false }
);
export const MultaVehiclesListModal = dynamic(
  () =>
    import('@/components/dashboard/components/multa-vehicles-list-modal').then(mod => ({
      default: mod.MultaVehiclesListModal,
    })),
  { ssr: false }
);
export const VehicleInspectionModal = dynamic(
  () =>
    import('@/components/vehicle-inspection/inspection-modal').then(mod => ({
      default: mod.VehicleInspectionModal,
    })),
  { ssr: false }
);

export const VehicleProfitabilityModal = dynamic(
  () =>
    import('@/components/dashboard/components/vehicle-profitability-modal').then(mod => ({
      default: mod.VehicleProfitabilityModal,
    })),
  { ssr: false }
);

export const ModalSkeleton = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="w-full max-w-md animate-pulse rounded-lg bg-background p-6">
      <div className="mb-4 h-6 rounded bg-muted" />
      <div className="space-y-3">
        <div className="h-4 rounded bg-muted" />
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <div className="h-10 w-24 rounded bg-muted" />
        <div className="h-10 w-24 rounded bg-muted" />
      </div>
    </div>
  </div>
);
