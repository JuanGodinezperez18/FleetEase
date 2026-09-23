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
  sumVehicleSales,
  sumVehicleSalesCost,
  sumExpense,
  daysBetweenInclusive,
  categoryIdsByAffects,
  calculateCashFlowBreakdown,
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
  vehicleSales: number;
  vehicleSalesCost: number;
  vehicleSalesGrossProfit: number;
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
      totalIncome: 0, operationalIncome: 0, vehicleSales: 0, vehicleSalesCost: 0, vehicleSalesGrossProfit: 0,
      customerCollections: 0, creditCollections: 0, securityDeposits: 0, partnerPayments: 0, supplierPayments: 0, otherPayments: 0,
      cashInflow: 0, cashOutflow: 0, netCashFlow: 0, creditGranted: 0, creditRecovered: 0,
      todayIncome: 0, totalExpenses: 0, todayExpenses: 0, netProfit: 0, profitMargin: 0,
      avgTransactionValue: 0, avgRevenuePerClient: 0,
      monthlyGrowth: { income: 0, profit: 0, expenses: 0 }, cashFlowAnalysis: [],
      expenseCategories: [], incomeCategories: [], topClients: [], topVehicles: [], profitabilityAnalysis: [],
    };

    if (!dateRange?.from || !dateRange.to) return defaultAnalytics;

    const filteredRecords = filterRecordsByDateRange(financialRecords, { from: dateRange.from, to: dateRange.to });
    const todayRecords = filterRecordsByDateRange(filteredRecords, { from: startOfDay(now), to: endOfDay(now) });
    const depositCategoryIds = categoryIdsByAffects(financialCategories, 'security_deposit');
    const refundDepositCategoryIds = new Set((financialCategories ?? []).filter(cat => cat.type === 'expense' && cat.name.trim().toLowerCase() === 'devolución de depósito').map(cat => cat.id));
    const isDepositRefund = (r: FinancialRecord) => r.type === 'expense' && (r.category === 'Devolución de Depósito' || (!!r.categoryId && refundDepositCategoryIds.has(r.categoryId)));
    const categoryMap = new Map<string, string>();
    financialCategories?.forEach(cat => categoryMap.set(cat.id, cat.name));

    const operationalIncome = sumRentalIncome(filteredRecords, depositCategoryIds);
    const todayOperationalIncome = sumRentalIncome(todayRecords, depositCategoryIds);
    const vehicleSales = sumVehicleSales(filteredRecords);
    const todayVehicleSales = sumVehicleSales(todayRecords);
    const vehicleSalesCost = sumVehicleSalesCost(filteredRecords, vehicles);
    const vehicleSalesGrossProfit = vehicleSales - vehicleSalesCost;
    const totalExpenses = sumExpense(filteredRecords.filter(r => !isDepositRefund(r)));
    const todayExpenses = sumExpense(todayRecords.filter(r => !isDepositRefund(r)));

    const securityDeposits = filteredRecords
      .filter(r => r.type === 'income' && (r.category === 'Depósito en Garantía' || (!!r.categoryId && depositCategoryIds.has(r.categoryId))))
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    const creditGranted = vehicleSales;

    const categoryMap = new Map<string, string>();
    financialCategories?.forEach(cat => categoryMap.set(cat.id, cat.name));
    const cashFlow = calculateCashFlowBreakdown(
      filteredRecords,
      categoryMap,
      depositCategoryIds,
      refundDepositCategoryIds,
    );

    const customerCollections = cashFlow.customerCollections;
    const creditCollections = cashFlow.creditCollections;
    const partnerPayments = cashFlow.partnerPayments;
    const supplierPayments = cashFlow.supplierPayments;
    const otherPayments = cashFlow.otherPayments;

    const totalIncome = operationalIncome + vehicleSales;
    // Un pago de multa es una cobranza de efectivo de un cliente: aumenta caja,
    // pero no es ingreso operativo ni utilidad. La salida a la autoridad se registra
    // por separado como gasto/pago cuando la empresa liquida la multa.
    const { cashInflow, cashOutflow, netCashFlow } = cashFlow;
    const creditRecovered = creditCollections;
    const netProfit = operationalIncome + vehicleSalesGrossProfit - totalExpenses;
    const profitMargin = calculateProfitMargin(totalIncome, vehicleSalesCost + totalExpenses);

    const expenseCategoriesMap: Record<string, number> = {};
    const incomeCategoriesMap: Record<string, number> = {};
    const clientValueMap: Record<string, number> = {};
    const vehicleValueMap: Record<string, number> = {};
    const clientsWithRevenueInPeriod = new Set<string>();

    filteredRecords.forEach(record => {
      if (record.type === 'income' && record.creditGranted === true) {
        const amount = Number(record.amount || 0);
        const categoryName = 'Venta de Vehículo Financiada';
        incomeCategoriesMap[categoryName] = (incomeCategoriesMap[categoryName] || 0) + amount;
        if (record.clientId) {
          clientValueMap[record.clientId] = (clientValueMap[record.clientId] || 0) + amount;
          clientsWithRevenueInPeriod.add(record.clientId);
        }
        if (record.vehicleId) vehicleValueMap[record.vehicleId] = (vehicleValueMap[record.vehicleId] || 0) + amount;
      } else if (record.type === 'income' && !depositCategoryIds.has(record.categoryId || '') && record.category !== 'Depósito en Garantía') {
        const categoryName = normalizedCategory(record, categoryMap) || 'Sin Categoría';
        const amount = Number(record.amount || 0);
        incomeCategoriesMap[categoryName] = (incomeCategoriesMap[categoryName] || 0) + amount;
        if (record.clientId) {
          clientValueMap[record.clientId] = (clientValueMap[record.clientId] || 0) + amount;
          clientsWithRevenueInPeriod.add(record.clientId);
        }
        if (record.vehicleId) vehicleValueMap[record.vehicleId] = (vehicleValueMap[record.vehicleId] || 0) + amount;
      } else if (record.type === 'expense' && !isDepositRefund(record)) {
        const categoryName = normalizedCategory(record, categoryMap) || 'Sin Categoría';
        const amount = Number(record.amount || 0);
        expenseCategoriesMap[categoryName] = (expenseCategoriesMap[categoryName] || 0) + amount;
        if (record.clientId) clientValueMap[record.clientId] = (clientValueMap[record.clientId] || 0) - amount;
        if (record.vehicleId) vehicleValueMap[record.vehicleId] = (vehicleValueMap[record.vehicleId] || 0) - amount;
      }
    });

    const profitabilityAnalysis: ClientProfitability[] = (clients || []).map(client => {
      const clientRecords = filteredRecords.filter(r => r.clientId === client.id);
      const financedSales = clientRecords.filter(r => r.type === 'income' && r.creditGranted === true);
      const revenue = clientRecords
        .filter(r => r.type === 'income' && !depositCategoryIds.has(r.categoryId || '') && r.category !== 'Depósito en Garantía')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const operatingExpenses = clientRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + Number(r.amount || 0), 0);
      const financedSaleCosts = sumVehicleSalesCost(clientRecords, vehicles);
      const expenses = operatingExpenses + financedSaleCosts;
      const netProfit = revenue - expenses;
      const profitMargin = calculateProfitMargin(revenue, expenses);
      const level: ProfitabilityLevel = netProfit <= 0 ? 'negative' : profitMargin > 25 ? 'high' : profitMargin > 10 ? 'medium' : 'low';
      return { clientId: client.id, clientName: `${client.firstname} ${client.lastname}`, revenue, expenses, netProfit, profitMargin, level };
    }).sort((a, b) => b.netProfit - a.netProfit);

    const cashFlowAnalysis: MonthlyCashFlow[] = Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(now, 11 - i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthRecords = filterRecordsByDateRange(financialRecords, { from: monthStart, to: monthEnd });
      const monthOperationalIncome = sumRentalIncome(monthRecords, depositCategoryIds);
      const monthVehicleSales = sumVehicleSales(monthRecords);
      const monthIncome = monthOperationalIncome + monthVehicleSales;
      const monthExpenses = sumExpense(monthRecords.filter(r => !isDepositRefund(r)));
      const monthCategoryMap = new Map<string, string>();
      financialCategories?.forEach(cat => monthCategoryMap.set(cat.id, cat.name));
      const monthCashFlow = calculateCashFlowBreakdown(
        monthRecords,
        monthCategoryMap,
        depositCategoryIds,
        refundDepositCategoryIds,
      );

      return { period: format(date, 'MMM yy', { locale: es }), income: monthIncome, expenses: monthExpenses, payments: monthCashFlow.customerCollections + monthCashFlow.creditCollections, netFlow: monthCashFlow.netCashFlow };
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
    const prevMonthVehicleSales = sumVehicleSales(prevMonthRecords);
    const prevMonthIncome = prevMonthOperationalIncome + prevMonthVehicleSales;
    const prevMonthVehicleSalesCost = sumVehicleSalesCost(prevMonthRecords, vehicles);
    const prevMonthExpenses = sumExpense(prevMonthRecords.filter(r => !isDepositRefund(r)));
    const prevMonthProfit = prevMonthOperationalIncome + (prevMonthVehicleSales - prevMonthVehicleSalesCost) - prevMonthExpenses;
    const monthlyGrowth = {
      income: calculateChange(totalIncome, prevMonthIncome),
      expenses: calculateChange(totalExpenses, prevMonthExpenses),
      profit: calculateChange(netProfit, prevMonthProfit),
    };

    const avgTransactionValue = calculateAvgTransactionValue(filteredRecords);
    const avgRevenuePerClient = clientsWithRevenueInPeriod.size > 0 ? totalIncome / clientsWithRevenueInPeriod.size : 0;
    const expenseCategories = Object.entries(expenseCategoriesMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const incomeCategories = Object.entries(incomeCategoriesMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const clientMap = new Map((clients || []).map(c => [c.id, `${c.firstname} ${c.lastname}`]));
    const topClients = Object.entries(clientValueMap).map(([id, netValue]) => ({ id, name: clientMap.get(id) || 'Cliente Desconocido', netValue })).sort((a,b) => b.netValue - a.netValue).slice(0, 10);
    const vehicleMap = new Map((vehicles || []).map(v => [v.id, `${v.make} ${v.model} (${v.plate})`]));
    const topVehicles = Object.entries(vehicleValueMap).map(([id, netValue]) => ({ id, name: vehicleMap.get(id) || 'Vehículo Desconocido', netValue })).sort((a,b) => b.netValue - a.netValue).slice(0, 10);

    return {
      totalIncome, operationalIncome, vehicleSales, vehicleSalesCost, vehicleSalesGrossProfit,
      customerCollections, creditCollections, securityDeposits, partnerPayments, supplierPayments, otherPayments,
      cashInflow, cashOutflow, netCashFlow, creditGranted, creditRecovered,
      todayIncome: todayOperationalIncome + todayVehicleSales, totalExpenses, todayExpenses,
      netProfit, profitMargin, avgTransactionValue, avgRevenuePerClient, monthlyGrowth,
      cashFlowAnalysis, expenseCategories, incomeCategories, topClients, topVehicles, profitabilityAnalysis,
    };
  }, [financialRecords, clients, vehicles, partners, dateRange, financialCategories]);

  return analytics;
};
