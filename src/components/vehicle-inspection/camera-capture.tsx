
// components/vehicle-inspection/camera-capture.tsx
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, RefreshCw, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type InspectionView = 'front' | 'left' | 'right' | 'rear';

interface CameraCaptureProps {
  view: InspectionView;
  onCapture: (blob: Blob) => void;
  onSkip?: () => void;
  captured: boolean;
}

const VIEW_INSTRUCTIONS: Record<InspectionView, { 
  title: string; 
  subtitle: string;
  icon: string;
}> = {
  front: {
    title: '📸 Parte Frontal',
    subtitle: 'Captura la parte delantera completa del vehículo',
    icon: '🚗',
  },
  left: {
    title: '📸 Lado Izquierdo',
    subtitle: 'Toma la foto desde el lado del conductor',
    icon: '👈',
  },
  right: {
    title: '📸 Lado Derecho',
    subtitle: 'Toma la foto desde el lado del copiloto',
    icon: '👉',
  },
  rear: {
    title: '📸 Parte Trasera',
    subtitle: 'Captura la parte posterior completa del vehículo',
    icon: '🚙',
  },
};

// SVG de siluetas de vehículo
const VehicleSilhouette = ({ view }: { view: InspectionView }) => {
  const silhouettes: Record<InspectionView, React.ReactElement> = {
    front: (
      <svg viewBox="0 0 200 120" className="w-full h-full" fill="currentColor" opacity="0.3">
        <path d="M30,60 Q30,40 50,40 L150,40 Q170,40 170,60 L170,100 Q170,110 160,110 L40,110 Q30,110 30,100 Z" />
        <circle cx="60" cy="100" r="15" />
        <circle cx="140" cy="100" r="15" />
        <rect x="70" y="50" width="60" height="35" rx="5" />
        <line x1="100" y1="50" x2="100" y2="85" strokeWidth="2" stroke="currentColor" />
      </svg>
    ),
    left: (
      <svg viewBox="0 0 200 100" className="w-full h-full" fill="currentColor" opacity="0.3">
        <path d="M20,40 L50,30 L140,30 L180,40 L180,70 Q180,80 170,80 L30,80 Q20,80 20,70 Z" />
        <circle cx="50" cy="75" r="12" />
        <circle cx="150" cy="75" r="12" />
        <rect x="60" y="35" width="80" height="30" rx="3" />
        <line x1="100" y1="35" x2="100" y2="65" strokeWidth="2" stroke="currentColor" />
      </svg>
    ),
    right: (
      <svg viewBox="0 0 200 100" className="w-full h-full" fill="currentColor" opacity="0.3">
        <path d="M180,40 L150,30 L60,30 L20,40 L20,70 Q20,80 30,80 L170,80 Q180,80 180,70 Z" />
        <circle cx="50" cy="75" r="12" />
        <circle cx="150" cy="75" r="12" />
        <rect x="60" y="35" width="80" height="30" rx="3" />
        <line x1="100" y1="35" x2="100" y2="65" strokeWidth="2" stroke="currentColor" />
      </svg>
    ),
    rear: (
      <svg viewBox="0 0 200 120" className="w-full h-full" fill="currentColor" opacity="0.3">
        <path d="M30,60 Q30,40 50,40 L150,40 Q170,40 170,60 L170,100 Q170,110 160,110 L40,110 Q30,110 30,100 Z" />
        <circle cx="60" cy="100" r="15" />
        <circle cx="140" cy="100" r="15" />
        <rect x="70" y="50" width="60" height="35" rx="5" />
        <rect x="80" y="55" width="10" height="15" rx="2" fill="white" opacity="0.6" />
        <rect x="110" y="55" width="10" height="15" rx="2" fill="white" opacity="0.6" />
      </svg>
    ),
  };

  return silhouettes[view];
};

export function CameraCapture({ view, onCapture, onSkip, captured }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photoTaken, setPhotoTaken] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Inicializar la cámara cuando el componente se monta
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    const videoElement = videoRef.current;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });

        currentStream = mediaStream;
        setStream(mediaStream);

        if (videoElement) {
          videoElement.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Error al acceder a la cámara:', err);
      }
    };

    if (!captured) {
      startCamera();
    }

    return () => {
      // Limpiar TODAS las referencias al stream cuando el componente se desmonte
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }

      // Limpiar el video element srcObject
      if (videoElement && videoElement.srcObject) {
        const tracks = (videoElement.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
      }

      // Limpiar el estado del stream
      setStream(prevStream => {
        if (prevStream) {
          prevStream.getTracks().forEach(track => track.stop());
        }
        return null;
      });
    };
  }, [captured]);

  // Limpiar URL objects al desmontar
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Calcular dimensiones reducidas manteniendo el aspect ratio
    const maxWidth = 1920;
    const maxHeight = 1080;
    let width = video.videoWidth;
    let height = video.videoHeight;

    // Reducir tamaño si excede los límites
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = width * ratio;
      height = height * ratio;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);

    // Comprimir la imagen a JPEG con calidad 0.8 (buena calidad, menor tamaño)
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setPhotoTaken(true);
      }
    }, 'image/jpeg', 0.8);
  }, []);

  const confirmPhoto = useCallback(async () => {
    if (canvasRef.current) {
      canvasRef.current.toBlob((blob) => {
        if (blob) {
          console.log(`📸 Foto confirmada - Tamaño: ${(blob.size / 1024).toFixed(2)} KB`);
          onCapture(blob);
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
          }
          setPhotoTaken(false);
          setPreviewUrl(null);
        }
      }, 'image/jpeg', 0.8);
    }
  }, [onCapture, previewUrl]);

  const retakePhoto = useCallback(() => {
    setPhotoTaken(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  if (captured) {
    return (
      <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <Check className="h-5 w-5" />
          <span className="font-medium">{VIEW_INSTRUCTIONS[view].title} capturada ✓</span>
        </div>
      </Card>
    );
  }

  // Si la cámara no se ha inicializado o no está lista, este componente no se debería mostrar
  // La lógica de permisos se manejará en el componente padre `inspection-modal`

  return (
    <Card className="overflow-hidden">
      <div className="bg-primary/10 p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{VIEW_INSTRUCTIONS[view].title}</h3>
          <span className="text-3xl">{VIEW_INSTRUCTIONS[view].icon}</span>
        </div>
        <p className="text-sm text-muted-foreground">{VIEW_INSTRUCTIONS[view].subtitle}</p>
      </div>

      <div className="relative bg-black aspect-video">
        <video
          ref={videoRef}
          className={cn(
            'w-full h-full object-cover',
            photoTaken && 'hidden'
          )}
          playsInline
          autoPlay
          muted
        />

        <canvas ref={canvasRef} className="hidden" />

        {photoTaken && previewUrl && (
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        )}

        {!photoTaken && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2/3 h-1/2 text-white">
                <VehicleSilhouette view={view} />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="w-full h-full border-4 border-white/40 border-dashed rounded-lg" />
            </div>
            <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-white/70" />
            <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-white/70" />
            <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-white/70" />
            <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-white/70" />
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {!photoTaken ? (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <AlertCircle className="h-4 w-4" />
              <span>Alinea el vehículo dentro del marco</span>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={takePhoto}
            >
              <Camera className="mr-2 h-5 w-5" />
              Tomar Foto
            </Button>
          </>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={retakePhoto}
              className="flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              Retomar
            </Button>
            <Button
              onClick={confirmPhoto}
              className="flex-1"
            >
              <Check className="mr-2 h-4 w-4" />
              Confirmar
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
