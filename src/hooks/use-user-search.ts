
"use client";

import { useState, useMemo, useCallback } from 'react';
import type { UserProfile, UserRole } from '@/types';
import type { UserMetric } from './use-user-analytics';
import { useDebouncedValue } from './use-debounced-value';


export type UserWithMetrics = UserProfile & Partial<UserMetric>;

export interface UserSearchFilters {
  query: string;
  status: 'all' | 'active' | 'deleted';
  role: 'all' | UserRole;
  activityLevel: 'all' | 'Alto' | 'Medio' | 'Bajo' | 'Inactivo';
  companyId: string | 'all';
}

export const useUserSearch = (users: UserWithMetrics[]) => {
  const [filters, setFilters] = useState<UserSearchFilters>({
    query: '',
    status: 'all',
    role: 'all',
    activityLevel: 'all',
    companyId: 'all',
  });

  const updateFilter = useCallback((key: keyof UserSearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const debouncedQuery = useDebouncedValue(filters.query, 300);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // 1. Filter by company
      if (filters.companyId !== 'all' && user.companyId !== filters.companyId) {
          return false;
      }

      // 2. Filter by status
      if (filters.status !== 'all') {
          const isDeleted = user.isDeleted ?? false;
          if (filters.status === 'active' && isDeleted) return false;
          if (filters.status === 'deleted' && !isDeleted) return false;
      }

      // 3. Filter by role
      if (filters.role !== 'all' && user.role !== filters.role) {
          return false;
      }
      
      // 4. Filter by activity level
      if (filters.activityLevel !== 'all' && user.activityLevel !== filters.activityLevel) {
          return false;
      }

      // 5. Filter by text query
      if (debouncedQuery) {
        const searchTerm = debouncedQuery.toLowerCase();
        const name = user.name.toLowerCase();
        const email = user.email?.toLowerCase() || '';
        if (!name.includes(searchTerm) && !email.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  }, [users, filters, debouncedQuery]);

  const resetFilters = useCallback(() => {
    setFilters({
      query: '',
      status: 'all',
      role: 'all',
      activityLevel: 'all',
      companyId: 'all',
    });
  }, []);

  const debouncedSetQuery = (query: string) => updateFilter('query', query);

  return {
    filters,
    filteredUsers,
    updateFilter,
    resetFilters,
    debouncedSetQuery,
    totalResults: filteredUsers.length,
  };
};
