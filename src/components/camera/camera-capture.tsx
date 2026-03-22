// components/camera/camera-capture.tsx
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Camera, X, RotateCw, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';

interface CameraCaptureProps {
  onPhotoCapture: (compressedFile: File, previewUrl: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onPhotoCapture, onCancel }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Iniciar cámara
  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    try {
      setError(null);

      // Detener stream anterior si existe
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Error al acceder a la cámara:', err);

      let errorMessage = 'No se pudo acceder a la cámara.';

      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permiso denegado. Por favor, permite el acceso a la cámara en la configuración de tu navegador.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No se encontró ninguna cámara en tu dispositivo.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'La cámara está siendo usada por otra aplicación.';
      }

      setError(errorMessage);
      toast.error('Error de Cámara', { description: errorMessage });
    }
  }, [stream]);

  // Cambiar entre cámara frontal y trasera
  const switchCamera = useCallback(() => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startCamera(newMode);
  }, [facingMode, startCamera]);

  // Capturar foto
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Establecer dimensiones del canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dibujar frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Obtener imagen como data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(imageDataUrl);

    // Detener stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Reintentar captura
  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera(facingMode);
  }, [facingMode, startCamera]);

  // Confirmar y comprimir foto
  const confirmPhoto = useCallback(async () => {
    if (!capturedImage) return;

    setIsProcessing(true);

    try {
      // Convertir data URL a Blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Opciones de compresión
      const options = {
        maxSizeMB: 1, // Tamaño máximo 1MB
        maxWidthOrHeight: 1920, // Dimensión máxima
        useWebWorker: true,
        fileType: 'image/jpeg' as const,
      };

      // Comprimir imagen
      const compressedBlob = await imageCompression(blob as File, options);

      // Convertir Blob a File
      const compressedFile = new File(
        [compressedBlob],
        `seguimiento_${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      );

      console.log('📦 Imagen comprimida:', {
        originalSize: `${(blob.size / 1024 / 1024).toFixed(2)} MB`,
        compressedSize: `${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`,
        reduction: `${(((blob.size - compressedFile.size) / blob.size) * 100).toFixed(1)}%`,
      });

      // Pasar imagen comprimida al padre
      onPhotoCapture(compressedFile, capturedImage);
    } catch (err) {
      console.error('Error al comprimir imagen:', err);
      toast.error('Error al procesar la imagen');
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, onPhotoCapture]);

  // Iniciar cámara al montar
  useEffect(() => {
    startCamera(facingMode);

    // Cleanup: detener stream al desmontar
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []); // Solo al montar

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {error && (
        <Card className="w-full border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-900">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vista de la cámara o imagen capturada */}
      <div className="relative w-full max-w-2xl bg-black rounded-lg overflow-hidden">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Controles de cámara activa */}
            {stream && !error && (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={switchCamera}
                  className="h-12 w-12 rounded-full"
                >
                  <RotateCw className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  onClick={capturePhoto}
                  className="h-16 w-16 rounded-full bg-white hover:bg-gray-100"
                >
                  <Camera className="h-8 w-8 text-black" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={onCancel}
                  className="h-12 w-12 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <img src={capturedImage} alt="Foto capturada" className="w-full h-auto" />

            {/* Controles de preview */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
              <Button
                variant="secondary"
                onClick={retakePhoto}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                <RotateCw className="h-4 w-4" />
                Repetir
              </Button>
              <Button
                onClick={confirmPhoto}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4" />
                {isProcessing ? 'Procesando...' : 'Confirmar'}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Instrucciones */}
      {!capturedImage && !error && (
        <p className="text-sm text-muted-foreground text-center">
          Asegúrate de tener buena iluminación y que el vehículo sea claramente visible
        </p>
      )}
    </div>
  );
}
