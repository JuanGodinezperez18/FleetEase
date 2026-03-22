
"use client";

import React, { useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, LineChart as LineChartIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { useData } from '@/hooks/use-data';
import type { MileageLog } from '@/types';
import { infallibleNormalizeDate } from '@/lib/date-utils';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface MileageHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string | null;
  mileageLogs: MileageLog[]; // ✅ Recibe la lista completa de logs
}

const MileageTrendChart = ({ vehicleId, mileageLogs }: { vehicleId: string; mileageLogs: MileageLog[] }) => {
  const trendData = useMemo(() => {
    return mileageLogs
      .filter(log => log.vehicleId === vehicleId)
      .map(log => ({ ...log, date: infallibleNormalizeDate(log.date) }))
      .filter((log): log is typeof log & { date: Date } => !!log.date)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(log => ({
        date: format(log.date, 'dd MMM', { locale: es }),
        km: log.mileage,
      }));
  }, [mileageLogs, vehicleId]);

  if (trendData.length < 2) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No hay suficientes datos para mostrar una tendencia.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendencia de Kilometraje</CardTitle>
      </CardHeader>
      <CardContent className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false}/>
            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Kilometraje']} />
            <Legend />
            <Line type="monotone" dataKey="km" stroke="#3b82f6" strokeWidth={2} name="Kilometraje" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};


export function MileageHistoryModal({ isOpen, onClose, vehicleId, mileageLogs }: MileageHistoryModalProps) {
  const { vehicles } = useData();

  // ✅ LOG: Verificar si se reciben las props correctamente
  useEffect(() => {
    console.log(`[HistoryModal] Modal abierto/actualizado. VehicleId: ${vehicleId}, Total logs recibidos: ${mileageLogs.length}`);
  }, [isOpen, vehicleId, mileageLogs]);

  const vehicleHistory = useMemo(() => {
    if (!vehicleId) return [];
    
    // ✅ LOG: Verificar el filtrado
    console.log(`[HistoryModal] Filtrando ${mileageLogs.length} logs para el vehicleId: ${vehicleId}`);
    
    const filtered = mileageLogs
      .filter(log => log.vehicleId === vehicleId)
      .sort((a, b) => {
        const dateA = infallibleNormalizeDate(a.date);
        const dateB = infallibleNormalizeDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      });
      
    // ✅ LOG: Mostrar resultado del filtrado
    console.log(`[HistoryModal] Se encontraron ${filtered.length} registros para este vehículo.`);
      
    return filtered;
  }, [mileageLogs, vehicleId]);

  const vehicle = useMemo(() => vehicles.find(v => v.id === vehicleId), [vehicles, vehicleId]);

  const handleExportHistory = () => {
    if (!vehicle) return;
    
    const data = vehicleHistory.map((log, index) => {
      const prevLog = vehicleHistory[index + 1];
      const increment = prevLog ? log.mileage - prevLog.mileage : 0;
      const daysDiff = prevLog 
        ? Math.ceil((new Date(log.date).getTime() - new Date(prevLog.date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const kmPerDay = daysDiff > 0 ? increment / daysDiff : 0;
      
      return {
        'Fecha': format(infallibleNormalizeDate(log.date)!, 'dd/MM/yyyy'),
        'Kilometraje': log.mileage,
        'Incremento (km)': increment > 0 ? increment : '',
        'Días desde anterior': daysDiff > 0 ? daysDiff : '',
        'Promedio km/día': kmPerDay > 0 ? kmPerDay.toFixed(1) : '',
        'Fuente': log.source || 'manual',
        'Notas': log.notes || ''
      };
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Historial de Kilometraje');
    XLSX.writeFile(wb, `historial_km_${vehicle?.plate}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    toast.success('Historial exportado a Excel.');
  };

  // ✅ LOG: Verificar qué se va a renderizar
  console.log(`[HistoryModal] Renderizando tabla con ${vehicleHistory.length} registros.`);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Historial de Kilometraje - {vehicle?.make} {vehicle?.model} ({vehicle?.plate})
          </DialogTitle>
          <DialogDescription>
            {vehicleHistory.length} registro(s) encontrado(s)
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">
          <ScrollArea className="h-[450px] lg:h-auto lg:col-span-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Kilometraje</TableHead>
                  <TableHead>Notas/Fuente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleHistory.length > 0 ? (
                  vehicleHistory.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(infallibleNormalizeDate(log.date)!, 'PPP', { locale: es })}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {log.mileage.toLocaleString()} km
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.source === 'expense' ? `Gasto: ${log.notes}` : log.notes || 'Manual'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                      No hay registros de kilometraje para este vehículo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="lg:col-span-1">
            {vehicleId && <MileageTrendChart vehicleId={vehicleId} mileageLogs={mileageLogs} />}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleExportHistory}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
