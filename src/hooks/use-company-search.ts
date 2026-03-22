
"use client";

import { useState, useMemo, useCallback } from 'react';
import { useDebouncedValue } from './use-debounced-value';
import type { Company } from '@/types';
import { infallibleNormalizeDate } from '@/lib/date-utils';

export interface CompanySearchFilters {
  query: string;
  status: 'all' | 'active' | 'deleted';
  vehicleLimitRange: { min: number; max: number };
  dateRange: { from: Date | null; to: Date | null };
  contractStatus: 'all' | 'with_template' | 'without_template';
}

interface CompanyMetrics {
  vehicleCount: number;
  userCount: number;
}

export const useCompanySearch = (companies: Company[], companyMetrics: Record<string, CompanyMetrics> = {}) => {
  const [filters, setFilters] = useState<CompanySearchFilters>({
    query: '',
    status: 'active',
    vehicleLimitRange: { min: 0, max: Infinity },
    dateRange: { from: null, to: null },
    contractStatus: 'all',
  });

  const updateFilter = useCallback((key: keyof CompanySearchFilters, value: any) => {
      setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const debouncedQuery = useDebouncedValue(filters.query, 300);

  const filteredCompanies = useMemo(() => {
    let result = companies.filter(company => {
      // 1. Filter by status
      if (filters.status !== 'all') {
          if (filters.status === 'deleted' && !company.isDeleted) return false;
          if (filters.status === 'active' && company.isDeleted) return false;
      }

      // 2. Filter by global search query
      if (debouncedQuery) {
        const searchTerm = debouncedQuery.toLowerCase();
        const name = company.name.toLowerCase();
        const email = company.email?.toLowerCase() || '';
        const phone = company.phone?.toLowerCase() || '';
        
        if (!name.includes(searchTerm) && !email.includes(searchTerm) && !phone.includes(searchTerm)) {
          return false;
        }
      }
      
      // 3. Filter by contract status
      if (filters.contractStatus !== 'all') {
        const hasContract = !!company.contractTemplateUrl;
        if (filters.contractStatus === 'with_template' && !hasContract) return false;
        if (filters.contractStatus === 'without_template' && hasContract) return false;
      }
      
      // 4. Filter by vehicle limit range
      const limit = company.vehicleLimit ?? Infinity;
      if (limit < filters.vehicleLimitRange.min || (filters.vehicleLimitRange.max !== Infinity && limit > filters.vehicleLimitRange.max)) {
        return false;
      }

      // 5. Filter by date range (using createdAt)
      if (filters.dateRange.from || filters.dateRange.to) {
          const companyDate = infallibleNormalizeDate(company.createdAt);
          if (!companyDate) return false;
          if (filters.dateRange.from && companyDate < filters.dateRange.from) return false;
          if (filters.dateRange.to && companyDate > filters.dateRange.to) return false;
      }

      return true;
    });

    return result;
  }, [companies, debouncedQuery, filters]);
  
  const resetFilters = useCallback(() => {
    setFilters({
      query: '',
      status: 'active',
      vehicleLimitRange: { min: 0, max: Infinity },
      dateRange: { from: null, to: null },
      contractStatus: 'all',
    });
  }, []);

  const debouncedSetQuery = (query: string) => updateFilter('query', query);

  return {
    filters,
    filteredCompanies,
    updateFilter,
    resetFilters,
    debouncedSetQuery,
    totalResults: filteredCompanies.length,
  };
};
