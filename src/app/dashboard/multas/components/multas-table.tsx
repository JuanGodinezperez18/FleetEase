"use client";

import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, CreditCard, Loader2, MoreHorizontal, ShieldAlert } from "lucide-react";
import { Search } from "@/components/ui/search";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { MultaWithDetails } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFinances } from "@/contexts/providers/finances-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MultasTableProps {
  multas: MultaWithDetails[];
  onEdit: (multa: MultaWithDetails) => void;
}

const STATUS_STYLES: Record<string, string> = {
  pendiente: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  pagada: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  en_proceso: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  cancelada: "border-white/10 bg-white/[0.06] text-white/45",
};

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  pagada: "Pagada",
  en_proceso: "En proceso",
  cancelada: "Cancelada",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        STATUS_STYLES[status] || STATUS_STYLES.cancelada
      )}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function MultaMobileCard({
  multa,
  onEdit,
  onPay,
  onDelete,
}: {
  multa: MultaWithDetails;
  onEdit: () => void;
  onPay: () => void;
  onDelete: () => void;
}) {
  const canPay = multa.status !== "pagada" && multa.status !== "cancelada";
  return (
    <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
            <ShieldAlert className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-white/90">{multa.vehiclePlate || "Sin placa"}</h3>
              <StatusBadge status={multa.status} />
            </div>
            <p className="truncate text-xs text-white/40">{multa.clientName}</p>
            <p className="mt-1.5 font-heading text-base font-semibold tabular-nums text-white">
              {formatCurrency(multa.outstandingAmount ?? multa.total)}
            </p>
            <p className="mt-1 text-[11px] text-white/35">
              {format(new Date(multa.fechaInfraccion), "dd MMM yyyy", { locale: es })}
              {multa.folio ? ` · Folio ${multa.folio}` : ""}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-white/40 hover:bg-white/[0.06] hover:text-white"
            >
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canPay && (
              <DropdownMenuItem onSelect={onPay}>
                <CreditCard className="mr-2 h-4 w-4" strokeWidth={1.75} />
                Registrar pago
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={onEdit}>
              <Edit className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDelete} className="text-rose-400 focus:text-rose-400">
              <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function MultasTable({ multas, onEdit }: MultasTableProps) {
  const { deleteMulta, processMultaPayment } = useFinances();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [vehicleFilter, setVehicleFilter] = useState<string>("todos");
  const [multaToDelete, setMultaToDelete] = useState<MultaWithDetails | null>(null);
  const [multaToPay, setMultaToPay] = useState<MultaWithDetails | null>(null);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("Transferencia");
  const [paying, setPaying] = useState(false);

  const uniqueVehicles = useMemo(() => {
    const vehiclesMap = new Map();
    multas.forEach(m => {
      if (m.vehiclePlate && !vehiclesMap.has(m.vehicleId)) {
        vehiclesMap.set(m.vehicleId, {
          id: m.vehicleId,
          plate: m.vehiclePlate,
          alias: m.vehicleAlias,
        });
      }
    });
    return Array.from(vehiclesMap.values());
  }, [multas]);

  const filteredMultas = useMemo(() => {
    return multas.filter(multa => {
      const matchesSearch =
        searchTerm === "" ||
        multa.folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        multa.vehiclePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        multa.vehicleAlias?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        multa.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        multa.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "todos" || multa.status === statusFilter;
      const matchesVehicle = vehicleFilter === "todos" || multa.vehicleId === vehicleFilter;
      return matchesSearch && matchesStatus && matchesVehicle;
    });
  }, [multas, searchTerm, statusFilter, vehicleFilter]);

  const handleDelete = async () => {
    if (!multaToDelete) return;
    try {
      await deleteMulta(multaToDelete.id);
      toast.success("Multa eliminada");
      setMultaToDelete(null);
    } catch {
      toast.error("Error al eliminar la multa");
    }
  };

  const openPaymentDialog = (multa: MultaWithDetails) => {
    if (multa.status === "pagada" || multa.status === "cancelada") return;
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod("Transferencia");
    setMultaToPay(multa);
  };

  const handlePayment = async () => {
    if (!multaToPay || !paymentDate) return;
    try {
      setPaying(true);
      await processMultaPayment(multaToPay.id, {
        clientId: multaToPay.clientId,
        vehicleId: multaToPay.vehicleId,
        companyId: multaToPay.companyId,
        amount: multaToPay.outstandingAmount ?? multaToPay.total,
        date: paymentDate,
        paymentMethod,
        description: `Pago de multa${multaToPay.folio ? ` - Folio ${multaToPay.folio}` : ""}`,
        isDeleted: false,
      });
      toast.success("Multa pagada", {
        description: `Se registró ${formatCurrency(multaToPay.outstandingAmount ?? multaToPay.total)}.`,
      });
      setMultaToPay(null);
    } catch {
      toast.error("No se pudo registrar el pago");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Search
          placeholder="Buscar folio, vehículo, cliente..."
          value={searchTerm}
          onValueChange={setSearchTerm}
          width={280}
        />
        <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
          <SelectTrigger className="w-full border-white/10 bg-white/[0.03] text-white sm:w-[200px]">
            <SelectValue placeholder="Vehículo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los vehículos</SelectItem>
            {uniqueVehicles.map(vehicle => (
              <SelectItem key={vehicle.id} value={vehicle.id}>
                {vehicle.alias} - {vehicle.plate}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full border-white/10 bg-white/[0.03] text-white sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="en_proceso">En proceso</SelectItem>
            <SelectItem value="pagada">Pagadas</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filteredMultas.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/35">No se encontraron multas</p>
        ) : (
          filteredMultas.map(multa => (
            <MultaMobileCard
              key={multa.id}
              multa={multa}
              onEdit={() => onEdit(multa)}
              onPay={() => openPaymentDialog(multa)}
              onDelete={() => setMultaToDelete(multa)}
            />
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-[16px] border border-white/[0.07] md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              {["Folio", "Fecha", "Vehículo", "Cliente", "Descripción", "Total", "Estado", ""].map(h => (
                <TableHead
                  key={h || "actions"}
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wide text-white/35",
                    (h === "Total" || h === "") && "text-right"
                  )}
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMultas.length === 0 ? (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell colSpan={8} className="py-10 text-center text-white/35">
                  No se encontraron multas
                </TableCell>
              </TableRow>
            ) : (
              filteredMultas.map(multa => {
                const daysOverdue = multa.daysOverdue ?? 0;
                return (
                <TableRow key={multa.id} className="border-white/[0.04] hover:bg-white/[0.02]">
                  <TableCell className="font-medium text-white/80">{multa.folio || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-white/80">
                        {format(new Date(multa.fechaInfraccion), "dd/MM/yyyy", { locale: es })}
                      </span>
                      <span className="text-[11px] text-white/35">{multa.daysOverdue > 0 ? `Hace ${multa.daysOverdue} días` : multa.daysOverdue < 0 ? `En ${Math.abs(multa.daysOverdue)} días` : "Hoy"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-white/90">{multa.vehiclePlate}</span>
                      <span className="text-[11px] text-white/35">{multa.vehicleAlias}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-white/80">{multa.clientName}</TableCell>
                  <TableCell className="max-w-[180px]">
                    <div className="truncate text-white/60" title={multa.descripcion}>
                      {multa.descripcion}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-white">
                    {formatCurrency(multa.total)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={multa.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {multa.status !== "pagada" && multa.status !== "cancelada" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/40 hover:bg-white/[0.06] hover:text-white"
                          title="Registrar pago"
                          onClick={() => openPaymentDialog(multa)}
                        >
                          <CreditCard className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/40 hover:bg-white/[0.06] hover:text-white"
                        title="Editar"
                        onClick={() => onEdit(multa)}
                      >
                        <Edit className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/40 hover:bg-rose-500/10 hover:text-rose-300"
                        title="Eliminar"
                        onClick={() => setMultaToDelete(multa)}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!multaToPay} onOpenChange={open => !open && !paying && setMultaToPay(null)}>
        <AlertDialogContent className="border-white/10 bg-[#0e1117] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Registrar pago de multa</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              {multaToPay && (
                <span>
                  Pago de <strong className="text-white">{formatCurrency(multaToPay.outstandingAmount ?? multaToPay.total)}</strong>
                  {multaToPay.folio ? ` · Folio ${multaToPay.folio}` : ""}. El estado pasará a Pagada.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {multaToPay && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="multa-payment-date" className="text-white/50">
                  Fecha de pago
                </Label>
                <Input
                  id="multa-payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  disabled={paying}
                  className="border-white/10 bg-white/[0.03] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/50">Método de pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={paying}>
                  <SelectTrigger className="border-white/10 bg-white/[0.03] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                    <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={paying}
              className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePayment}
              disabled={paying || !paymentDate}
              className="bg-[#d7ff3f] text-[#080a0f] hover:bg-[#d7ff3f]/90"
            >
              {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />}
              Confirmar pago
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!multaToDelete} onOpenChange={open => !open && setMultaToDelete(null)}>
        <AlertDialogContent className="border-white/10 bg-[#0e1117] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar multa?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-500 text-white hover:bg-rose-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
