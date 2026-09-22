"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useFinances } from "@/contexts/providers/finances-provider";
import { useVehicles } from "@/contexts/providers/vehicles-provider";
import { useClients } from "@/contexts/providers/clients-provider";
import { useAuth } from "@/contexts/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import type { Multa } from "@/types";
import { cn } from "@/lib/utils";

interface MultaFormProps {
  multa?: Multa | null;
  onClose: () => void;
}

interface MultaFormData {
  vehicleId: string;
  folio?: string;
  fechaInfraccion: string;
  direccion: string;
  descripcion: string;
  importe: number;
  recargos?: number;
  status: "pendiente" | "pagada" | "en_proceso" | "cancelada";
  fechaPago?: string;
  notas?: string;
}

const inputClass = "border-white/10 bg-white/[0.03] text-white";
const labelClass = "text-white/50";

export function MultaForm({ multa, onClose }: MultaFormProps) {
  const { vehicles, vehicleAssignmentLogs } = useVehicles();
  const { clients } = useClients();
  const { addMulta, updateMulta } = useFinances();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [assignedClient, setAssignedClient] = useState<{ id: string; name: string; auto: boolean } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MultaFormData>({
    defaultValues: multa
      ? {
          vehicleId: multa.vehicleId,
          folio: multa.folio || "",
          fechaInfraccion: multa.fechaInfraccion,
          direccion: multa.direccion,
          descripcion: multa.descripcion,
          importe: multa.importe,
          recargos: multa.recargos || 0,
          status: multa.status,
          fechaPago: multa.fechaPago || "",
          notas: multa.notas || "",
        }
      : {
          status: "pendiente",
          recargos: 0,
        },
  });

  const selectedVehicleId = watch("vehicleId");
  const fechaInfraccion = watch("fechaInfraccion");
  const importe = watch("importe");
  const recargos = watch("recargos");
  const currentStatus = watch("status");

  const activeVehicles = useMemo(
    () => vehicles.filter(v => !v.isDeleted && v.status !== "sold"),
    [vehicles]
  );

  useEffect(() => {
    if (!selectedVehicleId || !fechaInfraccion) {
      setAssignedClient(null);
      return;
    }

    const infraccionDate = new Date(fechaInfraccion).getTime();
    let foundClient: { id: string; name: string; auto: boolean } | null = null;

    const assignments = vehicleAssignmentLogs
      .filter(log => log.vehicleId === selectedVehicleId)
      .sort((a, b) => new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime());

    const activeAssignment = assignments.find(log => {
      const assignedAt = new Date(log.assignedAt).getTime();
      const unassignedAt = log.unassignedAt ? new Date(log.unassignedAt).getTime() : Date.now();
      return infraccionDate >= assignedAt && infraccionDate <= unassignedAt;
    });

    if (activeAssignment && activeAssignment.clientId) {
      const client = clients.find(c => c.id === activeAssignment.clientId);
      if (client) {
        foundClient = {
          id: client.id,
          name: `${client.firstname} ${client.lastname}`,
          auto: true,
        };
      }
    }

    if (!foundClient) {
      const clientsWithVehicle = clients.filter(
        c =>
          c.assignedVehicleId === selectedVehicleId &&
          !c.isDeleted &&
          c.status === "active" &&
          c.vehicleAssignedAt
      );

      const eligibleClients = clientsWithVehicle
        .filter(c => new Date(c.vehicleAssignedAt!).getTime() <= infraccionDate)
        .sort(
          (a, b) => new Date(b.vehicleAssignedAt!).getTime() - new Date(a.vehicleAssignedAt!).getTime()
        );

      if (eligibleClients.length > 0) {
        const client = eligibleClients[0];
        foundClient = {
          id: client.id,
          name: `${client.firstname} ${client.lastname}`,
          auto: true,
        };
      }
    }

    setAssignedClient(foundClient);
  }, [selectedVehicleId, fechaInfraccion, vehicleAssignmentLogs, clients]);

  const total = Number(importe || 0) + Number(recargos || 0);

  const onSubmit = async (data: MultaFormData) => {
    try {
      setLoading(true);

      if (!assignedClient) {
        toast.error("No se pudo determinar el cliente responsable", {
          description: "Verifica que el vehículo estuviera asignado en la fecha de la infracción",
        });
        return;
      }

      if (!currentUser?.companyId) {
        toast.error("Error: No se encontró la compañía del usuario");
        return;
      }

      if (data.status === "pagada") {
        toast.error("Una multa no puede marcarse como pagada desde este formulario", {
          description: "Registra el pago desde la acción de pago de la multa.",
        });
        return;
      }

      const multaData: Omit<Multa, "id"> = {
        vehicleId: data.vehicleId,
        clientId: assignedClient.id,
        fechaInfraccion: data.fechaInfraccion,
        direccion: data.direccion,
        descripcion: data.descripcion,
        importe: data.importe,
        recargos: data.recargos || 0,
        total,
        status: data.status,
        asignadoAutomaticamente: assignedClient.auto,
        assignmentDate: fechaInfraccion,
        companyId: currentUser.companyId,
        createdBy: currentUser.uid,
        createdAt: new Date().toISOString(),
        isDeleted: false,
        ...(data.folio ? { folio: data.folio } : {}),
        ...(data.notas ? { notas: data.notas } : {}),
      };

      if (multa) {
        await updateMulta(multa.id, multaData);
        toast.success("Multa actualizada");
      } else {
        await addMulta(multaData);
        toast.success("Multa registrada", {
          description: `Asignada a ${assignedClient.name}`,
        });
      }

      onClose();
    } catch (error: any) {
      console.error("[Multas] Error al guardar la multa:", error);
      const message = error?.message || error?.details || error?.hint || "Error desconocido";
      toast.error("Error al guardar la multa", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-white">
      <div className="space-y-2">
        <Label htmlFor="vehicleId" className={labelClass}>
          Vehículo *
        </Label>
        <Select
          value={watch("vehicleId") || ""}
          onValueChange={value => setValue("vehicleId", value)}
          disabled={!!multa}
        >
          <SelectTrigger className={inputClass}>
            <SelectValue placeholder="Selecciona un vehículo" />
          </SelectTrigger>
          <SelectContent>
            {activeVehicles.map(vehicle => (
              <SelectItem key={vehicle.id} value={vehicle.id}>
                {vehicle.alias} - {vehicle.plate}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.vehicleId && <p className="text-sm text-rose-300">{errors.vehicleId.message}</p>}
      </div>

      {selectedVehicleId && fechaInfraccion && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-[16px] border p-3 text-sm",
            assignedClient
              ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200"
              : "border-amber-400/25 bg-amber-400/[0.06] text-amber-200"
          )}
        >
          {assignedClient ? (
            <>
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>
                Cliente: <strong>{assignedClient.name}</strong>
                {assignedClient.auto && " (auto)"}
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>Sin asignación activa en la fecha de infracción</span>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="folio" className={labelClass}>
            Folio
          </Label>
          <Input id="folio" {...register("folio")} placeholder="Número de folio" className={inputClass} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fechaInfraccion" className={labelClass}>
            Fecha de infracción *
          </Label>
          <Input
            id="fechaInfraccion"
            type="date"
            {...register("fechaInfraccion", { required: "La fecha es requerida" })}
            className={inputClass}
          />
          {errors.fechaInfraccion && (
            <p className="text-sm text-rose-300">{errors.fechaInfraccion.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="direccion" className={labelClass}>
          Dirección *
        </Label>
        <Input
          id="direccion"
          {...register("direccion", { required: "La dirección es requerida" })}
          placeholder="Calle, colonia, ciudad"
          className={inputClass}
        />
        {errors.direccion && <p className="text-sm text-rose-300">{errors.direccion.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="descripcion" className={labelClass}>
          Descripción *
        </Label>
        <Textarea
          id="descripcion"
          {...register("descripcion", { required: "La descripción es requerida" })}
          placeholder="Exceso de velocidad, estacionamiento prohibido…"
          rows={3}
          className={inputClass}
        />
        {errors.descripcion && <p className="text-sm text-rose-300">{errors.descripcion.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="importe" className={labelClass}>
            Importe *
          </Label>
          <Input
            id="importe"
            type="number"
            step="0.01"
            {...register("importe", {
              required: "El importe es requerido",
              valueAsNumber: true,
              min: { value: 0, message: "Debe ser mayor a 0" },
            })}
            className={inputClass}
          />
          {errors.importe && <p className="text-sm text-rose-300">{errors.importe.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="recargos" className={labelClass}>
            Recargos
          </Label>
          <Input
            id="recargos"
            type="number"
            step="0.01"
            {...register("recargos", { valueAsNumber: true })}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label className={labelClass}>Total</Label>
          <Input
            value={`$${total.toFixed(2)}`}
            disabled
            className="border-white/10 bg-white/[0.05] font-semibold tabular-nums text-white"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className={labelClass}>Estado *</Label>
        <Select
          value={currentStatus || "pendiente"}
          onValueChange={(value: MultaFormData["status"]) => setValue("status", value)}
          disabled={multa?.status === "pagada"}
        >
          <SelectTrigger className={inputClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            {multa && <SelectItem value="en_proceso">En proceso</SelectItem>}
            {multa && <SelectItem value="cancelada">Cancelada</SelectItem>}
            {multa?.status === "pagada" && <SelectItem value="pagada">Pagada</SelectItem>}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-white/35">
          {multa?.status === "pagada"
            ? "El pago ya fue registrado; este estado no se modifica aquí."
            : "Para marcar como pagada, usa la acción de pago en la lista."}
        </p>
      </div>

      {currentStatus === "pagada" && multa?.status === "pagada" && (
        <div className="space-y-2">
          <Label className={labelClass}>Fecha de pago</Label>
          <Input type="date" value={multa.fechaPago || ""} disabled className={inputClass} />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notas" className={labelClass}>
          Notas
        </Label>
        <Textarea
          id="notas"
          {...register("notas")}
          placeholder="Información adicional"
          rows={2}
          className={inputClass}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
          className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading || !assignedClient}
          className="h-10 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90 disabled:opacity-50"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />}
          {multa ? "Actualizar" : "Registrar"} multa
        </Button>
      </div>
    </form>
  );
}
