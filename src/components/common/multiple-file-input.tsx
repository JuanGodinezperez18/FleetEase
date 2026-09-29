
"use client";
import React, { useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Camera, File as FileIcon, Trash2, UploadCloud, UserCircle, Loader2, Share2, Download } from 'lucide-react';
import Image from 'next/image';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useStorage, type StorageFolderPath } from '@/hooks/use-storage';
import { toast } from 'sonner';

type FileValue = string | File;

interface MultipleFileInputProps {
  onFilesSelected: (files: FileValue[]) => void;
  accept?: string;
  initialValue?: FileValue[];
  children?: ReactNode;
  disabled?: boolean;
  multiple?: boolean;
  previewType?: 'avatar' | 'file';
  className?: string;
  folder: StorageFolderPath;
  entityId?: string;
}

/** Convierte "image/jpeg,image/png" o "image/*" al formato Accept de react-dropzone */
function parseAccept(accept?: string): Accept | undefined {
  if (!accept || !accept.trim()) return undefined;
  const parts = accept.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return undefined;
  const result: Accept = {};
  for (const part of parts) {
    // Extensiones tipo .pdf
    if (part.startsWith('.')) {
      const key = part.toLowerCase();
      if (!result['application/octet-stream']) result['application/octet-stream'] = [];
      (result['application/octet-stream'] as string[]).push(key);
      continue;
    }
    result[part] = [];
  }
  return result;
}

