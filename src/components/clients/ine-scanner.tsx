"use client";

import React, { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Camera,
  Upload,
  Loader2,
  CheckCircle,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { scanDocument } from "@/lib/ocr/client";
import { supabase } from "@/lib/supabase-browser";

export interface ExtractedINEData {
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
  const [extractedData, setExtractedData] = useState<ExtractedINEData | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hadError, setHadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [useCamera, setUseCamera] = useState(false);

  const processImage = useCallback(async (file: File) => {
    setIsProcessing(true);
    setExtractedData(null);
    setWarnings([]);
    setHadError(false);

    try {
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);

      toast.info("Procesando INE...", {
        description: "Extracción con IA, puede tomar unos segundos",
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sesión no disponible. Inicia sesión de nuevo.");

      const result = await scanDocument("ine", file, token);
      const d = result.data;

      const mapped: ExtractedINEData = {};
      if (d.nombres) mapped.firstname = d.nombres;
      const apellidos = [d.apellidoPaterno, d.apellidoMaterno].filter(Boolean).join(" ");
      if (apellidos) mapped.lastname = apellidos;
      if (d.calle) mapped.street = d.calle;
      if (d.ciudad) mapped.city = d.ciudad;
      if (d.estado) mapped.state = d.estado;
      if (d.codigoPostal) mapped.zipCode = d.codigoPostal;
      if (d.curp) mapped.curp = d.curp;
      if (d.claveElector) mapped.claveElector = d.claveElector;
      if (d.fechaNacimiento) mapped.birthDate = d.fechaNacimiento;
      if (d.sexo) mapped.sex = d.sexo === "H" ? "Masculino" : "Femenino";

      if (result.warnings.length) setWarnings(result.warnings);

      const filled = Object.keys(mapped).length;
      if (filled === 0 || d.legible === false) {
        setHadError(true);
        toast.error("No se pudieron extraer datos", {
          description: "Intenta con una imagen más clara del frente de la INE",
        });
      } else {
        setExtractedData(mapped);
        toast.success("Datos extraídos exitosamente", {
          description: `Se encontraron ${filled} campos`,
        });
        for (const w of result.warnings) toast.warning(w);
      }
    } catch (error) {
      console.error("Error al procesar INE:", error);
      setHadError(true);
      toast.error("Error al procesar la imagen", {
        description: error instanceof Error ? error.message : "Verifica que la imagen sea legible",
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Archivo muy grande", { description: "El tamaño máximo es 10MB" });
        return;
      }
      processImage(file);
    },
    [processImage]
  );

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setUseCamera(true);
    } catch (error) {
      console.error("Error al acceder a la cámara:", error);
      toast.error("No se pudo acceder a la cámara", {
        description: "Verifica los permisos del navegador",
      });
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setUseCamera(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            processImage(new File([blob], "ine.jpg", { type: "image/jpeg" }));
            stopCamera();
          }
        },
        "image/jpeg",
        0.95
      );
    }
  }, [processImage, stopCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    setPreviewUrl(null);
    setExtractedData(null);
    setWarnings([]);
    setHadError(false);
    setOpen(false);
  }, [stopCamera]);

  const handleApplyData = useCallback(() => {
    if (extractedData) {
      onDataExtracted(extractedData);
      toast.success("Datos aplicados al formulario");
      handleClose();
    }
  }, [extractedData, onDataExtracted, handleClose]);

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

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escanear INE</DialogTitle>
            <DialogDescription>
              Sube una foto o captura la credencial de elector (lado frontal) para extraer los datos
              automáticamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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

            {useCamera && (
              <div className="space-y-4">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg border" />
                <div className="flex gap-2">
                  <Button type="button" onClick={capturePhoto} disabled={isProcessing} className="flex-1">
                    <Camera className="mr-2 h-4 w-4" />
                    Capturar Foto
                  </Button>
                  <Button type="button" variant="outline" onClick={stopCamera}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {previewUrl && (
              <div className="space-y-4">
                <div className="relative w-full h-64 rounded-lg border overflow-hidden">
                  <Image src={previewUrl} alt="INE" fill className="object-contain" />
                </div>

                {isProcessing && (
                  <Alert>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AlertDescription>
                      Procesando INE con IA... Esto puede tomar unos segundos
                    </AlertDescription>
                  </Alert>
                )}

                {extractedData && !isProcessing && (
                  <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-semibold">Datos extraídos:</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {extractedData.firstname && (
                            <div>
                              <span className="font-medium">Nombre(s):</span> {extractedData.firstname}
                            </div>
                          )}
                          {extractedData.lastname && (
                            <div>
                              <span className="font-medium">Apellidos:</span> {extractedData.lastname}
                            </div>
                          )}
                          {extractedData.curp && (
                            <div className="col-span-2">
                              <span className="font-medium">CURP:</span> {extractedData.curp}
                            </div>
                          )}
                          {extractedData.birthDate && (
                            <div>
                              <span className="font-medium">Fecha Nac.:</span> {extractedData.birthDate}
                            </div>
                          )}
                          {extractedData.sex && (
                            <div>
                              <span className="font-medium">Sexo:</span> {extractedData.sex}
                            </div>
                          )}
                          {extractedData.street && (
                            <div className="col-span-2">
                              <span className="font-medium">Calle:</span> {extractedData.street}
                            </div>
                          )}
                          {extractedData.city && (
                            <div>
                              <span className="font-medium">Ciudad:</span> {extractedData.city}
                            </div>
                          )}
                          {extractedData.state && (
                            <div>
                              <span className="font-medium">Estado:</span> {extractedData.state}
                            </div>
                          )}
                          {extractedData.zipCode && (
                            <div>
                              <span className="font-medium">C.P.:</span> {extractedData.zipCode}
                            </div>
                          )}
                          {extractedData.claveElector && (
                            <div className="col-span-2">
                              <span className="font-medium">Clave Elector:</span>{" "}
                              {extractedData.claveElector}
                            </div>
                          )}
                        </div>
                        {warnings.length > 0 && (
                          <ul className="mt-2 text-amber-700 dark:text-amber-400 text-xs list-disc pl-4">
                            {warnings.map((w) => (
                              <li key={w}>{w}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {hadError && !isProcessing && !extractedData && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No se pudieron extraer datos suficientes. Intenta con una imagen más clara del
                      lado frontal de la INE o ingresa los datos manualmente.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  {extractedData && (
                    <Button type="button" onClick={handleApplyData} className="flex-1">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Aplicar Datos
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPreviewUrl(null);
                      setExtractedData(null);
                      setWarnings([]);
                      setHadError(false);
                    }}
                    disabled={isProcessing}
                  >
                    Intentar de Nuevo
                  </Button>
                  <Button type="button" variant="ghost" onClick={handleClose}>
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
