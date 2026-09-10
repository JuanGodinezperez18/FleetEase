"use client";

import { useMemo } from 'react';
import { useFinances } from '@/contexts/providers/finances-provider';
import { useClients } from '@/contexts/providers/clients-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const SECURITY_DEPOSIT_CATEGORY = 'Depósito en Garantía';

export default function ClientBalancesPage() {
  const { clients, credits } = useClients();
  const { financialRecords } = useFinances();

  const clientBalances = useMemo(() => {
    return clients.map(client => {
      const balanceRecords = financialRecords.filter(
        fr => fr.clientId === client.id && !fr.isDeleted && fr.category !== SECURITY_DEPOSIT_CATEGORY
      );

      // Only operational client charges count toward receivables.
      const income = balanceRecords
        .filter(fr => fr.type === 'income')
        .reduce((sum, fr) => sum + fr.amount, 0);

      const expenses = balanceRecords
        .filter(fr => fr.type === 'expense')
        .reduce((sum, fr) => sum + fr.amount, 0);

      const payments = balanceRecords
        .filter(fr => fr.type === 'payment')
        .reduce((sum, fr) => sum + fr.amount, 0);

      const credit = credits.find(c => c.clientId === client.id && c.status === 'active');
      const creditBalance = credit?.remainingBalance || 0;

      const totalBalance = income - expenses - payments - creditBalance;

      return {
        clientId: client.id,
        clientName: `${client.firstname} ${client.lastname}`,
        income,
        expenses,
        payments,
        creditBalance,
        totalBalance,
      };
    });
  }, [clients, financialRecords, credits]);

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
                <TableHead className="text-right">Ingresos</TableHead>
                <TableHead className="text-right">Gastos</TableHead>
                <TableHead className="text-right">Saldo Crédito</TableHead>
                <TableHead className="text-right">Balance Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientBalances.map(cb => (
                <TableRow key={cb.clientId}>
                  <TableCell>{cb.clientName}</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(cb.income)}</TableCell>
                  <TableCell className="text-right text-red-600">{formatCurrency(cb.expenses)}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
