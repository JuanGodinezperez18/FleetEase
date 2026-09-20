// components/dashboard/components/vehicle-list-modal.tsx
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
import { cn } from '@/lib/utils';
import { useShareContent } from '@/hooks/use-share-content';
import { useModalData } from '@/hooks/use-modal-data';
import { Share2, Search, Car, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ModalTableSkeleton } from './modal-table-skeleton';
import { ModalPagination } from './modal-pagination';
import { StaggerTableRow } from '@/components/animations/modern-transitions';
import { EmptyState } from '@/components/common/empty-state';

interface VehicleData {
  id: string;
  alias?: string;
  plate: string;
  make?: string;
  model?: string;
  currentMileage?: number;
  nextMaintenanceAt?: number;
  lastMaintenanceDate?: string;
  lastMaintenanceMileage?: number;
  kmToNextMaintenance?: number;
  maintenanceInterval?: number;
  insuranceExpiryDate?: string;
  verificationExpiryDate?: string;
}

interface VehicleListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  vehicles: VehicleData[];
  loading?: boolean;
}

function getMaintenanceStatus(vehicle: VehicleData): 'overdue' | 'soon' | 'ok' {
  if (typeof vehicle.kmToNextMaintenance === 'number') {
    if (vehicle.kmToNextMaintenance <= 0) return 'overdue';
    if (vehicle.kmToNextMaintenance <= 1500) return 'soon';
    return 'ok';
  }
  if (vehicle.currentMileage == null || vehicle.nextMaintenanceAt == null) return 'ok';
  const remaining = vehicle.nextMaintenanceAt - vehicle.currentMileage;
  if (remaining <= 0) return 'overdue';
  if (remaining <= 1500) return 'soon';
  return 'ok';
}

const STATUS_BADGE = {
  overdue:
    'inline-flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300',
  soon:
    'inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300',
  ok:
    'inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300',
} as const;

