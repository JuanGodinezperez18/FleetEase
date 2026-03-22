'use client';

import { Suspense, useCallback } from 'react';
import { FormModal } from '@/components/common/form-modal';
import { FloatingActionButton } from '@/components/layout/floating-action-button';
import type { QuickActionModal } from '../hooks/use-dashboard-page';
import dynamic from 'next/dynamic';

interface QuickActionsProps {
  quickActionModal: QuickActionModal;
  isSubmittingForm: boolean;
  companies: any[];
  expenseCategories: any[];
  incomeAndPaymentCategories: any[];
  vehicles: any[];
  clients: any[];
  onOpenModal: (action: string) => void;
  onCloseModal: () => void;
  onIncomeSubmit: (data: any, category?: any) => Promise<void>;
  onExpenseSubmit: (data: any) => Promise<void>;
  onCreditSubmit: (data: any) => Promise<void>;
  onClientSubmit: (data: any) => Promise<void>;
  onVehicleSubmit: (data: any) => Promise<void>;
  onMileageSubmit: (data: any) => Promise<void>;
  modalTitles: Record<Exclude<QuickActionModal, null>, string>;
}

// Dynamic imports for form components
const ExpensesForm = dynamic(() => import('@/app/dashboard/finanzas/expenses/components/ExpensesForm'), { ssr: false });
const IncomeForm = dynamic(() => import('@/app/dashboard/finanzas/income/components/IncomeForm'), { ssr: false });
const CreditForm = dynamic(() => import('@/app/dashboard/credits/components/credit-form').then(mod => mod.CreditForm), { ssr: false });
const ClientForm = dynamic(() => import('@/app/dashboard/clients/components/client-form').then(mod => mod.ClientForm), { ssr: false });
const VehicleForm = dynamic(() => import('@/app/dashboard/vehicles/components/vehicle-form').then(mod => mod.VehicleForm), { ssr: false });
const MileageLogForm = dynamic(() => import('@/app/dashboard/mileage/components/mileage-log-form'), { ssr: false });

export function QuickActions({
  quickActionModal,
  isSubmittingForm,
  companies,
  expenseCategories,
  incomeAndPaymentCategories,
  vehicles,
  clients,
  onOpenModal,
  onCloseModal,
  onIncomeSubmit,
  onExpenseSubmit,
  onCreditSubmit,
  onClientSubmit,
  onVehicleSubmit,
  onMileageSubmit,
  modalTitles,
}: QuickActionsProps) {
  const handleSuccess = useCallback(() => {
    onCloseModal();
  }, [onCloseModal]);

  return (
    <>
      <FloatingActionButton openModal={onOpenModal} />

      {quickActionModal && quickActionModal !== 'vehicle-inspection' && (
        <FormModal
          isOpen={!!quickActionModal}
          onClose={onCloseModal}
          title={modalTitles[quickActionModal as Exclude<QuickActionModal, null>]}
        >
          <Suspense fallback={<div>Cargando formulario...</div>}>
            {quickActionModal === 'expense' && (
              <ExpensesForm 
                onSubmit={onExpenseSubmit} 
                initialData={null} 
                companies={companies} 
                expenseCategories={expenseCategories} 
                isSubmitting={isSubmittingForm} 
                onClose={onCloseModal} 
              />
            )}
            {quickActionModal === 'income' && (
              <IncomeForm 
                onSubmit={onIncomeSubmit} 
                initialData={null} 
                companies={companies} 
                incomeAndPaymentCategories={incomeAndPaymentCategories} 
                isSubmitting={isSubmittingForm} 
                onClose={onCloseModal} 
              />
            )}
            {quickActionModal === 'credit' && (
              <CreditForm 
                onSubmit={onCreditSubmit} 
                initialData={undefined} 
                isSubmitting={isSubmittingForm} 
                onClose={onCloseModal} 
              />
            )}
            {quickActionModal === 'client' && (
              <ClientForm 
                onSubmit={onClientSubmit} 
                initialData={null} 
                vehicles={vehicles} 
                companies={companies} 
                isSubmitting={isSubmittingForm} 
                onClose={onCloseModal} 
              />
            )}
            {quickActionModal === 'vehicle' && (
              <VehicleForm 
                onSuccess={handleSuccess} 
                onSubmit={onVehicleSubmit} 
                onOpenPartnerModal={() => {}} 
                isSubmitting={isSubmittingForm} 
                onClose={onCloseModal} 
              />
            )}
            {quickActionModal === 'mileage' && (
              <MileageLogForm 
                onSubmit={onMileageSubmit} 
                companies={companies} 
                isSubmitting={isSubmittingForm} 
                onClose={onCloseModal} 
              />
            )}
          </Suspense>
        </FormModal>
      )}
    </>
  );
}
