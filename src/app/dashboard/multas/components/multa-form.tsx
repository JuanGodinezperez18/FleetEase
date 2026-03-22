"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useFinances } from '@/contexts/providers/finances-provider';
import { useVehicles } from '@/contexts/providers/vehicles-provider';
import { useClients } from '@/contexts/providers/clients-provider';
import { useAuth } from '@/contexts/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { Multa } from '@/types';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  status: 'pendiente' | 'pagada' | 'en_proceso' | 'cancelada';
  fechaPago?: string;
  notas?: string;
}

export function MultaForm({ multa, onClose }: MultaFormProps) {
  const { vehicles, vehicleAssignmentLogs } = useVehicles();
  const { clients } = useClients();
  const { addMulta, updateMulta } = useFinances();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [assignedClient, setAssignedClient] = useState<{
    id: string;
    name: string;
    auto: boolean;
  } | null>(null);

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
          folio: multa.folio || '',
          fechaInfraccion: multa.fechaInfraccion,
          direccion: multa.direccion,
          descripcion: multa.descripcion,
          importe: multa.importe,
          recargos: multa.recargos || 0,
          status: multa.status,
          fechaPago: multa.fechaPago || '',
          notas: multa.notas || '',
        }
      : {
          status: 'pendiente',
          recargos: 0,
        },
  });

  const selectedVehicleId = watch('vehicleId');
  const fechaInfraccion = watch('fechaInfraccion');
  const importe = watch('importe');
  const recargos = watch('recargos');

  const activeVehicles = useMemo(
    () => vehicles.filter(v => !v.isDeleted && v.status !== 'sold'),
    [vehicles]
  );

  // Lógica para encontrar al cliente responsable basado en el historial
  useEffect(() => {
    if (!selectedVehicleId || !fechaInfraccion) {
      setAssignedClient(null);
      return;
    }

    const infraccionDate = new Date(fechaInfraccion).getTime();
    let foundClient: { id: string; name: string; auto: boolean } | null = null;

    // MÉTODO 1: Buscar en el historial de asignaciones (vehicleAssignmentLogs)
    const assignments = vehicleAssignmentLogs
      .filter(log => log.vehicleId === selectedVehicleId)
      .sort((a, b) => new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime());

    // Encontrar la asignación activa en la fecha de la infracción
    const activeAssignment = assignments.find(log => {
      const assignedAt = new Date(log.assignedAt).getTime();
      const unassignedAt = log.unassignedAt
        ? new Date(log.unassignedAt).getTime()
        : Date.now();

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

    // MÉTODO 2: Si no se encontró en logs, buscar directamente en clientes
    // que tengan el vehículo asignado y su fecha de asignación sea anterior a la multa
    if (!foundClient) {
      const clientsWithVehicle = clients.filter(
        c => c.assignedVehicleId === selectedVehicleId &&
             !c.isDeleted &&
             c.status === 'active' &&
             c.vehicleAssignedAt
      );

      // Buscar el cliente cuya fecha de asignación sea la más cercana pero anterior a la infracción
      const eligibleClients = clientsWithVehicle.filter(c => {
        const assignedAt = new Date(c.vehicleAssignedAt!).getTime();
        return assignedAt <= infraccionDate;
      }).sort((a, b) => {
        // Ordenar por fecha más reciente primero
        const dateA = new Date(a.vehicleAssignedAt!).getTime();
        const dateB = new Date(b.vehicleAssignedAt!).getTime();
        return dateB - dateA;
      });

      if (eligibleClients.length > 0) {
        const client = eligibleClients[0];
        foundClient = {
          id: client.id,
          name: `${client.firstname} ${client.lastname}`,
          auto: true,
        };
      }
    }

    if (foundClient) {
      setAssignedClient(foundClient);
    } else {
      setAssignedClient(null);
    }
  }, [selectedVehicleId, fechaInfraccion, vehicleAssignmentLogs, clients]);

  const total = Number(importe || 0) + Number(recargos || 0);

  const onSubmit = async (data: MultaFormData) => {
    try {
      setLoading(true);

      if (!assignedClient) {
        toast.error('No se pudo determinar el cliente responsable', {
          description: 'Verifica que el vehículo estuviera asignado en la fecha de la infracción',
        });
        setLoading(false);
        return;
      }

      if (!currentUser?.companyId) {
        toast.error('Error: No se encontró la compañía del usuario');
        setLoading(false);
        return;
      }

      const multaData: Omit<Multa, 'id'> = {
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
        // Optional fields, only add them if they have a value
        ...(data.folio ? { folio: data.folio } : {}),
        ...(data.status === 'pagada' && data.fechaPago ? { fechaPago: data.fechaPago } : {}),
        ...(data.notas ? { notas: data.notas } : {}),
      };


      if (multa) {
        await updateMulta(multa.id, multaData);
        toast.success('Multa actualizada exitosamente');
      } else {
        await addMulta(multaData);
        toast.success('Multa registrada exitosamente', {
          description: `Asignada a ${assignedClient.name}`,
        });
      }

      onClose();
    } catch (error) {
      console.error('Error al guardar multa:', error);
      toast.error('Error al guardar la multa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Selección de vehículo */}
      <div className="space-y-2">
        <Label htmlFor="vehicleId">Vehículo *</Label>
        <Select
          value={watch('vehicleId') || ''}
          onValueChange={(value) => setValue('vehicleId', value)}
          disabled={!!multa}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un vehículo" />
          </SelectTrigger>
          <SelectContent>
            {activeVehicles.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id}>
                {vehicle.alias} - {vehicle.plate}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.vehicleId && (
          <p className="text-sm text-red-500">{errors.vehicleId.message}</p>
        )}
      </div>

      {/* Información del cliente asignado */}
      {selectedVehicleId && fechaInfraccion && (
        <Alert className={assignedClient ? 'border-green-500' : 'border-yellow-500'}>
          <AlertDescription className="flex items-center gap-2">
            {assignedClient ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>
                  Cliente responsable: <strong>{assignedClient.name}</strong>
                  {assignedClient.auto && ' (asignado automáticamente)'}
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>
                  No se encontró asignación activa para este vehículo en la fecha de la infracción
                </span>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Folio */}
        <div className="space-y-2">
          <Label htmlFor="folio">Folio (Opcional)</Label>
          <Input
            id="folio"
            {...register('folio')}
            placeholder="Número de folio"
          />
        </div>

        {/* Fecha de infracción */}
        <div className="space-y-2">
          <Label htmlFor="fechaInfraccion">Fecha de Infracción *</Label>
          <Input
            id="fechaInfraccion"
            type="date"
            {...register('fechaInfraccion', { required: 'La fecha es requerida' })}
          />
          {errors.fechaInfraccion && (
            <p className="text-sm text-red-500">{errors.fechaInfraccion.message}</p>
          )}
        </div>
      </div>

      {/* Dirección */}
      <div className="space-y-2">
        <Label htmlFor="direccion">Dirección *</Label>
        <Input
          id="direccion"
          {...register('direccion', { required: 'La dirección es requerida' })}
          placeholder="Calle, colonia, ciudad"
        />
        {errors.direccion && (
          <p className="text-sm text-red-500">{errors.direccion.message}</p>
        )}
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <Label htmlFor="descripcion">Descripción de la Infracción *</Label>
        <Textarea
          id="descripcion"
          {...register('descripcion', { required: 'La descripción es requerida' })}
          placeholder="Exceso de velocidad, estacionamiento prohibido, etc."
          rows={3}
        />
        {errors.descripcion && (
          <p className="text-sm text-red-500">{errors.descripcion.message}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Importe */}
        <div className="space-y-2">
          <Label htmlFor="importe">Importe *</Label>
          <Input
            id="importe"
            type="number"
            step="0.01"
            {...register('importe', {
              required: 'El importe es requerido',
              valueAsNumber: true,
              min: { value: 0, message: 'Debe ser mayor a 0' },
            })}
          />
          {errors.importe && (
            <p className="text-sm text-red-500">{errors.importe.message}</p>
          )}
        </div>

        {/* Recargos */}
        <div className="space-y-2">
          <Label htmlFor="recargos">Recargos</Label>
          <Input
            id="recargos"
            type="number"
            step="0.01"
            {...register('recargos', { valueAsNumber: true })}
          />
        </div>

        {/* Total */}
        <div className="space-y-2">
          <Label>Total</Label>
          <Input
            value={`$${total.toFixed(2)}`}
            disabled
            className="font-bold"
          />
        </div>
      </div>

      {/* Estado */}
      <div className="space-y-2">
        <Label htmlFor="status">Estado *</Label>
        <Select
          value={watch('status') || 'pendiente'}
          onValueChange={(value: any) => setValue('status', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_proceso">En Proceso</SelectItem>
            <SelectItem value="pagada">Pagada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Fecha de pago (solo si está pagada) */}
      {watch('status') === 'pagada' && (
        <div className="space-y-2">
          <Label htmlFor="fechaPago">Fecha de Pago</Label>
          <Input
            id="fechaPago"
            type="date"
            {...register('fechaPago')}
          />
        </div>
      )}

      {/* Notas */}
      <div className="space-y-2">
        <Label htmlFor="notas">Notas Adicionales</Label>
        <Textarea
          id="notas"
          {...register('notas')}
          placeholder="Información adicional sobre la multa"
          rows={2}
        />
      </div>

      {/* Botones */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || !assignedClient}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {multa ? 'Actualizar' : 'Registrar'} Multa
        </Button>
      </div>
    </form>
  );
}
