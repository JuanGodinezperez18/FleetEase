

"use client";

import React, { useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import type { FinancialRecord, Client } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ImageIcon, FileText as FileTextIcon, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { FleetEaseLogo } from '@/components/icons/fleet-ease-logo';
import { infallibleNormalizeDate } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/utils';
import { DRIVER_PAYMENT_CATEGORY, SECURITY_DEPOSIT_CATEGORY, PARTNER_PAYMENT_CATEGORY_NAME } from '@/contexts/data-provider';
import { TransactionTimeline, type TimelineEvent } from './components/ClientTransactionTimeline';

export default function ClientTransactionsPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.clientId as string; 

  const { clients, financialRecords, users, loadingData, clientBalances, financialCategories } = useData();
  
  const client = useMemo(() => {
    if (!clients) return null;
    return clients.find(c => c.id === clientId && !c.isDeleted);
  }, [clients, clientId]);

  const userMap = useMemo(() => new Map(users.map(u => [u.uid, u.name])), [users]);
  const categoryMap = useMemo(() => new Map(financialCategories.map(cat => [cat.id, cat.name])), [financialCategories]);

  const timelineEvents: TimelineEvent[] = useMemo(() => {
    if (!clientId || !financialRecords) return [];
    
    return financialRecords
      .filter(fr => 
        fr.clientId === clientId && 
        !fr.isDeleted &&
        categoryMap.get(fr.categoryId || '') !== PARTNER_PAYMENT_CATEGORY_NAME
      )
      .sort((a, b) => {
        const dateA = infallibleNormalizeDate(a.date);
        const dateB = infallibleNormalizeDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      })
      .map(record => ({
        id: record.id,
        date: infallibleNormalizeDate(record.date)!,
        type: record.type,
        title: record.description,
        description: `Categoría: ${categoryMap.get(record.categoryId || '') || 'General'}`,
        amount: record.amount,
        userName: record.createdBy ? userMap.get(record.createdBy) || 'Sistema' : 'Sistema',
        paymentMethod: record.paymentMethod,
      }));
  }, [financialRecords, clientId, userMap, categoryMap]);

  const summary = useMemo(() => {
    if (!client) return { initialBalance: 0, totalCharges: 0, totalPayments: 0, finalBalance: 0 };
    
    const clientBalance = clientBalances.find(cb => cb.id === clientId);

    const recordsForBalance = financialRecords.filter(fr => 
      fr.clientId === clientId && 
      !fr.isDeleted && 
      categoryMap.get(fr.categoryId || '') !== SECURITY_DEPOSIT_CATEGORY
    );

    const totalCharges = recordsForBalance
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalPayments = recordsForBalance
      .filter(t => t.type === 'payment' || categoryMap.get(t.categoryId || '') === DRIVER_PAYMENT_CATEGORY)
      .reduce((sum, t) => sum + (t.amount || 0), 0);
        
    return { 
        initialBalance: client.initialBalance || 0, 
        totalCharges, 
        totalPayments, 
        finalBalance: clientBalance?.balance || 0
    };
  }, [client, financialRecords, clientBalances, clientId, categoryMap]);

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <Button variant="outline" onClick={() => router.push(`/dashboard/clients/${clientId}`)}><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Cliente</Button>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => generateContent('image')}><ImageIcon className="mr-2 h-4 w-4" /> Compartir Imagen</Button>
            <Button variant="outline" onClick={() => generateContent('pdf')}><FileTextIcon className="mr-2 h-4 w-4" /> Compartir PDF</Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Estado de Cuenta de {client.firstname} {client.lastname}</CardTitle>
          <CardDescription>Un resumen detallado del historial financiero y saldo del cliente.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-6 p-4 bg-muted/50 rounded-lg border">
                <div className="space-y-1">
                    <p className="font-medium text-muted-foreground text-xs flex items-center gap-1"><DollarSign className="h-3 w-3"/> Saldo Inicial</p>
                    <p className="font-bold text-base">{formatCurrency(summary.initialBalance)}</p>
                </div>
                <div className="space-y-1">
                    <p className="font-medium text-muted-foreground text-xs flex items-center gap-1"><TrendingUp className="h-3 w-3 text-destructive"/> Total de Cargos</p>
                    <p className="font-bold text-base text-destructive">+ {formatCurrency(summary.totalCharges)}</p>
                </div>
                <div className="space-y-1">
                    <p className="font-medium text-muted-foreground text-xs flex items-center gap-1"><TrendingDown className="h-3 w-3 text-green-600"/> Total de Abonos</p>
                    <p className="font-bold text-base text-green-600">- {formatCurrency(summary.totalPayments)}</p>
                </div>
                <div className="space-y-1 bg-background/50 p-3 rounded-md -m-3">
                    <p className="font-semibold text-primary text-xs">SALDO FINAL</p>
                    <p className={`font-bold text-lg ${summary.finalBalance > 0 ? 'text-destructive' : 'text-green-500'}`}>
                        {formatCurrency(Math.abs(summary.finalBalance))}
                        <span className="text-xs font-normal ml-1">{summary.finalBalance > 0 ? '(Debe)' : '(A Favor)'}</span>
                    </p>
                </div>
            </div>
            
            <TransactionTimeline events={timelineEvents} />

        </CardContent>
      </Card>
    </div>
  );
}
