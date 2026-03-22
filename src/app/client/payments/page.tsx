// app/(client)/payments/page.tsx
'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/hooks/use-data';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

export default function ClientPaymentsPage() {
  const { currentUser } = useAuth();
  const { clients, credits } = useData();

  // creditMetrics no está disponible en DataContext, usar array vacío
  const creditMetrics: any[] = [];

  const currentClient = useMemo(() => {
    return clients.find(c => c.userId === currentUser?.uid);
  }, [clients, currentUser]);

  const clientCredits = useMemo(() => {
    if (!currentClient) return [];
    return credits.filter(c => 
      c.clientId === currentClient.id && 
      !c.isDeleted
    );
  }, [currentClient, credits]);

  const columns = [
    {
      accessorKey: 'id',
      header: 'Crédito',
      cell: ({ row }: any) => `#${row.original.id.slice(0, 8)}`,
    },
    {
      accessorKey: 'weeklyPayment',
      header: 'Pago Semanal',
      cell: ({ row }: any) => formatCurrency(row.original.weeklyPayment),
    },
    {
      accessorKey: 'remainingBalance',
      header: 'Saldo Pendiente',
      cell: ({ row }: any) => formatCurrency(row.original.remainingBalance || 0),
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }: any) => {
        const metric = creditMetrics.find(m => m.creditId === row.original.id);
        const isOverdue = metric?.paymentBehavior === 'Retraso Severo';
        return (
          <Badge variant={isOverdue ? 'destructive' : 'default'}>
            {isOverdue ? 'Vencido' : 'Al corriente'}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mis Pagos</h1>
        <p className="text-muted-foreground mt-1">
          Historial de créditos y pagos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Créditos Activos</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveTable
            columns={columns}
            data={clientCredits}
            searchPlaceholder="Buscar crédito..."
            mobileCardRenderer={(credit) => (
              <div className="p-4 border rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Crédito #{credit.id.slice(0, 8)}</span>
                  <span className={`px-2 py-1 rounded text-xs ${credit.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {credit.status === 'active' ? 'Activo' : credit.status}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Saldo:</span> {formatCurrency(credit.remainingBalance || 0)}</p>
                  <p><span className="text-muted-foreground">Pago semanal:</span> {formatCurrency(credit.weeklyPayment)}</p>
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}