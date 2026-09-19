"use client";

import React from 'react';
import { useData } from '@/hooks/use-data';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, History, Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { openSafeUrl } from '@/lib/security/safe-url';

interface GeneratedReport {
  id: string;
  created_at: string;
  date_range: string;
  type: string;
  created_by: string;
  created_by_name?: string;
  format?: string;
  filename?: string;
  download_url?: string;
}

export default function ReportHistoryPage() {
  const router = useRouter();
  const { selectedCompanyId, loadingData } = useData();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['generatedReports', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from('generated_reports')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as GeneratedReport[];
    },
    enabled: !loadingData && !!selectedCompanyId,
    staleTime: 5 * 60 * 1000,
  });

  const downloadReport = (url?: string) => {
    if (url) {
      if (!openSafeUrl(url)) {
        toast.error('Descarga bloqueada', {
          description: 'La URL del reporte no pertenece a un dominio de confianza.',
        });
      }
    } else {
      toast.info('Descarga no disponible', {
        description: 'Este reporte no tiene un archivo descargable.',
      });
    }
  };

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="h-9 rounded-xl px-2 text-white/50 hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
          Volver a reportes
        </Button>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              Operación
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
              Historial de reportes
            </h1>
            <p className="mt-1 text-sm text-white/40">Últimos 50 reportes generados</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
            <History className="h-5 w-5" strokeWidth={1.75} />
          </div>
        </header>

        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          {isLoading || loadingData ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-white/30">
                <History className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <p className="font-heading text-base font-semibold text-white">Sin reportes</p>
              <p className="mt-1 text-sm text-white/40">Genera un PDF o Excel desde Reportes.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 p-3 md:hidden">
                {reports.map(report => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between gap-3 rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/90">
                        {report.type || report.filename || 'Reporte'}
                      </p>
                      <p className="text-[11px] text-white/35">
                        {format(new Date(report.created_at), 'dd MMM yyyy HH:mm', { locale: es })}
                      </p>
                      <p className="truncate text-[11px] text-white/30">
                        {report.created_by_name || report.created_by}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 shrink-0 text-white/40 hover:bg-white/[0.06] hover:text-white"
                      onClick={() => downloadReport(report.download_url)}
                      disabled={!report.download_url}
                    >
                      <Download className="h-4 w-4" strokeWidth={1.75} />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      {['Fecha', 'Periodo', 'Tipo', 'Generado por', ''].map(h => (
                        <TableHead
                          key={h || 'a'}
                          className="text-[10px] font-semibold uppercase tracking-wide text-white/35"
                        >
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map(report => (
                      <TableRow key={report.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                        <TableCell className="text-white/80">
                          {format(new Date(report.created_at), 'PPP p', { locale: es })}
                        </TableCell>
                        <TableCell className="text-white/50">
                          {typeof report.date_range === 'string' ? report.date_range : '—'}
                        </TableCell>
                        <TableCell>
                          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                            {report.type}
                            {report.format ? ` · ${report.format}` : ''}
                          </span>
                        </TableCell>
                        <TableCell className="text-white/60">
                          {report.created_by_name || report.created_by}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-white/40 hover:bg-white/[0.06] hover:text-white"
                            onClick={() => downloadReport(report.download_url)}
                            disabled={!report.download_url}
                          >
                            <Download className="h-4 w-4" strokeWidth={1.75} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
