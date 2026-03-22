

"use client";

import React, { useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import type { FinancialRecord, Client } from '@/types';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ImageIcon, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { FleetEaseLogo } from '@/components/icons/fleet-ease-logo';
import { getTransactionColumns } from './columns';
import { infallibleNormalizeDate } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/utils';
import { DRIVER_PAYMENT_CATEGORY } from '@/contexts/data-provider';
import { dataURItoFile } from '@/lib/file-utils';

export default function ClientTransactionsPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.clientId as string; 

  const { clients, financialRecords, financialCategories, loadingData, clientBalances } = useData();
  const shareableContentRef = useRef<HTMLDivElement>(null);
  const shareableHeaderRef = useRef<HTMLDivElement>(null);

  const client = useMemo(() => {
    if (!clients) return null;
    return clients.find(c => c.id === clientId && !c.isDeleted);
  }, [clients, clientId]);

  const clientTransactions = useMemo(() => {
    if (!clientId || !financialRecords) return [];
    return financialRecords
      .filter(fr => fr.clientId === clientId && !fr.isDeleted)
      .sort((a, b) => {
        const dateA = infallibleNormalizeDate(a.date);
        const dateB = infallibleNormalizeDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      });
  }, [financialRecords, clientId]);

  const summary = useMemo(() => {
    if (!client) return { initialBalance: 0, totalCharges: 0, totalPayments: 0, finalBalance: 0 };
    
    const clientBalance = clientBalances.find(cb => cb.id === clientId);

    const totalCharges = clientTransactions
      .filter(t => t.type === 'income' && t.category !== 'Deposito en Garantia') // Excluir depósitos
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalPayments = clientTransactions
      .filter(t => t.type === 'payment' || t.category === DRIVER_PAYMENT_CATEGORY)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
        
    return { 
        initialBalance: client.initialBalance || 0, 
        totalCharges, 
        totalPayments, 
        finalBalance: clientBalance?.balance || 0
    };
  }, [client, clientTransactions, clientBalances, clientId]);

  const columns = useMemo(() => getTransactionColumns(financialCategories), [financialCategories]);
  
  const generateContent = async (outputType: 'image' | 'pdf') => {
    toast.info("Función no disponible", { description: "La generación de reportes PDF y de imagen se ha desactivado temporalmente." });
    return;
  };

  if (loadingData) return <p>Cargando transacciones...</p>;
  if (!client) return (
      <Card><CardHeader><CardTitle>Error</CardTitle></CardHeader>
        <CardContent>
          <p>El cliente especificado no fue encontrado o no está activo.</p>
          <Button onClick={() => router.push('/dashboard/clients')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a Clientes</Button>
        </CardContent>
      </Card>
  );

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Volver</Button>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => generateContent('image')}><ImageIcon className="mr-2 h-4 w-4" /> Compartir Imagen</Button>
            <Button variant="outline" onClick={() => generateContent('pdf')}><FileText className="mr-2 h-4 w-4" /> Compartir PDF</Button>
        </div>
      </div>

      <div ref={shareableContentRef} className="bg-card p-4 sm:p-6 rounded-lg shadow">
        <div ref={shareableHeaderRef} hidden className="mb-6 flex items-center gap-4 border-b pb-4">
          <FleetEaseLogo className="h-14 w-14 text-primary" /> 
          <span className="text-2xl font-bold text-primary">Estado de Cuenta - FleetEase</span>
        </div>
        
        <Card className="mb-6 border-none shadow-none"> 
          <CardHeader className="px-0 pt-0">
            <CardTitle>Resumen del Cliente</CardTitle>
            <CardDescription>Información detallada y saldo de {client.firstname} {client.lastname}.</CardDescription>
          </CardHeader>
           <CardContent className="px-0 pb-0">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
                    <div className="bg-muted p-3 rounded-lg space-y-1">
                        <p className="font-medium text-muted-foreground text-xs">Saldo Inicial</p>
                        <p className="font-bold text-base">{formatCurrency(summary.initialBalance)}</p>
                    </div>
                    <div className="bg-muted p-3 rounded-lg space-y-1">
                        <p className="font-medium text-muted-foreground text-xs">Total de Cargos (Deuda+)</p>
                        <p className="font-bold text-base text-destructive">+ {formatCurrency(summary.totalCharges)}</p>
                    </div>
                    <div className="bg-muted p-3 rounded-lg space-y-1">
                        <p className="font-medium text-muted-foreground text-xs">Total de Abonos (Deuda-)</p>
                        <p className="font-bold text-base text-green-600">- {formatCurrency(summary.totalPayments)}</p>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-lg space-y-1">
                        <p className="font-semibold text-primary text-xs">SALDO FINAL</p>
                        <p className={`font-bold text-lg ${summary.finalBalance > 0 ? 'text-destructive' : 'text-green-500'}`}>
                            {formatCurrency(Math.abs(summary.finalBalance))}
                            <span className="text-xs font-normal ml-1">{summary.finalBalance > 0 ? '(Debe)' : '(A Favor)'}</span>
                        </p>
                    </div>
                </div>
                 <div className="text-sm">
                    <span className="font-medium text-muted-foreground">Nombre: </span>{client.firstname} {client.lastname}<br/>
                    <span className="font-medium text-muted-foreground">Correo: </span>{client.email}
                </div>
            </CardContent>
        </Card>

        <DataTable
          columns={columns}
          data={clientTransactions}
          searchPlaceholder="Buscar por descripción, categoría, monto..."
          noResultsText="No se encontraron transacciones para este cliente."
        />
      </div>
    </>
  );
}
