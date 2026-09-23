
"use client";

import { useRef } from 'react';
import type { Partner, Vehicle, FinancialRecord } from '@/types';
import { calculatePartnerProfitability, calculateProfitMargin, getPartnerFinancialRecords } from '@/lib/financial-metrics';

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
  if (!ref.current || JSON.stringify(ref.current.deps) !== depsString) ref.current = { deps, value: factory() };
  return ref.current.value;
};

export const usePartnerAnalytics = (
  partners: Partner[],
  vehicles: Vehicle[],
  financialRecords: FinancialRecord[]
) => {
  const partnerMetrics = useMemoDeep(() => {
    if (!partners || !vehicles || !financialRecords) return [];

    const metrics: PartnerMetric[] = partners.map(partner => {
      const partnerVehicles = vehicles.filter(v => v.partnerId === partner.id && !v.isDeleted);
      const recordsForPartner = getPartnerFinancialRecords(partner, partnerVehicles, financialRecords);

      const profitability = calculatePartnerProfitability(partnerVehicles, recordsForPartner);
      const totalIncome = profitability.totalIncome;
      const totalExpenses = profitability.totalExpenses;
      const netProfit = profitability.netProfit;
      const profitMargin = calculateProfitMargin(totalIncome, totalExpenses);

      let performanceLevel: PartnerMetric['performanceLevel'];
      if (netProfit > 5000) performanceLevel = 'Excelente';
      else if (netProfit > 1000) performanceLevel = 'Bueno';
      else if (netProfit >= 0) performanceLevel = 'Regular';
      else performanceLevel = 'Bajo';

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
