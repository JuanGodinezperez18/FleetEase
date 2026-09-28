"use client";

import { useMemo, useState, useEffect } from 'react';
import type { Client, FinancialRecord, Vehicle } from '@/types';
import { infallibleNormalizeDate } from '@/lib/date-utils';
import { calculateClientBalance, DRIVER_PAYMENT_CATEGORY } from '@/lib/financial-metrics';
import { differenceInDays } from 'date-fns';

const SECURITY_DEPOSIT_CATEGORY = 'Depósito en Garantía';

export type ClientMetric = {
  clientId: string;
  totalTransactions: number;
  totalIncome: number;
  totalPayments: number;
  currentBalance: number;
  avgTransactionValue: number;
  paymentFrequencyDays: number | null;
  daysSinceLastPayment: number | null;
  paymentBehavior: 'Excelente' | 'Bueno' | 'Regular' | 'Malo' | 'Crítico';
  activityLevel: 'Alto' | 'Medio' | 'Bajo' | 'Inactivo';
  licenseStatus: 'Vigente' | 'Próxima a Vencer' | 'Vencida' | 'N/A';
  daysUntilLicenseExpiry: number | null;
  alerts: string[];
  recommendations: string[];
};

export const useClientAnalytics = (
  clients: Client[],
  financialRecords: FinancialRecord[],
  vehicles: Vehicle[]
) => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const clientMetrics: ClientMetric[] = useMemo(() => {
    if (!clients || !financialRecords || !vehicles) return [];

    const recordsByClient = new Map<string, FinancialRecord[]>();
    financialRecords.forEach(r => {
      if (r.clientId && !r.isDeleted) {
        if (!recordsByClient.has(r.clientId)) recordsByClient.set(r.clientId, []);
        recordsByClient.get(r.clientId)!.push(r);
      }
    });

    return clients.map(client => {
      const clientRecords = recordsByClient.get(client.id) || [];
      // A security deposit is held money, not an account receivable.
      // It remains visible in the transaction history but never contributes to debt KPIs.
      let totalIncome = 0;
      let totalPayments = 0;
      let balanceRecordCount = 0;
      let latestRecordDate: Date | null = null;
      let earliestPaymentDate: Date | null = null;
      let latestPaymentDate: Date | null = null;
      let paymentCount = 0;

      for (const record of clientRecords) {
        const recordDate = infallibleNormalizeDate(record.date);
        if (recordDate && (!latestRecordDate || recordDate.getTime() > latestRecordDate.getTime())) {
          latestRecordDate = recordDate;
        }
        if (record.category === SECURITY_DEPOSIT_CATEGORY) continue;

        balanceRecordCount++;
        if (record.type === 'income') totalIncome += record.amount;
        if (record.type === 'payment' || (record.type === 'expense' && record.category === DRIVER_PAYMENT_CATEGORY)) {
          totalPayments += record.amount;
          if (recordDate) {
            paymentCount++;
            if (!earliestPaymentDate || recordDate.getTime() < earliestPaymentDate.getTime()) earliestPaymentDate = recordDate;
            if (!latestPaymentDate || recordDate.getTime() > latestPaymentDate.getTime()) latestPaymentDate = recordDate;
          }
        }
      }

      const totalTransactions = clientRecords.length;
      const currentBalance = (client.initialBalance || 0) + totalIncome - totalPayments;
      const avgTransactionValue = balanceRecordCount > 0
        ? (totalIncome + totalPayments) / balanceRecordCount
        : 0;

      let paymentFrequencyDays: number | null = null;
      if (paymentCount > 1 && earliestPaymentDate && latestPaymentDate) {
        const totalTimeSpan = differenceInDays(latestPaymentDate, earliestPaymentDate);
        paymentFrequencyDays = totalTimeSpan > 0 ? totalTimeSpan / (paymentCount - 1) : 0;
      }

      const lastPaymentDate = latestPaymentDate;
      const daysSinceLastPayment = hydrated && lastPaymentDate ? differenceInDays(new Date(), lastPaymentDate) : null;
      const lastActivityDate = latestRecordDate;
      const daysSinceLastActivity = hydrated && lastActivityDate ? differenceInDays(new Date(), lastActivityDate) : null;

      let paymentBehavior: ClientMetric['paymentBehavior'] = 'Regular';
      if (currentBalance > 0 && daysSinceLastPayment !== null) {
        if (daysSinceLastPayment <= 7) paymentBehavior = 'Bueno';
        else if (daysSinceLastPayment <= 14) paymentBehavior = 'Regular';
        else if (daysSinceLastPayment <= 30) paymentBehavior = 'Malo';
        else paymentBehavior = 'Crítico';
      } else if (currentBalance <= 0) {
        paymentBehavior = 'Excelente';
      } else if (balanceRecordCount > 0) {
        paymentBehavior = 'Malo';
      }

      let activityLevel: ClientMetric['activityLevel'] = 'Bajo';
      if (client.status === 'inactive' || client.isDeleted || (daysSinceLastActivity !== null && daysSinceLastActivity > 30)) {
        activityLevel = 'Inactivo';
      } else if (totalTransactions > 20) {
        activityLevel = 'Alto';
      } else if (totalTransactions > 5) {
        activityLevel = 'Medio';
      }

      let licenseStatus: ClientMetric['licenseStatus'] = 'N/A';
      let daysUntilLicenseExpiry: number | null = null;
      if (client.licenseExpiry) {
        const expiryDate = infallibleNormalizeDate(client.licenseExpiry);
        if (expiryDate) {
          daysUntilLicenseExpiry = hydrated ? differenceInDays(expiryDate, new Date()) : null;
          if (daysUntilLicenseExpiry !== null) {
            if (daysUntilLicenseExpiry < 0) licenseStatus = 'Vencida';
            else if (daysUntilLicenseExpiry <= 30) licenseStatus = 'Próxima a Vencer';
            else licenseStatus = 'Vigente';
          }
        }
      }

      const alerts: string[] = [];
      const recommendations: string[] = [];
      if (licenseStatus === 'Vencida') alerts.push('Licencia Vencida');
      if (paymentBehavior === 'Crítico') alerts.push('Comportamiento de Pago Crítico');
      if (currentBalance > 10000) {
        alerts.push('Saldo Deudor Elevado');
        recommendations.push('Contactar al cliente para plan de pagos.');
      }
      if (activityLevel === 'Inactivo' && currentBalance > 0) {
        recommendations.push('Cliente inactivo con saldo pendiente. Iniciar proceso de cobranza.');
      }

      return {
        clientId: client.id,
        totalTransactions,
        totalIncome,
        totalPayments,
        currentBalance,
        avgTransactionValue,
        paymentFrequencyDays,
        daysSinceLastPayment,
        paymentBehavior,
        activityLevel,
        licenseStatus,
        daysUntilLicenseExpiry,
        alerts,
        recommendations,
      };
    });
  }, [clients, financialRecords, vehicles, hydrated]);

  return { clientMetrics };
};
