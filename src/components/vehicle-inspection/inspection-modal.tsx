
// components/vehicle-inspection/inspection-modal.tsx
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CameraCapture } from './camera-capture';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/hooks/use-data';
import { supabase } from '@/lib/supabase';
import { Car, User } from 'lucide-react';
import { cleanupRadixUIArtifacts } from '@/lib/cleanup-radix';
import { compressImageIfNeeded } from '@/lib/image-compression';

type InspectionView = 'front' | 'left' | 'right' | 'rear';

const VIEWS: InspectionView[] = ['front', 'left', 'right', 'rear'];

interface VehicleInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId?: string; // Opcional para admins que pueden seleccionar vehículo
  onSuccess?: () => void;
}

export function VehicleInspectionModal({ isOpen, onClose, vehicleId, onSuccess }: VehicleInspectionModalProps) {
  const { currentUser } = useAuth();
  const { clients, rawVehicles } = useData();
  const [currentStep, setCurrentStep] = useState(0);
  const [photos, setPhotos] = useState<Record<InspectionView, Blob | null>>({
    front: null,
    left: null,
    right: null,
    rear: null,
  });
  const [uploading, setUploading] = useState(false);

  // Estado para selección de admin
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicleId || '');
  const [needsSelection, setNeedsSelection] = useState(false);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superAdmin' || currentUser?.role === 'editor';
  const currentClient = clients.find(c => c.userId === currentUser?.uid);
  const clientVehicle = rawVehicles.find(v => v.clientId === currentClient?.id && v.status !== 'sold');
  
  // Determinar el vehículo objetivo
  const targetVehicleId = vehicleId || selectedVehicleId || clientVehicle?.id;
  const targetVehicle = rawVehicles.find(v => v.id === targetVehicleId);

  // Vehículos disponibles para selección (admins)
  const availableVehicles = useMemo(() => {
    let vehiclesToShow = rawVehicles.filter(v => v.status !== 'sold' && !v.isDeleted);
    if (selectedClientId) {
      vehiclesToShow = vehiclesToShow.filter(v => v.clientId === selectedClientId);
    }
    return vehiclesToShow;
  }, [rawVehicles, selectedClientId]);

  // Clientes activos para selección
  const activeClients = useMemo(() => clients.filter(c => !c.isDeleted), [clients]);

  useEffect(() => {
    if (isOpen && isAdmin && !targetVehicleId) {
      setNeedsSelection(true);
    } else if (!isOpen) {
      // Resetear cuando se cierra el modal
      setNeedsSelection(false);
    }
  }, [isOpen, isAdmin, targetVehicleId]);

  // Limpiar estado completo cuando el modal se cierra
  useEffect(() => {
    if (!isOpen) {
      // Usar un timeout para permitir que las animaciones del modal terminen
      const timer = setTimeout(() => {
        setCurrentStep(0);
        setPhotos({ front: null, left: null, right: null, rear: null });
        setUploading(false);
        setSelectedClientId('');
        setSelectedVehicleId('');
        setNeedsSelection(false);

        // Limpiar artefactos de Radix UI
        cleanupRadixUIArtifacts();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleCapture = useCallback((blob: Blob) => {
    const view = VIEWS[currentStep];
    setPhotos(prev => ({ ...prev, [view]: blob }));

    if (currentStep < VIEWS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handleSubmit = async () => {
    if (!targetVehicle) {
      toast.error('No se pudo identificar el vehículo');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Subiendo inspección...');

    try {
      // Obtener sesión de Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Usuario no autenticado');
      }

      console.log('🔐 Obteniendo token de autenticación...');
      const token = session.access_token;
      const uploadedUrls: Record<string, string> = {};

      // Subir cada foto al servidor
      for (const view of VIEWS) {
        const photo = photos[view];
        if (!photo) {
          console.warn(`⚠️ No hay foto para la vista: ${view}`);
          continue;
        }

        console.log(`📤 Subiendo foto ${view} - Tamaño: ${(photo.size / 1024).toFixed(2)} KB`);
        toast.loading(`Subiendo foto ${view}...`, { id: toastId });

        // Pre-comprimir en cliente: reduce tráfico y evita el límite de 10MB del servidor
        const photoFile = new File([photo], `${view}.jpg`, { type: photo.type || 'image/jpeg' });
        const photoToUpload = (await compressImageIfNeeded(photoFile)) ?? photoFile;

        const formData = new FormData();
        formData.append('file', photoToUpload, `${view}.jpg`);
        formData.append('view', view);
        formData.append('vehicleId', targetVehicle.id);

        const response = await fetch('/api/upload-inspection', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
          console.error(`❌ Error al subir foto ${view}:`, errorData);
          throw new Error(errorData.error || errorData.details || `Error al subir foto ${view}`);
        }

        const result = await response.json();
        console.log(`✅ Foto ${view} subida exitosamente`);
        uploadedUrls[view] = result.url;
      }

      // Crear el documento de inspección en Supabase
      console.log('📝 Creando documento de inspección en Supabase...');

      if (!targetVehicle.clientId || !targetVehicle.companyId) {
        throw new Error('El vehículo no tiene cliente o empresa asignada; no se puede registrar la inspección.');
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

      const { error: inspectionError } = await supabase
        .from('vehicle_inspections')
        .insert({
          vehicle_id: targetVehicle.id,
          client_id: targetVehicle.clientId,
          company_id: targetVehicle.companyId,
          photos: uploadedUrls,
          timestamp: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          created_by: session.user.id,
        });

      if (inspectionError) {
        console.error('❌ Error al crear inspección:', inspectionError);
        throw new Error(inspectionError.message);
      }

      console.log('✅ Inspección registrada exitosamente');
      toast.success('Inspección registrada exitosamente', { id: toastId });
      resetState();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error al enviar inspección:', error);
      toast.error(error instanceof Error ? error.message : 'Error al enviar inspección', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const resetState = useCallback(() => {
    setCurrentStep(0);
    setPhotos({ front: null, left: null, right: null, rear: null });
    setUploading(false);
    setSelectedClientId('');
    setSelectedVehicleId('');
    setNeedsSelection(false);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
    // Limpiar después de un delay para permitir la animación de cierre
    setTimeout(() => cleanupRadixUIArtifacts(), 200);
  };

  // Si necesita selección
  if (needsSelection) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Seleccionar Vehículo
            </DialogTitle>
            <DialogDescription>
              Selecciona el cliente y vehículo para la inspección.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" /> Cliente (opcional)
              </Label>
              <Select
                value={selectedClientId || 'all'}
                onValueChange={(val) => setSelectedClientId(val === 'all' ? '' : val)}
              >
                <SelectTrigger><SelectValue placeholder="Filtrar por cliente..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {activeClients.map(client => (
                    <SelectItem key={client.id} value={client.id!}>{client.firstname} {client.lastname}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Car className="h-4 w-4" /> Vehículo *</Label>
              <Select
                value={selectedVehicleId || undefined}
                onValueChange={setSelectedVehicleId}
              >
                <SelectTrigger><SelectValue placeholder="Selecciona un vehículo..." /></SelectTrigger>
                <SelectContent>
                  {availableVehicles.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id!}>{vehicle.alias} - {vehicle.plate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => setNeedsSelection(false)} disabled={!selectedVehicleId}>
              Continuar con Inspección
            </Button>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  const allPhotosTaken = VIEWS.every(view => photos[view] !== null);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inspección Visual - {targetVehicle?.alias || 'Vehículo'}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Toma 4 fotos del vehículo para registrar su condición.
          </p>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progreso</span>
            <span>{currentStep} de {VIEWS.length}</span>
          </div>
          <Progress value={((currentStep) / VIEWS.length) * 100} />
        </div>

        <div className="space-y-4">
          {VIEWS.map((view, index) => (
            <div key={view} className={index !== currentStep && !photos[view] ? 'hidden' : ''}>
              <CameraCapture
                view={view}
                onCapture={handleCapture}
                captured={!!photos[view]}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          {currentStep > 0 && !allPhotosTaken && (
            <Button variant="outline" onClick={() => setCurrentStep(p => Math.max(0, p - 1))}>Anterior</Button>
          )}
          {allPhotosTaken && (
            <Button className="flex-1" onClick={handleSubmit} disabled={uploading}>
              {uploading ? 'Enviando...' : 'Enviar Inspección'}
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} disabled={uploading}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
