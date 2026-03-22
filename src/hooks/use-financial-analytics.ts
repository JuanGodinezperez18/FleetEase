// hooks/use-financial-analytics.ts
"use client";

import { useMemo } from 'react';
import type { FinancialRecord, Client, Vehicle, Partner } from '@/types';
import { startOfMonth, endOfMonth, subMonths, isWithinInterval, format, differenceInDays, subDays, startOfDay, endOfDay } from 'date-fns';
import { infallibleNormalizeDate } from '@/lib/date-utils';
import { es } from 'date-fns/locale';

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
  // Overall Metrics
  totalIncome: number;
  todayIncome: number;
  totalExpenses: number;
  todayExpenses: number;
  netProfit: number;
  profitMargin: number;
  avgTransactionValue: number;
  avgRevenuePerClient: number;

  // Growth & Trends
  monthlyGrowth: {
    income: number;
    profit: number;
    expenses: number;
  };
  cashFlowAnalysis: MonthlyCashFlow[];

  // Categorical Analysis
  expenseCategories: { name: string; value: number; }[];
  incomeCategories: { name: string; value: number; }[];

  // Top Performers
  topClients: { id: string; name: string; netValue: number; }[];
  topVehicles: { id: string; name: string; netValue: number; }[];

  // Detailed Analysis
  profitabilityAnalysis: ClientProfitability[];
};

