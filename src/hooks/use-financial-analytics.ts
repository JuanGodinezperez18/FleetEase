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
  sumPayment,
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
}

export type MonthlyCashFlow = {
  period: string;
  income: number;
  expenses: number;
  payments: number;
  netFlow: number;
};

export type FinancialAnalytics = {
  totalIncome: number;
  todayIncome: number;
  totalCashIncome: number;
  todayCashIncome: number;
  totalExpenses: number;
  todayExpenses: number;
  netProfit: number;
  profitMargin: number;
  avgTransactionValue: number;
  avgRevenuePerClient: number;
  monthlyGrowth: { income: number; profit: number; expenses: number; };
  cashFlowAnalysis: MonthlyCashFlow[];
  expenseCategories: { name: string; value: number; }[];
  incomeCategories: { name: string; value: number; }[];
  topClients: { id: string; name: string; netValue: number; }[];
  topVehicles: { id: string; name: string; netValue: number; }[];
  profitabilityAnalysis: ClientProfitability[];
};

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
      totalIncome: 0, todayIncome: 0, totalCashIncome: 0, todayCashIncome: 0, totalExpenses: 0, todayExpenses: 0, netProfit: 0, profitMargin: 0,
      avgTransactionValue: 0, avgRevenuePerClient: 0,
      monthlyGrowth: { income: 0, profit: 0, expenses: 0 },
      cashFlowAnalysis: [], expenseCategories: [], incomeCategories: [],
      topClients: [], topVehicles: [], profitabilityAnalysis: []
    };

    if (!dateRange || !dateRange.from || !dateRange.to) return defaultAnalytics;

    const filteredRecords = financialRecords
      ? filterRecordsByDateRange(financialRecords, { from: dateRange.from!, to: dateRange.to! })
      : [];
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const todayRecords = filterRecordsByDateRange(filteredRecords, { from: todayStart, to: todayEnd });
    const depositCategoryIds = categoryIdsByAffects(financialCategories, 'security_deposit');

    // Ingreso operativo: renta/ingresos ganados. No incluye crédito otorgado ni depósitos.
    const todayIncome = sumRentalIncome(todayRecords, depositCategoryIds);
    const totalIncome = sumRentalIncome(filteredRecords, depositCategoryIds);
    // Flujo de entrada de efectivo: ingreso operativo + pagos de créditos cobrados.
    const todayCashIncome = todayIncome + sumPayment(todayRecords);
    const totalCashIncome = totalIncome + sumPayment(filteredRecords);
    const todayExpenses = sumExpense(todayRecords);
    const totalExpenses = sumExpense(filteredRecords);

    const categoryMap = new Map<string, string>();
    financialCategories?.forEach(cat => categoryMap.set(cat.id, cat.name));

    const expenseCategoriesMap: Record<string, number> = {};
    const incomeCategoriesMap: Record<string, number> = {};
    const clientValueMap: Record<string, number> = {};
    const vehicleValueMap: Record<string, number> = {};
    const clientsWithRevenueInPeriod = new Set<string>();

    filteredRecords.forEach(record => {
      if (record.type === 'income' && !record.creditGranted && !depositCategoryIds.has(record.categoryId || '') && record.category !== 'Depósito en Garantía') {
        const categoryName = record.categoryId && categoryMap.has(record.categoryId) ? categoryMap.get(record.categoryId)! : (record.category || 'Sin Categoría');
        incomeCategoriesMap[categoryName] = (incomeCategoriesMap[categoryName] || 0) + record.amount;
        if (record.clientId) {
          clientValueMap[record.clientId] = (clientValueMap[record.clientId] || 0) + record.amount;
          clientsWithRevenueInPeriod.add(record.clientId);
        }
        if (record.vehicleId) vehicleValueMap[record.vehicleId] = (vehicleValueMap[record.vehicleId] || 0) + record.amount;
      } else if (record.type === 'payment') {
        // Los pagos de crédito sí son entrada de efectivo y deben aparecer en Ingresos.
        const categoryName = record.categoryId && categoryMap.has(record.categoryId) ? categoryMap.get(record.categoryId)! : (record.category || 'Pago de Crédito');
        incomeCategoriesMap[categoryName] = (incomeCategoriesMap[categoryName] || 0) + record.amount;
        if (record.clientId) clientValueMap[record.clientId] = (clientValueMap[record.clientId] || 0) + record.amount;
        if (record.vehicleId) vehicleValueMap[record.vehicleId] = (vehicleValueMap[record.vehicleId] || 0) + record.amount;
      } else if (record.type === 'expense') {
        const categoryName = record.categoryId && categoryMap.has(record.categoryId) ? categoryMap.get(record.categoryId)! : (record.category || 'Sin Categoría');
        expenseCategoriesMap[categoryName] = (expenseCategoriesMap[categoryName] || 0) + record.amount;
        if (record.clientId) clientValueMap[record.clientId] = (clientValueMap[record.clientId] || 0) - record.amount;
        if (record.vehicleId) vehicleValueMap[record.vehicleId] = (vehicleValueMap[record.vehicleId] || 0) - record.amount;
      }
    });

    const profitabilityAnalysis: ClientProfitability[] = (clients || []).map(client => {
      const clientRecords = filteredRecords.filter(r => r.clientId === client.id);
      const revenue = clientRecords.filter(r => r.type === 'income' && !r.creditGranted && !depositCategoryIds.has(r.categoryId || '') && r.category !== 'Depósito en Garantía').reduce((sum, r) => sum + r.amount, 0);
      const expenses = clientRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
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
      const income = sumRentalIncome(monthRecords, depositCategoryIds);
      const expenses = sumExpense(monthRecords);
      const payments = sumPayment(monthRecords);
      return { period: format(date, 'MMM yy', { locale: es }), income, expenses, payments, netFlow: income + payments - expenses };
    });

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : current < 0 ? -100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };
    const daysInPeriod = daysBetweenInclusive(dateRange.from, dateRange.to);
    const prevPeriodStart = subDays(dateRange.from, daysInPeriod);
    const prevPeriodEnd = subDays(dateRange.from, 1);
    const prevMonthRecords = filterRecordsByDateRange(financialRecords, { from: prevPeriodStart, to: prevPeriodEnd });
    const prevMonthIncome = sumRentalIncome(prevMonthRecords, depositCategoryIds);
    const prevMonthPayments = sumPayment(prevMonthRecords);
    const prevMonthCashIncome = prevMonthIncome + prevMonthPayments;
    const prevMonthExpenses = sumExpense(prevMonthRecords);
    const prevMonthProfit = prevMonthIncome - prevMonthExpenses;
    const monthlyGrowth = {
      income: calculateChange(totalCashIncome, prevMonthCashIncome),
      expenses: calculateChange(totalExpenses, prevMonthExpenses),
      profit: calculateChange(totalIncome - totalExpenses, prevMonthProfit),
    };

    const netProfit = totalIncome - totalExpenses;
    const profitMargin = calculateProfitMargin(totalIncome, totalExpenses);
    const avgTransactionValue = calculateAvgTransactionValue(filteredRecords);
    const avgRevenuePerClient = clientsWithRevenueInPeriod.size > 0 ? totalIncome / clientsWithRevenueInPeriod.size : 0;
    const expenseCategories = Object.entries(expenseCategoriesMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const incomeCategories = Object.entries(incomeCategoriesMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const clientMap = new Map((clients || []).map(c => [c.id, `${c.firstname} ${c.lastname}`]));
    const topClients = Object.entries(clientValueMap).map(([id, netValue]) => ({ id, name: clientMap.get(id) || 'Cliente Desconocido', netValue })).sort((a,b) => b.netValue - a.netValue).slice(0, 10);
    const vehicleMap = new Map((vehicles || []).map(v => [v.id, `${v.make} ${v.model} (${v.plate})`]));
    const topVehicles = Object.entries(vehicleValueMap).map(([id, netValue]) => ({ id, name: vehicleMap.get(id) || 'Vehículo Desconocido', netValue })).sort((a,b) => b.netValue - a.netValue).slice(0, 10);

    return { totalIncome, todayIncome, totalCashIncome, todayCashIncome, totalExpenses, todayExpenses, netProfit, profitMargin, avgTransactionValue, avgRevenuePerClient, monthlyGrowth, cashFlowAnalysis, expenseCategories, incomeCategories, topClients, topVehicles, profitabilityAnalysis };
  }, [financialRecords, clients, vehicles, dateRange, financialCategories]);

  return analytics;
};
