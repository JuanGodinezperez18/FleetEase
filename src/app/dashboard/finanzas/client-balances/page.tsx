"use client";

import { useMemo } from 'react';
import { useFinances } from '@/contexts/providers/finances-provider';
import { useClients } from '@/contexts/providers/clients-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function ClientBalancesPage() {
  const { clients, credits } = useClients();
  const { financialRecords } = useFinances();
  
  const clientBalances = useMemo(() => {
    return clients.map(client => {
      // Calcular ingresos (pagos del cliente)
      const income = financialRecords
        .filter(fr => fr.clientId === client.id && fr.type === 'income' && !fr.isDeleted)
        .reduce((sum, fr) => sum + fr.amount, 0);
      
      // Calcular gastos que afectan al cliente
      const expenses = financialRecords
        .filter(fr => fr.clientId === client.id && fr.type === 'expense' && !fr.isDeleted)
        .reduce((sum, fr) => sum + fr.amount, 0);
      
      // Calcular balance de crédito
      const credit = credits.find(c => c.clientId === client.id && c.status === 'active');
      const creditBalance = credit?.remainingBalance || 0;
      
      // Balance total
      const totalBalance = income - expenses - creditBalance;
      
      return {
        clientId: client.id,
        clientName: `${client.firstname} ${client.lastname}`,
        income,
        expenses,
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
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(cb.income)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(cb.expenses)}
                  </TableCell>
                  <TableCell className="text-right text-orange-600">
                    {formatCurrency(cb.creditBalance)}
                  </TableCell>
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

    