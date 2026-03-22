
// hooks/use-modal-data.ts
'use client';

import { useState, useMemo, useCallback } from 'react';

export interface UseModalDataOptions<T> {
  data: T[];
  searchFields: (item: T) => string[];
  sortFn?: (a: T, b: T) => number;
  initialPageSize?: number;
}

export function useModalData<T>({
  data,
  searchFields,
  sortFn,
  initialPageSize = 50
}: UseModalDataOptions<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(initialPageSize);

  // ✅ Filtrado y ordenamiento
  const filteredAndSorted = useMemo(() => {
    let result = data;

    // Filtrado por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = data.filter(item =>
        searchFields(item).some(field =>
          field.toLowerCase().includes(term)
        )
      );
    }

    // Ordenamiento
    if (sortFn) {
      result = [...result].sort(sortFn);
    }

    return result;
  }, [data, searchTerm, searchFields, sortFn]);

  // ✅ Paginación
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSorted.slice(startIndex, endIndex);
  }, [filteredAndSorted, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  }, [currentPage]);

  // Reset página al cambiar búsqueda
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  return {
    searchTerm,
    setSearchTerm: handleSearchChange,
    filteredData: filteredAndSorted,
    paginatedData,
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    totalResults: filteredAndSorted.length,
    showingFrom: (currentPage - 1) * pageSize + 1,
    showingTo: Math.min(currentPage * pageSize, filteredAndSorted.length)
  };
}