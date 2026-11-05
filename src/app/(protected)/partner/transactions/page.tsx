// app/(partner)/transactions/page.tsx
'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/hooks/use-data';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

export default function PartnerTransactionsPage() {
  const { currentUser } = useAuth();
  const { partners, financialRecords, rawVehicles } = useData();

  const currentPartner = useMemo(() => {
    return partners.find(p => p.userId === currentUser?.uid);
  }, [partners, currentUser]);

  const partnerTransactions = useMemo(() => {
    if (!currentPartner) return [];
    
    // Obtener IDs de vehículos del socio
    const vehicleIds = rawVehicles
      .filter(v => v.partnerId === currentPartner.id)
      .map(v => v.id);

    // Filtrar transacciones relacionadas
    return financialRecords
      .filter(r => 
        !r.isDeleted && 
        r.vehicleId && 
        vehicleIds.includes(r.vehicleId)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [currentPartner, financialRecords, rawVehicles]);

  const columns = [
    {
      accessorKey: 'date',
      header: 'Fecha',
      cell: ({ row }: any) => format(new Date(row.original.date), 'PPp', { locale: es }),
    },
    {
      accessorKey: 'type',
      header: 'Tipo',
      cell: ({ row }: any) => row.original.type === 'income' ? 'Ingreso' : 'Gasto',
    },
    {
      accessorKey: 'category',
      header: 'Categoría',
    },
    {
      accessorKey: 'amount',
      header: 'Monto',
      cell: ({ row }: any) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: 'description',
      header: 'Descripción',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mis Transacciones</h1>
        <p className="text-muted-foreground mt-1">
          Historial de ingresos y gastos de tus vehículos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transacciones ({partnerTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveTable
            columns={columns}
            data={partnerTransactions}
            mobileCardRenderer={(transaction) => (
              <Card key={transaction.id} className="mb-3">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transaction.date), 'PPp', { locale: es })}
                        </p>
                        <p className="font-medium">{transaction.category}</p>
                      </div>
                      <span className={`text-lg font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo</p>
                      <p className="text-sm">{transaction.type === 'income' ? 'Ingreso' : 'Gasto'}</p>
                    </div>
                    {transaction.description && (
                      <div>
                        <p className="text-sm text-muted-foreground">Descripción</p>
                        <p className="text-sm">{transaction.description}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            searchPlaceholder="Buscar transacción..."
          />
        </CardContent>
      </Card>
    </div>
  );
}