"use client";

import { Button } from "@/components/ui/button";

interface ListPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
}

export function ListPagination({
  page,
  totalPages,
  total,
  from,
  to,
  onPrev,
  onNext,
  className = "",
}: ListPaginationProps) {
  if (total <= 0) return null;

  return (
    <div
      className={`mt-4 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-4 sm:flex-row ${className}`}
    >
      <p className="text-xs text-white/40">
        Mostrando {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={onPrev}
          className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white"
        >
          Anterior
        </Button>
        <span className="text-xs tabular-nums text-white/50">
          {page} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={onNext}
          className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white"
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
