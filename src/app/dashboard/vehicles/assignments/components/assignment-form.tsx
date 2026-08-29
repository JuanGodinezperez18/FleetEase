'use client';

import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useData } from '@/hooks/use-data';
import { useAuth } from '@/contexts/auth-provider';
import { supabase } from '@/lib/supabase';
import { compressImageIfNeeded } from '@/lib/image-compression';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Camera, X, Car, User } from 'lucide-react';
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
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface AssignmentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  preselectedVehicleId?: string;
}

export function AssignmentForm({ onSuccess, onCancel, preselectedVehicleId }: AssignmentFormProps) {
  const { clients, rawVehicles, createVehicleAssignment, selectedCompanyId } = useData();
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<Record<string, File | null>>({});
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      clientId: '',
      vehicleId: preselectedVehicleId || '',
      odometerReading: '',
      fuelLevel: '',
      conditionNotes: '',
    },
  });

  // Solo vehículos que se pueden asignar por este formulario: no
  // bloqueados por un crédito activo (ese sistema es dueño de esos
  // vehículos - ver módulo de Créditos) y no vendidos.
  const availableVehicles = useMemo(() => {
    return rawVehicles.filter((v: Vehicle) =>
      !v.isDeleted &&
      v.status !== 'sold' &&
      !v.lockedByCredit
    );
  }, [rawVehicles]);

  const activeClients = useMemo(() => clients.filter((c: Client) => !c.isDeleted), [clients]);

  const handlePhotoChange = (viewKey: string, file: File | null) => {
    setPhotos(prev => ({ ...prev, [viewKey]: file }));
  };

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
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Error subiendo foto de ${viewKey}`);
      uploaded[viewKey] = result.url;
    }
    return uploaded;
  };

  const onSubmit = async (data: AssignmentFormValues) => {
    if (!currentUser?.uid) {
      toast.error('Usuario no autenticado');
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
        odometerReading: data.odometerReading ? Number(data.odometerReading) : null,
        fuelLevel: data.fuelLevel || null,
        conditionNotes: data.conditionNotes || null,
        photos: Object.keys(uploadedPhotos).length > 0 ? uploadedPhotos : null,
      });

      onSuccess();
    } catch (error) {
      toast.error('Error al registrar la asignación', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
      setUploadingPhotos(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2"><User className="h-4 w-4" /> Cliente</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Selecciona un cliente" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {activeClients.map((c: Client) => (
                    <SelectItem key={c.id} value={c.id}>{c.firstname} {c.lastname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="vehicleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2"><Car className="h-4 w-4" /> Vehículo</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Selecciona un vehículo" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableVehicles.map((v: Vehicle) => (
                    <SelectItem key={v.id} value={v.id}>{v.plate} - {v.make} {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="odometerReading"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kilometraje (odómetro)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Ej. 45000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="fuelLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nivel de combustible</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FUEL_LEVELS.map(level => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="conditionNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas de condición del vehículo</FormLabel>
              <FormControl>
                <Textarea placeholder="Rayones, golpes, detalles a la entrega..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Label className="mb-2 block">Fotos de entrega</Label>
          <div className="grid grid-cols-2 gap-3">
            {PHOTO_VIEWS.map(({ key, label }) => (
              <div key={key} className="border rounded-lg p-3 text-center space-y-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                {photos[key] ? (
                  <div className="relative">
                    <img
                      src={URL.createObjectURL(photos[key]!)}
                      alt={label}
                      className="w-full h-24 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => handlePhotoChange(key, null)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded cursor-pointer hover:bg-muted/50">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handlePhotoChange(key, e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploadingPhotos ? 'Subiendo fotos...' : 'Registrar Asignación'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
