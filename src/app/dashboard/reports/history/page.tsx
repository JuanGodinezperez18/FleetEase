"use client";

import React from 'react';
import { useData } from '@/hooks/use-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, History, Loader2, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

// Placeholder type - you should define this based on your actual data structure
interface GeneratedReport {
  id: string;
  created_at: string;
  date_range: string;
  type: 'Semanal' | 'Mensual' | 'Personalizado';
  created_by: string;
  download_url?: string; // URL to the generated report file
}

export default function ReportHistoryPage() {
  const router = useRouter();
  const { selectedCompanyId, loadingData } = useData();

  // ✅ OPTIMIZACIÓN: Usar React Query con Supabase en lugar de onSnapshot
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
    staleTime: 5 * 60 * 1000, // ✅ CACHÉ: 5 minutos
  });

  const downloadReport = (reportId: string, url?: string) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.info("Descarga no disponible", { description: "Este reporte no tiene un archivo descargable." });
    }
  };

  const renderContent = () => {
    if (isLoading || loadingData) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (reports.length === 0) {
        return <p className="text-center text-muted-foreground py-10">No hay reportes generados para esta empresa.</p>;
    }

    return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead>Período del Reporte</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Generado por</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map(report => (
              <TableRow key={report.id}>
                <TableCell>{format(new Date(report.created_at), 'PPP p', { locale: es })}</TableCell>
                <TableCell>{report.date_range}</TableCell>
                <TableCell>{report.type}</TableCell>
                <TableCell>{report.created_by}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={() => downloadReport(report.id, report.download_url)} disabled={!report.download_url}>
                    <Download className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    );
  };


  return (
    <div className="space-y-6">
       <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a Reportes
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Reportes Generados
          </CardTitle>
          <CardDescription>
            Consulta y descarga los reportes que se han generado anteriormente. Mostrando los últimos 50 reportes.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
