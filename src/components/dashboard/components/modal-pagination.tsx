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
  hasNextPage,
}: ModalPaginationProps) {
  if (totalResults === 0) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-white/[0.06] px-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-white/45 sm:text-sm">
        Mostrando <span className="font-semibold text-white/70">{showingFrom}</span> a{' '}
        <span className="font-semibold text-white/70">{showingTo}</span> de{' '}
        <span className="font-semibold text-white/70">{totalResults}</span>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevPage}
            disabled={!hasPrevPage}
            className="h-9 rounded-lg border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          >
            <ChevronLeft className="mr-1 h-4 w-4" strokeWidth={1.75} />
            Anterior
          </Button>

          <div className="text-xs tabular-nums text-white/45">
            {currentPage} / {totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onNextPage}
            disabled={!hasNextPage}
            className="h-9 rounded-lg border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
          >
            Siguiente
            <ChevronRight className="ml-1 h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      )}
    </div>
  );
}
