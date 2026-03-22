"use client";

import React, { createContext, useContext, useMemo, useEffect, useCallback, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { financialRecordService, financialCategoryService, creditService, multaService, db } from '@/lib/firestore-services';
import type { FinancialRecord, FinancialCategory, Credit, CreditPaymentSchedule, Multa, Vehicle, Client, Partner } from '@/types';
import { logger } from '@/lib/logger';
import { useAuth } from '../auth-provider';
import { useVehicles } from './vehicles-provider';
import { useClients } from './clients-provider';
import {
  CREDIT_GRANTED_CATEGORY,
  CREDIT_PAYMENT_CATEGORY,
  CLIENT_PAYMENT_CATEGORY,
  MAINTENANCE_CATEGORY,
  CLIENT_SECURITY_DEPOSIT_CATEGORY_ID,
  PARTNER_PAYMENT_CATEGORY_NAME,
  setPartnerPaymentCategoryId,
} from '../finance-constants';
import { addWeeks } from 'date-fns';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  limit,
  runTransaction,
  writeBatch,
  orderBy,
  addDoc,
  type Transaction,
} from 'firebase/firestore';
import { formatCurrency } from '@/lib/utils';

interface FinancesContextValue {
  financialRecords: FinancialRecord[];
  financialCategories: FinancialCategory[];
  creditPaymentSchedules: CreditPaymentSchedule[];
  multas: Multa[];
  loading: boolean;
  partnerPaymentCategoryId?: string;
  refreshFinances: () => Promise<void>;
  addFinancialCategory: (data: Omit<FinancialCategory, 'id'>, returnObject?: boolean) => Promise<FinancialCategory | void>;
  updateFinancialCategory: (id: string, data: Partial<FinancialCategory>) => Promise<void>;
  deleteFinancialCategory: (id: string) => Promise<void>;
  addFinancialRecord: (record: Omit<FinancialRecord, 'id' | 'uid'>) => Promise<FinancialRecord>;
  updateFinancialRecord: (id: string, data: Partial<FinancialRecord>) => Promise<void>;
  deleteFinancialRecord: (id: string, onSuccess?: () => void) => Promise<void>;
  addExpense: (data: Omit<FinancialRecord, 'id' | 'type' | 'uid'>) => Promise<void>;
  updateExpense: (id: string, data: Partial<FinancialRecord>) => Promise<void>;
  addIncome: (data: Partial<Omit<FinancialRecord, 'id'>>) => Promise<void>;
  updateIncome: (id: string, data: Partial<FinancialRecord>) => Promise<void>;
  addPayment: (data: Omit<FinancialRecord, 'id' | 'uid' | 'type' | 'category'>) => Promise<void>;
  updatePayment: (id: string, data: Partial<FinancialRecord>) => Promise<void>;
  processCreditPayment: (
    creditId: string,
    clientId: string,
    amount: number,
    paymentMethod?: string,
    description?: string,
    companyId?: string,
    categoryId?: string
  ) => Promise<{
    success: boolean;
    error?: string;
    newCreditBalance: number;
    creditId: string | null;
    paymentScheduleId: string | null;
    creditCompleted?: boolean;
    paymentsMarkedAsPaid?: number;
  }>;
  createCreditWithFinancialRecord: (
    creditData: Omit<Credit, 'id' | 'isDeleted'>,
    companyId: string,
  ) => Promise<string | null>;
  cancelCreditWithAdjustment: (creditId: string, reason?: string) => Promise<void>;
  deleteCreditWithCleanup: (creditId: string) => Promise<void>;
  addCredit: (data: Omit<Credit, 'id' | 'uid'>) => Promise<Credit>;
  updateCredit: (id: string, data: Partial<Credit>) => Promise<void>;
  deleteCredit: (id: string) => Promise<void>;
  deactivateCredit: (id: string) => Promise<void>;
  addMulta: (data: Omit<Multa, 'id'>) => Promise<Multa>;
  updateMulta: (id: string, data: Partial<Multa>) => Promise<void>;
  deleteMulta: (id: string) => Promise<void>;
  processMultaPayment: (multaId: string, paymentData: Omit<FinancialRecord, 'id' | 'uid' | 'type' | 'category'>) => Promise<void>;
}

const FinancesContext = createContext<FinancesContextValue | undefined>(undefined);

interface Props {
  children: ReactNode;
  companyId: string | null;
  isSuperAdmin: boolean;
}

// Helper to log client changes within a transaction
async function logClientChange(
  transaction: Transaction,
  clientId: string,
  changeType: any,
  userId: string,
  userName: string,
  description: string,
  fieldChanged?: string,
  previousValue?: any,
  newValue?: any
): Promise<void> {
  try {
    const clientChangeLogRef = doc(collection(db, 'clientChangeLogs'));
    const logData = {
      clientId,
      changeType,
      changedBy: userId,
      changedByName: userName,
      changedAt: new Date().toISOString(),
      description,
      fieldChanged: fieldChanged || null,
      previousValue: previousValue === undefined ? null : previousValue,
      newValue: newValue === undefined ? null : newValue,
    };
    transaction.set(clientChangeLogRef, logData);
  } catch (error) {
    logger.error('Error logging client change', error as Error);
  }
}

