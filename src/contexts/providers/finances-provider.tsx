"use client";

/**
 * @fileoverview Wrapper del Data Provider de Supabase.
 * Compatibilidad con las páginas que usan useFinances().
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useData } from '@/contexts/data-provider-supabase';
import type { FinancialRecord, FinancialCategory, Credit, CreditPaymentSchedule, Multa } from '@/types';

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

export const FinancesProvider = ({ children }: Props) => {
  const data = useData();

  const value: FinancesContextValue = {
    financialRecords: data.financialRecords,
    financialCategories: data.financialCategories,
    creditPaymentSchedules: data.creditPaymentSchedules,
    multas: data.multas,
    loading: data.loadingData,
    refreshFinances: data.refreshData,
    addFinancialCategory: data.addFinancialCategory,
    updateFinancialCategory: data.updateFinancialCategory,
    deleteFinancialCategory: data.deleteFinancialCategory,
    addFinancialRecord: data.addFinancialRecord,
    updateFinancialRecord: data.updateFinancialRecord,
    deleteFinancialRecord: data.deleteFinancialRecord,
    addExpense: data.addExpense,
    updateExpense: data.updateExpense,
    addIncome: data.addIncome,
    updateIncome: data.updateIncome,
    addPayment: data.addPayment,
    updatePayment: data.updatePayment,
    processCreditPayment: data.processCreditPayment,
    createCreditWithFinancialRecord: data.createCreditWithFinancialRecord,
    cancelCreditWithAdjustment: data.cancelCreditWithAdjustment,
    deleteCreditWithCleanup: data.deleteCreditWithCleanup,
    addCredit: data.addCredit,
    updateCredit: data.updateCredit,
    deleteCredit: data.deleteCredit,
    deactivateCredit: data.deactivateCredit,
    addMulta: data.addMulta,
    updateMulta: data.updateMulta,
    deleteMulta: data.deleteMulta,
    processMultaPayment: data.processMultaPayment,
  };

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
