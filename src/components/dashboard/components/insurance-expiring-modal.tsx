// components/dashboard/components/insurance-expiring-modal.tsx
'use client';

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
import { Share2, Search, Shield, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ModalTableSkeleton } from './modal-table-skeleton';
import { ModalPagination } from './modal-pagination';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface VehicleData {
  id: string;
  alias?: string;
  plate: string;
  make?: string;
  model?: string;
  insuranceExpiryDate?: string;
  insuranceCompany?: string;
  insurancePolicyNumber?: string;
}

interface InsuranceExpiringModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  vehicles: VehicleData[];
  loading?: boolean;
}

export function InsuranceExpiringModal({
  isOpen,
  onClose,
  title,
  vehicles = [],
  loading = false,
}: InsuranceExpiringModalProps) {
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
      vehicle.insuranceCompany || '',
    ],
    sortFn: (a, b) => {
      const dateA = a.insuranceExpiryDate
        ? new Date(a.insuranceExpiryDate).getTime()
        : Infinity;
      const dateB = b.insuranceExpiryDate
        ? new Date(b.insuranceExpiryDate).getTime()
        : Infinity;
      return dateA - dateB;
    },
    initialPageSize: 20,
  });

  const handleViewVehicle = (vehicleId: string) => {
    router.push(`/dashboard/vehicles/${vehicleId}`);
    onClose();
  };

  const formatInsuranceExpiry = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  const getDaysUntilExpiry = (dateString: string | undefined) => {
    if (!dateString) return null;
    try {
      return differenceInDays(parseISO(dateString), new Date());
    } catch {
      return null;
    }
  };

  const getInsuranceStatusBadge = (vehicle: VehicleData) => {
    const days = getDaysUntilExpiry(vehicle.insuranceExpiryDate);
    if (days === null) {
      return (
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/40">
          N/A
        </span>
      );
    }
    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
          <AlertTriangle className="h-3 w-3" strokeWidth={1.75} />
          Vencido ({Math.abs(days)} d)
        </span>
      );
    }
    if (days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
          <AlertTriangle className="h-3 w-3" strokeWidth={1.75} />
          {days} {days === 1 ? 'día' : 'días'}
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
          {days} días
        </span>
      );
    }
    return (
      <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/60">
        {days} días
      </span>
    );
  };

  const handleShare = () => {
    const date = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const list = filteredData
      .map(vehicle => {
        const expiryDate = formatInsuranceExpiry(vehicle.insuranceExpiryDate);
        const days = getDaysUntilExpiry(vehicle.insuranceExpiryDate);
        const daysText =
          days !== null
            ? days < 0
              ? `Vencido hace ${Math.abs(days)} días`
              : `Vence en ${days} días`
            : 'N/A';
        return `${vehicle.alias || vehicle.plate}: ${expiryDate} (${daysText})`;
      })
      .join('\n');
    shareContent({
      title: `Resumen de Seguros: ${title}`,
      text: `${title}\nFecha: ${date}\n\n${list}\n\nTotal: ${filteredData.length}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="flex h-[85vh] max-w-6xl flex-col gap-4 overflow-hidden sm:max-w-6xl">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/[0.08] text-amber-300">
              <Shield className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">
                {totalResults} seguro{totalResults !== 1 ? 's' : ''} por vencer o vencido
                {totalResults !== 1 ? 's' : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="relative shrink-0">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
            strokeWidth={1.75}
          />
          <Input
            placeholder="Buscar por alias, placa, marca o aseguradora..."
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
          <div className="space-y-3 md:hidden">
            {loading ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-xl border border-white/[0.07] bg-white/[0.03]" />) :
              paginatedData.length === 0 ? <p className="py-8 text-center text-sm text-white/45">{searchTerm ? 'No se encontraron seguros' : 'No hay seguros para mostrar'}</p> :
              paginatedData.map(vehicle => {
                const days = getDaysUntilExpiry(vehicle.insuranceExpiryDate);
                const expired = days !== null && days < 0;
                return <article key={vehicle.id} className={cn("space-y-3 rounded-xl border p-3", expired ? "border-rose-400/20 bg-rose-400/[0.04]" : "border-white/[0.08] bg-white/[0.02]")}>
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-semibold text-white/90">{vehicle.alias || vehicle.plate}</p><p className="mt-1 text-xs text-white/45">{vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model} · ` : ''}{vehicle.plate}</p></div><div className="shrink-0">{getInsuranceStatusBadge(vehicle)}</div></div>
                  <div className="grid grid-cols-1 gap-2 border-t border-white/[0.06] pt-2"><div><p className="text-[10px] uppercase tracking-wide text-white/35">Aseguradora</p><p className="break-words text-xs text-white/70">{vehicle.insuranceCompany || 'N/A'}</p></div><div><p className="text-[10px] uppercase tracking-wide text-white/35">Póliza</p><p className="break-words text-xs text-white/70">{vehicle.insurancePolicyNumber || 'N/A'}</p></div><div><p className="text-[10px] uppercase tracking-wide text-white/35">Vencimiento</p><p className="text-xs text-white/70">{formatInsuranceExpiry(vehicle.insuranceExpiryDate)}</p></div></div>
                  <Button variant="outline" size="sm" onClick={() => handleViewVehicle(vehicle.id)} className="h-9 w-full rounded-lg border-white/10 bg-white/[0.03] text-xs text-white/80">Ver detalle</Button>
                </article>;
              })}
          </div>
          <div className="hidden min-w-[800px] md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/40">Vehículo</TableHead>
                  <TableHead className="text-white/40">Placa</TableHead>
                  <TableHead className="text-white/40">Aseguradora</TableHead>
                  <TableHead className="text-white/40">Póliza</TableHead>
                  <TableHead className="text-white/40">Vencimiento</TableHead>
                  <TableHead className="text-white/40">Estado</TableHead>
                  <TableHead className="text-right text-white/40">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <ModalTableSkeleton rows={5} columns={7} />
                ) : paginatedData.length === 0 ? (
                  <TableRow className="border-white/[0.06]">
                    <TableCell colSpan={7} className="py-10 text-center text-white/40">
                      {searchTerm ? 'No se encontraron seguros' : 'No hay seguros para mostrar'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map(vehicle => {
                    const days = getDaysUntilExpiry(vehicle.insuranceExpiryDate);
                    const isExpired = days !== null && days < 0;
                    const isExpiringSoon = days !== null && days >= 0 && days <= 30;

                    return (
                      <TableRow
                        key={vehicle.id}
                        className={cn(
                          'border-white/[0.06] hover:bg-white/[0.03]',
                          isExpired && 'bg-rose-400/[0.04]',
                          isExpiringSoon && 'bg-amber-400/[0.04]'
                        )}
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
                        <TableCell className="text-white/55">
                          {vehicle.insuranceCompany || 'N/A'}
                        </TableCell>
                        <TableCell className="text-white/55">
                          {vehicle.insurancePolicyNumber || 'N/A'}
                        </TableCell>
                        <TableCell className="text-white/70">
                          {formatInsuranceExpiry(vehicle.insuranceExpiryDate)}
                        </TableCell>
                        <TableCell>{getInsuranceStatusBadge(vehicle)}</TableCell>
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
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" className="hidden md:flex" />
        </ScrollArea>

        {!loading && (
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
