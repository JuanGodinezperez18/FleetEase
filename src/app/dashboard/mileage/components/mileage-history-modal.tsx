"use client";

import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useData } from "@/hooks/use-data";
import type { MileageLog } from "@/types";
import { infallibleNormalizeDate } from "@/lib/date-utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface MileageHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string | null;
  mileageLogs: MileageLog[];
}

const MileageTrendChart = ({ vehicleId, mileageLogs }: { vehicleId: string; mileageLogs: MileageLog[] }) => {
  const trendData = useMemo(() => {
    return mileageLogs
      .filter(log => log.vehicleId === vehicleId)
      .map(log => ({ ...log, date: infallibleNormalizeDate(log.date) }))
      .filter((log): log is typeof log & { date: Date } => !!log.date)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(log => ({
        date: format(log.date, "dd MMM", { locale: es }),
        km: log.mileage,
      }));
  }, [mileageLogs, vehicleId]);

  if (trendData.length < 2) {
    return (
      <div className="flex h-[250px] items-center justify-center rounded-[16px] border border-border/50 text-sm text-muted-foreground">
        Datos insuficientes para la tendencia
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[16px] border border-border/50">
      <div className="border-b border-border/50 px-4 py-3">
        <h3 className="text-sm font-semibold">Tendencia de kilometraje</h3>
      </div>
      <div className="h-[250px] p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={value => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip formatter={(value: number) => [value.toLocaleString() + " km", "Kilometraje"]} />
            <Line type="monotone" dataKey="km" stroke="#d7ff3f" strokeWidth={2.5} name="Kilometraje" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export function MileageHistoryModal({ isOpen, onClose, vehicleId, mileageLogs }: MileageHistoryModalProps) {
  const { vehicles } = useData();

  const vehicleHistory = useMemo(() => {
    if (!vehicleId) return [];
    return mileageLogs
      .filter(log => log.vehicleId === vehicleId)
      .sort((a, b) => {
        const dateA = infallibleNormalizeDate(a.date);
        const dateB = infallibleNormalizeDate(b.date);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      });
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
        Fecha: format(infallibleNormalizeDate(log.date)!, "dd/MM/yyyy"),
        Kilometraje: log.mileage,
        "Incremento (km)": increment > 0 ? increment : "",
        "Días desde anterior": daysDiff > 0 ? daysDiff : "",
        "Promedio km/día": kmPerDay > 0 ? kmPerDay.toFixed(1) : "",
        Fuente: log.source || "manual",
        Notas: log.notes || "",
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Historial de Kilometraje");
    XLSX.writeFile(wb, `historial_km_${vehicle?.plate}_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("Historial exportado a Excel.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>
            Historial · {vehicle?.make} {vehicle?.model} ({vehicle?.plate})
          </DialogTitle>
          <DialogDescription>
            {vehicleHistory.length} registro{vehicleHistory.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
          <ScrollArea className="h-[450px] lg:h-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Kilometraje</TableHead>
                  <TableHead>Fuente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicleHistory.length > 0 ? (
                  vehicleHistory.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>{format(infallibleNormalizeDate(log.date)!, "PPP", { locale: es })}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {log.mileage.toLocaleString()} km
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.source === "expense" ? `Gasto: ${log.notes}` : log.notes || "Manual"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      No hay registros para este vehículo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          <div>{vehicleId && <MileageTrendChart vehicleId={vehicleId} mileageLogs={mileageLogs} />}</div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleExportHistory}>
            <Download className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Exportar
          </Button>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
