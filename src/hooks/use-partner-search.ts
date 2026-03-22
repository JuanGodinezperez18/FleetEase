
"use client";

import { useState, useMemo, useCallback } from 'react';
import type { Partner } from '@/types';
import { infallibleNormalizeDate } from '@/lib/date-utils';
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

export const usePartnerSearch = (partners: PartnerWithMetrics[]) => {
  const [filters, setFilters] = useState<PartnerSearchFilters>({
    query: '',
    performanceLevel: 'all',
    profitRange: { min: -10000, max: 500000 }, // Increased max profit range
    vehicleCountRange: { min: 0, max: 50 },
    companyId: 'all',
    status: 'active',
  });

  const updateFilter = useCallback((key: keyof PartnerSearchFilters, value: any) => {
      setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const debouncedQuery = useDebouncedValue(filters.query, 300);

  const filteredPartners = useMemo(() => {
    let result = partners.filter(partner => {
      // 1. Filter by status
      if (filters.status !== 'all') {
          if (filters.status === 'deleted' && !partner.isDeleted) return false;
          if (filters.status === 'active' && partner.isDeleted) return false;
      }

      // 2. Filter by company (This is now handled by DataProvider for superAdmins, but good for local filtering if needed)
      if (filters.companyId !== 'all' && partner.companyId !== filters.companyId) {
          return false;
      }

      // 3. Filter by global search query
      if (debouncedQuery) {
        const searchTerm = debouncedQuery.toLowerCase();
        const name = `${partner.firstname} ${partner.lastname}`.toLowerCase();
        const email = partner.email?.toLowerCase() || '';
        const phone = partner.phone?.toLowerCase() || '';
        
        if (!name.includes(searchTerm) && !email.includes(searchTerm) && !phone.includes(searchTerm)) {
          return false;
        }
      }
      
      // 4. Filter by performance level
      if (filters.performanceLevel !== 'all' && partner.performanceLevel !== filters.performanceLevel) {
          return false;
      }
      
      // 5. Filter by profit range
      const profit = partner.netProfit ?? 0;
      if (profit < filters.profitRange.min || profit > filters.profitRange.max) {
        return false;
      }

      // 6. Filter by vehicle count
      const vCount = partner.vehicleCount ?? 0;
      if(vCount < filters.vehicleCountRange.min || vCount > filters.vehicleCountRange.max) {
          return false;
      }

      return true;
    });

    return result;
  }, [partners, filters, debouncedQuery]);
  
  const resetFilters = useCallback(() => {
    setFilters({
      query: '',
      performanceLevel: 'all',
      profitRange: { min: -10000, max: 500000 }, // Increased max profit range
      vehicleCountRange: { min: 0, max: 50 },
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
