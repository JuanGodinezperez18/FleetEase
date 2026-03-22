
"use client";

import { useParams } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Check, Ban, Clock } from 'lucide-react';
import { useMemo } from 'react';
import { DataTable } from '@/components/common/data-table';
import type { CreditPaymentSchedule } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';

export default function CreditDetailPage() {
  const params = useParams();
  const creditId = params.id as string;
  const router = useRouter();
  const { credits, clients, vehicles, financialRecords, creditPaymentSchedules, financialCategories } = useData();
  
  const credit = useMemo(() => credits.find(c => c.id === creditId), [credits, creditId]);
  const client = useMemo(() => clients.find(c => c.id === credit?.clientId), [clients, credit]);
  const vehicle = useMemo(() => vehicles.find(v => v.id === credit?.vehicleId), [vehicles, credit]);
  
  const payments = useMemo(() => financialRecords.filter(fr => 
    fr.creditId === creditId && 
    fr.type === 'payment' && 
    !fr.isDeleted
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [financialRecords, creditId]);
  
  const schedule = useMemo(() => {
    return creditPaymentSchedules
        .filter(s => s.creditId === creditId)
        .sort((a,b) => a.paymentNumber - b.paymentNumber);
  }, [creditPaymentSchedules, creditId]);

  // ✅ AGREGAR: función helper para obtener nombre de categoría
    const getCategoryName = (categoryId: string) => {
      const category = financialCategories.find(c => c.id === categoryId);
      return category?.name || 'Sin categoría';
  };

  const scheduleColumns: ColumnDef<CreditPaymentSchedule>[] = [
    {
      accessorKey: 'paymentNumber',
      header: 'Pago #',
    },
    {
      accessorKey: 'dueDate',
      header: 'Fecha Vencimiento',
      cell: ({ row }) => format(new Date(row.original.dueDate), "PPP", { locale: es })
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const status = row.original.status;
        if (status === 'paid') return <Badge className="bg-green-100 text-green-800"><Check className="mr-1 h-3 w-3" /> Pagado</Badge>;
        if (status === 'cancelled') return <Badge variant="destructive"><Ban className="mr-1 h-3 w-3" />Cancelado</Badge>;
        return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />Pendiente</Badge>;
      }
    },
    {
      accessorKey: 'amount',
      header: 'Monto',
      cell: ({ row }) => formatCurrency(row.original.amount)
    },
    {
      accessorKey: 'paidDate',
      header: 'Fecha de Pago',
      cell: ({ row }) => row.original.paidDate ? format(new Date(row.original.paidDate), "PPP", { locale: es }) : '-',
    },
  ];

  if (!credit) return <div>Crédito no encontrado</div>;
  
  const progress = credit.totalAmount > 0 
    ? ((credit.paidAmount || 0) / credit.totalAmount) * 100 
    : 0;
  
  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.push('/dashboard/credits')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Créditos
      </Button>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Detalle del Crédito</CardTitle>
              <CardDescription>Resumen del estado actual del crédito.</CardDescription>
            </div>
            <Badge variant={credit.status === 'active' ? 'default' : (credit.status === 'completed' ? 'secondary' : 'destructive')}>
              {credit.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">Cliente</p>
              <p className="font-semibold">{client?.firstname} {client?.lastname}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">Vehículo</p>
              <p className="font-semibold">{vehicle?.make} {vehicle?.model} ({vehicle?.plate})</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">Monto Total del Crédito</p>
              <p className="font-semibold text-lg">{formatCurrency(credit.totalAmount)}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">Monto Pagado</p>
              <p className="font-semibold text-green-600 text-lg">{formatCurrency(credit.paidAmount || 0)}</p>
            </div>
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-destructive font-medium">Saldo Pendiente</p>
              <p className="font-semibold text-destructive text-lg">{formatCurrency(credit.remainingBalance || 0)}</p>
            </div>
             <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">Fecha de Inicio</p>
              <p className="font-semibold">{format(new Date(credit.startDate), "PPP", { locale: es })}</p>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-muted-foreground mb-1">Progreso del Crédito</p>
            <Progress value={progress} className="h-2.5" />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {credit.paymentsMade} de {credit.numberOfPayments} pagos realizados ({progress.toFixed(1)}%)
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5"/>
            Calendario de Pagos
          </CardTitle>
          <CardDescription>Plan de pagos completo para este crédito.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={scheduleColumns}
            data={schedule}
            noResultsText="No hay calendario de pagos para este crédito."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Pagos Registrados ({payments.length})</CardTitle>
          <CardDescription>Lista de todas las transacciones de abono registradas para este crédito.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {payments.map(payment => {
              const categoryName = getCategoryName(payment.categoryId);		//✅ AGREGAR 
              return(
             		<div key={payment.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50">
                  <div>
                    <p className="font-semibold text-green-600">{formatCurrency(payment.amount)}</p>
                    <p className="text-sm text-muted-foreground">
                    {format(new Date(payment.date), "PPP", { locale: es })}
                    </p>
                  </div>
                  <Badge variant={categoryName === "Pago de Crédito" ? 'default' : 'secondary'}>
                    {categoryName}  {/* ✅ USAR categoryName */}
                   </Badge>
                 </div>
              ); 
						})}
            {payments.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No hay pagos registrados para este crédito.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
