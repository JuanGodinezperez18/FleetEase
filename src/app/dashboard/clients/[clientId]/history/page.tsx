"use client";

import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Clock, User, FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ClientChangeLog } from '@/types';
import { Button } from '@/components/ui/button';
import { useData } from '@/hooks/use-data';
import { useQuery } from '@tanstack/react-query';

const CHANGE_STYLES: Record<string, string> = {
  created: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  updated: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  deleted: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  vehicle_assigned: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  vehicle_unassigned: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  balance_updated: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  deposit_updated: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  document_uploaded: 'border-pink-400/20 bg-pink-400/10 text-pink-300',
  credit_approved: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
};

export default function ClientHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;
  const { clients } = useData();

  const client = clients.find(c => c.id === clientId);

  const { data: changes = [], isLoading: loading } = useQuery({
    queryKey: ['clientChanges', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('client_change_logs')
        .select('*')
        .eq('client_id', clientId)
        .order('changed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as ClientChangeLog[];
    },
    enabled: !!clientId,
    staleTime: 2 * 60 * 1000,
  });

  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return 'vacío';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (value instanceof Date) return format(value, 'P p', { locale: es });
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-[18px] bg-[#080a0f] text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
      </div>
    );
  }

  const clientName = client ? `${client.firstname} ${client.lastname}` : 'cliente desconocido';

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[18px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/clients')}
          className="h-11 w-fit rounded-xl px-2 text-white/50 hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
          Volver
        </Button>

        <header>
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
            Clientes · Historial
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            Historial de cambios
          </h1>
          <p className="mt-1 text-sm text-white/45">
            Últimos 50 cambios de {clientName}
          </p>
        </header>

        <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_18px_50px_rgba(0,0,0,.22)] sm:p-5">
          <div className="space-y-0">
            {changes.map((change, idx) => {
              const style =
                CHANGE_STYLES[change.change_type] ||
                'border-white/10 bg-white/[0.06] text-white/50';
              const isLast = idx === changes.length - 1;
              return (
                <div
                  key={change.id}
                  className={`relative flex gap-4 pb-6 pl-2 ${!isLast ? 'after:absolute after:bottom-0 after:left-[1.35rem] after:top-12 after:w-px after:bg-white/10' : ''}`}
                >
                  <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#0e1117]">
                    <FileText className="h-4 w-4 text-white/45" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style}`}
                      >
                        {change.change_type.replace(/_/g, ' ')}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-white/40">
                        <User className="h-3 w-3" strokeWidth={1.75} />
                        {change.changed_by_name}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-white/40">
                        <Clock className="h-3 w-3" strokeWidth={1.75} />
                        {format(new Date(change.changed_at), 'dd MMM yyyy, HH:mm', {
                          locale: es,
                        })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white/85">{change.description}</p>
                    {(change.previousValue !== undefined || change.newValue !== undefined) && (
                      <div className="mt-2 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-xs text-white/50">
                        <p>
                          <span className="font-semibold text-white/60">Anterior:</span>{' '}
                          {formatValue(change.previousValue)}
                        </p>
                        <p className="mt-1">
                          <span className="font-semibold text-white/60">Nuevo:</span>{' '}
                          {formatValue(change.newValue)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {changes.length === 0 && (
              <p className="py-10 text-center text-sm text-white/40">No hay cambios registrados</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
