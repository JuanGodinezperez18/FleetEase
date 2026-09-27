// components/camera/tracking-modal.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CameraCapture } from './camera-capture';
import { MapPin, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { compressImageIfNeeded } from '@/lib/image-compression';
import { supabase } from '@/lib/supabase';

interface TrackingModalProps {
  open: boolean;
  onClose: () => void;
  vehicleId: string;
  vehicleName: string;
}

export function TrackingModal({ open, onClose, vehicleId, vehicleName }: TrackingModalProps) {
  const [step, setStep] = useState<'camera' | 'details'>('camera');
  const [capturedPhoto, setCapturedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Obtener ubicación al abrir el modal
  useEffect(() => {
    if (open && !location) {
      getLocation();
    }
  }, [open]);

  const getLocation = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocalización no soportada');
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoadingLocation(false);
      },
      (error) => {
        console.warn('No se pudo obtener la ubicación:', error);
        setLoadingLocation(false);
      }
    );
  };

  const handlePhotoCapture = (file: File, previewUrl: string) => {
    setCapturedPhoto(file);
    setPhotoPreview(previewUrl);
    setStep('details');
  };

  const handleCancel = () => {
    resetModal();
    onClose();
  };

  const handleUpload = async () => {
    if (!capturedPhoto) {
      toast.error('No hay foto capturada');
      return;
    }

    setUploading(true);

    try {
      // Compresión obligatoria antes de subir (fotos de cámara suelen ser 3–8+ MB)
      const compressed =
        (await compressImageIfNeeded(capturedPhoto, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        })) ?? capturedPhoto;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('No autenticado. Inicia sesión de nuevo.');
      }

      const formData = new FormData();
      // La API espera `file` (no `photo`) y `notes` (no `description`)
      formData.append('file', compressed, compressed.name || `seguimiento_${Date.now()}.jpg`);
      formData.append('vehicleId', vehicleId);
      if (description.trim()) {
        formData.append('notes', description.trim());
      }

      if (location) {
        formData.append('latitude', location.latitude.toString());
        formData.append('longitude', location.longitude.toString());
      }

      const response = await fetch('/api/seguimiento/upload-foto', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al subir la foto');
      }

      toast.success('Seguimiento registrado', {
        description: 'La foto se subió correctamente y fue registrada en el sistema.',
      });

      resetModal();
      onClose();
    } catch (error: unknown) {
      console.error('Error al subir foto:', error);
      toast.error('Error al subir la foto', {
        description: error instanceof Error ? error.message : 'Intenta nuevamente',
      });
    } finally {
      setUploading(false);
    }
  };

  const resetModal = () => {
    setStep('camera');
    setCapturedPhoto(null);
    setPhotoPreview(null);
    setDescription('');
    setLocation(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'camera' ? 'Capturar Foto de Seguimiento' : 'Detalles del Seguimiento'}
          </DialogTitle>
          <DialogDescription>
            {step === 'camera'
              ? `Toma una foto del vehículo ${vehicleName} para registrar su seguimiento`
              : 'Agrega una descripción y confirma el envío'}
          </DialogDescription>
        </DialogHeader>

        {step === 'camera' ? (
          <CameraCapture onPhotoCapture={handlePhotoCapture} onCancel={handleCancel} />
        ) : (
          <div className="space-y-4">
            {photoPreview && (
              <div className="rounded-lg overflow-hidden border">
                <img src={photoPreview} alt="Preview" className="w-full h-auto max-h-64 object-contain" />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Ej: Vehículo en buen estado, sin daños visibles..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {loadingLocation ? (
                <span>Obteniendo ubicación...</span>
              ) : location ? (
                <span>
                  Ubicación: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </span>
              ) : (
                <span>Ubicación no disponible</span>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep('camera')} className="flex-1" disabled={uploading}>
                Volver a Capturar
              </Button>
              <Button onClick={handleUpload} className="flex-1" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Enviar Seguimiento
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
