
"use client";

import { useMemo, useRef, useState, useEffect } from 'react';
import type { Partner, Vehicle, FinancialRecord } from '@/types';
import { infallibleNormalizeDate } from '@/lib/date-utils';

const PARTNER_PAYMENT_CATEGORY = "Pago a Socio";

export type PartnerMetric = {
  partnerId: string;
  partnerName: string;
  vehicleCount: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  performanceLevel: 'Excelente' | 'Bueno' | 'Regular' | 'Bajo';
};

const useMemoDeep = <T,>(factory: () => T, deps: any[]): T => {
    const ref = useRef<{ deps: any[], value: T } | undefined>(undefined);
    const depsString = JSON.stringify(deps);

    if (!ref.current || JSON.stringify(ref.current.deps) !== depsString) {
      ref.current = { deps, value: factory() };
    }

    return ref.current.value;
};


export const usePartnerAnalytics = (
  partners: Partner[],
  vehicles: Vehicle[],
  financialRecords: FinancialRecord[]
) => {
  const partnerMetrics = useMemoDeep(() => {
    if (!partners || !vehicles || !financialRecords) {
      return [];
    }

    const metrics: PartnerMetric[] = partners.map(partner => {
      const partnerVehicles = vehicles.filter(v => v.partnerId === partner.id && !v.isDeleted);
      const partnerVehicleIds = new Set(partnerVehicles.map(v => v.id));

      const recordsForPartner = financialRecords.filter(
        record => (partnerVehicleIds.has(record.vehicleId || '')) && !record.isDeleted
      );

      const totalIncome = recordsForPartner
        .filter(r => r.type === 'income')
        .reduce((sum, r) => sum + r.amount, 0);
      
      const totalExpenses = recordsForPartner
        .filter(r => r.type === 'expense' && r.category !== PARTNER_PAYMENT_CATEGORY)
        .reduce((sum, r) => sum + r.amount, 0);
      
      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : (netProfit < 0 ? -100 : 0);

      let performanceLevel: PartnerMetric['performanceLevel'];
      if (netProfit > 5000) {
        performanceLevel = 'Excelente';
      } else if (netProfit > 1000) {
        performanceLevel = 'Bueno';
      } else if (netProfit >= 0) {
        performanceLevel = 'Regular';
      } else {
        performanceLevel = 'Bajo';
      }

      return {
        partnerId: partner.id,
        partnerName: `${partner.firstname} ${partner.lastname}`,
        vehicleCount: partnerVehicles.length,
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin,
        performanceLevel,
      };
    });

    return metrics.sort((a,b) => b.netProfit - a.netProfit);
  }, [partners, vehicles, financialRecords]);

  return { partnerMetrics };
};
