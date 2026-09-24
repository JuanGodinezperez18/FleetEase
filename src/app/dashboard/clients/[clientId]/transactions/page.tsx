"use client";

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ImageIcon,
  FileText as FileTextIcon,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { infallibleNormalizeDate } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/utils';
import {
  DRIVER_PAYMENT_CATEGORY,
  SECURITY_DEPOSIT_CATEGORY,
  PARTNER_PAYMENT_CATEGORY_NAME,
} from '@/contexts/data-provider';
import { TransactionTimeline, type TimelineEvent } from './components/TransactionTimeline';

export default function ClientTransactionsPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.clientId as string;

  const { clients, financialRecords, users, loadingData, clientBalances, financialCategories } =
    useData();

  const client = useMemo(() => {
    if (!clients) return null;
    return clients.find(c => c.id === clientId && !c.isDeleted);
  }, [clients, clientId]);

  const userMap = useMemo(() => new Map(users.map(u => [u.uid, u.name])), [users]);
  const categoryMap = useMemo(
    () => new Map(financialCategories.map(cat => [cat.id, cat.name])),
    [financialCategories]
  );

  const timelineEvents: TimelineEvent[] = useMemo(() => {
    if (!clientId || !financialRecords) return [];

    return financialRecords
      .filter(
        fr =>
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

    const recordsForBalance = financialRecords.filter(
      fr =>
        fr.clientId === clientId &&
        !fr.isDeleted &&
        categoryMap.get(fr.categoryId || '') !== SECURITY_DEPOSIT_CATEGORY
    );

    const totalCharges = recordsForBalance
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalPayments = recordsForBalance
      .filter(
        t =>
          t.type === 'payment' ||
          categoryMap.get(t.categoryId || '') === DRIVER_PAYMENT_CATEGORY
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      initialBalance: client.initialBalance || 0,
      totalCharges,
      totalPayments,
      finalBalance: clientBalance?.balance || 0,
    };
  }, [client, financialRecords, clientBalances, clientId, categoryMap]);

  const generateContent = async (_outputType: 'image' | 'pdf') => {
    toast.info('Función no disponible', {
      description: 'La generación de reportes PDF e imagen está desactivada temporalmente.',
    });
  };

  if (loadingData) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-[30px] bg-[#080a0f] text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-[30px] bg-[#080a0f] text-center text-white">
        <p className="font-heading text-lg font-semibold">Cliente no encontrado</p>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/clients')}
          className="rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
          Volver a clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/clients/${clientId}`)}
            className="h-9 w-fit rounded-xl px-2 text-white/50 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Volver al cliente
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => generateContent('image')}
              className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <ImageIcon className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Compartir imagen
            </Button>
            <Button
              variant="outline"
              onClick={() => generateContent('pdf')}
              className="h-10 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              <FileTextIcon className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Compartir PDF
            </Button>
          </div>
        </div>

        <header>
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
            Clientes · Transacciones
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            Estado de cuenta
          </h1>
          <p className="mt-1 text-sm text-white/45">
            {client.firstname} {client.lastname}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.07] bg-[#0e1117] p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/40">
              <DollarSign className="h-3.5 w-3.5" strokeWidth={1.75} />
              Saldo inicial
            </p>
            <p className="mt-1.5 font-heading text-lg font-semibold tabular-nums text-white">
              {formatCurrency(summary.initialBalance)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#0e1117] p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/40">
              <TrendingUp className="h-3.5 w-3.5 text-rose-300" strokeWidth={1.75} />
              Total cargos
            </p>
            <p className="mt-1.5 font-heading text-lg font-semibold tabular-nums text-rose-300">
              + {formatCurrency(summary.totalCharges)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#0e1117] p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-white/40">
              <TrendingDown className="h-3.5 w-3.5 text-emerald-300" strokeWidth={1.75} />
              Total abonos
            </p>
            <p className="mt-1.5 font-heading text-lg font-semibold tabular-nums text-emerald-300">
              − {formatCurrency(summary.totalPayments)}
            </p>
          </div>
          <div className="rounded-2xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.06] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#d7ff3f]/80">
              Saldo final
            </p>
            <p
              className={`mt-1.5 font-heading text-lg font-semibold tabular-nums ${
                summary.finalBalance > 0 ? 'text-rose-300' : 'text-emerald-300'
              }`}
            >
              {formatCurrency(Math.abs(summary.finalBalance))}
              <span className="ml-1 text-xs font-normal text-white/45">
                {summary.finalBalance > 0 ? '(debe)' : '(a favor)'}
              </span>
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_18px_50px_rgba(0,0,0,.22)] sm:p-5">
          <TransactionTimeline events={timelineEvents} />
        </section>
      </div>
    </div>
  );
}
