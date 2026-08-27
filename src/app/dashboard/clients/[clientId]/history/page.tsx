"use client";

import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, FileText, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ClientChangeLog } from '@/types';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import { useQuery } from '@tanstack/react-query';

export default function ClientHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;
  const { clients } = useData();

  const client = clients.find(c => c.id === clientId);

  // ✅ OPTIMIZACIÓN: Usar React Query con Supabase en lugar de onSnapshot
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
    staleTime: 2 * 60 * 1000, // ✅ CACHÉ: 2 minutos
  });

  const getChangeTypeColor = (type: ClientChangeLog['changeType']) => {
    const colors: Record<ClientChangeLog['changeType'], string> = {
      created: 'bg-green-100 text-green-800',
      updated: 'bg-blue-100 text-blue-800',
      deleted: 'bg-red-100 text-red-800',
      vehicle_assigned: 'bg-blue-100 text-blue-800',
      vehicle_unassigned: 'bg-orange-100 text-orange-800',
      balance_updated: 'bg-yellow-100 text-yellow-800',
      deposit_updated: 'bg-cyan-100 text-cyan-800',
      document_uploaded: 'bg-pink-100 text-pink-800',
      credit_approved: 'bg-emerald-100 text-emerald-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return 'vacío';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (value instanceof Date) return format(value, "P p", { locale: es });
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }


  if (loading) {
    return <div>Cargando historial...</div>;
  }

  return (
    <div className="space-y-4">
       <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
            </Button>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cambios del Cliente</CardTitle>
          <CardDescription>
            Mostrando los últimos 50 cambios para {client ? `${client.firstname} ${client.lastname}` : 'cliente desconocido'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {changes.map((change) => (
              <div key={change.id} className="relative flex gap-4 pl-6 after:absolute after:left-3 after:top-12 after:bottom-0 after:w-px after:bg-border">
                <div className="absolute left-0 top-2 z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background border">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge className={getChangeTypeColor(change.change_type)}>
                      {change.change_type.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {change.changed_by_name}
                    </span>
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(change.changed_at), "dd MMM yyyy, HH:mm", { locale: es })}
                    </span>
                  </div>
                  <p className="text-sm font-medium">{change.description}</p>
                  {(change.previousValue !== undefined || change.newValue !== undefined) && (
                    <div className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded-md">
                      <span className="font-semibold">Valor Anterior:</span> {formatValue(change.previousValue)}
                      <br/>
                      <span className="font-semibold">Valor Nuevo:</span> {formatValue(change.newValue)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {changes.length === 0 && (
              <p className="text-center text-gray-500 py-8">No hay cambios registrados</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
