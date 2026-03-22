
// components/dashboard/components/modal-pagination.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ModalPaginationProps {
  currentPage: number;
  totalPages: number;
  showingFrom: number;
  showingTo: number;
  totalResults: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  hasPrevPage: boolean;
  hasNextPage: boolean;
}

export function ModalPagination({
  currentPage,
  totalPages,
  showingFrom,
  showingTo,
  totalResults,
  onPrevPage,
  onNextPage,
  hasPrevPage,
  hasNextPage
}: ModalPaginationProps) {
  if (totalResults === 0) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-800">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Mostrando <span className="font-medium">{showingFrom}</span> a{' '}
        <span className="font-medium">{showingTo}</span> de{' '}
        <span className="font-medium">{totalResults}</span> resultados
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevPage}
            disabled={!hasPrevPage}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Anterior
          </Button>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Página {currentPage} de {totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onNextPage}
            disabled={!hasNextPage}
          >
            Siguiente
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}