export function VehicleListModal({
  isOpen,
  onClose,
  title = 'Vehículos',
  vehicles = [],
  loading = false,
}: VehicleListModalProps) {
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
    searchFields: vehicle => [
      vehicle.alias || '',
      vehicle.plate,
      vehicle.make || '',
      vehicle.model || '',
    ],
    sortFn: (a, b) => {
      const priority = { overdue: 0, soon: 1, ok: 2 };
      return priority[getMaintenanceStatus(a)] - priority[getMaintenanceStatus(b)];
    },
    initialPageSize: 20,
  });

  const stats = useMemo(() => {
    const overdue = filteredData.filter(v => getMaintenanceStatus(v) === 'overdue').length;
    const soon = filteredData.filter(v => getMaintenanceStatus(v) === 'soon').length;
    const ok = filteredData.filter(v => getMaintenanceStatus(v) === 'ok').length;
    return { overdue, soon, ok };
  }, [filteredData]);

  const handleViewVehicle = (vehicleId: string) => {
    router.push(`/dashboard/vehicles/${vehicleId}`);
    onClose();
  };

  const handleShare = () => {
    const date = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const vehiclesText = filteredData
      .map(vehicle => {
        const status = getMaintenanceStatus(vehicle);
        const statusText =
          status === 'overdue' ? 'VENCIDO' : status === 'soon' ? 'PRÓXIMO' : 'OK';
        return `${vehicle.alias || vehicle.plate} - ${statusText}`;
      })
      .join('\n');
    shareContent({
      title: `Reporte de Vehículos: ${title}`,
      text: `${title}\nFecha: ${date}\n\n${vehiclesText}\n\nTotal: ${filteredData.length} vehículos`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="flex h-[85vh] max-w-5xl flex-col gap-4 overflow-hidden sm:max-w-5xl">
        <DialogHeader>
          <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
                <Car className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {totalResults} vehículo{totalResults !== 1 ? 's' : ''}
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {stats.overdue > 0 && (
                <span className={STATUS_BADGE.overdue}>
                  <AlertTriangle className="h-3 w-3" strokeWidth={1.75} />
                  {stats.overdue} vencido{stats.overdue > 1 ? 's' : ''}
                </span>
              )}
              {stats.soon > 0 && (
                <span className={STATUS_BADGE.soon}>
                  <Clock className="h-3 w-3" strokeWidth={1.75} />
                  {stats.soon} próximo{stats.soon > 1 ? 's' : ''}
                </span>
              )}
              {stats.ok > 0 && (
                <span className={STATUS_BADGE.ok}>
                  <CheckCircle className="h-3 w-3" strokeWidth={1.75} />
                  {stats.ok} OK
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="relative shrink-0">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
            strokeWidth={1.75}
          />
          <Input
            placeholder="Buscar por alias, placa, marca o modelo..."
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
          <div className="min-w-[720px]">
            {loading ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/40">Vehículo</TableHead>
                    <TableHead className="text-white/40">Placa</TableHead>
                    <TableHead className="text-right text-white/40">Kilometraje</TableHead>
                    <TableHead className="text-right text-white/40">Próx. mant.</TableHead>
                    <TableHead className="text-center text-white/40">Estado</TableHead>
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
                title={searchTerm ? 'No se encontraron vehículos' : 'No hay vehículos para mostrar'}
                description={
                  searchTerm
                    ? 'Prueba con otro término de búsqueda.'
                    : 'Cuando agregues vehículos, aparecerán aquí con su estado de mantenimiento.'
                }
                className="min-h-[280px] border-0 bg-transparent"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/40">Vehículo</TableHead>
                    <TableHead className="text-white/40">Placa</TableHead>
                    <TableHead className="text-right text-white/40">Kilometraje</TableHead>
                    <TableHead className="text-right text-white/40">Próx. mant.</TableHead>
                    <TableHead className="text-center text-white/40">Estado</TableHead>
                    <TableHead className="text-right text-white/40">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map(vehicle => {
                    const status = getMaintenanceStatus(vehicle);
                    const remaining =
                      typeof vehicle.kmToNextMaintenance === 'number'
                        ? vehicle.kmToNextMaintenance
                        : vehicle.nextMaintenanceAt != null && vehicle.currentMileage != null
                          ? vehicle.nextMaintenanceAt - vehicle.currentMileage
                          : null;

                    return (
                      <StaggerTableRow
                        key={vehicle.id}
                        className="border-white/[0.06] hover:bg-white/[0.03]"
                      >
                        <TableCell className="font-medium text-white/90">
                          <div>
                            {vehicle.alias || vehicle.plate}
                            {vehicle.make && vehicle.model && (
                              <div className="text-xs text-white/40">
                                {vehicle.make} {vehicle.model}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-white/60">{vehicle.plate}</TableCell>
                        <TableCell className="text-right tabular-nums text-white/70">
                          {vehicle.currentMileage != null
                            ? `${vehicle.currentMileage.toLocaleString('es-MX')} km`
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          {vehicle.nextMaintenanceAt ? (
                            <div
                              className={cn(
                                'font-medium tabular-nums',
                                status === 'overdue' && 'text-rose-300',
                                status === 'soon' && 'text-amber-300',
                                status === 'ok' && 'text-white/60'
                              )}
                            >
                              {vehicle.nextMaintenanceAt.toLocaleString('es-MX')} km
                              {remaining !== null && (
                                <div className="text-xs text-white/40">
                                  (
                                  {remaining > 0
                                    ? `faltan ${remaining}`
                                    : `excedido ${Math.abs(remaining)}`}
                                  {' '}km)
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-white/35">No configurado</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={STATUS_BADGE[status]}>
                            {status === 'overdue' && (
                              <AlertTriangle className="h-3 w-3" strokeWidth={1.75} />
                            )}
                            {status === 'soon' && <Clock className="h-3 w-3" strokeWidth={1.75} />}
                            {status === 'ok' && (
                              <CheckCircle className="h-3 w-3" strokeWidth={1.75} />
                            )}
                            {status === 'overdue' ? 'Vencido' : status === 'soon' ? 'Próximo' : 'OK'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewVehicle(vehicle.id)}
                            className="h-8 rounded-lg border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
                          >
                            Ver detalle
                          </Button>
                        </TableCell>
                      </StaggerTableRow>
                    );
                  })}
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
            Compartir reporte
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
