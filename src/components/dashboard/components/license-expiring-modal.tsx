// components/dashboard/components/license-expiring-modal.tsx
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
import { Share2, Search, Calendar, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ModalTableSkeleton } from './modal-table-skeleton';
import { ModalPagination } from './modal-pagination';
import type { ClientWithMetrics } from '@/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { StaggerTableRow } from '@/components/animations/modern-transitions';

interface LicenseExpiringModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  clients: ClientWithMetrics[];
  loading?: boolean;
}

export function LicenseExpiringModal({
  isOpen,
  onClose,
  title,
  clients = [],
  loading = false
}: LicenseExpiringModalProps) {
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
    data: clients,
    searchFields: (client) => [
      `${client.firstname} ${client.lastname}`,
      client.email || '',
      client.licenseNumber || ''
    ],
    sortFn: (a, b) => {
      // Ordenar por fecha de vencimiento más próxima
      const dateA = a.licenseExpiry ? new Date(a.licenseExpiry).getTime() : Infinity;
      const dateB = b.licenseExpiry ? new Date(b.licenseExpiry).getTime() : Infinity;
      return dateA - dateB;
    },
    initialPageSize: 20
  });

  const handleViewClient = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}/transactions`);
    onClose();
  };

  const formatLicenseExpiry = (dateString: string | undefined) => {
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

  const getLicenseStatusBadge = (client: ClientWithMetrics) => {
    const days = getDaysUntilExpiry(client.licenseExpiry);

    if (days === null) {
      return <Badge variant="secondary">N/A</Badge>;
    }

    if (days < 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
          Vencida ({Math.abs(days)} días)
        </Badge>
      );
    }

    if (days <= 30) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="w-3 h-3" />
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

    const licensesList = filteredData
      .map(client => {
        const expiryDate = formatLicenseExpiry(client.licenseExpiry);
        const days = getDaysUntilExpiry(client.licenseExpiry);
        const daysText = days !== null
          ? (days < 0 ? `Vencida hace ${Math.abs(days)} días` : `Vence en ${days} días`)
          : 'N/A';
        return `${client.firstname} ${client.lastname}: ${expiryDate} (${daysText})`;
      })
      .join('\n');

    const shareText = `${title}
Fecha: ${date}

${licensesList}

Total de licencias: ${filteredData.length}`;

    shareContent({
      title: `Resumen de Licencias: ${title}`,
      text: shareText,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {totalResults} licencia{totalResults !== 1 ? 's' : ''} por vencer o vencida{totalResults !== 1 ? 's' : ''}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Barra de búsqueda */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, email o número de licencia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {filteredData.length !== clients.length && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Badge variant="secondary" className="text-xs">
                {filteredData.length} de {clients.length}
              </Badge>
            </div>
          )}
        </div>

        {/* Tabla con scroll */}
        <ScrollArea className="flex-1 -mx-6 min-h-0">
          <div className="min-w-[700px] px-6">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Número de Licencia</TableHead>
                <TableHead>Fecha de Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <ModalTableSkeleton rows={5} columns={5} />
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No se encontraron licencias' : 'No hay licencias para mostrar'}
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {/* React 19: StaggerContainer for animated rows */}
                  {paginatedData.map((client) => {
                    const days = getDaysUntilExpiry(client.licenseExpiry);
                    const isExpired = days !== null && days < 0;
                    const isExpiringSoon = days !== null && days >= 0 && days <= 30;

                    return (
                      <StaggerTableRow
                        key={client.id}
                        className={cn(
                          "hover:bg-gray-50 dark:hover:bg-slate-800/50",
                          isExpired && "bg-red-50 dark:bg-red-900/10",
                          isExpiringSoon && "bg-orange-50 dark:bg-orange-900/10"
                        )}
                      >
                          <TableCell className="font-medium">
                            {client.firstname} {client.lastname}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            {client.licenseNumber || 'N/A'}
                          </TableCell>
                          <TableCell>
                            {formatLicenseExpiry(client.licenseExpiry)}
                          </TableCell>
                          <TableCell>
                            {getLicenseStatusBadge(client)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewClient(client.id)}
                            >
                              Ver Cliente
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
            Compartir Lista
          </Button>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
