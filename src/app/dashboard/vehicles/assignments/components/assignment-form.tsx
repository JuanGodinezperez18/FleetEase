'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useData } from '@/hooks/use-data';
import { useAuth } from '@/contexts/auth-provider';
import { supabase } from '@/lib/supabase';
import { compressImageIfNeeded } from '@/lib/image-compression';
import { checkAssignmentDateAgainstEntityCreation, isDateOnOrAfter } from '@/lib/vehicle-assignment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Camera, X, Car, User, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { Client, Vehicle } from '@/types';

const PHOTO_VIEWS = [
  { key: 'front', label: 'Frente' },
  { key: 'rear', label: 'Trasera' },
  { key: 'left', label: 'Lateral Izquierdo' },
  { key: 'right', label: 'Lateral Derecho' },
] as const;

const FUEL_LEVELS = ['Vacío', '1/4', '1/2', '3/4', 'Lleno'] as const;

const assignmentSchema = z.object({
  clientId: z.string().min(1, 'Selecciona un cliente'),
  vehicleId: z.string().min(1, 'Selecciona un vehículo'),
  odometerReading: z.string().optional(),
  fuelLevel: z.string().optional(),
  conditionNotes: z.string().optional(),
  assignedAt: z.string().min(1, 'Fecha de asignación requerida'),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface AssignmentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  preselectedVehicleId?: string;
}

export function AssignmentForm({ onSuccess, onCancel, preselectedVehicleId }: AssignmentFormProps) {
  const { clients, rawVehicles, vehicleAssignmentLogs, createVehicleAssignment, selectedCompanyId, credits } = useData();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<Record<string, File | null>>({});
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [latestMileage, setLatestMileage] = useState<number | null>(null);
  const [mileageLoading, setMileageLoading] = useState(false);

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      clientId: '',
      vehicleId: preselectedVehicleId || '',
      odometerReading: '',
      fuelLevel: '',
      conditionNotes: '',
      assignedAt: new Date().toISOString().slice(0, 10),
    },
  });

  const selectedClientId = form.watch('clientId');
  const selectedVehicleId = form.watch('vehicleId');
  const assignedAt = form.watch('assignedAt');

  const activeAssignmentClientIds = useMemo(() => new Set(
    vehicleAssignmentLogs
      .filter((log) => !log.unassignedAt)
      .map((log) => log.clientId)
  ), [vehicleAssignmentLogs]);

  const activeAssignmentVehicleIds = useMemo(() => new Set(
    vehicleAssignmentLogs
      .filter((log) => !log.unassignedAt)
      .map((log) => log.vehicleId)
  ), [vehicleAssignmentLogs]);

  /** Vehículos disponibles en la fecha de asignación (registro <= fecha). */
  const availableVehicles = useMemo(() => rawVehicles.filter((v: Vehicle) =>
    !v.isDeleted &&
    v.status === 'active' &&
    !v.clientId &&
    !v.lockedByCredit &&
    !activeAssignmentVehicleIds.has(v.id) &&
    (!assignedAt || !v.createdAt || isDateOnOrAfter(assignedAt, v.createdAt))
  ), [rawVehicles, activeAssignmentVehicleIds, assignedAt]);

  /** Clientes disponibles en la fecha de asignación (registro <= fecha). */
  const activeClients = useMemo(() => clients.filter((c: Client) =>
    !c.isDeleted &&
    !activeAssignmentClientIds.has(c.id) &&
    !rawVehicles.some((v: Vehicle) => !v.isDeleted && v.clientId === c.id) &&
    (!assignedAt || !c.createdAt || isDateOnOrAfter(assignedAt, c.createdAt))
  ), [clients, activeAssignmentClientIds, rawVehicles, assignedAt]);

  const selectedClientVehicle = useMemo(() => {
    if (!selectedClientId) return null;
    return rawVehicles.find((vehicle: Vehicle) =>
      !vehicle.isDeleted && vehicle.clientId === selectedClientId
    ) || null;
  }, [rawVehicles, selectedClientId]);

  const selectedClientActiveCredit = useMemo(() => {
    if (!selectedClientId) return false;
    return credits.some((credit) => credit.clientId === selectedClientId && credit.status === 'active');
  }, [credits, selectedClientId]);

  const selectedVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return rawVehicles.find((vehicle: Vehicle) => vehicle.id === selectedVehicleId) || null;
  }, [rawVehicles, selectedVehicleId]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c: Client) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Si cambia la fecha y el vehículo/cliente elegido queda fuera del rango, se limpia la selección.
  useEffect(() => {
    if (!assignedAt) return;

    if (selectedVehicleId) {
      const stillValid = availableVehicles.some((v) => v.id === selectedVehicleId);
      if (!stillValid) {
        form.setValue('vehicleId', '', { shouldValidate: true });
        toast.message('Vehículo no disponible en esa fecha', {
          description: 'La fecha de asignación es anterior al registro del vehículo seleccionado. Elige otra unidad o una fecha posterior.',
        });
      }
    }

    if (selectedClientId) {
      const stillValid = activeClients.some((c) => c.id === selectedClientId);
      if (!stillValid) {
        form.setValue('clientId', '', { shouldValidate: true });
        toast.message('Cliente no disponible en esa fecha', {
          description: 'La fecha de asignación es anterior al registro del cliente seleccionado. Elige otro cliente o una fecha posterior.',
        });
      }
    }
  }, [assignedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Precarga el último kilometraje conocido del vehículo. La BD también lo valida
  // al guardar, pero el usuario debe verlo y poder corregirlo hacia arriba.
  useEffect(() => {
    let cancelled = false;
    const loadLatestMileage = async () => {
      if (!selectedVehicleId || !selectedVehicle) {
        setLatestMileage(null);
        form.setValue('odometerReading', '');
        return;
      }

      setMileageLoading(true);
      try {
        const { data, error } = await supabase
          .from('mileage_logs')
          .select('mileage')
          .eq('vehicle_id', selectedVehicleId)
          .order('mileage', { ascending: false })
          .limit(1);

        if (error) throw error;
        if (cancelled) return;

        const vehicleMileage = Number(selectedVehicle.currentMileage ?? 0);
        const logMileage = data?.[0]?.mileage != null ? Number(data[0].mileage) : 0;
        const latest = Math.max(vehicleMileage, logMileage);
        setLatestMileage(latest);
        form.setValue('odometerReading', latest > 0 ? String(latest) : '', { shouldValidate: true });
      } catch {
        if (cancelled) return;
        const fallback = Number(selectedVehicle.currentMileage ?? 0);
        setLatestMileage(fallback);
        form.setValue('odometerReading', fallback > 0 ? String(fallback) : '', { shouldValidate: true });
      } finally {
        if (!cancelled) setMileageLoading(false);
      }
    };

    void loadLatestMileage();
    return () => { cancelled = true; };
  }, [selectedVehicleId, selectedVehicle, form]);

  const handlePhotoChange = (viewKey: string, file: File | null) => setPhotos(prev => ({ ...prev, [viewKey]: file }));

  const uploadPhotos = async (vehicleId: string): Promise<Record<string, string>> => {
    const uploaded: Record<string, string> = {};
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Sesión expirada, vuelve a iniciar sesión.');

    for (const [viewKey, file] of Object.entries(photos)) {
      if (!file) continue;
      const compressed = (await compressImageIfNeeded(file)) ?? file;
      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('view', viewKey);
      formData.append('vehicleId', vehicleId);
      const response = await fetch('/api/upload-assignment-photo', {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Error subiendo foto de ${viewKey}`);
      uploaded[viewKey] = result.url;
    }
    return uploaded;
  };

  const onSubmit = async (data: AssignmentFormValues) => {
    if (!currentUser?.uid) { toast.error('Usuario no autenticado'); return; }
    if (selectedClientVehicle || activeAssignmentClientIds.has(data.clientId)) {
      toast.error('No se puede asignar otro vehículo', { description: selectedClientActiveCredit
        ? 'El cliente tiene un vehículo ligado a un crédito activo. Debe liquidarse o cancelarse antes de liberar la unidad.'
        : 'El cliente ya tiene un vehículo asignado. Primero debes desasignarlo antes de asignarle otra unidad.' });
      return;
    }

    const selected = rawVehicles.find((vehicle) => vehicle.id === data.vehicleId);
    if (!selected || selected.isDeleted || selected.status !== 'active' || selected.clientId || selected.lockedByCredit || activeAssignmentVehicleIds.has(selected.id)) {
      toast.error('Vehículo no disponible', { description: 'La unidad ya no está disponible para asignación. Actualiza la información e inténtalo nuevamente.' });
      return;
    }

    const client = clients.find((c) => c.id === data.clientId);
    const dateCheck = checkAssignmentDateAgainstEntityCreation(data.assignedAt, {
      vehicleCreatedAt: selected.createdAt,
      clientCreatedAt: client?.createdAt,
    });
    if (!dateCheck.available) {
      form.setError('assignedAt', { type: 'validate', message: dateCheck.error });
      toast.error('Fecha de asignación inválida', { description: dateCheck.error });
      return;
    }

    const enteredMileage = data.odometerReading ? Number(data.odometerReading) : null;
    if (latestMileage != null && enteredMileage != null && enteredMileage < latestMileage) {
      form.setError('odometerReading', { type: 'validate', message: `El kilometraje no puede ser menor a ${latestMileage.toLocaleString()} km.` });
      return;
    }

    setIsSubmitting(true);
    try {
      setUploadingPhotos(true);
      const uploadedPhotos = await uploadPhotos(data.vehicleId);
      setUploadingPhotos(false);
      await createVehicleAssignment({
        vehicleId: data.vehicleId,
        clientId: data.clientId,
        assignedBy: currentUser.uid,
        companyId: currentUser.companyId || selectedCompanyId || '',
        odometerReading: enteredMileage,
        fuelLevel: data.fuelLevel || null,
        conditionNotes: data.conditionNotes || null,
        photos: Object.keys(uploadedPhotos).length > 0 ? uploadedPhotos : null,
        assignedAt: new Date(`${data.assignedAt}T12:00:00`).toISOString(),
      });
      onSuccess();
    } catch (error) {
      toast.error('Error al registrar la asignación', { description: error instanceof Error ? error.message : undefined });
    } finally {
      setIsSubmitting(false);
      setUploadingPhotos(false);
    }
  };

  const minAssignableDateHint = useMemo(() => {
    const dates: string[] = [];
    if (selectedVehicle?.createdAt) dates.push(selectedVehicle.createdAt.slice(0, 10));
    if (selectedClient?.createdAt) dates.push(selectedClient.createdAt.slice(0, 10));
    if (dates.length === 0) return null;
    return dates.sort().pop() ?? null;
  }, [selectedVehicle, selectedClient]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField control={form.control} name="assignedAt" render={({ field }) => (
          <FormItem>
            <FormLabel>Fecha de asignación</FormLabel>
            <FormControl>
              <Input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                min={minAssignableDateHint ?? undefined}
                {...field}
              />
            </FormControl>
            <p className="text-xs text-muted-foreground">
              Debe ser igual o posterior a la fecha de registro del vehículo y del cliente.
              {minAssignableDateHint ? ` Mínimo sugerido según la selección actual: ${minAssignableDateHint}.` : ' Los listados de vehículo y cliente se filtran según esta fecha.'}
            </p>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="clientId" render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2"><User className="h-4 w-4" /> Cliente</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un cliente" /></SelectTrigger></FormControl>
              <SelectContent>{activeClients.map((c: Client) => <SelectItem key={c.id} value={c.id}>{c.firstname} {c.lastname}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
            {assignedAt && activeClients.length === 0 && !selectedClientVehicle && (
              <p className="text-xs text-muted-foreground">No hay clientes registrados en o antes de la fecha de asignación seleccionada.</p>
            )}
            {selectedClientVehicle && <div className="mt-2 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm"><div className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><div><p className="font-medium text-foreground">Este cliente ya tiene vehículo</p><p className="text-muted-foreground">{selectedClientVehicle.plate} · {selectedClientVehicle.make} {selectedClientVehicle.model}</p><p className="mt-1 text-xs text-muted-foreground">{selectedClientActiveCredit ? 'Está protegido por un crédito activo. Debe liquidarse o cancelarse antes de liberar la unidad.' : 'Primero debes desasignar esta unidad para poder asignarle otra.'}</p></div></div></div>}
          </FormItem>
        )} />

        <FormField control={form.control} name="vehicleId" render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2"><Car className="h-4 w-4" /> Vehículo disponible</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} disabled={!!selectedClientVehicle}>
              <FormControl><SelectTrigger><SelectValue placeholder={selectedClientVehicle ? 'Primero libera el vehículo actual' : 'Selecciona un vehículo'} /></SelectTrigger></FormControl>
              <SelectContent>{availableVehicles.map((v: Vehicle) => <SelectItem key={v.id} value={v.id}>{v.plate} - {v.make} {v.model}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
            {availableVehicles.length === 0 && !selectedClientVehicle && (
              <p className="text-xs text-muted-foreground">
                {assignedAt
                  ? 'No hay vehículos disponibles registrados en o antes de la fecha de asignación seleccionada.'
                  : 'No hay vehículos disponibles para asignar.'}
              </p>
            )}
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="odometerReading" render={({ field }) => (
            <FormItem>
              <FormLabel>Kilometraje (odómetro)</FormLabel>
              <FormControl><Input type="number" min={latestMileage ?? 0} placeholder={mileageLoading ? 'Consultando último kilometraje...' : 'Ej. 45000'} {...field} /></FormControl>
              {latestMileage != null && <p className="text-xs text-muted-foreground">Último kilometraje conocido: <span className="font-medium text-foreground">{latestMileage.toLocaleString()} km</span></p>}
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="fuelLevel" render={({ field }) => (
            <FormItem>
              <FormLabel>Nivel de combustible</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger></FormControl><SelectContent>{FUEL_LEVELS.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent></Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="conditionNotes" render={({ field }) => (
          <FormItem><FormLabel>Notas de condición del vehículo</FormLabel><FormControl><Textarea placeholder="Rayones, golpes, detalles a la entrega..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <div><Label className="mb-2 block">Fotos de entrega</Label><div className="grid grid-cols-2 gap-3">{PHOTO_VIEWS.map(({ key, label }) => <div key={key} className="border rounded-lg p-3 text-center space-y-2"><p className="text-xs text-muted-foreground">{label}</p>{photos[key] ? <div className="relative"><img src={URL.createObjectURL(photos[key]!)} alt={label} className="w-full h-24 object-cover rounded" /><button type="button" onClick={() => handlePhotoChange(key, null)} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"><X className="h-3 w-3" /></button></div> : <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded cursor-pointer hover:bg-muted/50"><Camera className="h-5 w-5 text-muted-foreground" /><input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handlePhotoChange(key, e.target.files?.[0] || null)} /></label>}</div>)}</div></div>

        <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button><Button type="submit" disabled={isSubmitting || !!selectedClientVehicle || availableVehicles.length === 0}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{uploadingPhotos ? 'Subiendo fotos...' : 'Registrar Asignación'}</Button></div>
      </form>
    </Form>
  );
}
