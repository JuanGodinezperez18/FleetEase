// src/app/dashboard/hooks/use-dashboard-actions.ts
'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { checkCreditAvailability, buildCreditData, buildVehicleCreditLockPayload } from '@/lib/credit-creation';
import type { QuickActionModal } from './use-dashboard-page';

interface UseDashboardActionsProps {
  addIncome?: (data: any) => Promise<any>;
  addExpense?: (data: any) => Promise<any>;
  createCreditWithFinancialRecord?: (creditData: any, companyId: string) => Promise<string | null>;
  updateVehicle?: (id: string, data: any) => Promise<any>;
  credits?: Array<{ id: string; vehicleId: string; clientId: string; status: string; isDeleted?: boolean }>;
  selectedCompanyId?: string | null;
  addClient?: (data: any) => Promise<any>;
  addVehicle?: (data: any) => Promise<any>;
  addMileageLog?: (data: any) => Promise<any>;
  currentUser?: { uid?: string; role?: string; companyId?: string | null };
  handleCloseQuickAction: () => void;
}

/**
 * Hook especializado para acciones del dashboard (formularios rápidos)
 * Centraliza todos los handlers de submit de formularios
 */
export function useDashboardActions({
  addIncome,
  addExpense,
  createCreditWithFinancialRecord,
  updateVehicle,
  credits,
  selectedCompanyId,
  addClient,
  addVehicle,
  addMileageLog,
  currentUser,
  handleCloseQuickAction,
}: UseDashboardActionsProps) {
  const queryClient = useQueryClient();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Handler para ingresos
  const handleIncomeSubmit = useCallback(async (data: any, category?: any) => {
    try {
      setIsSubmittingForm(true);
      const recordType = category?.type || 'income';
      const successMessage = recordType === 'payment' ? 'Pago registrado exitosamente' : 'Ingreso registrado exitosamente';

      await addIncome?.({
        ...data,
        type: recordType,
        category: category?.name || '',
        categoryId: data.categoryId,
        uid: currentUser?.uid,
        isDeleted: false,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['financialRecords'] }),
        queryClient.invalidateQueries({ queryKey: ['clients'] }),
        queryClient.invalidateQueries({ queryKey: ['partners'] }),
        queryClient.invalidateQueries({ queryKey: ['credits'] }),
        queryClient.invalidateQueries({ queryKey: ['creditPaymentSchedules'] }),
      ]);

      toast.success(successMessage);
      handleCloseQuickAction();
    } catch (error) {
      console.error('Error al registrar ingreso:', error);
      toast.error(error instanceof Error ? error.message : 'Error al registrar el movimiento');
    } finally {
      setIsSubmittingForm(false);
    }
  }, [addIncome, currentUser?.uid, queryClient, handleCloseQuickAction]);

  // Handler para gastos
  const handleExpenseSubmit = useCallback(async (data: any) => {
    try {
      setIsSubmittingForm(true);
      await addExpense?.(data);
      toast.success('Gasto registrado exitosamente');
      handleCloseQuickAction();
    } catch (error) {
      console.error('Error al registrar gasto:', error);
      toast.error('Error al registrar el gasto');
    } finally {
      setIsSubmittingForm(false);
    }
  }, [addExpense, handleCloseQuickAction]);

  // Handler para créditos
  //
  // Antes: llamaba a addCredit(data) directo con el 'data' crudo del
  // formulario (clientId, vehicleId, startDate, numberOfPayments,
  // weeklyPayment) - eso es un insert crudo sin total_amount calculado
  // (columna NOT NULL), sin cronograma de pagos, sin bloquear el vehículo
  // y sin generar el ingreso "Crédito Otorgado". Esta acción rápida usaba
  // una ruta completamente distinta a la de /dashboard/credits, que sí
  // hace todo eso via createCreditWithFinancialRecord. Ahora replica
  // exactamente esa misma lógica.
  const handleCreditSubmit = useCallback(async (data: any) => {
    try {
      setIsSubmittingForm(true);

      const availability = checkCreditAvailability(credits || [], {
        vehicleId: data.vehicleId,
        clientId: data.clientId,
      });
      if (!availability.available) {
        toast.error(availability.error);
        return;
      }

      const creditData = buildCreditData(data, currentUser?.companyId ?? selectedCompanyId);
      const creditId = await createCreditWithFinancialRecord?.(creditData, creditData.companyId);

      if (creditId) {
        await updateVehicle?.(data.vehicleId, buildVehicleCreditLockPayload(data.clientId, creditId));
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['credits'] }),
        queryClient.invalidateQueries({ queryKey: ['clients'] }),
        queryClient.invalidateQueries({ queryKey: ['financialRecords'] }),
        queryClient.invalidateQueries({ queryKey: ['creditPaymentSchedules'] }),
      ]);
      toast.success('Crédito registrado exitosamente');
      handleCloseQuickAction();
    } catch (error) {
      console.error('Error al registrar crédito:', error);
      toast.error(error instanceof Error ? error.message : 'Error al registrar el crédito');
    } finally {
      setIsSubmittingForm(false);
    }
  }, [createCreditWithFinancialRecord, updateVehicle, credits, selectedCompanyId, currentUser?.companyId, queryClient, handleCloseQuickAction]);

  // Handler para clientes
  const handleClientSubmit = useCallback(async (data: any) => {
    try {
      setIsSubmittingForm(true);
      await addClient?.(data);
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente registrado exitosamente');
      handleCloseQuickAction();
    } catch (error) {
      console.error('Error al registrar cliente:', error);
      toast.error('Error al registrar el cliente');
    } finally {
      setIsSubmittingForm(false);
    }
  }, [addClient, queryClient, handleCloseQuickAction]);

  // Handler para vehículos
  const handleVehicleSubmit = useCallback(async (data: any) => {
    try {
      setIsSubmittingForm(true);
      await addVehicle?.(data);
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehículo registrado exitosamente');
      handleCloseQuickAction();
    } catch (error) {
      console.error('Error al registrar vehículo:', error);
      toast.error('Error al registrar el vehículo');
    } finally {
      setIsSubmittingForm(false);
    }
  }, [addVehicle, queryClient, handleCloseQuickAction]);

  // Handler para kilometraje
  const handleMileageSubmit = useCallback(async (data: any) => {
    try {
      setIsSubmittingForm(true);
      await addMileageLog?.(data);
      toast.success('Kilometraje registrado exitosamente');
      handleCloseQuickAction();
    } catch (error) {
      console.error('Error al registrar kilometraje:', error);
      toast.error(error instanceof Error ? error.message : 'Error al registrar el kilometraje');
    } finally {
      setIsSubmittingForm(false);
    }
  }, [addMileageLog, handleCloseQuickAction]);

  return {
    isSubmittingForm,
    handleIncomeSubmit,
    handleExpenseSubmit,
    handleCreditSubmit,
    handleClientSubmit,
    handleVehicleSubmit,
    handleMileageSubmit,
  };
}
