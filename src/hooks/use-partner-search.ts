"use client";

import { useState, useMemo, useCallback } from 'react';
import type { Partner } from '@/types';
import type { PartnerWithMetrics } from '@/app/dashboard/partners/page';
import { useDebouncedValue } from './use-debounced-value';

export interface PartnerSearchFilters {
  query: string;
  performanceLevel: 'all' | 'Excelente' | 'Bueno' | 'Regular' | 'Bajo';
  profitRange: { min: number; max: number };
  vehicleCountRange: { min: number; max: number };
  companyId: string | 'all';
  status: 'all' | 'active' | 'deleted';
}

const DEFAULT_PROFIT_RANGE = { min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY };
const DEFAULT_VEHICLE_RANGE = { min: 0, max: Number.POSITIVE_INFINITY };

export const usePartnerSearch = (partners: PartnerWithMetrics[]) => {
  const [filters, setFilters] = useState<PartnerSearchFilters>({
    query: '',
    performanceLevel: 'all',
    profitRange: DEFAULT_PROFIT_RANGE,
    vehicleCountRange: DEFAULT_VEHICLE_RANGE,
    companyId: 'all',
    status: 'active',
  });

  const updateFilter = useCallback((key: keyof PartnerSearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const debouncedQuery = useDebouncedValue(filters.query, 300);

  const filteredPartners = useMemo(() => {
    return partners.filter(partner => {
      if (filters.status !== 'all') {
        if (filters.status === 'deleted' && !partner.isDeleted) return false;
        if (filters.status === 'active' && partner.isDeleted) return false;
      }

      if (filters.companyId !== 'all' && partner.companyId !== filters.companyId) {
        return false;
      }

      if (debouncedQuery) {
        const searchTerm = debouncedQuery.toLowerCase().trim();
        const name = `${partner.firstname} ${partner.lastname}`.toLowerCase();
        const email = partner.email?.toLowerCase() || '';
        const phone = partner.phone?.toLowerCase() || '';
        if (!name.includes(searchTerm) && !email.includes(searchTerm) && !phone.includes(searchTerm)) {
          return false;
        }
      }

      if (filters.performanceLevel !== 'all' && partner.performanceLevel !== filters.performanceLevel) {
        return false;
      }

      const profit = partner.netProfit ?? 0;
      if (profit < filters.profitRange.min || profit > filters.profitRange.max) {
        return false;
      }

      const vCount = partner.vehicleCount ?? 0;
      if (vCount < filters.vehicleCountRange.min || vCount > filters.vehicleCountRange.max) {
        return false;
      }

      return true;
    });
  }, [partners, filters, debouncedQuery]);

  const resetFilters = useCallback(() => {
    setFilters({
      query: '',
      performanceLevel: 'all',
      profitRange: DEFAULT_PROFIT_RANGE,
      vehicleCountRange: DEFAULT_VEHICLE_RANGE,
      companyId: 'all',
      status: 'active',
    });
  }, []);

  const debouncedSetQuery = (query: string) => updateFilter('query', query);

  return {
    filters,
    filteredPartners,
    updateFilter,
    resetFilters,
    debouncedSetQuery,
    totalResults: filteredPartners.length,
  };
};
