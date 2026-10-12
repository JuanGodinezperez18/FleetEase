"use client";

import React, { useMemo, useState } from 'react';
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
import { Share2, Search, Loader2, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PartnerBalance {
  id: string;
  name: string;
  balance: number;
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
  const descriptionId = React.useId();
  const [searchTerm, setSearchTerm] = useState('');
  const { shareContent, isSharing } = useShareContent();

  const handleViewTransactions = (partnerId: string) => {
    router.push(`/dashboard/partners/${partnerId}/transactions`);
    onClose();
  };

  const filteredAndSortedBalances = useMemo(() => {
    let filtered = balances;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = balances.filter(partner => partner.name.toLowerCase().includes(term));
    }
    return filtered.sort((a, b) => b.balance - a.balance);
  }, [balances, searchTerm]);

  const totalBalance = useMemo(
    () => filteredAndSortedBalances.reduce((sum, partner) => sum + partner.balance, 0),
    [filteredAndSortedBalances]
  );

  const handleShare = () => {
    const date = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const balancesText = filteredAndSortedBalances
      .map(partner => `${partner.name}: ${formatCurrency(partner.balance)}`)
      .join('\n');

    const shareText = `Resumen de Saldos de Socios\nFecha: ${date}\n\n${balancesText}\n\nSaldo Total General: ${formatCurrency(totalBalance)}`;

    shareContent({
      title: 'Resumen de Saldos de Socios',
      text: shareText,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        className="flex max-h-[85vh] max-w-2xl flex-col gap-4 overflow-hidden sm:max-w-2xl"
        aria-describedby={descriptionId}
      >
        <DialogHeader>
          <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
                <Briefcase className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <DialogTitle>Saldos de socios</DialogTitle>
                <DialogDescription id={descriptionId} className="mt-1">
                  Socios activos y sus saldos. Positivo = ganancia del socio.
                </DialogDescription>
              </div>
            </div>
            {totalBalance !== 0 && (
              <span
                className={cn(
                  'inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums',
                  totalBalance > 0
                    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                    : 'border-rose-400/20 bg-rose-400/10 text-rose-300'
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
            placeholder="Buscar socio por nombre..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-10 rounded-xl border-white/10 bg-white/[0.03] pl-9 text-white placeholder:text-white/30 focus-visible:ring-[#d7ff3f]/30"
          />
          {filteredAndSortedBalances.length !== balances.length && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/50">
              {filteredAndSortedBalances.length} de {balances.length}
            </span>
          )}
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-3 sm:hidden">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-xl border border-white/[0.07] bg-white/[0.04]" />
              ))
            ) : filteredAndSortedBalances.length === 0 ? (
              <div className="rounded-xl border border-white/[0.07] px-4 py-10 text-center text-sm text-white/45">
                {searchTerm ? 'No se encontraron socios' : 'No hay socios con saldo'}
              </div>
            ) : (
              filteredAndSortedBalances.map(partner => (
                <article key={partner.id} className="min-w-0 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 break-words text-sm font-semibold text-white/90">{partner.name}</p>
                    <p className={cn('shrink-0 text-right text-sm font-bold tabular-nums', partner.balance >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
                      {formatCurrency(partner.balance)}
                    </p>
                  </div>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-white/35">Saldo del socio</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewTransactions(partner.id)}
                    className="mt-3 h-10 w-full rounded-lg border-white/10 bg-white/[0.03] text-xs text-white/75 hover:bg-white/[0.06] hover:text-white"
                  >
                    Ver transacciones
                  </Button>
                </article>
              ))
            )}
          </div>
          <div className="hidden min-w-[480px] sm:block">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-white/40">Socio</TableHead>
                  <TableHead className="w-[120px] text-right text-white/40">Saldo</TableHead>
                  <TableHead className="w-[150px] text-right text-white/40">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow className="border-white/[0.06]">
                    <TableCell colSpan={3} className="h-24 text-center text-white/40">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
                        Cargando…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAndSortedBalances.length === 0 ? (
                  <TableRow className="border-white/[0.06]">
                    <TableCell colSpan={3} className="h-24 text-center text-white/40">
                      {searchTerm ? 'No se encontraron socios' : 'No hay socios con saldo'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedBalances.map(partner => (
                    <TableRow
                      key={partner.id}
                      className="border-white/[0.06] hover:bg-white/[0.03]"
                    >
                      <TableCell className="font-medium text-white/90">{partner.name}</TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-semibold tabular-nums',
                          partner.balance >= 0 ? 'text-emerald-300' : 'text-rose-300'
                        )}
                      >
                        {formatCurrency(partner.balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewTransactions(partner.id)}
                          className="h-8 rounded-lg border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
                        >
                          Ver transacciones
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" className="hidden sm:flex" />
        </ScrollArea>

        <DialogFooter className="mt-1 border-t border-white/[0.06] pt-4 sm:justify-between">
          <Button
            variant="outline"
            onClick={handleShare}
            disabled={balances.length === 0 || isSharing}
            className="h-10 w-full rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white sm:w-auto"
          >
            {isSharing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
            ) : (
              <Share2 className="mr-2 h-4 w-4" strokeWidth={1.75} />
            )}
            Compartir resumen
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
