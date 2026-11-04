"use client";

import { useMemo } from 'react';
import { useData } from '@/contexts/data-provider';
import { useClients } from '@/contexts/providers/clients-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useClientPagination } from '@/hooks/use-client-pagination';
import { ListPagination } from '@/components/common/list-pagination';

export default function ClientBalancesPage() {
  const { clients, credits } = useClients();
  const { clientBalances: canonicalClientBalances } = useData();

  const clientBalances = useMemo(() => {
    return clients.map(client => {
      const credit = credits.find(c => c.clientId === client.id && c.status === 'active');
      const totalBalance = canonicalClientBalances.find(b => b.id === client.id)?.balance ?? 0;

      return {
        clientId: client.id,
        clientName: `${client.firstname} ${client.lastname}`,
        creditBalance: credit?.remainingBalance || 0,
        totalBalance,
      };
    });
  }, [clients, credits, canonicalClientBalances]);

  const {
    page,
    totalPages,
    total,
    from,
    to,
    paginatedItems,
    prevPage,
    nextPage,
  } = useClientPagination(clientBalances);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Balance por Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Saldo Crédito</TableHead>
                <TableHead className="text-right">Balance Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map(cb => (
                <TableRow key={cb.clientId}>
                  <TableCell>{cb.clientName}</TableCell>
                  <TableCell className="text-right text-orange-600">{formatCurrency(cb.creditBalance)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={cb.totalBalance >= 0 ? 'default' : 'destructive'}>
                      {formatCurrency(cb.totalBalance)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ListPagination
            page={page}
            totalPages={totalPages}
            total={total}
            from={from}
            to={to}
            onPrev={prevPage}
            onNext={nextPage}
            className="border-border text-muted-foreground"
          />
        </CardContent>
      </Card>
    </div>
  );
}