export const useFinancialAnalytics = (
  financialRecords: FinancialRecord[],
  clients: Client[],
  vehicles: Vehicle[],
  partners: Partner[],
  dateRange?: { from?: Date; to?: Date },
  financialCategories?: any[]
): FinancialAnalytics => {

  const analytics = useMemo(() => {
    const now = new Date();
    
    const defaultAnalytics: FinancialAnalytics = {
        totalIncome: 0, todayIncome: 0, totalExpenses: 0, todayExpenses: 0, netProfit: 0, profitMargin: 0,
        avgTransactionValue: 0, avgRevenuePerClient: 0,
        monthlyGrowth: { income: 0, profit: 0, expenses: 0 },
        cashFlowAnalysis: [], expenseCategories: [], incomeCategories: [],
        topClients: [], topVehicles: [], profitabilityAnalysis: []
    };
    
    if (!dateRange || !dateRange.from || !dateRange.to) {
      return defaultAnalytics;
    }
    
    const filteredRecords = financialRecords
      ? financialRecords.filter(r => {
          if (r.isDeleted) return false;
          const recordDate = infallibleNormalizeDate(r.date);
          if (!recordDate) return false;
          return isWithinInterval(recordDate, {
            start: dateRange.from!,
            end: dateRange.to!
          });
        })
      : [];
      
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const todayRecords = filteredRecords.filter(r => {
        const recordDate = infallibleNormalizeDate(r.date);
        return recordDate && isWithinInterval(recordDate, { start: todayStart, end: todayEnd });
    });
    
    const todayIncome = todayRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
    const todayExpenses = todayRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);

    const totalIncome = filteredRecords
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);

    const totalExpenses = filteredRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);

    // Crear mapa de categorías para búsqueda rápida
    const categoryMap = new Map<string, string>();
    if (financialCategories) {
      financialCategories.forEach(cat => {
        categoryMap.set(cat.id, cat.name);
      });
    }

    const expenseCategoriesMap: Record<string, number> = {};
    const incomeCategoriesMap: Record<string, number> = {};
    const clientValueMap: Record<string, number> = {};
    const vehicleValueMap: Record<string, number> = {};

    const activeClientsCount = clients ? clients.filter(c => c.status === 'active' && !c.isDeleted).length : 0;

    filteredRecords.forEach(record => {
      if (record.type === 'income') {
        // Usar categoryId para obtener el nombre actualizado de la categoría
        const categoryName = record.categoryId && categoryMap.has(record.categoryId)
          ? categoryMap.get(record.categoryId)!
          : (record.category || 'Sin Categoría');
        incomeCategoriesMap[categoryName] = (incomeCategoriesMap[categoryName] || 0) + record.amount;

        if (record.clientId) {
          clientValueMap[record.clientId] = (clientValueMap[record.clientId] || 0) + record.amount;
        }
        if (record.vehicleId) {
          vehicleValueMap[record.vehicleId] = (vehicleValueMap[record.vehicleId] || 0) + record.amount;
        }

      } else if (record.type === 'payment') {
        // Los pagos también cuentan para el valor neto de clientes y vehículos
        if (record.clientId) {
          clientValueMap[record.clientId] = (clientValueMap[record.clientId] || 0) + record.amount;
        }
        if (record.vehicleId) {
          vehicleValueMap[record.vehicleId] = (vehicleValueMap[record.vehicleId] || 0) + record.amount;
        }

      } else if (record.type === 'expense') {
        // Usar categoryId para obtener el nombre actualizado de la categoría
        const categoryName = record.categoryId && categoryMap.has(record.categoryId)
          ? categoryMap.get(record.categoryId)!
          : (record.category || 'Sin Categoría');
        expenseCategoriesMap[categoryName] = (expenseCategoriesMap[categoryName] || 0) + record.amount;

        if (record.clientId) {
          clientValueMap[record.clientId] = (clientValueMap[record.clientId] || 0) - record.amount;
        }
        if (record.vehicleId) {
          vehicleValueMap[record.vehicleId] = (vehicleValueMap[record.vehicleId] || 0) - record.amount;
        }
      }
    });

    const profitabilityAnalysis: ClientProfitability[] = (clients || []).map(client => {
        const clientRecords = filteredRecords.filter(r => r.clientId === client.id);
        
        const revenue = clientRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
        const expenses = clientRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
        const netProfit = revenue - expenses;
        const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
        
        let level: ProfitabilityLevel;
        if (netProfit <= 0) {
            level = 'negative';
        } else if (profitMargin > 25) {
            level = 'high';
        } else if (profitMargin > 10) {
            level = 'medium';
        } else {
            level = 'low';
        }
        
        return { clientId: client.id, clientName: `${client.firstname} ${client.lastname}`, revenue, expenses, netProfit, profitMargin, level };
    }).sort((a, b) => b.netProfit - a.netProfit);

    const cashFlowAnalysis: MonthlyCashFlow[] = Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(now, 11 - i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthRecords = financialRecords.filter(r => {
        const recordDate = infallibleNormalizeDate(r.date);
        return recordDate && isWithinInterval(recordDate, { start: monthStart, end: monthEnd });
      });
      
      const income = monthRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
      const expenses = monthRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
      const payments = monthRecords.filter(r => r.type === 'payment').reduce((sum, r) => sum + r.amount, 0);
      
      return {
        period: format(date, 'MMM yy', { locale: es }),
        income,
        expenses,
        payments,
        netFlow: income - expenses,
      };
    });

    const calculateChange = (current: number, previous: number) => {
        if(previous === 0) {
          if (current > 0) return 100;
          if (current < 0) return -100;
          return 0;
        }
        return ((current - previous) / Math.abs(previous)) * 100;
    };
    
    const daysInPeriod = differenceInDays(dateRange.to, dateRange.from) + 1;
    const prevPeriodStart = subDays(dateRange.from, daysInPeriod);
    const prevPeriodEnd = subDays(dateRange.from, 1);
    
    const prevMonthRecords = financialRecords.filter(r => {
        const recordDate = infallibleNormalizeDate(r.date);
        return recordDate ? isWithinInterval(recordDate, {start: prevPeriodStart, end: prevPeriodEnd}) : false;
    });
    
    const prevMonthIncome = prevMonthRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0);
    const prevMonthExpenses = prevMonthRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0);
    const prevMonthProfit = prevMonthIncome - prevMonthExpenses;

    const monthlyGrowth = {
      income: calculateChange(totalIncome, prevMonthIncome),
      expenses: calculateChange(totalExpenses, prevMonthExpenses),
      profit: calculateChange(totalIncome - totalExpenses, prevMonthProfit),
    };


    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
    const avgTransactionValue = financialRecords.length > 0 ? (totalIncome + totalExpenses) / financialRecords.length : 0;
    const avgRevenuePerClient = activeClientsCount > 0 ? totalIncome / activeClientsCount : 0;

    const expenseCategories = Object.entries(expenseCategoriesMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    const incomeCategories = Object.entries(incomeCategoriesMap).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

    const clientMap = new Map((clients || []).map(c => [c.id, `${c.firstname} ${c.lastname}`]));
    const topClients = Object.entries(clientValueMap).map(([id, netValue]) => ({
      id,
      name: clientMap.get(id) || 'Cliente Desconocido',
      netValue
    })).sort((a,b) => b.netValue - a.netValue).slice(0, 10);

    const vehicleMap = new Map((vehicles || []).map(v => [v.id, `${v.make} ${v.model} (${v.plate})`]));
    const topVehicles = Object.entries(vehicleValueMap).map(([id, netValue]) => ({
      id,
      name: vehicleMap.get(id) || 'Vehículo Desconocido',
      netValue
    })).sort((a,b) => b.netValue - a.netValue).slice(0, 10);

    return {
      totalIncome,
      todayIncome,
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
      profitabilityAnalysis
    };
  }, [financialRecords, clients, vehicles, dateRange, financialCategories]);

  return analytics;
};
