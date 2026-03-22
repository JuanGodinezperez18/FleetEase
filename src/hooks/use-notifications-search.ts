
"use client";

import { useState, useMemo, useCallback } from 'react';
import type { AnalyzedNotification } from './use-notifications-analytics';
import { infallibleNormalizeDate } from '@/lib/date-utils';
import { useDebouncedValue } from './use-debounced-value';

export interface NotificationSearchFilters {
  query: string;
  priority: 'all' | 'Crítica' | 'Alta' | 'Media' | 'Baja';
  category: 'all' | 'Mantenimiento' | 'Financiera' | 'Legal' | 'Operacional';
  status: 'all' | 'read' | 'unread';
  entityType: 'all' | 'Vehículo' | 'Cliente' | 'Socio' | 'Sistema';
  dateRange: { from: Date | undefined; to: Date | undefined };
}

export const useNotificationsSearch = (notifications: AnalyzedNotification[]) => {
  const [filters, setFilters] = useState<NotificationSearchFilters>({
    query: '',
    priority: 'all',
    category: 'all',
    status: 'all',
    entityType: 'all',
    dateRange: { from: undefined, to: undefined },
  });

  const updateFilter = useCallback((key: keyof NotificationSearchFilters, value: any) => {
      setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const debouncedQuery = useDebouncedValue(filters.query, 300);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // 1. Filter by global search query
      if (debouncedQuery) {
        const searchTerm = debouncedQuery.toLowerCase();
        const message = notification.message.toLowerCase();
        if (!message.includes(searchTerm)) {
          return false;
        }
      }
      
      // 2. Filter by priority
      if (filters.priority !== 'all' && notification.priority !== filters.priority) {
        return false;
      }
      
      // 3. Filter by category
      if (filters.category !== 'all' && notification.category !== filters.category) {
        return false;
      }
      
      // 4. Filter by status
      if (filters.status !== 'all') {
        if (filters.status === 'read' && !notification.isRead) return false;
        if (filters.status === 'unread' && notification.isRead) return false;
      }
      
      // 5. Filter by entity type
      if (filters.entityType !== 'all' && notification.entityType !== filters.entityType) {
        return false;
      }

      // 6. Filter by date range
      if (filters.dateRange.from || filters.dateRange.to) {
          const notificationDate = infallibleNormalizeDate(notification.date);
          if (!notificationDate) return false;
          if (filters.dateRange.from && notificationDate < filters.dateRange.from) return false;
          if (filters.dateRange.to && notificationDate > filters.dateRange.to) return false;
      }

      return true;
    });
  }, [notifications, filters, debouncedQuery]);
  
  const resetFilters = useCallback(() => {
    setFilters({
      query: '',
      priority: 'all',
      category: 'all',
      status: 'all',
      entityType: 'all',
      dateRange: { from: undefined, to: undefined },
    });
  }, []);

  const debouncedSetQuery = (query: string) => updateFilter('query', query);

  return {
    filters,
    filteredNotifications,
    updateFilter,
    resetFilters,
    debouncedSetQuery,
    totalResults: filteredNotifications.length,
  };
};
