// src/app/dashboard/hooks/use-dashboard-actions.ts
'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { checkCreditAvailability, buildCreditData, buildVehicleCreditLockPayload } from '@/lib/credit-creation';
import { sanitizeExpenseFormData } from '@/lib/sanitize-expense';
import { formatCurrency } from '@/lib/utils';
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
 * Hook especializado para acciones del dashboard (formularios rápidos).
 * Centraliza los handlers de submit de formularios.
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

  const handleIncomeSubmit = useCallback(async (data: any, category?: any) => {
    try {
      setIsSubmittingForm(true);
      const recordType = category?.type || 'income';
      const successMessage = recordType === 'payment' ? 'Pago registrado exitosamente' : 'Ingreso registrado exitosamente';
      await addIncome?.({ ...data, type: recordType, category: category?.name || '', categoryId: data.categoryId, uid: currentUser?.uid, isDeleted: false });
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

  const handleExpenseSubmit = useCallback(async (data: any) => {
    try {
      setIsSubmittingForm(true);
      if (!addExpense) throw new Error('La función para registrar gastos no está disponible.');
      const rawItems = Array.isArray(data?.items) ? data.items : [];
      const normalizedItems = rawItems.map((item: any) => {
        const quantity = Number(item?.quantity) > 0 ? Number(item.quantity) : 1;
        const enteredUnitAmount = Number(item?.unitAmount);
        const enteredAmount = Number(item?.amount);
        const unitAmount = Number.isFinite(enteredUnitAmount) && enteredUnitAmount > 0
          ? enteredUnitAmount
          : Number.isFinite(enteredAmount) && enteredAmount > 0 ? enteredAmount / quantity : 0;
        const amount = unitAmount > 0 ? quantity * unitAmount : Number.isFinite(enteredAmount) && enteredAmount > 0 ? enteredAmount : 0;
        return { ...item, quantity, unitAmount, amount };
      });
      if (normalizedItems.length === 0) throw new Error('Agrega al menos un concepto de gasto.');
      const sanitizedData = sanitizeExpenseFormData({ ...data, items: normalizedItems });
      const totalAmount = sanitizedData.items.reduce((sum: number, item: { amount?: number }) => sum + (Number(item.amount) || 0), 0);
      if (!(totalAmount > 0)) throw new Error('El total del gasto debe ser mayor que cero.');
      const description = sanitizedData.description || sanitizedData.items.map((item: { concept: string; amount: number }) => `${item.concept}: ${formatCurrency(item.amount)}`).join(' | ');
      await addExpense({ ...sanitizedData, amount: totalAmount, description, type: 'expense', isDeleted: false, createdAt: new Date().toISOString() });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['financialRecords'] }),
        queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
        queryClient.invalidateQueries({ queryKey: ['mileage'] }),
      ]);
      toast.success('Gasto registrado exitosamente');
      handleCloseQuickAction();
    } catch (error) {
      console.error('Error al registrar gasto:', error);
      toast.error(error instanceof Error ? error.message : 'Error al registrar el gasto');
    } finally {
      setIsSubmittingForm(false);
    }
  }, [addExpense, queryClient, handleCloseQuickAction]);

  const handleCreditSubmit = useCallback(async (data: any) => {
    try {
      setIsSubmittingForm(true);
      const availability = checkCreditAvailability(credits || [], { vehicleId: data.vehicleId, clientId: data.clientId });
      if (!availability.available) {
        toast.error(availability.error);
        return;
      }
      const creditData = buildCreditData(data, currentUser?.companyId ?? selectedCompanyId);
      const creditId = await createCreditWithFinancialRecord?.(creditData, creditData.companyId);
      if (creditId) await updateVehicle?.(data.vehicleId, buildVehicleCreditLockPayload(data.clientId, creditId));
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

  // Clientes: el botón flotante NO debe tener una ruta de creación distinta.
  // El ClientForm ya valida y normaliza los datos; aquí solamente se delega
  // al mismo addClient usado por /dashboard/clients y se refresca la misma query.
  const handleClientSubmit = useCallback(async (data: any) => {
    try {
      setIsSubmittingForm(true);

      if (!addClient) {
        throw new Error('La función para registrar clientes no está disponible.');
      }

      // El formulario rápido puede abrirse para un Super Admin. En ese caso,
      // si el formulario recibió la empresa seleccionada, conservarla; si no,
      // usar la empresa global seleccionada. Para usuarios normales usar la
      // empresa de su sesión. Nunca enviar companyId vacío.
      const companyId = data?.companyId || selectedCompanyId || currentUser?.companyId || null;
      if (!companyId) {
        throw new Error('No se pudo determinar la empresa del cliente. Selecciona una empresa e inténtalo nuevamente.');
      }

      const payload = {
        ...data,
        companyId,
        assignedVehicleId: data?.assignedVehicleId === '@none' ? null : (data?.assignedVehicleId ?? null),
        email: typeof data?.email === 'string' && data.email.trim() ? data.email.trim().toLowerCase() : undefined,
        phone: typeof data?.phone === 'string' ? data.phone.replace(/\D/g, '') : data?.phone,
        licenseNumber: typeof data?.licenseNumber === 'string' ? data.licenseNumber.trim().replace(/\s+/g, ' ').toUpperCase() : data?.licenseNumber,
        initialBalance: Number(data?.initialBalance ?? 0),
        securityDeposit: Number(data?.securityDeposit ?? 0),
      };

      await addClient(payload);
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Cliente registrado exitosamente');
      handleCloseQuickAction();
    } catch (error) {
      console.error('Error al registrar cliente:', error);
      toast.error(error instanceof Error ? error.message : 'Error al registrar el cliente');
    } finally {
      setIsSubmittingForm(false);
    }
  }, [addClient, selectedCompanyId, currentUser?.companyId, queryClient, handleCloseQuickAction]);

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
