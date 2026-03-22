"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Upload, Loader2, CheckCircle, AlertCircle, Scan } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExtractedData {
  make?: string;
  model?: string;
  year?: number;
  plate?: string;
  serialNumber?: string;
  color?: string;
  registrationDate?: string;
}

interface CirculationCardScannerProps {
  onDataExtracted: (data: ExtractedData) => void;
  disabled?: boolean;
}

export function CirculationCardScanner({ onDataExtracted, disabled }: CirculationCardScannerProps) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [useCamera, setUseCamera] = useState(false);

  // Función para procesar la imagen con OCR
  const processImage = useCallback(async (file: File) => {
    setIsProcessing(true);
    setExtractedData(null);
    setExtractedText('');

    try {
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Importar Tesseract de forma dinámica
      const Tesseract = await import('tesseract.js');

      toast.info('Procesando imagen...', {
        description: 'Esto puede tomar unos segundos',
      });

      // Procesar imagen con OCR
      const result = await Tesseract.recognize(file, 'spa', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`Progreso: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const text = result.data.text;
      setExtractedText(text);

      // Parsear datos de la tarjeta de circulación
      const data = parseCirculationCard(text);

      if (Object.keys(data).length === 0) {
        toast.error('No se pudieron extraer datos', {
          description: 'Intenta con una imagen más clara',
        });
      } else {
        setExtractedData(data);
        toast.success('Datos extraídos exitosamente', {
          description: `Se encontraron ${Object.keys(data).length} campos`,
        });
      }
    } catch (error) {
      console.error('Error al procesar imagen:', error);
      toast.error('Error al procesar la imagen', {
        description: 'Verifica que la imagen sea legible',
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Función para parsear el texto extraído
  const parseCirculationCard = (text: string): ExtractedData => {
    const data: ExtractedData = {};
    const upperText = text.toUpperCase();
    const lines = text.split('\n').map(l => l.trim());

    try {
      // Buscar placa (formato mexicano: ABC1234 o ABC-123-D)
      const platePattern = /([A-Z]{2,3}[-\s]?\d{3,4}[-\s]?[A-Z\d]?)/gi;
      const plateMatch = text.match(platePattern);
      if (plateMatch) {
        data.plate = plateMatch[0].replace(/[-\s]/g, '').toUpperCase();
      }

      // Buscar número de serie/NIV (17 caracteres alfanuméricos)
      const vinPattern = /(?:NIV|VIN|SERIE|NO\.?\s*SERIE)[\s:]*([A-HJ-NPR-Z0-9]{17})/gi;
      const vinMatch = text.match(vinPattern);
      if (vinMatch) {
        const vin = vinMatch[0].replace(/(?:NIV|VIN|SERIE|NO\.?\s*SERIE)[\s:]*/gi, '').trim();
        data.serialNumber = vin.substring(0, 17).toUpperCase();
      }

      // Buscar marca
      const commonMakes = [
        'NISSAN', 'TOYOTA', 'HONDA', 'MAZDA', 'VOLKSWAGEN', 'VW', 'CHEVROLET',
        'FORD', 'HYUNDAI', 'KIA', 'SUZUKI', 'MITSUBISHI', 'BMW', 'MERCEDES',
        'AUDI', 'SEAT', 'JEEP', 'DODGE', 'CHRYSLER', 'RENAULT', 'PEUGEOT',
        'FIAT', 'GMC', 'ISUZU', 'JAC', 'CHERY', 'MG', 'VOLVO', 'TESLA'
      ];

      for (const make of commonMakes) {
        if (upperText.includes(make)) {
          data.make = make;
          break;
        }
      }

      // Buscar modelo (suele estar después de la marca)
      if (data.make) {
        const makeIndex = upperText.indexOf(data.make);
        const afterMake = text.substring(makeIndex + data.make.length, makeIndex + data.make.length + 50);
        const modelMatch = afterMake.match(/([A-Z][A-Z0-9\-\s]{2,20})/i);
        if (modelMatch) {
          data.model = modelMatch[0].trim();
        }
      }

      // Buscar año (4 dígitos entre 1980 y año actual + 1)
      const currentYear = new Date().getFullYear();
      const yearPattern = new RegExp(`\\b(19[89]\\d|20[0-${String(currentYear + 1).charAt(2)}]\\d)\\b`, 'g');
      const yearMatches = text.match(yearPattern);
      if (yearMatches) {
        const years = yearMatches.map(y => parseInt(y)).filter(y => y >= 1980 && y <= currentYear + 1);
        if (years.length > 0) {
          data.year = Math.max(...years); // Tomar el año más reciente
        }
      }

      // Buscar color
      const commonColors = [
        'BLANCO', 'NEGRO', 'GRIS', 'PLATA', 'PLATEADO', 'AZUL', 'ROJO',
        'VERDE', 'AMARILLO', 'CAFE', 'CAFÉ', 'BEIGE', 'NARANJA', 'ROSA',
        'MORADO', 'VIOLETA', 'ORO', 'DORADO', 'BRONCE', 'VINO'
      ];

      for (const color of commonColors) {
        const colorPattern = new RegExp(`(?:COLOR[:\s]+)?${color}`, 'i');
        if (colorPattern.test(upperText)) {
          data.color = color.charAt(0) + color.slice(1).toLowerCase();
          break;
        }
      }

      // Buscar fecha de registro (formato: DD/MM/YYYY o DD-MM-YYYY)
      const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g;
      const dateMatches = [...text.matchAll(datePattern)];

      if (dateMatches.length > 0) {
        // Buscar específicamente fecha de registro
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].toUpperCase();
          if (line.includes('REGISTRO') || line.includes('EXPEDICION') || line.includes('FECHA')) {
            const dateMatch = lines[i].match(datePattern);
            if (dateMatch) {
              const [_, day, month, year] = dateMatch[0].match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)!;
              // Convertir a formato YYYY-MM-DD para input type="date"
              data.registrationDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              break;
            }
          }
        }

        // Si no encontramos fecha de registro, usar la primera fecha válida
        if (!data.registrationDate) {
          const [_, day, month, year] = dateMatches[0][0].match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)!;
          data.registrationDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }

    } catch (error) {
      console.error('Error al parsear datos:', error);
    }

    return data;
  };

  // Manejar selección de archivo
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast.error('Archivo muy grande', {
          description: 'El tamaño máximo es 10MB',
        });
        return;
      }
      processImage(file);
    }
  }, [processImage]);

  // Iniciar cámara
  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setUseCamera(true);
    } catch (error) {
      console.error('Error al acceder a la cámara:', error);
      toast.error('No se pudo acceder a la cámara', {
        description: 'Verifica los permisos del navegador',
      });
    }
  }, []);

  // Detener cámara
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setUseCamera(false);
  }, [stream]);

  // Capturar foto de la cámara
  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'circulation-card.jpg', { type: 'image/jpeg' });
          processImage(file);
          stopCamera();
        }
      }, 'image/jpeg', 0.95);
    }
  }, [processImage, stopCamera]);

  // Aplicar datos extraídos
  const handleApplyData = useCallback(() => {
    if (extractedData) {
      onDataExtracted(extractedData);
      toast.success('Datos aplicados al formulario');
      setOpen(false);
      handleClose();
    }
  }, [extractedData, onDataExtracted]);

  // Cerrar y limpiar
  const handleClose = useCallback(() => {
    stopCamera();
    setPreviewUrl(null);
    setExtractedText('');
    setExtractedData(null);
    setOpen(false);
  }, [stopCamera]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="w-full"
      >
        <Scan className="mr-2 h-4 w-4" />
        Escanear Tarjeta
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escanear Tarjeta de Circulación</DialogTitle>
            <DialogDescription>
              Sube una foto o captura la tarjeta de circulación para extraer los datos automáticamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Botones de acción */}
            {!previewUrl && !useCamera && (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="h-24"
                >
                  <Upload className="mr-2 h-6 w-6" />
                  Subir Imagen
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={startCamera}
                  disabled={isProcessing}
                  className="h-24"
                >
                  <Camera className="mr-2 h-6 w-6" />
                  Usar Cámara
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Vista de cámara */}
            {useCamera && (
              <div className="space-y-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full rounded-lg border"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={capturePhoto}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Capturar Foto
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={stopCamera}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Preview de imagen */}
            {previewUrl && (
              <div className="space-y-4">
                <div className="relative w-full h-64 rounded-lg border overflow-hidden">
                  <Image
                    src={previewUrl}
                    alt="Tarjeta de circulación"
                    fill
                    className="object-contain"
                  />
                </div>

                {/* Estado de procesamiento */}
                {isProcessing && (
                  <Alert>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      Procesando imagen... Esto puede tomar unos segundos
                    </AlertDescription>
                  </Alert>
                )}

                {/* Datos extraídos */}
                {extractedData && !isProcessing && (
                  <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-semibold">Datos extraídos:</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {extractedData.make && (
                            <div><span className="font-medium">Marca:</span> {extractedData.make}</div>
                          )}
                          {extractedData.model && (
                            <div><span className="font-medium">Modelo:</span> {extractedData.model}</div>
                          )}
                          {extractedData.year && (
                            <div><span className="font-medium">Año:</span> {extractedData.year}</div>
                          )}
                          {extractedData.plate && (
                            <div><span className="font-medium">Placa:</span> {extractedData.plate}</div>
                          )}
                          {extractedData.color && (
                            <div><span className="font-medium">Color:</span> {extractedData.color}</div>
                          )}
                          {extractedData.serialNumber && (
                            <div className="col-span-2"><span className="font-medium">No. Serie:</span> {extractedData.serialNumber}</div>
                          )}
                          {extractedData.registrationDate && (
                            <div className="col-span-2"><span className="font-medium">Fecha Registro:</span> {extractedData.registrationDate}</div>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {!extractedData && !isProcessing && extractedText && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No se pudieron extraer datos suficientes. Intenta con una imagen más clara o ingresa los datos manualmente.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Botones de acción */}
                <div className="flex gap-2">
                  {extractedData && (
                    <Button
                      type="button"
                      onClick={handleApplyData}
                      className="flex-1"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Aplicar Datos
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPreviewUrl(null);
                      setExtractedText('');
                      setExtractedData(null);
                    }}
                    disabled={isProcessing}
                  >
                    Intentar de Nuevo
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClose}
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
