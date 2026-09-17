// hooks/use-financial-analytics.ts
"use client";

import { useMemo } from 'react';
import type { FinancialRecord, Client, Vehicle, Partner, FinancialCategory } from '@/types';
import { startOfMonth, endOfMonth, subMonths, format, subDays, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  filterRecordsByDateRange,
  calculateProfitMargin,
  calculateAvgTransactionValue,
  sumRentalIncome,
  sumExpense,
  daysBetweenInclusive,
  categoryIdsByAffects,
} from '@/lib/financial-metrics';

type ProfitabilityLevel = 'high' | 'medium' | 'low' | 'negative';

export type ClientProfitability = {
  clientId: string;
  clientName: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
  level: ProfitabilityLevel;
};

export type MonthlyCashFlow = {
  period: string;
  income: number;
  expenses: number;
  payments: number;
  netFlow: number;
};

export type FinancialAnalytics = {
  totalIncome: number;
  operationalIncome: number;
  customerCollections: number;
  creditCollections: number;
  securityDeposits: number;
  partnerPayments: number;
  supplierPayments: number;
  otherPayments: number;
  cashInflow: number;
  cashOutflow: number;
  netCashFlow: number;
  creditGranted: number;
  creditRecovered: number;
  todayIncome: number;
  totalExpenses: number;
  todayExpenses: number;
  netProfit: number;
  profitMargin: number;
  avgTransactionValue: number;
  avgRevenuePerClient: number;
  monthlyGrowth: { income: number; profit: number; expenses: number };
  cashFlowAnalysis: MonthlyCashFlow[];
  expenseCategories: { name: string; value: number }[];
  incomeCategories: { name: string; value: number }[];
  topClients: { id: string; name: string; netValue: number }[];
  topVehicles: { id: string; name: string; netValue: number }[];
  profitabilityAnalysis: ClientProfitability[];
};

const PAYMENT_ALIASES = {
  client: ['pago de cliente', 'pago cliente', 'abono de cliente'],
  partner: ['pago a socio', 'pago de socio', 'abono a socio', 'comisión socio', 'comision socio'],
  supplier: ['pago a proveedor', 'pago de proveedor', 'abono a proveedor'],
  credit: ['pago de crédito', 'pago credito', 'pago de crédito semanal'],
} as const;

function normalizedCategory(record: FinancialRecord, categoryMap: Map<string, string>): string {
  return (record.categoryId && categoryMap.get(record.categoryId)) || record.category || '';
}

function isPaymentCategory(record: FinancialRecord, categoryMap: Map<string, string>, aliases: readonly string[]): boolean {
  const category = normalizedCategory(record, categoryMap).trim().toLowerCase();
  return aliases.includes(category as never);
}

