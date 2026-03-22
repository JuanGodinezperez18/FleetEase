// components/dashboard/components/income-list-modal.tsx
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
import { Share2, Search, DollarSign, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ModalTableSkeleton } from './modal-table-skeleton';
import { ModalPagination } from './modal-pagination';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { FinancialRecord } from '@/types';
import { StaggerTableRow } from '@/components/animations/modern-transitions';
import { useData } from '@/contexts/data-provider';

// Mapeo de métodos de pago a etiquetas amigables
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  'Efectivo': 'Efectivo',
  'Transferencia': 'Transferencia',
  'Uso de Depósito en Garantía': 'Depósito en Garantía',
  'Tarjeta': 'Tarjeta',
  'Cheque': 'Cheque',
  'credito': 'Crédito',
  'Retiro sin tarjeta': 'Retiro sin tarjeta'
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
  loading = false
}: IncomeListModalProps) {
  const router = useRouter();
  const { shareContent, isSharing } = useShareContent();
  const { financialCategories } = useData();

  // Enriquecer ingresos con nombres correctos de categoría y método de pago
  const enrichedIncomes = useMemo(() => {
    const categoryMap = new Map<string, string>();
    if (financialCategories) {
      financialCategories.forEach(cat => {
        categoryMap.set(cat.id, cat.name);
      });
    }

    return incomes.map(income => {
      // Obtener nombre de categoría usando categoryId
      const categoryName = income.categoryId && categoryMap.has(income.categoryId)
        ? categoryMap.get(income.categoryId)!
        : (income.category || 'Sin Categoría');

      // Obtener etiqueta amigable del método de pago
      const paymentMethodLabel = income.paymentMethod
        ? (PAYMENT_METHOD_LABELS[income.paymentMethod] || income.paymentMethod)
        : 'No especificado';

      return {
        ...income,
        categoryName,
        paymentMethodLabel
      };
    });
  }, [incomes, financialCategories]);

  // Hook con paginación
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
    data: enrichedIncomes,
    searchFields: (income: any) => [
      income.description,
      income.categoryName,
      income.paymentMethodLabel
    ],
    sortFn: (a, b) => {
      // Ordenar por fecha descendente (más recientes primero)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    },
    initialPageSize: 20
  });

  // Cálculos totales
  const totals = useMemo(() => {
    const totalAmount = filteredData.reduce((sum, income) => sum + income.amount, 0);

    // Agrupar por categoría
    const byCategory = filteredData.reduce((acc, income) => {
      const category = income.category || 'Sin Categoría';
      acc[category] = (acc[category] || 0) + income.amount;
      return acc;
    }, {} as Record<string, number>);

    // Agrupar por método de pago
    const byPaymentMethod = filteredData.reduce((acc, income) => {
      const method = income.paymentMethod || 'No especificado';
      acc[method] = (acc[method] || 0) + income.amount;
      return acc;
    }, {} as Record<string, number>);

    const sortedCategories = Object.entries(byCategory).sort((a, b) => (b[1] as number) - (a[1] as number));

    return {
      totalAmount,
      categoriesCount: Object.keys(byCategory).length,
      topCategory: sortedCategories.length > 0 ? sortedCategories[0] : undefined,
      byCategory,
      byPaymentMethod
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
      day: 'numeric'
    });

    const incomesText = filteredData
      .map(income => {
        const dateStr = format(new Date(income.date), 'dd/MM/yyyy', { locale: es });
        return `${dateStr} - ${income.category}: ${formatCurrency(income.amount)} (${income.description})`;
      })
      .join('\n');

    const shareText = `${title}
Fecha: ${date}

${incomesText}

Total de Ingresos: ${formatCurrency(totals.totalAmount)}
Categorías: ${totals.categoriesCount}`;

    shareContent({
      title: `Reporte de Ingresos: ${title}`,
      text: shareText,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {totalResults} transacción{totalResults !== 1 ? 'es' : ''} de ingreso
                </DialogDescription>
              </div>
            </div>

            {/* Estadísticas rápidas */}
            <div className="flex gap-2">
              <Badge variant="default" className="text-xs bg-green-600">
                <DollarSign className="w-3 h-3 mr-1" />
                Total: {formatCurrency(totals.totalAmount)}
              </Badge>
              {totals.topCategory && (
                <Badge variant="outline" className="text-xs">
                  Top: {totals.topCategory[0]}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Barra de búsqueda */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por descripción, categoría o método de pago..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {filteredData.length !== incomes.length && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Badge variant="secondary" className="text-xs">
                {filteredData.length} de {incomes.length}
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
                  <TableHead>Fecha</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Método de Pago</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <ModalTableSkeleton rows={5} columns={6} />
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No se encontraron ingresos' : 'No hay ingresos para mostrar'}
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* React 19: StaggerContainer for animated rows */}
                    {paginatedData.map((income) => (
                      <StaggerTableRow key={income.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                            {format(new Date(income.date), 'dd MMM yyyy', { locale: es })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {income.category || 'Sin Categoría'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium max-w-xs truncate">
                            {income.description}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                            {income.paymentMethod || 'No especificado'}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-green-600">
                              {formatCurrency(income.amount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewTransaction(income.id)}
                            >
                              Ver Detalles
                            </Button>
                          </TableCell>
                        </StaggerTableRow>
                    ))}
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
