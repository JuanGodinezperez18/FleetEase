// components/dashboard/components/client-list-modal.tsx
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
import { formatCurrency, cn } from '@/lib/utils';
import { useShareContent } from '@/hooks/use-share-content';
import { useModalData } from '@/hooks/use-modal-data';
import { Share2, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ModalTableSkeleton } from './modal-table-skeleton';
import { ModalPagination } from './modal-pagination';
import type { ClientWithMetrics } from '@/types';
import { StaggerTableRow } from '@/components/animations/modern-transitions';
import { EmptyState } from '@/components/common/empty-state';

interface ClientListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  clients: ClientWithMetrics[];
  loading?: boolean;
}

export function ClientListModal({
  isOpen,
  onClose,
  title,
  clients = [],
  loading = false,
}: ClientListModalProps) {
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
    searchFields: client => [`${client.firstname} ${client.lastname}`, client.email || ''],
    sortFn: (a, b) => b.balance - a.balance,
    initialPageSize: 20,
  });

  const totalBalance = useMemo(
    () => filteredData.reduce((sum, client) => sum + client.balance, 0),
    [filteredData]
  );

  const handleViewClient = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}/transactions`);
    onClose();
  };

  const handleShare = () => {
    const date = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const balancesText = filteredData
      .map(client => `${client.firstname} ${client.lastname}: ${formatCurrency(client.balance)}`)
      .join('\n');
    const shareText = `${title}\nFecha: ${date}\n\n${balancesText}\n\nSaldo Total: ${formatCurrency(totalBalance)}`;
    shareContent({
      title: `Resumen de Clientes: ${title}`,
      text: shareText,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-4 overflow-hidden rounded-none p-4 sm:h-[85vh] sm:max-h-[85vh] sm:max-w-5xl sm:rounded-lg sm:p-6">
        <DialogHeader>
          <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
                <Users className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {totalResults} cliente{totalResults !== 1 ? 's' : ''}
                </DialogDescription>
              </div>
            </div>

            {totalBalance !== 0 && (
              <span
                className={cn(
                  'inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums',
                  totalBalance > 0
                    ? 'border-rose-400/20 bg-rose-400/10 text-rose-300'
                    : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                )}
              >
                Total: {formatCurrency(totalBalance)}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="relative shrink-0">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
            strokeWidth={1.75}
          />
          <Input
            placeholder="Buscar por nombre o email..."
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
          <div className="min-w-[560px]">
            {loading ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/40">Cliente</TableHead>
                    <TableHead className="text-white/40">Email</TableHead>
                    <TableHead className="text-right text-white/40">Saldo</TableHead>
                    <TableHead className="text-right text-white/40">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <ModalTableSkeleton rows={5} columns={4} />
                </TableBody>
              </Table>
            ) : paginatedData.length === 0 ? (
              <EmptyState
                illustration={searchTerm ? 'search' : 'clients'}
                title={searchTerm ? 'No se encontraron clientes' : 'No hay clientes para mostrar'}
                description={
                  searchTerm
                    ? 'Prueba con otro nombre o email.'
                    : 'Cuando registres clientes, verás aquí sus saldos y estado.'
                }
                className="min-h-[280px] border-0 bg-transparent"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/40">Cliente</TableHead>
                    <TableHead className="text-white/40">Email</TableHead>
                    <TableHead className="text-right text-white/40">Saldo</TableHead>
                    <TableHead className="text-right text-white/40">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map(client => (
                    <StaggerTableRow
                      key={client.id}
                      className="border-white/[0.06] hover:bg-white/[0.03]"
                    >
                      <TableCell className="font-medium text-white/90">
                        {client.firstname} {client.lastname}
                      </TableCell>
                      <TableCell className="text-white/50">{client.email || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'font-semibold tabular-nums',
                            client.balance > 0 ? 'text-rose-300' : 'text-emerald-300'
                          )}
                        >
                          {formatCurrency(client.balance)}
                        </span>
                      </TableCell>
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
