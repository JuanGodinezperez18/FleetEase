
"use client";

import { useState, useMemo, useCallback } from 'react';
import type { Credit } from '@/types';
import type { CreditMetric } from './use-credits-analytics';
import { useDebouncedValue } from './use-debounced-value';

export type CreditWithMetrics = Credit & Partial<CreditMetric> & { clientName?: string };

export interface CreditSearchFilters {
  query: string;
  paymentBehavior: 'all' | 'Puntual' | 'Ligero Retraso' | 'Retraso Severo';
  progressRange: { min: number; max: number };
  balanceRange: { min: number; max: number };
  status: 'all' | 'active' | 'completed' | 'defaulted' | 'inactive';
  clientId: string | 'all';
}

export const useCreditsSearch = (credits: CreditWithMetrics[]) => {
  const [filters, setFilters] = useState<CreditSearchFilters>({
    query: '',
    paymentBehavior: 'all',
    progressRange: { min: 0, max: 100 },
    balanceRange: { min: 0, max: 500000 },
    status: 'all',
    clientId: 'all',
  });

  const updateFilter = useCallback((key: keyof CreditSearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const debouncedQuery = useDebouncedValue(filters.query, 300);

  const filteredCredits = useMemo(() => {
    return credits.filter(credit => {
      // 1. Filter by status
      if (filters.status !== 'all' && credit.status !== filters.status) {
        return false;
      }
      
      // 2. Filter by text query (client name or vehicle plate)
      if (debouncedQuery) {
        const searchTerm = debouncedQuery.toLowerCase();
        if (
            !(credit.clientName || '').toLowerCase().includes(searchTerm)
        ) {
           return false;
        }
      }
      
      // 3. Filter by payment behavior
      if (filters.paymentBehavior !== 'all' && credit.paymentBehavior !== filters.paymentBehavior) {
        return false;
      }
      
      // 4. Filter by progress range
      const progress = credit.progressPercentage ?? 0;
      if (progress < filters.progressRange.min || progress > filters.progressRange.max) {
        return false;
      }

      // 5. Filter by balance range
      const balance = credit.remainingBalance ?? 0;
      if (balance < filters.balanceRange.min || balance > filters.balanceRange.max) {
          return false;
      }
      
      // 6. Filter by client ID
      if (filters.clientId !== 'all' && credit.clientId !== filters.clientId) {
        return false;
      }

      return true;
    });
  }, [credits, filters, debouncedQuery]);

  const resetFilters = useCallback(() => {
    setFilters({
      query: '',
      paymentBehavior: 'all',
      progressRange: { min: 0, max: 100 },
      balanceRange: { min: 0, max: 500000 },
      status: 'all',
      clientId: 'all',
    });
  }, []);

  const debouncedSetQuery = (query: string) => updateFilter('query', query);

  return {
    filters,
    filteredCredits,
    updateFilter,
    resetFilters,
    debouncedSetQuery,
    totalResults: filteredCredits.length,
  };
};
