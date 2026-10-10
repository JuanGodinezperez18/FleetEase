// components/dashboard/components/license-expiring-modal.tsx
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useShareContent } from '@/hooks/use-share-content';
import { useModalData } from '@/hooks/use-modal-data';
import { Share2, Search, Calendar, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  loading = false,
}: LicenseExpiringModalProps) {
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
    data: clients,
    searchFields: client => [
      `${client.firstname} ${client.lastname}`,
      client.email || '',
      client.licenseNumber || '',
    ],
    sortFn: (a, b) => {
      const dateA = a.licenseExpiry ? new Date(a.licenseExpiry).getTime() : Infinity;
      const dateB = b.licenseExpiry ? new Date(b.licenseExpiry).getTime() : Infinity;
      return dateA - dateB;
    },
    initialPageSize: 20,
  });

  const handleViewClient = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}`);
    onClose();
  };

  const formatLicenseExpiry = (dateString: string | undefined) => {
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

  const getLicenseStatusBadge = (client: ClientWithMetrics) => {
    const days = getDaysUntilExpiry(client.licenseExpiry);
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
          Vencida ({Math.abs(days)} d)
        </span>
      );
    }
    if (days <= 30) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
          <AlertTriangle className="h-3 w-3" strokeWidth={1.75} />
          {days} {days === 1 ? 'día' : 'días'}
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
    const licensesList = filteredData
      .map(client => {
        const expiryDate = formatLicenseExpiry(client.licenseExpiry);
        const days = getDaysUntilExpiry(client.licenseExpiry);
        const daysText =
          days !== null
            ? days < 0
              ? `Vencida hace ${Math.abs(days)} días`
              : `Vence en ${days} días`
            : 'N/A';
        return `${client.firstname} ${client.lastname}: ${expiryDate} (${daysText})`;
      })
      .join('\n');
    shareContent({
      title: `Resumen de Licencias: ${title}`,
      text: `${title}\nFecha: ${date}\n\n${licensesList}\n\nTotal: ${filteredData.length}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="flex h-[min(88dvh,760px)] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-3 overflow-hidden p-4 sm:gap-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/[0.08] text-amber-300">
              <Calendar className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">
                {totalResults} licencia{totalResults !== 1 ? 's' : ''} por vencer o vencida
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
            placeholder="Buscar por nombre, email o número de licencia..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-10 rounded-xl border-white/10 bg-white/[0.03] pl-9 text-white placeholder:text-white/30 focus-visible:ring-[#d7ff3f]/30"
          />
          {filteredData.length !== clients.length && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/50">
              {filteredData.length} de {clients.length}
            </span>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="min-w-[640px]">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/40">Cliente</TableHead>
                  <TableHead className="text-white/40">Licencia</TableHead>
                  <TableHead className="text-white/40">Vencimiento</TableHead>
                  <TableHead className="text-white/40">Estado</TableHead>
                  <TableHead className="text-right text-white/40">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <ModalTableSkeleton rows={5} columns={5} />
                ) : paginatedData.length === 0 ? (
                  <TableRow className="border-white/[0.06]">
                    <TableCell colSpan={5} className="py-10 text-center text-white/40">
                      {searchTerm ? 'No se encontraron licencias' : 'No hay licencias para mostrar'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map(client => {
                    const days = getDaysUntilExpiry(client.licenseExpiry);
                    const isExpired = days !== null && days < 0;
                    const isExpiringSoon = days !== null && days >= 0 && days <= 30;

                    return (
                      <StaggerTableRow
                        key={client.id}
                        className={cn(
                          'border-white/[0.06] hover:bg-white/[0.03]',
                          isExpired && 'bg-rose-400/[0.04]',
                          isExpiringSoon && 'bg-amber-400/[0.04]'
                        )}
                      >
                        <TableCell className="font-medium text-white/90">
                          {client.firstname} {client.lastname}
                        </TableCell>
                        <TableCell className="text-white/55">
                          {client.licenseNumber || 'N/A'}
                        </TableCell>
                        <TableCell className="text-white/70">
                          {formatLicenseExpiry(client.licenseExpiry)}
                        </TableCell>
                        <TableCell>{getLicenseStatusBadge(client)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewClient(client.id)}
                            className="h-8 rounded-lg border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
                          >
                            Ver cliente
                          </Button>
                        </TableCell>
                      </StaggerTableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
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

        <DialogFooter className="shrink-0 flex-col gap-2 border-t border-white/[0.06] pt-3 sm:flex-row sm:pt-4">
          <Button
            variant="outline"
            onClick={handleShare}
            disabled={isSharing || paginatedData.length === 0}
            className="h-10 w-full rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white sm:w-auto"
          >
            <Share2 className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Compartir lista
          </Button>
          <Button
            onClick={onClose}
            className="h-10 w-full rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e] sm:w-auto"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
