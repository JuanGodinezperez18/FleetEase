// components/dashboard/components/insurance-expiring-modal.tsx
'use client';

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useShareContent } from '@/hooks/use-share-content';
import { useModalData } from '@/hooks/use-modal-data';
import { Share2, Search, Shield, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  loading = false
}: InsuranceExpiringModalProps) {
  const router = useRouter();
  const { shareContent, isSharing } = useShareContent();

  // ✅ Hook mejorado con paginación
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
    showingTo
  } = useModalData({
    data: vehicles,
    searchFields: (vehicle) => [
      vehicle.alias || '',
      vehicle.plate,
      vehicle.make || '',
      vehicle.model || '',
      vehicle.insuranceCompany || ''
    ],
    sortFn: (a, b) => {
      // Ordenar por fecha de vencimiento más próxima
      const dateA = a.insuranceExpiryDate ? new Date(a.insuranceExpiryDate).getTime() : Infinity;
      const dateB = b.insuranceExpiryDate ? new Date(b.insuranceExpiryDate).getTime() : Infinity;
      return dateA - dateB;
    },
    initialPageSize: 20
  });

  const handleViewVehicle = (vehicleId: string) => {
    router.push(`/dashboard/vehicles/${vehicleId}`);
    onClose();
  };

  const formatInsuranceExpiry = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = parseISO(dateString);
      return format(date, "d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  const getDaysUntilExpiry = (dateString: string | undefined) => {
    if (!dateString) return null;
    try {
      const expiryDate = parseISO(dateString);
      const today = new Date();
      return differenceInDays(expiryDate, today);
    } catch {
      return null;
    }
  };

  const getInsuranceStatusBadge = (vehicle: VehicleData) => {
    const days = getDaysUntilExpiry(vehicle.insuranceExpiryDate);

    if (days === null) {
      return <Badge variant="secondary">N/A</Badge>;
    }

    if (days < 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          Vencido ({Math.abs(days)} días)
        </Badge>
      );
    }

    if (days <= 7) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          {days} {days === 1 ? 'día' : 'días'}
        </Badge>
      );
    }

    if (days <= 30) {
      return (
        <Badge variant="default" className="bg-orange-600 gap-1">
          {days} {days === 1 ? 'día' : 'días'}
        </Badge>
      );
    }

    return (
      <Badge variant="default">
        {days} {days === 1 ? 'día' : 'días'}
      </Badge>
    );
  };

  const handleShare = () => {
    const date = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const insurancesList = filteredData
      .map(vehicle => {
        const expiryDate = formatInsuranceExpiry(vehicle.insuranceExpiryDate);
        const days = getDaysUntilExpiry(vehicle.insuranceExpiryDate);
        const daysText = days !== null
          ? (days < 0 ? `Vencido hace ${Math.abs(days)} días` : `Vence en ${days} días`)
          : 'N/A';
        const vehicleName = vehicle.alias || vehicle.plate;
        return `${vehicleName}: ${expiryDate} (${daysText})`;
      })
      .join('\n');

    const shareText = `${title}
Fecha: ${date}

${insurancesList}

Total de seguros: ${filteredData.length}`;

    shareContent({
      title: `Resumen de Seguros: ${title}`,
      text: shareText,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {totalResults} seguro{totalResults !== 1 ? 's' : ''} por vencer o vencido{totalResults !== 1 ? 's' : ''}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Barra de búsqueda */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por alias, placa, marca o aseguradora..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {filteredData.length !== vehicles.length && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Badge variant="secondary" className="text-xs">
                {filteredData.length} de {vehicles.length}
              </Badge>
            </div>
          )}
        </div>

        {/* Tabla con scroll */}
        <ScrollArea className="flex-1 -mx-6 min-h-0">
          <div className="min-w-[900px] px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Aseguradora</TableHead>
                  <TableHead>Póliza</TableHead>
                  <TableHead>Fecha de Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <ModalTableSkeleton rows={5} columns={7} />
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No se encontraron seguros' : 'No hay seguros para mostrar'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((vehicle) => {
                    const days = getDaysUntilExpiry(vehicle.insuranceExpiryDate);
                    const isExpired = days !== null && days < 0;
                    const isExpiringSoon = days !== null && days >= 0 && days <= 30;

                    return (
                      <TableRow
                        key={vehicle.id}
                        className={cn(
                          "hover:bg-gray-50 dark:hover:bg-slate-800/50",
                          isExpired && "bg-red-50 dark:bg-red-900/10",
                          isExpiringSoon && "bg-orange-50 dark:bg-orange-900/10"
                        )}
                      >
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {vehicle.alias || vehicle.plate}
                            </div>
                            {vehicle.make && vehicle.model && (
                              <div className="text-xs text-gray-500">
                                {vehicle.make} {vehicle.model}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {vehicle.plate}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {vehicle.insuranceCompany || 'N/A'}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {vehicle.insurancePolicyNumber || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {formatInsuranceExpiry(vehicle.insuranceExpiryDate)}
                        </TableCell>
                        <TableCell>
                          {getInsuranceStatusBadge(vehicle)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewVehicle(vehicle.id)}
                          >
                            Ver Detalle
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Paginación */}
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

        <DialogFooter className="shrink-0">
          <Button
            variant="outline"
            onClick={handleShare}
            disabled={isSharing || paginatedData.length === 0}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartir Lista
          </Button>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
