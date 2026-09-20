// components/dashboard/components/multa-vehicles-list-modal.tsx
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { useShareContent } from '@/hooks/use-share-content';
import { useModalData } from '@/hooks/use-modal-data';
import { Share2, Search, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ModalTableSkeleton } from './modal-table-skeleton';
import { ModalPagination } from './modal-pagination';
import { StaggerTableRow } from '@/components/animations/modern-transitions';
import { EmptyState } from '@/components/common/empty-state';

export interface MultaVehicleRow {
  vehicleId: string;
  plate?: string;
  alias?: string;
  count: number;
  totalAmount: number;
  pendientes: number;
  pagadas: number;
}

interface MultaVehiclesListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  vehicles: MultaVehicleRow[];
  loading?: boolean;
}

export function MultaVehiclesListModal({
  isOpen,
  onClose,
  title,
  vehicles = [],
  loading = false,
}: MultaVehiclesListModalProps) {
  const router = useRouter();
  const { shareContent, isSharing } = useShareContent();

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
    showingFrom,
    showingTo,
  } = useModalData({
    data: vehicles,
    searchFields: row => [row.plate || '', row.alias || ''],
    sortFn: (a, b) => b.pendientes - a.pendientes || b.count - a.count,
    initialPageSize: 20,
  });

  const totals = useMemo(() => {
    const pendientes = filteredData.reduce((s, r) => s + r.pendientes, 0);
    const totalAmount = filteredData.reduce((s, r) => s + r.totalAmount, 0);
    const totalCount = filteredData.reduce((s, r) => s + r.count, 0);
    return { pendientes, totalAmount, totalCount };
  }, [filteredData]);

  const handleViewVehicle = (vehicleId: string) => {
    router.push(`/dashboard/multas?vehicleId=${vehicleId}`);
    onClose();
  };

  const handleShare = () => {
    const date = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const lines = filteredData
      .map(
        r =>
          `${r.alias || r.plate || r.vehicleId}: ${r.count} multas (${r.pendientes} pend.) · ${formatCurrency(r.totalAmount)}`
      )
      .join('\n');
    shareContent({
      title: `Resumen de Multas: ${title}`,
      text: `${title}\nFecha: ${date}\n\n${lines}\n\nVehículos: ${filteredData.length}\nMultas: ${totals.totalCount}\nPendientes: ${totals.pendientes}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-4 overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/[0.08] text-rose-300">
                <ShieldAlert className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {totalResults} vehículo{totalResults !== 1 ? 's' : ''}
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {totals.pendientes > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300">
                  <AlertTriangle className="h-3 w-3" strokeWidth={1.75} />
                  {totals.pendientes} pendiente{totals.pendientes !== 1 ? 's' : ''}
                </span>
              )}
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-white/70">
                {formatCurrency(totals.totalAmount)}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="relative shrink-0">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
            strokeWidth={1.75}
          />
          <Input
            placeholder="Buscar por placa o alias..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-10 rounded-xl border-white/10 bg-white/[0.03] pl-9 text-white placeholder:text-white/30 focus-visible:ring-[#d7ff3f]/30"
          />
          {filteredData.length !== vehicles.length && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/50">
              {filteredData.length} de {vehicles.length}
            </span>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="min-w-[640px]">
            {loading ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/40">Vehículo</TableHead>
                    <TableHead className="text-right text-white/40">Total</TableHead>
                    <TableHead className="text-right text-white/40">Pendientes</TableHead>
                    <TableHead className="text-right text-white/40">Pagadas</TableHead>
                    <TableHead className="text-right text-white/40">Monto</TableHead>
                    <TableHead className="text-right text-white/40">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <ModalTableSkeleton rows={5} columns={6} />
                </TableBody>
              </Table>
            ) : paginatedData.length === 0 ? (
              <EmptyState
                illustration={searchTerm ? 'search' : 'vehicles'}
                title={searchTerm ? 'Sin resultados' : 'Sin vehículos con multas'}
                description={
                  searchTerm
                    ? 'Prueba con otra placa o alias.'
                    : 'Cuando se registren multas, aparecerán aquí agrupadas por unidad.'
                }
                className="min-h-[280px] border-0 bg-transparent"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/40">Vehículo</TableHead>
                    <TableHead className="text-right text-white/40">Total</TableHead>
                    <TableHead className="text-right text-white/40">Pendientes</TableHead>
                    <TableHead className="text-right text-white/40">Pagadas</TableHead>
                    <TableHead className="text-right text-white/40">Monto</TableHead>
                    <TableHead className="text-right text-white/40">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map(row => (
                    <StaggerTableRow
                      key={row.vehicleId}
                      className="border-white/[0.06] hover:bg-white/[0.03]"
                    >
                      <TableCell className="font-medium text-white/90">
                        <div>
                          {row.alias || row.plate || row.vehicleId}
                          {row.alias && row.plate && (
                            <div className="text-xs text-white/40">{row.plate}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-white/70">
                        {row.count}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.pendientes > 0 ? (
                          <span className="font-semibold tabular-nums text-amber-300">
                            {row.pendientes}
                          </span>
                        ) : (
                          <span className="tabular-nums text-white/40">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-300/80">
                        {row.pagadas}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-white/85">
                        {formatCurrency(row.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewVehicle(row.vehicleId)}
                          className="h-8 rounded-lg border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
                        >
                          Ver multas
                        </Button>
                      </TableCell>
                    </StaggerTableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {!loading && paginatedData.length > 0 && (
          <div className="shrink-0">
            <ModalPagination
              currentPage={currentPage}
              totalPages={totalPages}
              showingFrom={showingFrom}
              showingTo={showingTo}
              totalResults={totalResults}
              onPrevPage={prevPage}
              onNextPage={nextPage}
              hasPrevPage={hasPrevPage}
              hasNextPage={hasNextPage}
            />
          </div>
        )}

        <DialogFooter className="shrink-0 border-t border-white/[0.06] pt-4">
          <Button
            variant="outline"
            onClick={handleShare}
            disabled={isSharing || paginatedData.length === 0}
            className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            <Share2 className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Compartir lista
          </Button>
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
