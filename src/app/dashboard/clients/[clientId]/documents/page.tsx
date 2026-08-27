
"use client";

import React, { useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import type { Client } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download as DownloadIcon, Share2 as Share2Icon, FileText as FileTextIcon, Image as ImageIcon, AlertTriangle as AlertTriangleIcon, UploadCloud as UploadCloudIcon, UserCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { useStorage } from '@/hooks/use-storage';
import { MultipleFileInput } from '@/components/common/multiple-file-input';
import { getFileNameFromUrl, dataURItoFile } from '@/lib/file-utils';
import { supabase } from '@/lib/supabase';

type FileValue = File | string;

export default function ClientDocumentsPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.clientId as string;
  const { clients, loadingData, updateClient } = useData();
  const { uploadFile, deleteFileByUrl } = useStorage();
  
  const [uploadingState, setUploadingState] = useState<Record<string, boolean>>({});
  const [downloadingState, setDownloadingState] = useState<Record<string, boolean>>({});

  const client = useMemo(() => (clients || []).find(d => d.id === clientId && !d.isDeleted), [clients, clientId]);

  const handleFileUpload = async (files: FileValue[], fieldName: keyof Client) => {
    if (!client || files.length === 0) return;
    
    const file = files[0];
    if (!(file instanceof File)) {
        return;
    }

    // ✅ VALIDAR tamaño de archivo
    const isImage = file.type.startsWith('image/');
    const maxSizeMB = isImage ? 2 : 5; // 2MB para imágenes, 5MB para PDFs
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      toast.error('Archivo muy grande', {
        description: `El archivo debe ser menor a ${maxSizeMB}MB. Tamaño actual: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      });
      return;
    }

    // ✅ VALIDAR tipo de archivo
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    const validDocTypes = ['application/pdf'];
    const validTypes = fieldName === 'photoUrl' ? validImageTypes : [...validImageTypes, ...validDocTypes];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de archivo no válido', {
        description: `Solo se permiten archivos: ${validTypes.map(t => t.split('/')[1]).join(', ')}`
      });
      return;
    }

    setUploadingState(prev => ({ ...prev, [fieldName]: true }));
    const oldFileUrl = client[fieldName] as string | undefined;

    try {
        const newFileUrl = await uploadFile(file, `driver_documents`, true, client.id);
        
        await updateClient(client.id, { [fieldName]: newFileUrl });

        // Solo después de éxito, eliminar viejo
        if (oldFileUrl) {
            await deleteFileByUrl(oldFileUrl).catch(e => console.warn(`Could not delete old file: ${oldFileUrl}`, e));
        }

        toast.success("Documento Actualizado", {
            description: `El documento se ha subido y guardado correctamente.`,
        });

    } catch (error) {
        console.error(`Failed to upload ${fieldName}:`, error);
        toast.error("Error al Subir", {
            description: "No se pudo subir el archivo. Por favor, inténtelo de nuevo.",
        });
    } finally {
        setUploadingState(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleDownload = useCallback(async (url: string | undefined, defaultFilename: string) => {
    if (!url) {
      toast.error("Error", { description: "Documento no encontrado." });
      return;
    }
    
    setDownloadingState(prev => ({ ...prev, [url]: true }));
    const toastId = toast.loading("Preparando descarga...");

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) throw new Error('No autenticado');

        const response = await fetch('/api/download-file', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ fileUrl: url }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: response.statusText }));
            throw new Error(errorData.error || 'No se pudo obtener el enlace de descarga.');
        }

        const { signedUrl } = await response.json();

        const filename = getFileNameFromUrl(url, defaultFilename);
        const link = document.createElement('a');
        link.href = signedUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Descarga Iniciada", { id: toastId, description: `Descargando ${filename}...` });

    } catch (error: any) {
        toast.error("Error de Descarga", { id: toastId, description: error.message });
    } finally {
        setDownloadingState(prev => ({ ...prev, [url]: false }));
    }
  }, []);

  const handleShare = useCallback(async (url: string | undefined, defaultFilename: string, title: string) => {
    if (!url) {
        toast.error("Error", { description: "Documento no encontrado para compartir." });
        return;
    }
    const filename = getFileNameFromUrl(url, defaultFilename);
    
    if (!navigator.share) {
        toast.info("No Soportado", { description: "La función de compartir no está soportada en este navegador." });
        return;
    }

    try {
        const shareData: ShareData = { title: title || filename };
        
        if (url.startsWith('data:')) {
            const file = await dataURItoFile(url, filename);
            if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
                shareData.files = [file];
                shareData.text = `Documento: ${filename}`;
            } else {
                toast.info("No Compartible", { description: "Este tipo de archivo no se puede compartir en tu navegador." });
                return;
            }
        } else if (url.startsWith('http')) {
            shareData.url = url;
            shareData.text = `Ver documento: ${filename}`;
        } else {
             toast.info("No Compartible", { description: "Este tipo de documento no se puede compartir. Intente descargar primero." });
             return;
        }
        
        await navigator.share(shareData);
        toast.success("Compartido", { description: `${filename} compartido exitosamente.` });
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            return;
        }
        console.error('Error al compartir:', error);
        toast.error("Error al Compartir", { 
            description: "Ocurrió un error inesperado al intentar compartir.", 
        });
    }
}, []);
  
const DocumentCard = ({ title, docUrl, defaultFileName, fieldName, hint, isClientPhoto = false, isUploading = false }: { title: string, docUrl?: string | File | undefined, defaultFileName: string, fieldName: keyof Client, hint: string, isClientPhoto?: boolean, isUploading?: boolean }) => {
    
    const getPreviewUrl = (doc: string | File | undefined): string | null => {
        if (!doc) return null;
        if (typeof doc === 'string') return doc;
        if (doc instanceof File) return URL.createObjectURL(doc);
        return null;
    };

    const previewUrl = getPreviewUrl(docUrl);
    const cleanUrl = typeof docUrl === 'string' ? docUrl.split('?')[0] : '';
    
    const isPdf = typeof docUrl === 'string' && (cleanUrl.endsWith('.pdf') || docUrl?.startsWith('data:application/pdf')) || (docUrl instanceof File && docUrl.type === 'application/pdf');
    const isImage = typeof docUrl === 'string' && (/\.(jpg|jpeg|png|gif|heic|webp)$/i.test(cleanUrl) || docUrl?.startsWith('data:image')) || (docUrl instanceof File && docUrl.type.startsWith('image/'));

    const fileName = docUrl ? (typeof docUrl === 'string' ? getFileNameFromUrl(docUrl, defaultFileName) : docUrl.name) : defaultFileName;
    const previewContainerClass = isClientPhoto ? "h-32 w-32 rounded-full relative" : "h-40 w-full relative";

    const isDownloading = typeof docUrl === 'string' ? downloadingState[docUrl] : false;
    
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isClientPhoto ? <UserCircle className="h-5 w-5 text-primary" /> : (isPdf ? <FileTextIcon className="h-5 w-5 text-primary" /> : <ImageIcon className="h-5 w-5 text-primary" />)}
            {title}
          </CardTitle>
          {docUrl && <CardDescription className="truncate">{fileName}</CardDescription>}
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center bg-muted/20 rounded-md p-4 min-h-[150px]">
          {isUploading ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="h-10 w-10 animate-spin mb-2" />
                <p>Subiendo...</p>
            </div>
          ) : previewUrl ? (
            isImage ? (
              <div className={previewContainerClass}>
                <Image 
                  src={previewUrl} 
                  alt={title} 
                  fill 
                  style={{ objectFit: 'cover' }} 
                  className="rounded-md" 
                  data-ai-hint={hint}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            ) : isPdf ? (
              <div className="text-center">
                <FileTextIcon className="h-16 w-16 text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Archivo PDF</p>
              </div>
            ) : (
                 <div className="text-center">
                    <AlertTriangleIcon className="h-16 w-16 text-destructive mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Formato no soportado.</p>
                </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              {isClientPhoto ? <UserCircle className="h-10 w-10 mb-2" /> : <UploadCloudIcon className="h-10 w-10 mb-2" />}
              <p>No hay documento.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-2 pt-4">
          <MultipleFileInput
              onFilesSelected={(files) => handleFileUpload(files, fieldName)}
              accept={isClientPhoto ? "image/*" : "image/*,application/pdf"}
              disabled={isUploading || isDownloading}
              initialValue={docUrl ? [docUrl] : []}
              multiple={false}
              folder="driver_documents"
              entityId={client?.id}
          >
              <Button className="w-full" variant="outline" disabled={isUploading || isDownloading}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <UploadCloudIcon className="mr-2 h-4 w-4" />}
                  {docUrl ? "Cambiar" : "Subir"}
              </Button>
          </MultipleFileInput>
          {docUrl && typeof docUrl === 'string' && !isUploading && (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => handleShare(docUrl, defaultFileName, title)} disabled={isDownloading}>
                <Share2Icon className="mr-2 h-4 w-4" /> Compartir
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDownload(docUrl, defaultFileName)} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <DownloadIcon className="mr-2 h-4 w-4" />}
                 Descargar
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>
    );
  };

  if (loadingData) {
    return <div className="flex justify-center items-center h-full"><p>Cargando...</p></div>;
  }

  if (!client) {
    return (
        <>
            <Card>
                <CardHeader><CardTitle>Error</CardTitle></CardHeader>
                <CardContent><p>Cliente no encontrado. Puede haber sido eliminado o la URL es incorrecta.</p></CardContent>
                <CardFooter> <Button onClick={() => router.push('/dashboard/clients')}><ArrowLeft className="mr-2 h-4 w-4" /> Volver a Clientes</Button></CardFooter>
            </Card>
        </>
    );
  }

  return (
    <>
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.push(`/dashboard/clients/${clientId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Cliente
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DocumentCard 
            title="Foto del Cliente" 
            docUrl={client.photoUrl} 
            defaultFileName={`foto_${client.firstname}_${client.lastname}`}
            fieldName="photoUrl"
            hint="person portrait"
            isClientPhoto={true}
            isUploading={uploadingState['photoUrl']}
        />
        <DocumentCard 
            title="Identificación (INE)" 
            docUrl={client.ineUrl} 
            defaultFileName={`ine_${client.firstname}_${client.lastname}`}
            fieldName="ineUrl"
            hint="ID card document"
            isUploading={uploadingState['ineUrl']}
        />
        <DocumentCard 
            title="Licencia de Conducir" 
            docUrl={client.licenseImageUrl} 
            defaultFileName={`licencia_${client.firstname}_${client.lastname}`}
            fieldName="licenseImageUrl"
            hint="driver license document"
            isUploading={uploadingState['licenseImageUrl']}
        />
      </div>
    </>
  );
}
