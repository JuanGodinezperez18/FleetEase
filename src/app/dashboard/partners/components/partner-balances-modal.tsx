
"use client";

import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useRouter } from 'next/navigation';
import { formatCurrency, cn } from '@/lib/utils';
import { useShareContent } from '@/hooks/use-share-content';
import { Share2, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';


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
  loading = false
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
      filtered = balances.filter(partner => 
        partner.name.toLowerCase().includes(term)
      );
    }
    return filtered.sort((a, b) => b.balance - a.balance);
  }, [balances, searchTerm]);

  const totalBalance = useMemo(() => 
    filteredAndSortedBalances.reduce((sum, partner) => sum + partner.balance, 0),
    [filteredAndSortedBalances]
  );
  
  const handleShare = () => {
    const date = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const balancesText = filteredAndSortedBalances
      .map(partner => `${partner.name}: ${formatCurrency(partner.balance)}`)
      .join('\n');
    
    const shareText = `Resumen de Saldos de Socios\nFecha: ${date}\n\n${balancesText}\n\nSaldo Total General: ${formatCurrency(totalBalance)}`;
    
    shareContent({
        title: 'Resumen de Saldos de Socios',
        text: shareText,
    });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="h-24 text-center">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando...
            </div>
          </TableCell>
        </TableRow>
      );
    }
    if (filteredAndSortedBalances.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
            {searchTerm ? 'No se encontraron socios' : 'No hay socios con saldo'}
          </TableCell>
        </TableRow>
      );
    }

    return filteredAndSortedBalances.map((partner) => (
      <TableRow key={partner.id}>
        <TableCell className="font-medium">{partner.name}</TableCell>
        <TableCell className={cn("text-right font-semibold", partner.balance >= 0 ? 'text-green-600' : 'text-red-600')}>
          {formatCurrency(partner.balance)}
        </TableCell>
        <TableCell className="text-right">
          <Button variant="outline" size="sm" onClick={() => handleViewTransactions(partner.id)}>Ver Transacciones</Button>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl" aria-describedby={descriptionId}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Saldos de Socios
            {totalBalance !== 0 && (
              <Badge variant={totalBalance > 0 ? "default" : "destructive"}>
                Total: {formatCurrency(totalBalance)}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription id={descriptionId}>
            Lista de socios activos y sus saldos actuales. Un saldo positivo indica una ganancia para el socio.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center gap-2 my-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar socio por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          {filteredAndSortedBalances.length !== balances.length && (
            <Badge variant="secondary">
              {filteredAndSortedBalances.length} de {balances.length}
            </Badge>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          <div className="min-w-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Socio</TableHead>
                  <TableHead className="text-right w-[110px]">Saldo Actual</TableHead>
                  <TableHead className="text-right w-[170px]">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderContent()}</TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <DialogFooter className="mt-4 sm:justify-between">
          <Button variant="secondary" onClick={handleShare} disabled={balances.length === 0 || isSharing}>
            {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
            Compartir Resumen
          </Button>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
