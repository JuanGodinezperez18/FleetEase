
// components/dashboard/components/vehicle-list-modal.tsx
'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useShareContent } from '@/hooks/use-share-content';
import { useModalData } from '@/hooks/use-modal-data';
import { Share2, Search, Car, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ModalTableSkeleton } from './modal-table-skeleton';
import { ModalPagination } from './modal-pagination';
import { StaggerTableRow } from '@/components/animations/modern-transitions';

interface VehicleData {
  id: string;
  alias?: string;
  plate: string;
  make?: string;
  model?: string;
  currentMileage?: number;
  nextMaintenanceAt?: number;
  lastMaintenanceDate?: string;
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

export function VehicleListModal({
  isOpen,
  onClose,
  title = 'Vehículos',
  vehicles = [],
  loading = false
}: VehicleListModalProps) {
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
      vehicle.model || ''
    ],
    sortFn: (a, b) => {
      // Priorizar por estado de mantenimiento
      const aStatus = getMaintenanceStatus(a);
      const bStatus = getMaintenanceStatus(b);
      const priority = { overdue: 0, soon: 1, ok: 2 };
      return priority[aStatus] - priority[bStatus];
    },
    initialPageSize: 20
  });

  // ✅ Función para determinar estado de mantenimiento
  function getMaintenanceStatus(vehicle: VehicleData): 'overdue' | 'soon' | 'ok' {
    if (!vehicle.currentMileage || !vehicle.nextMaintenanceAt) return 'ok';
    
    const remaining = vehicle.nextMaintenanceAt - vehicle.currentMileage;
    if (remaining <= 0) return 'overdue';
    if (remaining <= 500) return 'soon';
    return 'ok';
  }

  // ✅ Estadísticas del modal
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
      day: 'numeric'
    });
    
    const vehiclesText = filteredData
      .map(vehicle => {
        const status = getMaintenanceStatus(vehicle);
        const statusText = status === 'overdue' ? '⚠️ VENCIDO' : status === 'soon' ? '⏰ PRÓXIMO' : '✅ OK';
        return `${vehicle.alias || vehicle.plate} - ${statusText}`;
      })
      .join('');
    
    const shareText = `${title}
Fecha: ${date}

${vehiclesText}

Total: ${filteredData.length} vehículos`;
    
    shareContent({
      title: `Reporte de Vehículos: ${title}`,
      text: shareText,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {totalResults} vehículo{totalResults !== 1 ? 's' : ''}
                </DialogDescription>
              </div>
            </div>

            {/* Estadísticas rápidas */}
            <div className="flex gap-2">
              {stats.overdue > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {stats.overdue} Vencido{stats.overdue > 1 ? 's' : ''}
                </Badge>
              )}
              {stats.soon > 0 && (
                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                  <Clock className="w-3 h-3 mr-1" />
                  {stats.soon} Próximo{stats.soon > 1 ? 's' : ''}
                </Badge>
              )}
              {stats.ok > 0 && (
                <Badge variant="default" className="text-xs bg-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {stats.ok} OK
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Barra de búsqueda */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por alias, placa, marca o modelo..."
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
          <div className="min-w-[800px] px-6">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehículo</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead className="text-right">Kilometraje</TableHead>
                <TableHead className="text-right">Próximo Mant.</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <ModalTableSkeleton rows={5} columns={6} />
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No se encontraron vehículos' : 'No hay vehículos para mostrar'}
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {/* React 19: StaggerContainer for animated rows */}
                  {paginatedData.map((vehicle) => {
                    const status = getMaintenanceStatus(vehicle);
                    const remaining = vehicle.nextMaintenanceAt && vehicle.currentMileage
                      ? vehicle.nextMaintenanceAt - vehicle.currentMileage
                      : null;

                    return (
                      <StaggerTableRow key={vehicle.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
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
                        <TableCell className="text-right font-medium">
                          {vehicle.currentMileage?.toLocaleString('es-MX') || 'N/A'} km
                        </TableCell>
                        <TableCell className="text-right">
                          {vehicle.nextMaintenanceAt ? (
                            <div className={cn(
                              'font-medium',
                              status === 'overdue' && 'text-red-600',
                              status === 'soon' && 'text-yellow-600',
                              status === 'ok' && 'text-gray-600'
                            )}>
                              {vehicle.nextMaintenanceAt.toLocaleString('es-MX')} km
                              {remaining !== null && (
                                <div className="text-xs">
                                  ({remaining > 0 ? `faltan ${remaining}` : `excedido ${Math.abs(remaining)}`} km)
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">No configurado</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {status === 'overdue' && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Vencido
                            </Badge>
                          )}
                          {status === 'soon' && (
                            <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                              <Clock className="w-3 h-3 mr-1" />
                              Próximo
                            </Badge>
                          )}
                          {status === 'ok' && (
                            <Badge variant="default" className="text-xs bg-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              OK
                            </Badge>
                          )}
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
                      </StaggerTableRow>
                    );
                  })}
                </>
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
            Compartir Reporte
          </Button>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}