export const FinancesProvider = ({ children, companyId, isSuperAdmin }: Props) => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { vehicles: rawVehicles = [] } = useVehicles();
  const { credits: rawCredits = [] } = useClients();

  const recordsQuery = useQuery({
    queryKey: ['financialRecords', companyId, isSuperAdmin],
    queryFn: () => financialRecordService.getAll().then(list => {
      if (isSuperAdmin && !companyId) return list;
      if (!companyId) return [];
      return list.filter(r => (r as any).companyId === companyId);
    }),
    staleTime: 5 * 60 * 1000,
  });

  const categoriesQuery = useQuery({
    queryKey: ['financialCategories', companyId, isSuperAdmin],
    queryFn: () => financialCategoryService.getAll().then(list => {
      if (isSuperAdmin && !companyId) return list;
      if (!companyId) return [];
      // ✅ FIX: Incluir categorías con companyId === null O isDefault === true
      return list.filter(c => 
        (c as any).companyId === companyId || 
        (c as any).companyId === null || 
        (c as any).companyId === undefined ||
        (c as any).isDefault === true
      );
    }),
    staleTime: 5 * 60 * 1000,
  });

  const schedulesQuery = useQuery({
    queryKey: ['creditPaymentSchedules', companyId, isSuperAdmin],
    queryFn: async (): Promise<CreditPaymentSchedule[]> => {
      if (isSuperAdmin && !companyId) {
        const qSnap = await getDocs(query(collection(db, 'creditPaymentSchedules')));
        return qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditPaymentSchedule));
      }
      if (!companyId) return [];
      const qSnap = await getDocs(query(collection(db, 'creditPaymentSchedules'), where('companyId', '==', companyId as string)));
      return qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CreditPaymentSchedule));
    },
    staleTime: 5 * 60 * 1000,
  });

  const multasQuery = useQuery({
    queryKey: ['multas', companyId, isSuperAdmin],
    queryFn: async (): Promise<Multa[]> => {
      if (isSuperAdmin && !companyId) {
        const qSnap = await getDocs(query(collection(db, 'multas')));
        return qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Multa));
      }
      if (!companyId) return [];
      const qSnap = await getDocs(query(collection(db, 'multas'), where('companyId', '==', companyId as string)));
      return qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Multa));
    },
    staleTime: 5 * 60 * 1000,
  });

  const financialRecords = recordsQuery.data || [];
  const financialCategories = categoriesQuery.data || [];
  const creditPaymentSchedules = schedulesQuery.data || [];
  const multas = multasQuery.data || [];

  const refreshFinances = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
    await queryClient.invalidateQueries({ queryKey: ['financialCategories'] });
    await queryClient.invalidateQueries({ queryKey: ['creditPaymentSchedules'] });
    await queryClient.invalidateQueries({ queryKey: ['multas'] });
  }, [queryClient]);

  const ensureSystemCategories = useCallback(async () => {
    if (!currentUser) return;
    try {
      const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superAdmin';
      if (!isAdmin) return;

      const qCredit = query(
        collection(db, 'financialCategories'),
        where('companyId', '==', null),
        where('name', '==', CREDIT_GRANTED_CATEGORY),
        where('isDefault', '==', true),
        limit(1)
      );
      const snapshotCredit = await getDocs(qCredit);
      if (snapshotCredit.empty) {
        await addDoc(collection(db, 'financialCategories'), {
          name: CREDIT_GRANTED_CATEGORY,
          type: 'income',
          affects: 'client_balance',
          description: 'Registro del crédito otorgado al cliente',
          isDefault: true,
          companyId: null,
          createdAt: new Date().toISOString(),
        });
        logger.info('✅ Categoría de sistema "Crédito Otorgado" creada.');
      }

      const qMulta = query(
        collection(db, 'financialCategories'),
        where('companyId', '==', null),
        where('name', '==', 'Multa'),
        where('isDefault', '==', true),
        limit(1)
      );
      const snapshotMulta = await getDocs(qMulta);
      if (snapshotMulta.empty) {
        await addDoc(collection(db, 'financialCategories'), {
          name: 'Multa',
          type: 'income',
          affects: 'client_balance',
          description: 'Registro automático de multas de tránsito',
          isDefault: true,
          companyId: null,
          createdAt: new Date().toISOString(),
        });
        logger.info('✅ Categoría de sistema "Multa" creada.');
      }

      const qPagoMulta = query(
        collection(db, 'financialCategories'),
        where('companyId', '==', null),
        where('name', '==', 'Pago de Multa'),
        where('isDefault', '==', true),
        limit(1)
      );
      const snapshotPagoMulta = await getDocs(qPagoMulta);
      if (snapshotPagoMulta.empty) {
        await addDoc(collection(db, 'financialCategories'), {
          name: 'Pago de Multa',
          type: 'payment',
          affects: 'client_balance',
          description: 'Pago de multas de tránsito por parte del cliente',
          isDefault: true,
          companyId: null,
          createdAt: new Date().toISOString(),
        });
        logger.info('✅ Categoría de sistema "Pago de Multa" creada.');
      }
    } catch (error) {
      logger.warn('⚠️ Aviso: No se pudo verificar/crear categorías del sistema', { error: String(error) });
    }
  }, [currentUser]);

  useEffect(() => {
    ensureSystemCategories();
  }, [ensureSystemCategories]);

  useEffect(() => {
    const partnerPaymentCategory = financialCategories.find(cat => cat.name === PARTNER_PAYMENT_CATEGORY_NAME && cat.type === 'payment');
    setPartnerPaymentCategoryId(partnerPaymentCategory?.id);
  }, [financialCategories]);

  const addFinancialCategory = useCallback(async (data: Omit<FinancialCategory, 'id'>, returnObject?: boolean) => {
    const result = await financialCategoryService.add(data as any);
    await queryClient.invalidateQueries({ queryKey: ['financialCategories'] });
    return returnObject ? result : undefined;
  }, [queryClient]);

  const updateFinancialCategory = useCallback(async (id: string, data: Partial<FinancialCategory>) => {
    await financialCategoryService.update(id, data);
    await queryClient.invalidateQueries({ queryKey: ['financialCategories'] });
  }, [queryClient]);

  const deleteFinancialCategory = useCallback(async (id: string) => {
    await financialCategoryService.hardDelete(id);
    await queryClient.invalidateQueries({ queryKey: ['financialCategories'] });
  }, [queryClient]);

  const addFinancialRecordAndUpdateBalances = useCallback(async (record: Omit<FinancialRecord, 'id' | 'uid'>): Promise<FinancialRecord> => {
    const category = financialCategories.find(c => c.id === record.categoryId);
    return runTransaction(db, async (transaction) => {
      if (record.clientId && category?.affects === 'client_balance') {
        const clientRef = doc(db, 'clients', record.clientId);
        const clientSnap = await transaction.get(clientRef);
        if (clientSnap.exists()) {
          transaction.update(clientRef, { updatedAt: new Date().toISOString() });
        }
      }

      if (record.vehicleId && category?.affects === 'partner_balance') {
        const vehicle = rawVehicles.find(v => v.id === record.vehicleId);
        if (vehicle?.partnerId) {
          const partnerRef = doc(db, 'partners', vehicle.partnerId);
          const partnerSnap = await transaction.get(partnerRef);
          if (partnerSnap.exists()) {
            const partnerData = partnerSnap.data() as Partner;
            const amount = record.amount || 0;
            const newBalance = record.type === 'income' ? (partnerData.balance || 0) + amount : (partnerData.balance || 0) - amount;
            transaction.update(partnerRef, { balance: newBalance, updatedAt: new Date().toISOString() });
          }
        }
      }

      const recordWithCategory = {
        ...record,
        category: category?.name || (record as any).category || 'Sin categoría',
        createdAt: new Date().toISOString(),
      };

      const newRecordRef = doc(collection(db, 'financialRecords'));
      transaction.set(newRecordRef, recordWithCategory);

      return { id: newRecordRef.id, ...recordWithCategory } as FinancialRecord;
    });
  }, [financialCategories, rawVehicles]);

  const addFinancialRecord = useCallback(async (record: Omit<FinancialRecord, 'id' | 'uid'>) => {
    const created = await addFinancialRecordAndUpdateBalances(record);
    await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
    return created;
  }, [addFinancialRecordAndUpdateBalances, queryClient]);

  const updateFinancialRecord = useCallback(async (id: string, data: Partial<FinancialRecord>) => {
    await financialRecordService.update(id, data);
    await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
  }, [queryClient]);

  const addExpense = useCallback(async (data: Omit<FinancialRecord, 'id' | 'type' | 'uid'>) => {
    const maintenanceCategory = financialCategories.find(c => c.name === MAINTENANCE_CATEGORY);
    const isMaintenance = data.categoryId === maintenanceCategory?.id;
    const now = new Date().toISOString();

    await runTransaction(db, async (transaction) => {
      let vehicleRef: any;
      let vehicleDoc: any;
      let companyIdTx = data.companyId;

      if (data.vehicleId) {
        vehicleRef = doc(db, 'vehicles', data.vehicleId);
        vehicleDoc = await transaction.get(vehicleRef);
        if (!vehicleDoc.exists()) throw new Error('El vehículo especificado para el gasto no existe.');
        if (!companyIdTx) {
          companyIdTx = vehicleDoc.data()?.companyId;
        }
      }

      const newExpenseRef = doc(collection(db, 'financialRecords'));
      const expenseData = {
        ...data,
        type: 'expense' as const,
        createdBy: currentUser?.uid || 'system',
        createdAt: now,
        isDeleted: false,
        companyId: companyIdTx || null,
      };
      transaction.set(newExpenseRef, expenseData);

      if (data.mileageAtExpense && data.vehicleId) {
        const odometerLogRef = doc(collection(db, 'mileageLogs'));
        const odometerLogData: Omit<any, 'id'> = {
          vehicleId: data.vehicleId,
          mileage: data.mileageAtExpense,
          date: data.date,
          source: 'expense',
          kind: 'odometer',
          financialRecordId: newExpenseRef.id,
          notes: `Gasto: ${data.description}`,
          createdAt: now,
          companyId: companyIdTx ?? null,
          isDeleted: false,
        };
        transaction.set(odometerLogRef, odometerLogData);

        const updatePayload: Partial<Vehicle> = { currentMileage: data.mileageAtExpense };

        if (isMaintenance) {
          const maintLogRef = doc(collection(db, 'mileageLogs'));
          const maintLogData = {
            ...odometerLogData,
            kind: 'maintenance',
            notes: `Mantenimiento: ${data.description}`,
          };
          transaction.set(maintLogRef, maintLogData);
          (updatePayload as any).lastMaintenanceMileage = data.mileageAtExpense;
        }

        if (vehicleRef) {
          transaction.update(vehicleRef, updatePayload);
        }
      }
    });

    await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
    await queryClient.invalidateQueries({ queryKey: ['mileageLogs'] });
  }, [currentUser?.uid, financialCategories, queryClient]);

  const deleteFinancialRecord = useCallback(async (id: string, onSuccess?: () => void) => {
    try {
      await runTransaction(db, async (transaction) => {
        const recordRef = doc(db, 'financialRecords', id);
        const recordSnap = await transaction.get(recordRef);
        if (!recordSnap.exists()) throw new Error('El registro financiero no existe.');
        const recordData = recordSnap.data() as FinancialRecord;

        transaction.update(recordRef, { isDeleted: true, deletedAt: new Date().toISOString() });

        const logsQuery = query(collection(db, 'mileageLogs'), where('financialRecordId', '==', id));
        const logsSnapshot = await getDocs(logsQuery);
        if (!logsSnapshot.empty) {
          logsSnapshot.docs.forEach((d) => transaction.delete(d.ref));
        }

        if (recordData.vehicleId) {
          const vehicleRef = doc(db, 'vehicles', recordData.vehicleId);
          const allLogsQuery = query(
            collection(db, 'mileageLogs'),
            where('vehicleId', '==', recordData.vehicleId),
            orderBy('date', 'desc')
          );
          const allLogsSnapshot = await getDocs(allLogsQuery);
          const remainingLogs = allLogsSnapshot.docs
            .map(d => d.data() as any)
            .filter(l => l.financialRecordId !== id && !l.isDeleted);

          const lastOdometerLog = remainingLogs.find(l => l.kind === 'odometer' || !l.kind);
          const lastMaintenanceLog = remainingLogs.find(l => l.kind === 'maintenance');

          transaction.update(vehicleRef, {
            currentMileage: lastOdometerLog?.mileage || 0,
            lastMaintenanceMileage: lastMaintenanceLog?.mileage || 0,
          });
        }
      });

      await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
      await queryClient.invalidateQueries({ queryKey: ['mileageLogs'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });

      if (onSuccess) onSuccess();
    } catch (error) {
      logger.error('Error al eliminar registro:', error);
      throw error;
    }
  }, [queryClient]);

  const updateExpense = useCallback(async (id: string, data: Partial<FinancialRecord>) => {
    await financialRecordService.update(id, data);
    await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
    await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    await queryClient.invalidateQueries({ queryKey: ['mileageLogs'] });
  }, [queryClient]);

  const updateIncome = useCallback(async (id: string, data: Partial<FinancialRecord>) => {
    await financialRecordService.update(id, data);
    await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
    await queryClient.invalidateQueries({ queryKey: ['clients'] });
    await queryClient.invalidateQueries({ queryKey: ['partners'] });
  }, [queryClient]);

  const updatePayment = useCallback(async (id: string, data: Partial<FinancialRecord>) => {
    await financialRecordService.update(id, data);
    await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
    await queryClient.invalidateQueries({ queryKey: ['clients'] });
  }, [queryClient]);

  const processCreditPayment = useCallback(async (
    creditId: string,
    clientId: string,
    amount: number,
    paymentMethod?: string,
    description?: string,
    companyId?: string,
    categoryId?: string
  ) => {
    const result: {
      newCreditBalance: number;
      paymentScheduleId: string | null;
      creditCompleted?: boolean;
      paymentsMarkedAsPaid?: number;
    } = { newCreditBalance: 0, paymentScheduleId: null, creditCompleted: false, paymentsMarkedAsPaid: 0 };

    try {
      await runTransaction(db, async (transaction) => {
        const creditRef = doc(db, 'credits', creditId);
        const creditSnap = await transaction.get(creditRef);
        if (!creditSnap.exists()) throw new Error('Crédito no encontrado');
        const creditData = creditSnap.data() as Credit;

        const clientRef = doc(db, 'clients', clientId);
        const clientSnap = await transaction.get(clientRef);
        if (!clientSnap.exists()) throw new Error('Cliente no encontrado');
        const clientData = clientSnap.data() as Client;

        const currentPaidAmount = creditData.paidAmount || 0;
        const currentRemainingBalance = creditData.remainingBalance || creditData.totalAmount;
        const newPaidAmount = currentPaidAmount + amount;
        const newRemainingBalance = Math.max(0, currentRemainingBalance - amount);
        const isCompleted = newRemainingBalance <= 0;

        const pendingSchedules = creditPaymentSchedules
          .filter(s => s.creditId === creditId && s.status === 'pending' && !s.isDeleted)
          .sort((a, b) => a.paymentNumber - b.paymentNumber);

        let remainingPaymentAmount = amount;
        let paymentsMarkedCount = 0;
        const now = new Date().toISOString();

        for (const schedule of pendingSchedules) {
          if (remainingPaymentAmount <= 0) break;
          const scheduleAmount = schedule.amount || 0;
          const scheduleRef = doc(db, 'creditPaymentSchedules', schedule.id);

          if (remainingPaymentAmount >= scheduleAmount) {
            transaction.update(scheduleRef, {
              status: 'paid',
              paidAmount: scheduleAmount,
              paidDate: now,
              updatedAt: now,
            });
            remainingPaymentAmount -= scheduleAmount;
            paymentsMarkedCount++;
            if (paymentsMarkedCount === 1) result.paymentScheduleId = schedule.id;
          } else {
            transaction.update(scheduleRef, {
              status: 'paid',
              paidAmount: remainingPaymentAmount,
              paidDate: now,
              updatedAt: now,
            });
            paymentsMarkedCount++;
            if (paymentsMarkedCount === 1) result.paymentScheduleId = schedule.id;
            remainingPaymentAmount = 0;
            break;
          }
        }

        result.paymentsMarkedAsPaid = paymentsMarkedCount;

        const newPaymentsMade = creditData.paymentsMade + paymentsMarkedCount;
        transaction.update(creditRef, {
          paidAmount: newPaidAmount,
          remainingBalance: newRemainingBalance,
          paymentsMade: newPaymentsMade,
          status: isCompleted ? 'completed' : 'active',
          updatedAt: now,
        });

        if (isCompleted) {
          transaction.update(clientRef, { hasActiveCredit: false, activeCreditId: null, updatedAt: now });
        } else {
          transaction.update(clientRef, { updatedAt: now });
        }

        const finalCategoryId = categoryId || CREDIT_PAYMENT_CATEGORY;
        if (!finalCategoryId) throw new Error('No se especificó categoría de pago de crédito');

        const newRecordRef = doc(collection(db, 'financialRecords'));
        transaction.set(newRecordRef, {
          companyId,
          clientId,
          vehicleId: creditData.vehicleId,
          categoryId: finalCategoryId,
          type: 'payment',
          amount,
          paymentMethod: paymentMethod || 'transferencia',
          description: description || `Pago de crédito (${paymentsMarkedCount} cuota${paymentsMarkedCount > 1 ? 's' : ''} pagada${paymentsMarkedCount > 1 ? 's' : ''})`,
          date: now,
          creditId,
          creditPayment: true,
          isDeleted: false,
          createdBy: currentUser?.uid || 'system',
          createdAt: now,
          updatedAt: now,
        });

        result.newCreditBalance = newRemainingBalance;
        result.creditCompleted = isCompleted;
      });

      await queryClient.invalidateQueries({ queryKey: ['credits'] });
      await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      await queryClient.invalidateQueries({ queryKey: ['creditPaymentSchedules'] });

      return { success: true, ...result, creditId };
    } catch (error: any) {
      logger.error('❌ [ERROR EN PROCESSCREDITPAYMENT]', error);
      return {
        success: false,
        error: error.message || 'Error desconocido al procesar el pago',
        newCreditBalance: 0,
        creditId: null,
        paymentScheduleId: null,
        paymentsMarkedAsPaid: 0,
      };
    }
  }, [creditPaymentSchedules, currentUser?.uid, queryClient]);

  const addIncome = useCallback(async (data: Partial<Omit<FinancialRecord, 'id'>>) => {
    const category = financialCategories.find(c => c.id === data.categoryId);
    const isClientSecurityDeposit = data.categoryId === CLIENT_SECURITY_DEPOSIT_CATEGORY_ID;
    const isUsingDepositAsPayment = data.paymentMethod === 'Uso de Depósito en Garantía';

    const isCreditPayment = category?.type === 'payment' && (category?.name === 'Pago de Crédito' || data.categoryId === CREDIT_PAYMENT_CATEGORY);
    if (isCreditPayment && data.clientId && data.amount) {
      const activeCredit = rawCredits.find(c => c.clientId === data.clientId && c.status === 'active');
      if (!activeCredit) throw new Error('No hay crédito activo para este cliente');
      const result = await processCreditPayment(
        activeCredit.id,
        data.clientId,
        data.amount,
        data.paymentMethod,
        data.description,
        data.companyId || currentUser?.companyId || '',
        data.categoryId
      );
      if (!result.success) throw new Error(result.error || 'Error al procesar pago de crédito');
      await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
      await queryClient.invalidateQueries({ queryKey: ['credits'] });
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      await queryClient.invalidateQueries({ queryKey: ['creditPaymentSchedules'] });
      return;
    }

    if (isClientSecurityDeposit) {
      if (!data.clientId || !data.amount) throw new Error('Client ID and amount are required for client security deposit.');
      await runTransaction(db, async (transaction) => {
        const clientRef = doc(db, 'clients', data.clientId!);
        const clientSnap = await transaction.get(clientRef);
        if (!clientSnap.exists()) throw new Error('Client not found.');

        const clientData = clientSnap.data() as Client;
        const currentDeposit = clientData.securityDeposit ?? 0;

        transaction.update(clientRef, {
          securityDeposit: currentDeposit + data.amount!,
          updatedAt: new Date().toISOString(),
        });

        const newRecordRef = doc(collection(db, 'financialRecords'));
        const recordPayload = {
          ...data,
          type: 'income',
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.uid || 'system',
          isDeleted: false,
        };
        transaction.set(newRecordRef, recordPayload);

        await logClientChange(
          transaction,
          data.clientId!,
          'deposit_updated',
          currentUser?.uid || 'system',
          currentUser?.name || 'Sistema',
          `Depósito en garantía actualizado por ${formatCurrency(data.amount!)}`,
          'securityDeposit',
          currentDeposit,
          currentDeposit + data.amount!
        );
      });

      await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      return;
    }

    if (isUsingDepositAsPayment) {
      if (!data.clientId || !data.amount) throw new Error('Client and amount required');
      await runTransaction(db, async (transaction) => {
        const clientRef = doc(db, 'clients', data.clientId!);
        const clientSnap = await transaction.get(clientRef);
        if (!clientSnap.exists()) throw new Error('Client not found');
        const clientData = clientSnap.data() as Client;
        const currentDeposit = clientData.securityDeposit ?? 0;
        if (data.amount! > currentDeposit) throw new Error('Payment amount exceeds available deposit.');

        transaction.update(clientRef, {
          securityDeposit: currentDeposit - data.amount!,
          balance: (clientData.balance ?? 0) - data.amount!,
          updatedAt: new Date().toISOString(),
        });

        const newRecordRef = doc(collection(db, 'financialRecords'));
        const recordPayload = {
          ...data,
          type: 'payment',
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.uid || 'system',
          isDeleted: false,
        };
        transaction.set(newRecordRef, recordPayload);
      });

      await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      return;
    }

    await addFinancialRecordAndUpdateBalances({ ...data, type: category?.type === 'payment' ? 'payment' : 'income' } as any);

    await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
    await queryClient.invalidateQueries({ queryKey: ['clients'] });
    await queryClient.invalidateQueries({ queryKey: ['partners'] });
  }, [financialCategories, addFinancialRecordAndUpdateBalances, currentUser, rawCredits, processCreditPayment, queryClient]);

  const addPayment = useCallback(async (data: Omit<FinancialRecord, 'id' | 'uid' | 'type' | 'category'>) => {
    await addFinancialRecord({ ...data, type: 'payment', category: CLIENT_PAYMENT_CATEGORY } as any);
  }, [addFinancialRecord]);

  const addCredit = useCallback(async (data: Omit<Credit, 'id' | 'uid'>) => {
    const result = await creditService.add(data as any);
    await queryClient.invalidateQueries({ queryKey: ['credits'] });
    return result;
  }, [queryClient]);

  const updateCredit = useCallback(async (id: string, data: Partial<Credit>) => {
    await creditService.update(id, data);
    await queryClient.invalidateQueries({ queryKey: ['credits'] });
  }, [queryClient]);

  const deleteCredit = useCallback(async (id: string) => {
    await creditService.softDelete(id);
    await queryClient.invalidateQueries({ queryKey: ['credits'] });
  }, [queryClient]);

  const deactivateCredit = useCallback(async (id: string) => {
    const credit = rawCredits.find(c => c.id === id);
    if (!credit) return;
    const batch = writeBatch(db);
    const vehicleRef = doc(db, 'vehicles', credit.vehicleId);
    batch.update(vehicleRef, { status: 'active', clientId: null });
    const creditRef = doc(db, 'credits', id);
    batch.update(creditRef, { status: 'inactive' });
    await batch.commit();
    await refreshFinances();
  }, [rawCredits, refreshFinances]);

  const createCreditWithFinancialRecord = useCallback(async (
    creditData: Omit<Credit, 'id' | 'isDeleted'>,
    companyIdTx: string,
  ): Promise<string | null> => {
    if (!currentUser?.uid) throw new Error('Usuario no autenticado');
    try {
      const creditGrantedCategory = financialCategories.find(cat => cat.name === CREDIT_GRANTED_CATEGORY && cat.type === 'income');
      if (!creditGrantedCategory) throw new Error('⚠️ No se encontró la categoría "Crédito Otorgado".');

      const creditId = await runTransaction(db, async (transaction) => {
        const clientRef = doc(db, 'clients', creditData.clientId);
        const clientSnap = await transaction.get(clientRef);
        if (!clientSnap.exists()) throw new Error('❌ Cliente no encontrado para la transacción');

        const creditRef = doc(collection(db, 'credits'));
        const newCredit = {
          ...creditData,
          paidAmount: 0,
          paymentsMade: 0,
          remainingBalance: creditData.totalAmount,
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDeleted: false,
        };
        transaction.set(creditRef, newCredit);

        for (let i = 0; i < creditData.numberOfPayments; i++) {
          const scheduleRef = doc(collection(db, 'creditPaymentSchedules'));
          const dueDate = addWeeks(new Date(creditData.startDate), i);
          const scheduleData = {
            creditId: creditRef.id,
            paymentNumber: i + 1,
            dueDate: dueDate.toISOString(),
            amount: creditData.weeklyPayment,
            status: 'pending' as const,
            createdAt: new Date().toISOString(),
            companyId: companyIdTx,
          };
          transaction.set(scheduleRef, scheduleData);
        }

        transaction.update(clientRef, { hasActiveCredit: true, activeCreditId: creditRef.id, updatedAt: new Date().toISOString() });

        const financialRecordRef = doc(collection(db, 'financialRecords'));
        const financialRecordData = {
          companyId: companyIdTx,
          clientId: creditData.clientId,
          vehicleId: creditData.vehicleId,
          categoryId: creditGrantedCategory.id,
          type: 'income' as const,
          amount: creditData.totalAmount,
          paymentMethod: 'credito',
          description: `Crédito otorgado - ${creditData.numberOfPayments} pagos de ${formatCurrency(creditData.weeklyPayment)}`,
          date: creditData.startDate,
          creditId: creditRef.id,
          creditGranted: true,
          isDeleted: false,
          createdBy: currentUser.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        transaction.set(financialRecordRef, financialRecordData);

        if (creditData.clientId) {
          await logClientChange(
            transaction,
            creditData.clientId,
            'credit_approved',
            currentUser.uid,
            currentUser.name || 'Sistema',
            `Crédito aprobado por ${formatCurrency(creditData.totalAmount)}`,
            'activeCreditId',
            null,
            creditRef.id
          );
        }

        return creditRef.id;
      });

      await queryClient.invalidateQueries({ queryKey: ['credits'] });
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
      await queryClient.invalidateQueries({ queryKey: ['creditPaymentSchedules'] });
      return creditId;
    } catch (error) {
      logger.error('❌ Error completo al crear crédito:', error);
      throw error;
    }
  }, [currentUser, financialCategories, queryClient]);

  const cancelCreditWithAdjustment = useCallback(async (creditId: string, reason?: string) => {
    if (!currentUser?.uid) throw new Error('Usuario no autenticado');
    try {
      await runTransaction(db, async (transaction) => {
        const creditRef = doc(db, 'credits', creditId);
        const creditSnap = await transaction.get(creditRef);
        if (!creditSnap.exists()) throw new Error('Crédito no encontrado');
        const creditData = creditSnap.data() as Credit;
        if (creditData.status !== 'active') throw new Error('Crédito no está activo. Estado actual: ' + creditData.status);

        const remainingBalance = creditData.remainingBalance || 0;
        const clientId = creditData.clientId;
        const vehicleId = creditData.vehicleId;
        const companyIdTx = creditData.companyId;

        transaction.update(creditRef, {
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          cancelledBy: currentUser.uid,
          cancelReason: reason || 'Cancelación manual',
          updatedAt: new Date().toISOString(),
        });

        if (remainingBalance > 0 && clientId) {
          const creditNoteRef = doc(collection(db, 'financialRecords'));
          transaction.set(creditNoteRef, {
            type: 'payment',
            amount: remainingBalance,
            description: 'Nota de Crédito - Cancelación de crédito',
            date: new Date().toISOString(),
            categoryId: 'credit-cancellation-adjustment',
            clientId,
            vehicleId: vehicleId || null,
            creditId,
            companyId: companyIdTx || null,
            isCreditCancellation: true,
            createdBy: currentUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDeleted: false,
          });
        }

        if (vehicleId) {
          const vehicleRef = doc(db, 'vehicles', vehicleId);
          transaction.update(vehicleRef, { lockedByCredit: false, associatedCreditId: null, updatedAt: new Date().toISOString() });
        }

        if (clientId) {
          const clientRef = doc(db, 'clients', clientId);
          transaction.update(clientRef, { hasActiveCredit: false, activeCreditId: null, updatedAt: new Date().toISOString() });
        }

        const scheduleQuery = query(
          collection(db, 'creditPaymentSchedules'),
          where('creditId', '==', creditId),
          where('status', '==', 'pending')
        );
        const scheduleSnap = await getDocs(scheduleQuery);
        scheduleSnap.docs.forEach((scheduleDoc) => {
          transaction.update(doc(db, 'creditPaymentSchedules', scheduleDoc.id), {
            status: 'cancelled',
            updatedAt: new Date().toISOString(),
          });
        });
      });

      await queryClient.invalidateQueries({ queryKey: ['credits'] });
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
      await queryClient.invalidateQueries({ queryKey: ['creditPaymentSchedules'] });
    } catch (error) {
      logger.error('Error al cancelar crédito:', error);
      throw error;
    }
  }, [currentUser, queryClient]);

  const deleteCreditWithCleanup = useCallback(async (creditId: string) => {
    try {
      const qSnap = await getDocs(query(collection(db, 'financialRecords'), where('creditId', '==', creditId)));
      const batch = writeBatch(db);
      const creditRef = doc(db, 'credits', creditId);
      batch.delete(creditRef);
      qSnap.docs.forEach(docSnap => batch.delete(docSnap.ref));
      await batch.commit();
      await queryClient.invalidateQueries({ queryKey: ['credits'] });
      await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
    } catch (error) {
      logger.error('❌ Error en deleteCreditWithCleanup:', error);
      throw new Error('No se pudo completar la eliminación del crédito y sus registros.');
    }
  }, [queryClient]);

  const addMulta = useCallback(async (data: Omit<Multa, 'id'>): Promise<Multa> => {
    const multaId = await runTransaction(db, async (transaction) => {
      const clientRef = doc(db, 'clients', data.clientId!);
      const clientSnap = await transaction.get(clientRef);
      if (!clientSnap.exists()) throw new Error('Cliente no encontrado');

      const multaCategoryQuery = query(
        collection(db, 'financialCategories'),
        where('name', '==', 'Multa'),
        where('isDefault', '==', true),
        limit(1)
      );
      const multaCategorySnapshot = await getDocs(multaCategoryQuery);
      if (multaCategorySnapshot.empty) throw new Error('Categoría "Multa" no encontrada.');
      const multaCategoryId = multaCategorySnapshot.docs[0].id;

      const multaRef = doc(collection(db, 'multas'));
      transaction.set(multaRef, { ...data, createdAt: data.createdAt || new Date().toISOString() });

      const finRecordRef = doc(collection(db, 'financialRecords'));
      transaction.set(finRecordRef, {
        clientId: data.clientId,
        vehicleId: data.vehicleId,
        categoryId: multaCategoryId,
        category: 'Multa',
        type: 'income',
        amount: data.total,
        description: `Multa: ${data.descripcion}${data.folio ? ` (Folio: ${data.folio})` : ''}`,
        date: data.fechaInfraccion,
        multaId: multaRef.id,
        isPending: true,
        isDeleted: false,
        createdBy: data.createdBy,
        createdAt: new Date().toISOString(),
        companyId: data.companyId,
      });

      return multaRef.id;
    });

    await queryClient.invalidateQueries({ queryKey: ['multas'] });
    await queryClient.invalidateQueries({ queryKey: ['clients'] });
    await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });

    return { id: multaId, ...data } as Multa;
  }, [queryClient]);

  const updateMulta = useCallback(async (id: string, data: Partial<Multa>) => {
    await multaService.update(id, data);
    await queryClient.invalidateQueries({ queryKey: ['multas'] });
  }, [queryClient]);

  const deleteMulta = useCallback(async (id: string) => {
    await multaService.softDelete(id);
    await queryClient.invalidateQueries({ queryKey: ['multas'] });
  }, [queryClient]);

  const processMultaPayment = useCallback(async (multaId: string, paymentData: Omit<FinancialRecord, 'id' | 'uid' | 'type' | 'category'>) => {
    await runTransaction(db, async (transaction) => {
      const multaRef = doc(db, 'multas', multaId);
      const multaSnap = await transaction.get(multaRef);
      if (!multaSnap.exists()) throw new Error('Multa no encontrada');
      const multa = multaSnap.data() as Multa;
      if (multa.status === 'pagada') throw new Error('Esta multa ya fue pagada');

      const pagoMultaCategoryQuery = query(
        collection(db, 'financialCategories'),
        where('name', '==', 'Pago de Multa'),
        where('isDefault', '==', true),
        limit(1)
      );
      const pagoMultaCategorySnapshot = await getDocs(pagoMultaCategoryQuery);
      if (pagoMultaCategorySnapshot.empty) throw new Error('Categoría "Pago de Multa" no encontrada. Recarga la página.');
      const pagoMultaCategoryId = pagoMultaCategorySnapshot.docs[0].id;

      const paymentRef = doc(collection(db, 'financialRecords'));
      transaction.set(paymentRef, {
        ...paymentData,
        type: 'payment',
        category: 'Pago de Multa',
        categoryId: pagoMultaCategoryId,
        multaId,
        description: paymentData.description || `Pago de multa${multa.folio ? ` (Folio: ${multa.folio})` : ''}: ${multa.descripcion}`,
        isPending: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      });

      transaction.update(multaRef, { status: 'pagada', fechaPago: paymentData.date, updatedAt: new Date().toISOString() });

      const finRecordQuery = query(
        collection(db, 'financialRecords'),
        where('multaId', '==', multaId),
        where('type', '==', 'income'),
        limit(1)
      );
      const finRecordSnapshot = await getDocs(finRecordQuery);
      if (!finRecordSnapshot.empty) {
        const finRecordRef = finRecordSnapshot.docs[0].ref;
        transaction.update(finRecordRef, { isPending: false, updatedAt: new Date().toISOString() });
      }
    });

    await queryClient.invalidateQueries({ queryKey: ['multas'] });
    await queryClient.invalidateQueries({ queryKey: ['financialRecords'] });
    await queryClient.invalidateQueries({ queryKey: ['clients'] });
  }, [queryClient]);

  const loading = recordsQuery.isLoading || categoriesQuery.isLoading || schedulesQuery.isLoading || multasQuery.isLoading;

  const partnerPaymentCategoryId = useMemo(() => {
    const partnerPaymentCategory = financialCategories.find(cat => cat.name === PARTNER_PAYMENT_CATEGORY_NAME && cat.type === 'payment');
    return partnerPaymentCategory?.id;
  }, [financialCategories]);

  const value = useMemo<FinancesContextValue>(() => ({
    financialRecords,
    financialCategories,
    creditPaymentSchedules,
    multas,
    loading,
    partnerPaymentCategoryId,
    refreshFinances,
    addFinancialCategory,
    updateFinancialCategory,
    deleteFinancialCategory,
    addFinancialRecord,
    updateFinancialRecord,
    deleteFinancialRecord,
    addExpense,
    updateExpense,
    addIncome,
    updateIncome,
    addPayment,
    updatePayment,
    processCreditPayment,
    createCreditWithFinancialRecord,
    cancelCreditWithAdjustment,
    deleteCreditWithCleanup,
    addCredit,
    updateCredit,
    deleteCredit,
    deactivateCredit,
    addMulta,
    updateMulta,
    deleteMulta,
    processMultaPayment,
  }), [
    financialRecords,
    financialCategories,
    creditPaymentSchedules,
    multas,
    loading,
    partnerPaymentCategoryId,
    refreshFinances,
    addFinancialCategory,
    updateFinancialCategory,
    deleteFinancialCategory,
    addFinancialRecord,
    updateFinancialRecord,
    deleteFinancialRecord,
    addExpense,
    updateExpense,
    addIncome,
    updateIncome,
    addPayment,
    updatePayment,
    processCreditPayment,
    createCreditWithFinancialRecord,
    cancelCreditWithAdjustment,
    deleteCreditWithCleanup,
    addCredit,
    updateCredit,
    deleteCredit,
    deactivateCredit,
    addMulta,
    updateMulta,
    deleteMulta,
    processMultaPayment,
  ]);

  if (recordsQuery.isLoading && categoriesQuery.isLoading) return null;

  return (
    <FinancesContext.Provider value={value}>
      {children}
    </FinancesContext.Provider>
  );
};

export const useFinances = () => {
  const ctx = useContext(FinancesContext);
  if (!ctx) throw new Error('useFinances debe usarse dentro de FinancesProvider');
  return ctx;
};
