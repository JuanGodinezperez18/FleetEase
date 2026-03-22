"use client";

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, Upload, Loader2, CheckCircle, AlertCircle, Scan, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ExtractedINEData {
  firstname?: string;
  lastname?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  curp?: string;
  claveElector?: string;
  birthDate?: string;
  sex?: string;
}

interface INEScannerProps {
  onDataExtracted: (data: ExtractedINEData) => void;
  disabled?: boolean;
}

export function INEScanner({ onDataExtracted, disabled }: INEScannerProps) {
  const [open, setOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [extractedData, setExtractedData] = useState<ExtractedINEData | null>(null);
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

      toast.info('Procesando INE...', {
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

      // Parsear datos de la INE
      const data = parseINE(text);

      if (Object.keys(data).length === 0) {
        toast.error('No se pudieron extraer datos', {
          description: 'Intenta con una imagen más clara del frente de la INE',
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

  // Función para parsear el texto extraído de la INE
  const parseINE = (text: string): ExtractedINEData => {
    const data: ExtractedINEData = {};
    const upperText = text.toUpperCase();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    try {
      // Buscar CURP (18 caracteres específicos)
      const curpPattern = /[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d/g;
      const curpMatch = text.match(curpPattern);
      if (curpMatch && curpMatch[0].length === 18) {
        data.curp = curpMatch[0];

        // Extraer información del CURP
        // CURP format: AAAA######HMMMMM##
        // Los 4 primeros son apellido paterno (2), materno (1), nombre (1)
        // Después 6 dígitos de fecha: AAMMDD

        const year = curpMatch[0].substring(4, 6);
        const month = curpMatch[0].substring(6, 8);
        const day = curpMatch[0].substring(8, 10);
        const sex = curpMatch[0].charAt(10); // H o M

        // Convertir año a 4 dígitos
        const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
        data.birthDate = `${fullYear}-${month}-${day}`;
        data.sex = sex === 'H' ? 'Masculino' : 'Femenino';
      }

      // Buscar Clave de Elector (18 caracteres alfanuméricos)
      const clavePattern = /[A-Z]{6}\d{8}[HM]\d{3}/g;
      const claveMatch = text.match(clavePattern);
      if (claveMatch) {
        data.claveElector = claveMatch[0];
      }

      // Buscar nombre y apellidos
      // En la INE, normalmente aparecen en formato:
      // APELLIDO PATERNO
      // APELLIDO MATERNO
      // NOMBRE(S)

      // Buscar línea con "NOMBRE" o patrones de nombre
      let nameLines: string[] = [];
      let foundNameSection = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toUpperCase();

        // Saltar líneas que son claramente no-nombres
        if (
          line.includes('INSTITUTO') ||
          line.includes('FEDERAL') ||
          line.includes('ELECTORAL') ||
          line.includes('CREDENCIAL') ||
          line.includes('VIGENCIA') ||
          line.includes('DOMICILIO') ||
          line.includes('CLAVE') ||
          line.includes('CURP') ||
          line.includes('REGISTRO') ||
          line.includes('EMISION') ||
          line.includes('MEXICO') ||
          line.length < 3 ||
          /^\d+$/.test(line)
        ) {
          continue;
        }

        // Buscar líneas que parecen nombres (mayúsculas, sin números)
        if (/^[A-ZÁÉÍÓÚÑ\s]+$/.test(line) && line.length > 2) {
          nameLines.push(line);
          if (nameLines.length >= 3) break;
        }
      }

      // Si encontramos líneas que parecen nombres, procesarlas
      if (nameLines.length >= 2) {
        // Típicamente: [0] = Apellido Paterno, [1] = Apellido Materno, [2] = Nombre(s)
        if (nameLines.length >= 3) {
          const apellidoPaterno = nameLines[0];
          const apellidoMaterno = nameLines[1];
          const nombres = nameLines[2];

          data.lastname = `${apellidoPaterno} ${apellidoMaterno}`.trim();
          data.firstname = nombres.trim();
        } else if (nameLines.length === 2) {
          // Si solo hay 2 líneas, asumir que la primera es apellido y la segunda nombre
          data.lastname = nameLines[0].trim();
          data.firstname = nameLines[1].trim();
        }
      }

      // Buscar dirección
      // La dirección en INE suele estar después de "DOMICILIO" o en el reverso
      let addressLines: string[] = [];
      let inAddressSection = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const upperLine = line.toUpperCase();

        if (upperLine.includes('DOMICILIO') || upperLine.includes('DIRECCION')) {
          inAddressSection = true;
          continue;
        }

        if (inAddressSection) {
          // Capturar las siguientes líneas como dirección
          if (
            !upperLine.includes('CURP') &&
            !upperLine.includes('CLAVE') &&
            !upperLine.includes('VIGENCIA') &&
            line.length > 5
          ) {
            addressLines.push(line);
            if (addressLines.length >= 3) break;
          }
        }
      }

      // Procesar líneas de dirección
      if (addressLines.length > 0) {
        const fullAddress = addressLines.join(' ');

        // Buscar código postal (5 dígitos)
        const cpPattern = /\b\d{5}\b/g;
        const cpMatch = fullAddress.match(cpPattern);
        if (cpMatch) {
          data.zipCode = cpMatch[0];
        }

        // Buscar estados mexicanos
        const estados = [
          'AGUASCALIENTES', 'BAJA CALIFORNIA', 'BAJA CALIFORNIA SUR', 'CAMPECHE',
          'CHIAPAS', 'CHIHUAHUA', 'COAHUILA', 'COLIMA', 'DURANGO', 'GUANAJUATO',
          'GUERRERO', 'HIDALGO', 'JALISCO', 'MEXICO', 'MICHOACAN', 'MORELOS',
          'NAYARIT', 'NUEVO LEON', 'OAXACA', 'PUEBLA', 'QUERETARO', 'QUINTANA ROO',
          'SAN LUIS POTOSI', 'SINALOA', 'SONORA', 'TABASCO', 'TAMAULIPAS',
          'TLAXCALA', 'VERACRUZ', 'YUCATAN', 'ZACATECAS', 'CDMX', 'CIUDAD DE MEXICO'
        ];

        for (const estado of estados) {
          if (fullAddress.toUpperCase().includes(estado)) {
            data.state = estado.charAt(0) + estado.slice(1).toLowerCase();
            break;
          }
        }

        // La primera línea suele ser calle y número
        if (addressLines.length > 0) {
          data.street = addressLines[0];
        }

        // Buscar ciudad/municipio en las líneas restantes
        if (addressLines.length > 1) {
          // La ciudad suele estar antes del estado y CP
          const cityLine = addressLines[addressLines.length - 1];
          // Remover CP y estado si están en la misma línea
          let city = cityLine;
          if (data.zipCode) {
            city = city.replace(data.zipCode, '').trim();
          }
          if (data.state) {
            city = city.replace(new RegExp(data.state, 'gi'), '').trim();
          }
          // Limpiar caracteres extra
          city = city.replace(/[,]/g, '').trim();
          if (city.length > 2) {
            data.city = city;
          }
        }
      }

    } catch (error) {
      console.error('Error al parsear INE:', error);
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
          const file = new File([blob], 'ine.jpg', { type: 'image/jpeg' });
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
        <CreditCard className="mr-2 h-4 w-4" />
        Escanear INE
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escanear INE</DialogTitle>
            <DialogDescription>
              Sube una foto o captura la credencial de elector (lado frontal) para extraer los datos automáticamente
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
                    alt="INE"
                    fill
                    className="object-contain"
                  />
                </div>

                {/* Estado de procesamiento */}
                {isProcessing && (
                  <Alert>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      Procesando INE... Esto puede tomar unos segundos
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
                          {extractedData.firstname && (
                            <div><span className="font-medium">Nombre(s):</span> {extractedData.firstname}</div>
                          )}
                          {extractedData.lastname && (
                            <div><span className="font-medium">Apellidos:</span> {extractedData.lastname}</div>
                          )}
                          {extractedData.curp && (
                            <div className="col-span-2"><span className="font-medium">CURP:</span> {extractedData.curp}</div>
                          )}
                          {extractedData.birthDate && (
                            <div><span className="font-medium">Fecha Nac.:</span> {extractedData.birthDate}</div>
                          )}
                          {extractedData.sex && (
                            <div><span className="font-medium">Sexo:</span> {extractedData.sex}</div>
                          )}
                          {extractedData.street && (
                            <div className="col-span-2"><span className="font-medium">Calle:</span> {extractedData.street}</div>
                          )}
                          {extractedData.city && (
                            <div><span className="font-medium">Ciudad:</span> {extractedData.city}</div>
                          )}
                          {extractedData.state && (
                            <div><span className="font-medium">Estado:</span> {extractedData.state}</div>
                          )}
                          {extractedData.zipCode && (
                            <div><span className="font-medium">C.P.:</span> {extractedData.zipCode}</div>
                          )}
                          {extractedData.claveElector && (
                            <div className="col-span-2"><span className="font-medium">Clave Elector:</span> {extractedData.claveElector}</div>
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
                      No se pudieron extraer datos suficientes. Intenta con una imagen más clara del lado frontal de la INE o ingresa los datos manualmente.
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
