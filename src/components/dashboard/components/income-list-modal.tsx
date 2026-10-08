// components/dashboard/components/income-list-modal.tsx
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
import { Share2, Search, DollarSign, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ModalTableSkeleton } from './modal-table-skeleton';
import { ModalPagination } from './modal-pagination';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { FinancialRecord } from '@/types';
import { StaggerTableRow } from '@/components/animations/modern-transitions';
import { useData } from '@/contexts/data-provider';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  Efectivo: 'Efectivo',
  Transferencia: 'Transferencia',
  'Uso de Depósito en Garantía': 'Depósito en Garantía',
  Tarjeta: 'Tarjeta',
  Cheque: 'Cheque',
  credito: 'Crédito',
  'Retiro sin tarjeta': 'Retiro sin tarjeta',
};

interface IncomeListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  incomes: FinancialRecord[];
  loading?: boolean;
}

export function IncomeListModal({
  isOpen,
  onClose,
  title = 'Ingresos del Mes',
  incomes = [],
  loading = false,
}: IncomeListModalProps) {
  const router = useRouter();
  const { shareContent, isSharing } = useShareContent();
  const { financialCategories } = useData();

  const enrichedIncomes = useMemo(() => {
    const categoryMap = new Map<string, string>();
    financialCategories?.forEach(cat => categoryMap.set(cat.id, cat.name));

    return incomes.map(income => {
      const categoryName =
        income.categoryId && categoryMap.has(income.categoryId)
          ? categoryMap.get(income.categoryId)!
          : income.category || 'Sin categoría';
      const paymentMethodLabel = income.paymentMethod
        ? PAYMENT_METHOD_LABELS[income.paymentMethod] || income.paymentMethod
        : 'No especificado';
      return { ...income, categoryName, paymentMethodLabel };
    });
  }, [incomes, financialCategories]);

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
    data: enrichedIncomes,
    searchFields: (income: any) => [
      income.description,
      income.categoryName,
      income.paymentMethodLabel,
    ],
    sortFn: (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    initialPageSize: 20,
  });

  const totals = useMemo(() => {
    const totalAmount = filteredData.reduce((sum, income) => sum + income.amount, 0);
    const byCategory = filteredData.reduce(
      (acc, income: any) => {
        const category = income.categoryName || 'Sin categoría';
        acc[category] = (acc[category] || 0) + income.amount;
        return acc;
      },
      {} as Record<string, number>
    );
    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    return {
      totalAmount,
      topCategory: sorted.length > 0 ? sorted[0] : undefined,
    };
  }, [filteredData]);

  const handleViewTransaction = (incomeId: string) => {
    router.push(`/dashboard/finanzas?transaction=${incomeId}`);
    onClose();
  };

  const handleShare = () => {
    const date = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const incomesText = filteredData
      .map((income: any) => {
        const dateStr = format(new Date(income.date), 'dd/MM/yyyy', { locale: es });
        return `${dateStr} - ${income.categoryName}: ${formatCurrency(income.amount)} (${income.description})`;
      })
      .join('\n');
    shareContent({
      title: `Reporte de Ingresos: ${title}`,
      text: `${title}\nFecha: ${date}\n\n${incomesText}\n\nTotal: ${formatCurrency(totals.totalAmount)}`,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col gap-4 overflow-hidden rounded-none p-4 sm:h-[85vh] sm:max-h-[85vh] sm:max-w-5xl sm:rounded-lg sm:p-6">
        <DialogHeader>
          <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300">
                <TrendingUp className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {totalResults} transacción{totalResults !== 1 ? 'es' : ''} de ingreso
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-300">
                <DollarSign className="h-3 w-3" strokeWidth={1.75} />
                Total: {formatCurrency(totals.totalAmount)}
              </span>
              {totals.topCategory && (
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-white/55">
                  Top: {totals.topCategory[0]}
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
            placeholder="Buscar por descripción, categoría o método..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-10 rounded-xl border-white/10 bg-white/[0.03] pl-9 text-white placeholder:text-white/30 focus-visible:ring-[#d7ff3f]/30"
          />
          {filteredData.length !== incomes.length && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/50">
              {filteredData.length} de {incomes.length}
            </span>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="min-w-[800px]">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/40">Fecha</TableHead>
                  <TableHead className="text-white/40">Categoría</TableHead>
                  <TableHead className="text-white/40">Descripción</TableHead>
                  <TableHead className="text-white/40">Método</TableHead>
                  <TableHead className="text-right text-white/40">Monto</TableHead>
                  <TableHead className="text-right text-white/40">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <ModalTableSkeleton rows={5} columns={6} />
                ) : paginatedData.length === 0 ? (
                  <TableRow className="border-white/[0.06]">
                    <TableCell colSpan={6} className="py-10 text-center text-white/40">
                      {searchTerm ? 'No se encontraron ingresos' : 'No hay ingresos para mostrar'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((income: any) => (
                    <StaggerTableRow
                      key={income.id}
                      className="border-white/[0.06] hover:bg-white/[0.03]"
                    >
                      <TableCell className="text-sm text-white/50">
                        {format(new Date(income.date), 'dd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/60">
                          {income.categoryName || 'Sin categoría'}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate font-medium text-white/85">
                        {income.description}
                      </TableCell>
                      <TableCell className="text-sm text-white/50">
                        {income.paymentMethodLabel || 'No especificado'}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums text-emerald-300">
                        {formatCurrency(income.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewTransaction(income.id)}
                          className="h-8 rounded-lg border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
                        >
                          Ver detalles
                        </Button>
                      </TableCell>
                    </StaggerTableRow>
                  ))
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
