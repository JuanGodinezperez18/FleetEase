// components/dashboard/components/credit-list-modal.tsx
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
import { Share2, Search, CreditCard, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ModalTableSkeleton } from './modal-table-skeleton';
import { ModalPagination } from './modal-pagination';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { StaggerTableRow } from '@/components/animations/modern-transitions';
import { EmptyState } from '@/components/common/empty-state';

interface CreditData {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  balance: number;
  createdAt: string;
  dueDate?: string;
  status?: 'active' | 'paid' | 'overdue';
  paymentsCount?: number;
  totalPayments?: number;
}

interface CreditListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  credits: CreditData[];
  loading?: boolean;
}

const STATUS_BADGE = {
  overdue:
    'inline-flex items-center gap-1 rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300',
  active:
    'inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300',
  paid:
    'inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300',
} as const;

export function CreditListModal({
  isOpen,
  onClose,
  title = 'Créditos',
  credits = [],
  loading = false,
}: CreditListModalProps) {
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
    data: credits,
    searchFields: credit => [credit.clientName],
    sortFn: (a, b) => {
      const statusPriority = { overdue: 0, active: 1, paid: 2 };
      const aPriority = statusPriority[a.status || 'active'];
      const bPriority = statusPriority[b.status || 'active'];
      if (aPriority !== bPriority) return aPriority - bPriority;
      return b.balance - a.balance;
    },
    initialPageSize: 20,
  });

  const totals = useMemo(() => {
    const totalLent = filteredData.reduce((sum, c) => sum + c.amount, 0);
    const totalPending = filteredData.reduce((sum, c) => sum + c.balance, 0);
    const activeCount = filteredData.filter(c => c.status === 'active').length;
    const overdueCount = filteredData.filter(c => c.status === 'overdue').length;
    return { totalLent, totalPending, activeCount, overdueCount };
  }, [filteredData]);

  const handleViewCredit = (creditId: string) => {
    router.push(`/dashboard/credits/${creditId}`);
    onClose();
  };

  const handleShare = () => {
    const date = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const creditsText = filteredData
      .map(
        credit =>
          `${credit.clientName}: ${formatCurrency(credit.balance)} pendiente`
      )
      .join('\n');
    shareContent({
      title: `Reporte de Créditos: ${title}`,
      text: `${title}\nFecha: ${date}\n\n${creditsText}\n\nTotal prestado: ${formatCurrency(totals.totalLent)}\nPendiente: ${formatCurrency(totals.totalPending)}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-4 overflow-hidden rounded-none p-4 sm:h-[85vh] sm:max-h-[85vh] sm:max-w-5xl sm:rounded-lg sm:p-6">
        <DialogHeader>
          <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
                <CreditCard className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {totalResults} crédito{totalResults !== 1 ? 's' : ''}
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {totals.overdueCount > 0 && (
                <span className={STATUS_BADGE.overdue}>
                  <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                  {totals.overdueCount} vencido{totals.overdueCount > 1 ? 's' : ''}
                </span>
              )}
              {totals.activeCount > 0 && (
                <span className={STATUS_BADGE.active}>
                  <Clock className="h-3 w-3" strokeWidth={1.75} />
                  {totals.activeCount} activo{totals.activeCount > 1 ? 's' : ''}
                </span>
              )}
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-white/70">
                Pendiente: {formatCurrency(totals.totalPending)}
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
            placeholder="Buscar por nombre de cliente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-10 rounded-xl border-white/10 bg-white/[0.03] pl-9 text-white placeholder:text-white/30 focus-visible:ring-[#d7ff3f]/30"
          />
          {filteredData.length !== credits.length && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/50">
              {filteredData.length} de {credits.length}
            </span>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="min-w-[800px]">
            {loading ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/40">Cliente</TableHead>
                    <TableHead className="text-right text-white/40">Prestado</TableHead>
                    <TableHead className="text-right text-white/40">Pendiente</TableHead>
                    <TableHead className="text-center text-white/40">Progreso</TableHead>
                    <TableHead className="text-white/40">Inicio</TableHead>
                    <TableHead className="text-center text-white/40">Estado</TableHead>
                    <TableHead className="text-right text-white/40">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <ModalTableSkeleton rows={5} columns={7} />
                </TableBody>
              </Table>
            ) : paginatedData.length === 0 ? (
              <EmptyState
                illustration={searchTerm ? 'search' : 'transactions'}
                title={searchTerm ? 'No se encontraron créditos' : 'No hay créditos para mostrar'}
                description={
                  searchTerm
                    ? 'Prueba con otro nombre de cliente.'
                    : 'Cuando registres créditos, verás aquí saldos, progreso y vencimientos.'
                }
                className="min-h-[280px] border-0 bg-transparent"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-white/40">Cliente</TableHead>
                    <TableHead className="text-right text-white/40">Prestado</TableHead>
                    <TableHead className="text-right text-white/40">Pendiente</TableHead>
                    <TableHead className="text-center text-white/40">Progreso</TableHead>
                    <TableHead className="text-white/40">Inicio</TableHead>
                    <TableHead className="text-center text-white/40">Estado</TableHead>
                    <TableHead className="text-right text-white/40">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map(credit => {
                    const progress =
                      credit.amount > 0
                        ? ((credit.amount - credit.balance) / credit.amount) * 100
                        : 0;
                    const status = credit.status || 'active';

                    return (
                      <StaggerTableRow
                        key={credit.id}
                        className="border-white/[0.06] hover:bg-white/[0.03]"
                      >
                        <TableCell className="font-medium text-white/90">
                          {credit.clientName}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-white/80">
                          {formatCurrency(credit.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              'font-semibold tabular-nums',
                              credit.balance > 0 ? 'text-amber-300' : 'text-emerald-300'
                            )}
                          >
                            {formatCurrency(credit.balance)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  status === 'paid' && 'bg-emerald-400',
                                  status === 'overdue' && 'bg-rose-400',
                                  status === 'active' && 'bg-sky-400'
                                )}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-xs tabular-nums text-white/45">
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-white/50">
                          {format(new Date(credit.createdAt), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={STATUS_BADGE[status] || STATUS_BADGE.active}>
                            {status === 'overdue' && (
                              <AlertCircle className="h-3 w-3" strokeWidth={1.75} />
                            )}
                            {status === 'active' && <Clock className="h-3 w-3" strokeWidth={1.75} />}
                            {status === 'paid' && (
                              <CheckCircle className="h-3 w-3" strokeWidth={1.75} />
                            )}
                            {status === 'overdue'
                              ? 'Vencido'
                              : status === 'paid'
                                ? 'Pagado'
                                : 'Activo'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewCredit(credit.id)}
                            className="h-8 rounded-lg border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
                          >
                            Ver crédito
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