export const useFinancialAnalytics = (
  financialRecords: FinancialRecord[],
  clients: Client[],
  vehicles: Vehicle[],
  partners: Partner[],
  dateRange?: { from?: Date; to?: Date },
  financialCategories?: FinancialCategory[]
): FinancialAnalytics => {
  const analytics = useMemo(() => {
    const now = new Date();
    const defaultAnalytics: FinancialAnalytics = {
      totalIncome: 0,
      operationalIncome: 0,
      customerCollections: 0,
      creditCollections: 0,
      securityDeposits: 0,
      partnerPayments: 0,
      supplierPayments: 0,
      otherPayments: 0,
      cashInflow: 0,
      cashOutflow: 0,
      netCashFlow: 0,
      creditGranted: 0,
      creditRecovered: 0,
      todayIncome: 0,
      totalExpenses: 0,
      todayExpenses: 0,
      netProfit: 0,
      profitMargin: 0,
      avgTransactionValue: 0,
      avgRevenuePerClient: 0,
      monthlyGrowth: { income: 0, profit: 0, expenses: 0 },
      cashFlowAnalysis: [],
      expenseCategories: [],
      incomeCategories: [],
      topClients: [],
      topVehicles: [],
      profitabilityAnalysis: [],
    };

    if (!dateRange?.from || !dateRange.to) return defaultAnalytics;

    const filteredRecords = financialRecords
      ? filterRecordsByDateRange(financialRecords, { from: dateRange.from, to: dateRange.to })
      : [];
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const todayRecords = filterRecordsByDateRange(filteredRecords, { from: todayStart, to: todayEnd });
    const depositCategoryIds = categoryIdsByAffects(financialCategories, 'security_deposit');

    const categoryMap = new Map<string, string>();
    financialCategories?.forEach(cat => categoryMap.set(cat.id, cat.name));

    const operationalIncome = sumRentalIncome(filteredRecords, depositCategoryIds);
    const todayOperationalIncome = sumRentalIncome(todayRecords, depositCategoryIds);
    const totalExpenses = sumExpense(filteredRecords);
    const todayExpenses = sumExpense(todayRecords);

    const securityDeposits = filteredRecords
      .filter(r => r.type === 'income' && !r.isDeleted && (r.category === 'Depósito en Garantía' || (r.categoryId && depositCategoryIds.has(r.categoryId))))
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const creditGranted = filteredRecords
      .filter(r => r.type === 'income' && !r.isDeleted && !!r.creditGranted)
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const paymentRecords = filteredRecords.filter(r => r.type === 'payment' && !r.isDeleted);
    const customerCollections = paymentRecords
      .filter(r => isPaymentCategory(r, categoryMap, PAYMENT_ALIASES.client))
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const creditCollections = paymentRecords
      .filter(r => isPaymentCategory(r, categoryMap, PAYMENT_ALIASES.credit))
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const partnerPayments = paymentRecords
      .filter(r => isPaymentCategory(r, categoryMap, PAYMENT_ALIASES.partner))
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const supplierPayments = paymentRecords
      .filter(r => isPaymentCategory(r, categoryMap, PAYMENT_ALIASES.supplier))
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const otherPayments = paymentRecords
      .filter(r => !isPaymentCategory(r, categoryMap, PAYMENT_ALIASES.client)
        && !isPaymentCategory(r, categoryMap, PAYMENT_ALIASES.credit)
        && !isPaymentCategory(r, categoryMap, PAYMENT_ALIASES.partner)
        && !isPaymentCategory(r, categoryMap, PAYMENT_ALIASES.supplier))
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    // Los ingresos operativos son ingresos ganados. Los pagos de cliente son
    // cobranza de esos ingresos y no se vuelven a sumar como ingreso ganado.
    // Los pagos de crédito son recuperación de cartera, no utilidad.
    const totalIncome = operationalIncome;
    const cashInflow = operationalIncome + customerCollections + creditCollections + securityDeposits;
    const cashOutflow = totalExpenses + partnerPayments + supplierPayments + otherPayments;
    const netCashFlow = cashInflow - cashOutflow;
    const creditRecovered = creditCollections;
    const netProfit = operationalIncome - totalExpenses;
    const profitMargin = calculateProfitMargin(operationalIncome, totalExpenses);

    const expenseCategoriesMap: Record<string, number> = {};
    const incomeCategoriesMap: Record<string, number> = {};
    const clientValueMap: Record<string, number> = {};
    const vehicleValueMap: Record<string, number> = {};
    const clientsWithRevenueInPeriod = new Set<string>();

    filteredRecords.forEach(record => {
      if (record.type === 'income' && !record.creditGranted && !depositCategoryIds.has(record.categoryId || '') && record.category !== 'Depósito en Garantía') {
        const categoryName = normalizedCategory(record, categoryMap) || 'Sin Categoría';
        incomeCategoriesMap[categoryName] = (incomeCategoriesMap[categoryName] || 0) + Number(record.amount || 0);
        if (record.clientId) {
          clientValueMap[record.clientId] = (clientValueMap[record.clientId] || 0) + Number(record.amount || 0);
          clientsWithRevenueInPeriod.add(record.clientId);
        }
        if (record.vehicleId) vehicleValueMap[record.vehicleId] = (vehicleValueMap[record.vehicleId] || 0) + Number(record.amount || 0);
      } else if (record.type === 'expense') {
        const categoryName = normalizedCategory(record, categoryMap) || 'Sin Categoría';
        expenseCategoriesMap[categoryName] = (expenseCategoriesMap[categoryName] || 0) + Number(record.amount || 0);
        if (record.clientId) clientValueMap[record.clientId] = (clientValueMap[record.clientId] || 0) - Number(record.amount || 0);
        if (record.vehicleId) vehicleValueMap[record.vehicleId] = (vehicleValueMap[record.vehicleId] || 0) - Number(record.amount || 0);
      }
    });

    const profitabilityAnalysis: ClientProfitability[] = (clients || []).map(client => {
      const clientRecords = filteredRecords.filter(r => r.clientId === client.id);
      const revenue = clientRecords.filter(r => r.type === 'income' && !r.creditGranted && !depositCategoryIds.has(r.categoryId || '') && r.category !== 'Depósito en Garantía').reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const expenses = clientRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const netProfit = revenue - expenses;
      const profitMargin = calculateProfitMargin(revenue, expenses);
      let level: ProfitabilityLevel;
      if (netProfit <= 0) level = 'negative';
      else if (profitMargin > 25) level = 'high';
      else if (profitMargin > 10) level = 'medium';
      else level = 'low';
      return { clientId: client.id, clientName: `${client.firstname} ${client.lastname}`, revenue, expenses, netProfit, profitMargin, level };
    }).sort((a, b) => b.netProfit - a.netProfit);

    const cashFlowAnalysis: MonthlyCashFlow[] = Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(now, 11 - i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthRecords = filterRecordsByDateRange(financialRecords, { from: monthStart, to: monthEnd });
      const monthCategoryMap = new Map<string, string>();
      financialCategories?.forEach(cat => monthCategoryMap.set(cat.id, cat.name));
      const income = sumRentalIncome(monthRecords, depositCategoryIds);
      const expenses = sumExpense(monthRecords);
      const payments = monthRecords.filter(r => r.type === 'payment').reduce((sum, r) => sum + Number(r.amount || 0), 0);
      // Este gráfico conserva el desglose histórico, pero ya no presenta
      // ingreso operativo + todos los pagos como "beneficio".
      const monthDeposits = monthRecords.filter(r => r.type === 'income' && (r.category === 'Depósito en Garantía' || (r.categoryId && depositCategoryIds.has(r.categoryId)))).reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const monthPartnerPayments = monthRecords.filter(r => r.type === 'payment' && isPaymentCategory(r, monthCategoryMap, PAYMENT_ALIASES.partner)).reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const monthSupplierPayments = monthRecords.filter(r => r.type === 'payment' && isPaymentCategory(r, monthCategoryMap, PAYMENT_ALIASES.supplier)).reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const monthOtherPayments = monthRecords.filter(r => r.type === 'payment' && !isPaymentCategory(r, monthCategoryMap, PAYMENT_ALIASES.client) && !isPaymentCategory(r, monthCategoryMap, PAYMENT_ALIASES.credit) && !isPaymentCategory(r, monthCategoryMap, PAYMENT_ALIASES.partner) && !isPaymentCategory(r, monthCategoryMap, PAYMENT_ALIASES.supplier)).reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const cashOut = expenses + monthPartnerPayments + monthSupplierPayments + monthOtherPayments;
      const cashIn = income + monthDeposits + payments;
      return { period: format(date, 'MMM yy', { locale: es }), income, expenses, payments, netFlow: cashIn - cashOut };
    });

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : current < 0 ? -100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };
    const daysInPeriod = daysBetweenInclusive(dateRange.from, dateRange.to);
    const prevPeriodStart = subDays(dateRange.from, daysInPeriod);
    const prevPeriodEnd = subDays(dateRange.from, 1);
    const prevMonthRecords = filterRecordsByDateRange(financialRecords, { from: prevPeriodStart, to: prevPeriodEnd });
    const prevMonthOperationalIncome = sumRentalIncome(prevMonthRecords, depositCategoryIds);
    const prevMonthExpenses = sumExpense(prevMonthRecords);
    const prevMonthProfit = prevMonthOperationalIncome - prevMonthExpenses;
    const monthlyGrowth = {
      income: calculateChange(operationalIncome, prevMonthOperationalIncome),
      expenses: calculateChange(totalExpenses, prevMonthExpenses),
      profit: calculateChange(netProfit, prevMonthProfit),
    };

    const avgTransactionValue = calculateAvgTransactionValue(filteredRecords);
    const avgRevenuePerClient = clientsWithRevenueInPeriod.size > 0 ? operationalIncome / clientsWithRevenueInPeriod.size : 0;
    const expenseCategories = Object.entries(expenseCategoriesMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const incomeCategories = Object.entries(incomeCategoriesMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const clientMap = new Map((clients || []).map(c => [c.id, `${c.firstname} ${c.lastname}`]));
    const topClients = Object.entries(clientValueMap).map(([id, netValue]) => ({ id, name: clientMap.get(id) || 'Cliente Desconocido', netValue })).sort((a,b) => b.netValue - a.netValue).slice(0, 10);
    const vehicleMap = new Map((vehicles || []).map(v => [v.id, `${v.make} ${v.model} (${v.plate})`]));
    const topVehicles = Object.entries(vehicleValueMap).map(([id, netValue]) => ({ id, name: vehicleMap.get(id) || 'Vehículo Desconocido', netValue })).sort((a,b) => b.netValue - a.netValue).slice(0, 10);

    return {
      totalIncome,
      operationalIncome,
      customerCollections,
      creditCollections,
      securityDeposits,
      partnerPayments,
      supplierPayments,
      otherPayments,
      cashInflow,
      cashOutflow,
      netCashFlow,
      creditGranted,
      creditRecovered,
      todayIncome: todayOperationalIncome,
      totalExpenses,
      todayExpenses,
      netProfit,
      profitMargin,
      avgTransactionValue,
      avgRevenuePerClient,
      monthlyGrowth,
      cashFlowAnalysis,
      expenseCategories,
      incomeCategories,
      topClients,
      topVehicles,
      profitabilityAnalysis,
    };
  }, [financialRecords, clients, vehicles, dateRange, financialCategories]);

  return analytics;
};
