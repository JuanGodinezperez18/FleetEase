
// components/dashboard/components/client-list-modal.tsx
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
import { Share2, Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ModalTableSkeleton } from './modal-table-skeleton';
import { ModalPagination } from './modal-pagination';
import type { ClientWithMetrics } from '@/types';
import { StaggerTableRow } from '@/components/animations/modern-transitions';

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
  loading = false
}: ClientListModalProps) {
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
      client.email || ''
    ],
    sortFn: (a, b) => b.balance - a.balance,
    initialPageSize: 20
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
      day: 'numeric'
    });
    
    const balancesText = filteredData
      .map(client => `${client.firstname} ${client.lastname}: ${formatCurrency(client.balance)}`)
      .join('');
    
    const shareText = `${title}
Fecha: ${date}

${balancesText}

Saldo Total: ${formatCurrency(totalBalance)}`;
    
    shareContent({
      title: `Resumen de Clientes: ${title}`,
      text: shareText,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {totalResults} cliente{totalResults !== 1 ? 's' : ''}
                </DialogDescription>
              </div>
            </div>

            {totalBalance !== 0 && (
              <Badge variant={totalBalance > 0 ? 'destructive' : 'default'} className="text-sm">
                Total: {formatCurrency(totalBalance)}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Barra de búsqueda */}
        <div className="relative shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre o email..."
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
          <div className="min-w-[600px] px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <ModalTableSkeleton rows={5} columns={4} />
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      {searchTerm ? 'No se encontraron clientes' : 'No hay clientes para mostrar'}
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* React 19: Animated rows with StaggerTableRow */}
                    {paginatedData.map((client) => (
                      <StaggerTableRow key={client.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                        <TableCell className="font-medium">
                          {client.firstname} {client.lastname}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {client.email || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            'font-semibold',
                            client.balance > 0 ? 'text-destructive' : 'text-green-600'
                          )}>
                            {formatCurrency(client.balance)}
                          </span>
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
            Compartir Lista
          </Button>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}