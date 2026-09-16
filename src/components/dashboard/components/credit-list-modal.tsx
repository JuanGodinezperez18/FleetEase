
// components/dashboard/components/credit-list-modal.tsx
'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { formatCurrency, cn } from '@/lib/utils';
import { useShareContent } from '@/hooks/use-share-content';
import { useModalData } from '@/hooks/use-modal-data';
import { Share2, Search, CreditCard, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

export function CreditListModal({
  isOpen,
  onClose,
  title = 'Créditos',
  credits = [],
  loading = false
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
    showingTo
  } = useModalData({
    data: credits,
    searchFields: (credit) => [credit.clientName],
    sortFn: (a, b) => {
      const statusPriority = { overdue: 0, active: 1, paid: 2 };
      const aPriority = statusPriority[a.status || 'active'];
      const bPriority = statusPriority[b.status || 'active'];
      if (aPriority !== bPriority) return aPriority - bPriority;
      return b.balance - a.balance;
    },
    initialPageSize: 20
  });

  const totals = useMemo(() => {
    const totalLent = filteredData.reduce((sum, c) => sum + c.amount, 0);
    const totalPending = filteredData.reduce((sum, c) => sum + c.balance, 0);
    const totalPaid = totalLent - totalPending;
    const activeCount = filteredData.filter(c => c.status === 'active').length;
    const overdueCount = filteredData.filter(c => c.status === 'overdue').length;
    const paidCount = filteredData.filter(c => c.status === 'paid').length;
    return { totalLent, totalPending, totalPaid, activeCount, overdueCount, paidCount };
  }, [filteredData]);

  const handleViewCredit = (creditId: string) => {
    router.push(`/dashboard/credits/${creditId}`);
    onClose();
  };

  const handleShare = () => {
    const date = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const creditsText = filteredData
      .map(credit => {
        const status = credit.status === 'overdue' ? '⚠️' : credit.status === 'paid' ? '✅' : '⏳';
        return `${status} ${credit.clientName}: ${formatCurrency(credit.balance)} pendiente`;
      })
      .join('\n');
    const shareText = `${title}\nFecha: ${date}\n\n${creditsText}\n\nTotal Prestado: ${formatCurrency(totals.totalLent)}\nTotal Pendiente: ${formatCurrency(totals.totalPending)}`;
    shareContent({
      title: `Reporte de Créditos: ${title}`,
      text: shareText,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-[#d7ff3f]" />
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {totalResults} crédito{totalResults !== 1 ? 's' : ''}
                </DialogDescription>
              </div>
            </div>

            <div className="flex gap-2">
              {totals.overdueCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {totals.overdueCount} Vencido{totals.overdueCount > 1 ? 's' : ''}
                </Badge>
              )}
              {totals.activeCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {totals.activeCount} Activo{totals.activeCount > 1 ? 's' : ''}
                </Badge>
              )}
              <Badge variant="default" className="text-xs bg-blue-600">
                Pendiente: {formatCurrency(totals.totalPending)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre de cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {filteredData.length !== credits.length && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Badge variant="secondary" className="text-xs">
                {filteredData.length} de {credits.length}
              </Badge>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 -mx-6 min-h-0">
          <div className="min-w-[900px] px-6">
            {loading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Monto Prestado</TableHead>
                    <TableHead className="text-right">Saldo Pendiente</TableHead>
                    <TableHead className="text-center">Progreso</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
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
                description={searchTerm ? 'Prueba con otro nombre de cliente.' : 'Cuando registres créditos, verás aquí saldos, progreso y vencimientos.'}
                className="min-h-[280px] border-0 bg-transparent"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Monto Prestado</TableHead>
                    <TableHead className="text-right">Saldo Pendiente</TableHead>
                    <TableHead className="text-center">Progreso</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((credit) => {
                    const progress = ((credit.amount - credit.balance) / credit.amount) * 100;

                    return (
                      <StaggerTableRow key={credit.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <TableCell className="font-medium">
                          {credit.clientName}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(credit.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            'font-semibold',
                            credit.balance > 0 ? 'text-orange-600' : 'text-green-600'
                          )}>
                            {formatCurrency(credit.balance)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={cn(
                                  'h-2 rounded-full transition-all',
                                  credit.status === 'paid' ? 'bg-green-600' :
                                  credit.status === 'overdue' ? 'bg-red-600' :
                                  'bg-blue-600'
                                )}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600 dark:text-gray-400 w-12 text-right">
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                          {format(new Date(credit.createdAt), 'dd MMM yyyy', { locale: es })}
                        </TableCell>
                        <TableCell className="text-center">
                          {credit.status === 'overdue' && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Vencido
                            </Badge>
                          )}
                          {credit.status === 'active' && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              Activo
                            </Badge>
                          )}
                          {credit.status === 'paid' && (
                            <Badge variant="default" className="text-xs bg-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Pagado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewCredit(credit.id)}
                          >
                            Ver Crédito
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
