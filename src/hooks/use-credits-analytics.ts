
"use client";

import { useMemo } from 'react';
import type { Credit, Client, Vehicle, FinancialRecord } from '@/types';
import { infallibleNormalizeDate } from '@/lib/date-utils';
import { differenceInWeeks, addWeeks } from 'date-fns';


export type CreditMetric = {
  // Core Identifiers
  creditId: string;
  clientId: string;
  vehicleId: string;

  // Financial Status
  totalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  progressPercentage: number;

  // Payment Behavior Analysis
  paymentsMade: number;
  paymentsTotal: number;
  weeksSinceStart: number;
  expectedPayments: number;
  weeksOverdue: number;
  paymentBehavior: 'Puntual' | 'Ligero Retraso' | 'Retraso Severo';
  
  // Predictive Metrics
  estimatedCompletionDate: Date | null;

  // Alerts & Recommendations
  alerts: string[];
  
  // NEW: Validation fields
  recordedPayments?: number; // Suma de pagos en financialRecords
  paymentDiscrepancy?: boolean; // Si hay diferencia entre credit.paidAmount y suma de records
};

export type PortfolioAnalytics = {
    totalPortfolioValue: number;
    totalPaid: number;
    totalRemaining: number;
    portfolioHealthScore: number; // 0-100
    behaviorDistribution: {
        puntual: number;
        ligeroRetraso: number;
        retrasoSevero: number;
    };
    // NEW: Portfolio-level validation
    totalDiscrepancies?: number;
};

export const useCreditAnalytics = (
  credits: Credit[],
  clients: Client[],
  vehicles: Vehicle[],
  financialRecords: FinancialRecord[]
) => {
  const activeCredits = useMemo(() => credits.filter(c => c.status === 'active' && !c.isDeleted), [credits]);

  const creditPaymentsMap = useMemo(() => {
    const map = new Map<string, number>();
    
    financialRecords
      .filter(record => 
        record.type === 'payment' &&
        record.creditId && 
        !record.isDeleted &&
        record.creditPayment === true
      )
      .forEach(record => {
        const currentSum = map.get(record.creditId!) || 0;
        map.set(record.creditId!, currentSum + record.amount);
      });
    
    return map;
  }, [financialRecords]);

  const creditMetrics: CreditMetric[] = useMemo(() => {
    if (!activeCredits) return [];
    
    const metrics = activeCredits.map(credit => {
      const startDate = infallibleNormalizeDate(credit.startDate);
      if (!startDate) {
        // Return a default/error state for credits with invalid dates
        return {
          creditId: credit.id,
          clientId: credit.clientId,
          vehicleId: credit.vehicleId,
          totalAmount: credit.totalAmount,
          paidAmount: credit.paidAmount,
          remainingBalance: credit.remainingBalance,
          progressPercentage: credit.totalAmount > 0 ? (credit.paidAmount / credit.totalAmount) * 100 : 0,
          paymentsMade: credit.paymentsMade,
          paymentsTotal: credit.numberOfPayments,
          weeksSinceStart: 0,
          expectedPayments: 0,
          weeksOverdue: 0,
          paymentBehavior: 'Retraso Severo' as const,
          estimatedCompletionDate: null,
          alerts: ['Fecha de inicio inválida'],
          recordedPayments: 0,
          paymentDiscrepancy: false,
        };
      }

      const weeksSinceStart = differenceInWeeks(new Date(), startDate);
      const expectedPayments = Math.max(0, weeksSinceStart);
      const paymentsMade = credit.paymentsMade || 0;
      const weeksOverdue = Math.max(0, expectedPayments - paymentsMade);
      
      let paymentBehavior: CreditMetric['paymentBehavior'];
      if (weeksOverdue === 0) {
        paymentBehavior = 'Puntual';
      } else if (weeksOverdue <= 4) {
        paymentBehavior = 'Ligero Retraso';
      } else {
        paymentBehavior = 'Retraso Severo';
      }

      const paymentsRemaining = credit.numberOfPayments - paymentsMade;
      const estimatedCompletionDate = paymentsRemaining > 0 
        ? addWeeks(new Date(), paymentsRemaining) 
        : null;

      const alerts: string[] = [];
      if (paymentBehavior === 'Retraso Severo') {
        alerts.push(`Crédito con ${weeksOverdue} semanas de atraso.`);
      }
      if (credit.remainingBalance > 0 && credit.status === 'completed') {
        alerts.push("Crédito marcado como completado pero aún tiene saldo.");
      }

      // NEW: Validación cruzada con registros financieros
      const recordedPayments = creditPaymentsMap.get(credit.id) || 0;
      const paymentDiscrepancy = Math.abs(credit.paidAmount - recordedPayments) > 0.01; // Tolerancia de 1 centavo
      
      if (paymentDiscrepancy) {
        alerts.push(`⚠️ Discrepancia: Crédito reporta $${credit.paidAmount.toFixed(2)} pero registros suman $${recordedPayments.toFixed(2)}`);
      }

      return {
        creditId: credit.id,
        clientId: credit.clientId,
        vehicleId: credit.vehicleId,
        totalAmount: credit.totalAmount,
        paidAmount: credit.paidAmount,
        remainingBalance: credit.remainingBalance,
        progressPercentage: credit.totalAmount > 0 ? (credit.paidAmount / credit.totalAmount) * 100 : 0,
        paymentsMade: paymentsMade,
        paymentsTotal: credit.numberOfPayments,
        weeksSinceStart: weeksSinceStart,
        expectedPayments: expectedPayments,
        weeksOverdue: weeksOverdue,
        paymentBehavior,
        estimatedCompletionDate,
        alerts,
        recordedPayments,
        paymentDiscrepancy,
      };
    });

    return metrics;
  }, [activeCredits, creditPaymentsMap]);
  
  const portfolioAnalytics: PortfolioAnalytics = useMemo(() => {
    const totalPortfolioValue = creditMetrics.reduce((sum, m) => sum + m.totalAmount, 0);
    const totalPaid = creditMetrics.reduce((sum, m) => sum + m.paidAmount, 0);
    const totalRemaining = creditMetrics.reduce((sum, m) => sum + m.remainingBalance, 0);
    
    const behaviorCounts = creditMetrics.reduce((acc, metric) => {
        if(metric.paymentBehavior === 'Puntual') acc.puntual++;
        else if(metric.paymentBehavior === 'Ligero Retraso') acc.ligeroRetraso++;
        else acc.retrasoSevero++;
        return acc;
    }, { puntual: 0, ligeroRetraso: 0, retrasoSevero: 0 });

    const totalCredits = creditMetrics.length;
    let healthScore = 0;
    if (totalCredits > 0) {
        const punctualWeight = 100;
        const lightDelayWeight = 50;
        const severeDelayWeight = 0;

        const weightedSum = (behaviorCounts.puntual * punctualWeight) + 
                            (behaviorCounts.ligeroRetraso * lightDelayWeight) + 
                            (behaviorCounts.retrasoSevero * severeDelayWeight);
        
        healthScore = weightedSum / totalCredits;
    }

    // NEW: Contar discrepancias
    const totalDiscrepancies = creditMetrics.filter(m => m.paymentDiscrepancy).length;

    return {
      totalPortfolioValue,
      totalPaid,
      totalRemaining,
      portfolioHealthScore: Math.round(healthScore),
      behaviorDistribution: behaviorCounts,
      totalDiscrepancies,
    };
  }, [creditMetrics]);

  return { creditMetrics, portfolioAnalytics };
};
