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
import { MapPin, Upload, Loader2, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { compressImageIfNeeded } from '@/lib/image-compression';
import { supabase } from '@/lib/supabase';

const INSPECTION_ITEMS = [
  { id: 'front_signals', label: 'Intermitentes delanteras' },
  { id: 'rear_signals', label: 'Intermitentes traseras' },
  { id: 'lights', label: 'Luces principales y de freno' },
  { id: 'brakes', label: 'Frenos' },
  { id: 'tires', label: 'Llantas' },
  { id: 'mirrors_windows', label: 'Espejos y cristales' },
  { id: 'accessories', label: 'Accesorios y equipamiento' },
  { id: 'bodywork', label: 'Carrocería y daños visibles' },
] as const;

type InspectionResult = { status: 'yes' | 'no' | null; details: string };

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
  const [description, setDescription] = useState('');\n  const [inspectionResults, setInspectionResults] = useState<Record<string, InspectionResult>>(() =>\n    Object.fromEntries(INSPECTION_ITEMS.map(item => [item.id, { status: null, details: '' }]))\n  );
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
    const incompleteItem = INSPECTION_ITEMS.find(item => {
      const result = inspectionResults[item.id];
      return !result?.status || (result.status === 'no' && !result.details.trim());
    });
    if (incompleteItem) {
      toast.error('Completa la inspección', {
        description: `Indica el estado de: ${incompleteItem.label}${inspectionResults[incompleteItem.id]?.status === 'no' ? ' y describe la falla' : ''}.`,
      });
      return;
    }
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
      const inspectionNotes = [
        'INSPECCIÓN FÍSICA',
        ...INSPECTION_ITEMS.map(item => {
          const result = inspectionResults[item.id];
          return `- ${item.label}: ${result.status === 'yes' ? 'Sí' : 'No'}${result.status === 'no' ? ` — ${result.details.trim()}` : ''}`;
        }),
        description.trim() ? `Comentarios generales: ${description.trim()}` : '',
      ].filter(Boolean).join('\n');
      formData.append('notes', inspectionNotes);

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
    setInspectionResults(Object.fromEntries(INSPECTION_ITEMS.map(item => [item.id, { status: null, details: '' }])));
    setLocation(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-h-[90dvh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {step === 'camera' ? 'Capturar Foto de Seguimiento' : 'Detalles del Seguimiento'}
          </DialogTitle>
          <DialogDescription>
            {step === 'camera'
              ? `Toma una foto del vehículo ${vehicleName} para registrar su seguimiento`
               : 'Revisa cada elemento, documenta las fallas y agrega comentarios'}
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

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Inspección física</h3>
                <p className="mt-1 text-xs text-muted-foreground">Marca Sí o No en cada elemento. Si marcas No, describe la falla para que pueda atenderse.</p>
              </div>
              <div className="space-y-3">
                {INSPECTION_ITEMS.map(item => {
                  const result = inspectionResults[item.id];
                  return (
                    <div key={item.id} className="space-y-2 rounded-xl border p-3">
                      <p className="text-sm font-medium">{item.label}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(['yes', 'no'] as const).map(status => (
                          <button
                            key={status}
                            type="button"
                            aria-pressed={result.status === status}
                            onClick={() => setInspectionResults(previous => ({
                              ...previous,
                              [item.id]: { ...previous[item.id], status },
                            }))}
                            className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm transition-colors ${result.status === status ? status === 'yes' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300' : 'border-border text-muted-foreground'}`}
                          >
                            {result.status === status ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                            {status === 'yes' ? 'Sí, funciona' : 'No funciona'}
                          </button>
                        ))}
                      </div>
                      {result.status === 'no' && (
                        <div className="space-y-1.5">
                          <Label htmlFor={`issue-${item.id}`} className="flex items-center gap-1 text-xs">
                            <AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> Describe la falla (obligatorio)
                          </Label>
                          <Textarea
                            id={`issue-${item.id}`}
                            value={result.details}
                            onChange={event => setInspectionResults(previous => ({
                              ...previous,
                              [item.id]: { ...previous[item.id], details: event.target.value },
                            }))}
                            placeholder="¿Qué no funciona o qué desgaste observaste?"
                            maxLength={100}
                            rows={2}
                            className="resize-y"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="space-y-2">
              <Label htmlFor="description">Comentarios adicionales (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Otros daños, ruidos, accesorios faltantes o tareas pendientes..."
                maxLength={300}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-y"
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
