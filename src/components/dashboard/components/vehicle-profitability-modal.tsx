// components/dashboard/components/vehicle-profitability-modal.tsx
'use client';

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useModalData } from '@/hooks/use-modal-data';
import { Search, TrendingUp, TrendingDown, Car } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { EmptyState } from '@/components/common/empty-state';

export interface VehicleProfitabilityRow {
  id: string;
  alias?: string;
  plate: string;
  make?: string;
  model?: string;
  status?: string;
  imageUrl?: string;
  totalIncome?: number;
  totalExpenses?: number;
  grossProfit?: number;
  netProfit?: number;
  vehicleCost?: number;
  weeklyRentalValue?: number;
}

interface VehicleProfitabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  vehicles: VehicleProfitabilityRow[];
}

export function VehicleProfitabilityModal({
  isOpen,
  onClose,
  title = 'Rentabilidad por vehículo',
  vehicles = [],
}: VehicleProfitabilityModalProps) {
  const router = useRouter();

  const {
    searchTerm,
    setSearchTerm,
    paginatedData,
    filteredData,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    hasPrevPage,
    hasNextPage,
    totalResults,
  } = useModalData({
    data: vehicles,
    searchFields: v => [v.alias || '', v.plate, v.make || '', v.model || ''],
    sortFn: (a, b) => (b.grossProfit || 0) - (a.grossProfit || 0),
    initialPageSize: 20,
  });

  const totals = useMemo(() => {
    const gross = filteredData.reduce((s, v) => s + (v.grossProfit || 0), 0);
    const income = filteredData.reduce((s, v) => s + (v.totalIncome || 0), 0);
    const expenses = filteredData.reduce((s, v) => s + (v.totalExpenses || 0), 0);
    return { gross, income, expenses };
  }, [filteredData]);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="flex h-[85vh] max-w-3xl flex-col gap-4 overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
              <TrendingUp className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">
                Rentabilidad bruta = ingresos − gastos (sin costo del vehículo). {totalResults} unidad
                {totalResults !== 1 ? 'es' : ''}.
              </DialogDescription>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 font-semibold text-emerald-300">
              Ingresos {formatCurrency(totals.income)}
            </span>
            <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 font-semibold text-rose-300">
              Gastos {formatCurrency(totals.expenses)}
            </span>
            <span
              className={cn(
                'rounded-full border px-2.5 py-1 font-semibold',
                totals.gross >= 0
                  ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                  : 'border-rose-400/20 bg-rose-400/10 text-rose-300'
              )}
            >
              Bruta {formatCurrency(totals.gross)}
            </span>
          </div>
        </DialogHeader>

        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" strokeWidth={1.75} />
          <Input
            placeholder="Buscar por alias, placa, marca o modelo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-10 rounded-xl border-white/10 bg-white/[0.03] pl-9 text-white placeholder:text-white/30 focus-visible:ring-[#d7ff3f]/30"
          />
        </div>

        <ScrollArea className="min-h-0 flex-1">
          {paginatedData.length === 0 ? (
            <EmptyState
              illustration={searchTerm ? 'search' : 'vehicles'}
              title={searchTerm ? 'Sin resultados' : 'Sin datos de rentabilidad'}
              description="Cuando haya ingresos y gastos por vehículo, verás la rentabilidad bruta aquí."
              className="min-h-[280px] border-0 bg-transparent"
            />
          ) : (
            <div className="space-y-3 pr-2">
              {paginatedData.map(v => {
                const name = v.alias || `${v.make || ''} ${v.model || ''}`.trim() || v.plate;
                const gross = v.grossProfit || 0;
                const positive = gross >= 0;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      router.push(`/dashboard/vehicles/${v.id}`);
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-left transition hover:bg-white/[0.06]"
                  >
                    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
                      {v.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.imageUrl} alt={name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/25">
                          <Car className="h-6 w-6" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white/90">{name}</p>
                      <p className="truncate text-xs text-white/40">
                        Placas: {v.plate}
                        {v.make || v.model ? ` · ${v.make || ''} ${v.model || ''}`.trim() : ''}
                      </p>
                      <p className="mt-1 text-[10px] text-white/35">
                        Ing. {formatCurrency(v.totalIncome || 0)} · Gast. {formatCurrency(v.totalExpenses || 0)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={cn(
                          'flex items-center justify-end gap-1 text-sm font-semibold tabular-nums',
                          positive ? 'text-emerald-300' : 'text-rose-300'
                        )}
                      >
                        {positive ? (
                          <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.75} />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                        {formatCurrency(gross)}
                      </p>
                      <p className="text-[10px] text-white/35">bruta</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-white/40">
            <Button variant="outline" size="sm" disabled={!hasPrevPage} onClick={prevPage} className="h-8 border-white/10">
              Anterior
            </Button>
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={!hasNextPage} onClick={nextPage} className="h-8 border-white/10">
              Siguiente
            </Button>
          </div>
        )}

        <DialogFooter className="shrink-0 border-t border-white/[0.06] pt-4">
          <Button
            onClick={onClose}
            className="h-10 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
