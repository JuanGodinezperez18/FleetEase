"use client";

/**
 * @fileoverview Componente de Upload para Supabase Storage
 *
 * Permite subir archivos directamente desde el cliente a Supabase Storage.
 * Soporta drag & drop, validación de tipos/tamaño, y muestra progreso.
 *
 * @example
 * <SupabaseUpload
 *   bucket="documents"
 *   folder="companies/123"
 *   allowedTypes={['image/jpeg', 'image/png', 'application/pdf']}
 *   maxSizeMB={10}
 *   onUploadComplete={(url) => console.log('Uploaded:', url)}
 * />
 */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Upload,
  File,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupabaseUploadProps {
  /** Nombre del bucket en Supabase Storage */
  bucket: string;
  /** Carpeta dentro del bucket (ej: "companies/123/vehicles") */
  folder?: string;
  /** Tipos MIME permitidos */
  allowedTypes?: string[];
  /** Tamaño máximo en MB */
  maxSizeMB?: number;
  /** Múltiples archivos */
  multiple?: boolean;
  /** Callback cuando se completa la subida */
  onUploadComplete?: (urls: string[]) => void;
  /** Callback cuando hay error */
  onError?: (error: Error) => void;
  /** Clase CSS adicional */
  className?: string;
  /** Texto del botón */
  buttonText?: string;
  /** Mostrar vista previa */
  showPreview?: boolean;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface FileUpload {
  file: File;
  id: string;
  progress: number;
  status: UploadStatus;
  url?: string;
  error?: string;
}

export function SupabaseUpload({
  bucket,
  folder = '',
  allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  maxSizeMB = 10,
  multiple = false,
  onUploadComplete,
  onError,
  className,
  buttonText = 'Seleccionar archivo',
  showPreview = true,
}: SupabaseUploadProps) {
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const generateUniqueFileName = (originalName: string) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const extension = originalName.split('.').pop()?.toLowerCase() || 'bin';
    const sanitizedName = originalName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50);
    return `${sanitizedName}_${timestamp}_${random}.${extension}`;
  };

  const uploadFile = async (fileUpload: FileUpload) => {
    const { file, id } = fileUpload;

    try {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'uploading' } : f))
      );

      // Generar path único
      const fileName = generateUniqueFileName(file.name);
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Subir archivo a Supabase
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        throw new Error(`Error al subir: ${error.message}`);
      }

      // Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      const url = publicUrlData.publicUrl;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: 'success', progress: 100, url }
            : f
        )
      );

      return url;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: 'error', error: errorMessage } : f
        )
      );

      throw error;
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      // Validar tamaño de archivos
      const invalidFiles = acceptedFiles.filter((file) => file.size > maxSizeBytes);
      if (invalidFiles.length > 0) {
        toast.error(
          `Archivos demasiado grandes`,
          {
            description: `Los siguientes archivos exceden ${maxSizeMB}MB: ${invalidFiles
              .map((f) => f.name)
              .join(', ')}`,
          }
        );
        return;
      }

      // Crear objetos de archivo para el estado
      const newFiles: FileUpload[] = acceptedFiles.map((file) => ({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        progress: 0,
        status: 'idle',
      }));

      setFiles((prev) => (multiple ? [...prev, ...newFiles] : newFiles));

      // Iniciar subida
      setIsUploading(true);
      const urls: string[] = [];

      try {
        for (const fileUpload of newFiles) {
          const url = await uploadFile(fileUpload);
          urls.push(url);
        }

        toast.success(
          `Archivo${urls.length > 1 ? 's' : ''} subido exitosamente`,
          {
            description: `${urls.length} archivo${urls.length > 1 ? 's' : ''} completado${urls.length > 1 ? 's' : ''}`,
          }
        );

        onUploadComplete?.(urls);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Error al subir archivos';
        toast.error('Error en la subida', { description: errorMsg });
        onError?.(error instanceof Error ? error : new Error(errorMsg));
      } finally {
        setIsUploading(false);
      }
    },
    [bucket, folder, maxSizeBytes, maxSizeMB, multiple, onUploadComplete, onError]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: allowedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
      maxSize: maxSizeBytes,
      multiple,
      disabled: isUploading,
    });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearFiles = () => {
    setFiles([]);
  };

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <File className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: UploadStatus, error?: string) => {
    switch (status) {
      case 'uploading':
        return 'Subiendo...';
      case 'success':
        return 'Completado';
      case 'error':
        return error || 'Error';
      default:
        return 'Pendiente';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer',
          'hover:border-blue-400 hover:bg-blue-50/50',
          isDragActive && 'border-blue-500 bg-blue-50',
          isDragReject && 'border-red-500 bg-red-50',
          isUploading && 'opacity-50 cursor-not-allowed',
          'dark:hover:border-blue-600 dark:hover:bg-blue-950/20',
          'dark:isDragActive && dark:border-blue-600 dark:bg-blue-950/30'
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center gap-3">
          <div
            className={cn(
              'p-3 rounded-full bg-gray-100 dark:bg-gray-800',
              isDragActive && 'bg-blue-100 dark:bg-blue-900',
              isDragReject && 'bg-red-100 dark:bg-red-900'
            )}
          >
            <Upload
              className={cn(
                'h-6 w-6 text-gray-400',
                isDragActive && 'text-blue-500',
                isDragReject && 'text-red-500'
              )}
            />
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isDragActive
                ? 'Suelta los archivos aquí'
                : 'Arrastra archivos aquí, o haz clic para seleccionar'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Máximo {maxSizeMB}MB por archivo
              {allowedTypes.length > 0 && (
                <span className="block">
                  Tipos permitidos: {allowedTypes
                    .map((t) => t.split('/')[1].toUpperCase())
                    .join(', ')}
                </span>
              )}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
          >
            {buttonText}
          </Button>
        </div>
      </div>

      {/* Lista de archivos */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Archivos ({files.length})
            </h4>
            {!isUploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFiles}
                className="text-red-500 hover:text-red-600"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800',
                  file.status === 'success' &&
                    'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900',
                  file.status === 'error' &&
                    'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                )}
              >
                {getStatusIcon(file.status)}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(file.file.size / 1024 / 1024).toFixed(2)} MB •{' '}
                    {getStatusText(file.status, file.error)}
                  </p>

                  {file.status === 'uploading' && (
                    <Progress value={file.progress} className="h-1 mt-2" />
                  )}
                </div>

                {file.status === 'success' && file.url && showPreview && (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Ver
                  </a>
                )}

                {file.status !== 'uploading' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook para usar Supabase Storage
 */
export function useSupabaseUpload() {
  const upload = async (
    file: File,
    bucket: string,
    folder?: string
  ): Promise<string> => {
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  };

  const deleteFile = async (bucket: string, path: string): Promise<void> => {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      throw new Error(error.message);
    }
  };

  const getSignedUrl = async (
    bucket: string,
    path: string,
    expiresIn: number = 60
  ): Promise<string> => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(error.message);
    }

    return data.signedUrl;
  };

  return { upload, deleteFile, getSignedUrl };
}