export function MultipleFileInput({ 
  onFilesSelected: onFilesChange, 
  accept = 'image/*,application/pdf', 
  initialValue = [],
  children,
  disabled,
  multiple = true,
  previewType = 'file',
  className = '',
  folder,
  entityId,
}: MultipleFileInputProps) {
  const { uploadFile, deleteFileByUrl, getShareableUrl, downloadFile } = useStorage();
  const [isComponentUploading, setIsComponentUploading] = useState(false);
  const [localPreviewUrls, setLocalPreviewUrls] = useState<Map<File, string>>(new Map());

  const files = useMemo(() => {
    if (!initialValue) return [];
    return Array.isArray(initialValue) ? initialValue : [initialValue];
  }, [initialValue]);

  const dropzoneAccept = useMemo(() => parseAccept(accept), [accept]);

  useEffect(() => {
    const newLocalUrls = new Map<File, string>();
    files.forEach(file => {
      if (file instanceof File) {
        newLocalUrls.set(file, URL.createObjectURL(file));
      }
    });
    setLocalPreviewUrls(newLocalUrls);

    return () => {
      newLocalUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [files]);
  
  const getPreviewUrl = useCallback((file: FileValue): string => {
    if (file instanceof File) {
      return localPreviewUrls.get(file) || '';
    }
    return file;
  }, [localPreviewUrls]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsComponentUploading(true);
    const toastId = toast.loading(`Subiendo ${acceptedFiles.length} archivo(s)...`);

    try {
      if (!entityId) {
        const newFiles = multiple ? [...files, ...acceptedFiles] : [acceptedFiles[0]];
        onFilesChange(newFiles);
        toast.info("Archivo listo para subir", { id: toastId, description: "El archivo se subirá cuando guardes el formulario."});
        return;
      }
      
      const uploadPromises = acceptedFiles.map(file => uploadFile(file, folder, true, entityId));
      const uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean) as string[];

      if (uploadedUrls.length === 0) {
        throw new Error("Ningún archivo pudo ser subido.");
      }

      if (uploadedUrls.length < acceptedFiles.length) {
        toast.warning("Subida Parcial", { id: toastId, description: `${uploadedUrls.length} de ${acceptedFiles.length} archivos fueron subidos.` });
      } else {
        toast.success("Subida Completa", { id: toastId, description: `${uploadedUrls.length} archivo(s) subido(s) correctamente.`});
      }

      const newFiles = multiple ? [...files, ...uploadedUrls] : [uploadedUrls[0]];
      onFilesChange(newFiles);

    } catch (error) {
      toast.error("Error en la Subida", { id: toastId, description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setIsComponentUploading(false);
    }
  }, [entityId, folder, multiple, files, onFilesChange, uploadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: dropzoneAccept,
    multiple,
    disabled: disabled || isComponentUploading,
  });

  const handleRemove = useCallback(async (indexToRemove: number) => {
    const fileToRemove = files[indexToRemove];
    const newFiles = files.filter((_, i) => i !== indexToRemove);

    if (typeof fileToRemove === 'string') {
        try {
            await deleteFileByUrl(fileToRemove);
            toast.success("Archivo eliminado del servidor.");
        } catch {
            // handled in deleteFileByUrl
        }
    }
    onFilesChange(newFiles);
  }, [files, deleteFileByUrl, onFilesChange]);
  
  const handleSingleRemove = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const fileToRemove = files[0];
    if (typeof fileToRemove === 'string') {
        try {
          await deleteFileByUrl(fileToRemove);
          toast.success("Archivo eliminado del servidor.");
        } catch {
            // handled in useStorage
        }
    }
    onFilesChange([]);
  }, [files, deleteFileByUrl, onFilesChange]);

  const handleShare = async (file: File | string) => {
    try {
      if (typeof file === 'string') {
        const signedUrl = await getShareableUrl(file);
        await navigator.clipboard.writeText(signedUrl);
        toast.success('Link copiado (válido por 15 minutos)');
      } else {
        toast.error('Guarda el archivo primero para poder compartir');
      }
    } catch {
      toast.error('Error al generar link');
    }
  };
  
  const handleDownload = async (file: File | string) => {
    try {
      if (typeof file === 'string') {
        await downloadFile(file);
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      toast.error('Error al descargar archivo');
    }
  };

  if (!multiple) {
    const currentFile = files[0];
    const preview = currentFile ? getPreviewUrl(currentFile) : null;
    const isImage = preview && (preview.startsWith('data:image') || preview.startsWith('blob:') || preview.startsWith('http'));
    const containerClass = previewType === 'avatar' ? 'h-32 w-32 rounded-full' : 'h-32 w-full';

    return (
      <div {...getRootProps()}
        className={cn(`relative flex justify-center items-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer
        ${isDragActive ? 'border-[var(--fe-lime)] bg-[var(--fe-nav-active)]' : 'border-[var(--fe-border)]'}`, containerClass, className)}
      >
        <input {...getInputProps()} />
        {isComponentUploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
        ) : preview ? (
            <div className="relative text-center w-full h-full">
            {isImage ? (
                <Image src={preview} alt="Preview" fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className={cn('object-cover', previewType === 'avatar' ? 'rounded-full' : 'rounded-md')} />
            ) : (
                <div className="flex flex-col items-center justify-center h-full">
                <FileIcon className="w-12 h-12 text-[var(--fe-text-muted)]" />
                <p className="text-sm text-muted-foreground truncate max-w-xs">{currentFile instanceof File ? currentFile.name : 'Archivo'}</p>
                </div>
            )}
            <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10" onClick={handleSingleRemove}>
                <Trash2 className="h-4 w-4" />
            </Button>
            </div>
        ) : (
            <div className="space-y-1 text-center text-muted-foreground">
                {previewType === 'avatar' ? <UserCircle className="mx-auto h-12 w-12" /> : <Camera className="mx-auto h-12 w-12" />}
                <p className="text-sm">{isDragActive ? 'Suelta el archivo aquí...' : 'Arrastra o haz clic'}</p>
                 {!entityId && <p className="text-xs font-semibold text-[var(--fe-warning)]">Guarda primero para subir</p>}
            </div>
        )}
      </div>
    );
  }

  if (children) {
    return (
        <div {...getRootProps()} className="cursor-pointer">
            <input {...getInputProps()} />
            {children}
        </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(`flex flex-col justify-center items-center w-full p-6 border-2 border-dashed rounded-md transition-colors`,
        isDragActive ? 'border-primary bg-primary/10' : 'border-[var(--fe-border)] hover:border-[var(--fe-border-strong)]',
        (disabled || isComponentUploading) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}
      >
        <input {...getInputProps()} />
        {isComponentUploading ? (
            <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
            <div className="text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {isDragActive ? 'Suelta los archivos aquí...' : 'Arrastra archivos o haz clic para seleccionar'}
                </p>
                <p className="text-xs text-muted-foreground/80">{accept}</p>
                 {!entityId && <p className="text-xs font-semibold text-amber-600 mt-1">Guarda primero para poder subir archivos</p>}
            </div>
        )}
      </div>
      
      {files.length > 0 && (
        <ScrollArea className="w-full">
            <div className="flex space-x-4 pb-4">
            {files.map((file, index) => {
                const previewUrl = getPreviewUrl(file);
                const isImage = typeof file === 'string' 
                    ? file.match(/.(jpg|jpeg|png|gif|webp|avif|heic)$/i) || file.startsWith('data:image')
                    : file.type.startsWith('image/');
                
                return (
                <div key={index} className="w-40 flex-shrink-0 border rounded-lg overflow-hidden bg-[var(--fe-surface)] flex flex-col group">
                    <div className="relative w-full h-24 bg-[var(--fe-main)]">
                      {isImage ? (
                          <Image src={previewUrl} alt={`Preview ${index}`} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover" onError={(e) => { e.currentTarget.src = '/placeholder-image.png'; }} />
                      ) : (
                          <div className="flex flex-col items-center justify-center h-full p-1">
                              <FileIcon className="w-8 h-8 text-muted-foreground" />
                          </div>
                      )}
                    </div>
                    <div className="p-2 flex-grow flex flex-col justify-between">
                        <p className="text-xs text-center truncate">{file instanceof File ? file.name : 'Archivo subido'}</p>
                        <div className="flex gap-1 mt-2">
                            <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleShare(file)}>
                                <Share2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => handleDownload(file)}>
                                <Download className="w-3.5 h-3.5" />
                            </Button>
                            <Button type="button" variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleRemove(index)}>
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
                );
            })}
            </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
}
