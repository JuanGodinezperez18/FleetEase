
// app/dashboard/partners/components/partner-balances-modal.tsx
'use client';

import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { formatCurrency, cn } from '@/lib/utils';
import { useShareContent } from '@/hooks/use-share-content';
import { useModalData } from '@/hooks/use-modal-data';
import { Share2, Search, Users, TrendingUp, TrendingDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ModalTableSkeleton } from '@/components/dashboard/components/modal-table-skeleton';
import { ModalPagination } from '@/components/dashboard/components/modal-pagination';

interface PartnerBalance {
  id: string;
  name: string;
  balance: number;
  vehicleCount?: number;
  email?: string;
}

interface PartnerBalancesModalProps {
  isOpen: boolean;
  onClose: () => void;
  balances: PartnerBalance[];
  loading?: boolean;
}

export function PartnerBalancesModal({
  isOpen,
  onClose,
  balances = [],
  loading = false,
}: PartnerBalancesModalProps) {
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
    data: balances,
    searchFields: (partner) => [partner.name, partner.email || ""],
    sortFn: (a, b) => Math.abs(b.balance) - Math.abs(a.balance),
    initialPageSize: 20,
  });

  const totals = useMemo(() => {
    const totalBalance = filteredData.reduce((sum, p) => sum + p.balance, 0);
    const positiveBalance = filteredData
      .filter((p) => p.balance > 0)
      .reduce((sum, p) => sum + p.balance, 0);
    const negativeBalance = filteredData
      .filter((p) => p.balance < 0)
      .reduce((sum, p) => sum + p.balance, 0);
    const positiveCount = filteredData.filter((p) => p.balance > 0).length;
    const negativeCount = filteredData.filter((p) => p.balance < 0).length;
    const zeroCount = filteredData.filter((p) => p.balance === 0).length;

    return {
      totalBalance,
      positiveBalance,
      negativeBalance,
      positiveCount,
      negativeCount,
      zeroCount,
    };
  }, [filteredData]);

  const handleViewPartner = (partnerId: string) => {
    router.push(`/dashboard/partners/${partnerId}/transactions`);
    onClose();
  };

  const handleShare = () => {
    const date = new Date().toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const balancesText = filteredData
      .map((partner) => {
        const icon =
          partner.balance > 0 ? "↗️" : partner.balance < 0 ? "↘️" : "➖";
        return `${icon} ${partner.name}: ${formatCurrency(partner.balance)}`;
      })
      .join("");

    const shareText = `Balance de Socios

Fecha: ${date}

${balancesText}

Balance Total: ${formatCurrency(totals.totalBalance)}`;

    shareContent({
      title: "Reporte de Balances de Socios",
      text: shareText,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn("flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col p-0 rounded-none sm:h-[90vh] sm:max-h-[90vh] sm:max-w-5xl sm:w-[95vw] sm:rounded-lg")}>
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>Balance de Socios</DialogTitle>
          <DialogDescription>
            {totalResults} socio{totalResults !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 px-6 pb-4 overflow-hidden flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {totals.positiveCount} a favor
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              {totals.negativeCount} en contra
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              {totals.zeroCount} en cero
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              Total: {formatCurrency(totals.totalBalance)}
            </Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar socio por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            {filteredData.length !== balances.length && (
              <p className="mt-1 text-xs text-muted-foreground">
                {filteredData.length} de {balances.length}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-hidden border rounded-md">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Socio</TableHead>
                    <TableHead>Vehículos</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[140px]">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <ModalTableSkeleton rows={10} />
                  ) : paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-sm text-muted-foreground"
                      >
                        {searchTerm
                          ? "No se encontraron socios"
                          : "No hay socios para mostrar"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((partner) => (
                      <TableRow key={partner.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{partner.name}</span>
                            {partner.email && (
                              <span className="text-xs text-muted-foreground">
                                {partner.email}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {partner.vehicleCount !== undefined
                            ? `${partner.vehicleCount} vehículo${
                                partner.vehicleCount !== 1 ? "s" : ""
                              }`
                            : "N/A"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            partner.balance > 0
                              ? "text-green-600"
                              : partner.balance < 0
                              ? "text-red-600"
                              : "text-gray-600"
                          )}
                        >
                          {formatCurrency(partner.balance)}
                        </TableCell>
                        <TableCell>
                          {partner.balance > 0
                            ? "A favor"
                            : partner.balance < 0
                            ? "En contra"
                            : "Equilibrado"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewPartner(partner.id)}
                          >
                            Ver Transacciones
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {!loading && (
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Mostrando {showingFrom}–{showingTo} de {totalResults}
              </span>
              <ModalPagination
                currentPage={currentPage}
                totalPages={totalPages}
                showingFrom={showingFrom}
                showingTo={showingTo}
                totalResults={totalResults}
                hasPrevPage={hasPrevPage}
                hasNextPage={hasNextPage}
                onPrevPage={prevPage}
                onNextPage={nextPage}
              />
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={handleShare}
            disabled={isSharing || loading || filteredData.length === 0}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Compartir Reporte
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
