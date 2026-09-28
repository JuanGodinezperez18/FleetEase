
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

    const vehiclesByPartner = new Map<string, Vehicle[]>();
    for (const vehicle of vehicles) {
      if (vehicle.isDeleted || !vehicle.partnerId) continue;
      const list = vehiclesByPartner.get(vehicle.partnerId);
      if (list) list.push(vehicle);
      else vehiclesByPartner.set(vehicle.partnerId, [vehicle]);
    }

    const activeRecords = financialRecords.filter(record => !record.isDeleted);
    const recordsByPartner = new Map<string, FinancialRecord[]>();
    const recordsByVehicle = new Map<string, FinancialRecord[]>();

    for (const record of activeRecords) {
      if (record.partnerId) {
        const list = recordsByPartner.get(record.partnerId);
        if (list) list.push(record);
        else recordsByPartner.set(record.partnerId, [record]);
      }
      if (record.vehicleId) {
        const list = recordsByVehicle.get(record.vehicleId);
        if (list) list.push(record);
        else recordsByVehicle.set(record.vehicleId, [record]);
      }
    }

    const metrics: PartnerMetric[] = partners.map(partner => {
      const partnerVehicles = vehiclesByPartner.get(partner.id) ?? [];

      // Preserve getPartnerFinancialRecords semantics:
      // include direct partner records plus records tied to current or historical
      // vehicles associated with the partner, without duplicating a record.
      const partnerRecords = recordsByPartner.get(partner.id) ?? [];
      const partnerVehicleIds = new Set(partnerVehicles.map(vehicle => vehicle.id));
      for (const record of partnerRecords) {
        if (record.vehicleId) partnerVehicleIds.add(record.vehicleId);
      }

      const recordsForPartner: FinancialRecord[] = [];
      const seenRecords = new Set<FinancialRecord>();
      for (const record of partnerRecords) {
        if (!seenRecords.has(record)) {
          seenRecords.add(record);
          recordsForPartner.push(record);
        }
      }
      for (const vehicleId of partnerVehicleIds) {
        for (const record of recordsByVehicle.get(vehicleId) ?? []) {
          if (!seenRecords.has(record)) {
            seenRecords.add(record);
            recordsForPartner.push(record);
          }
        }
      }

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
