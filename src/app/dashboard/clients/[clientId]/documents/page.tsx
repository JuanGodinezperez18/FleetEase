"use client";

import React, { useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import type { Client } from '@/types';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Download as DownloadIcon,
  Share2 as Share2Icon,
  FileText as FileTextIcon,
  Image as ImageIcon,
  AlertTriangle as AlertTriangleIcon,
  UploadCloud as UploadCloudIcon,
  UserCircle,
  Loader2,
} from 'lucide-react';
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

  const client = useMemo(
    () => (clients || []).find(d => d.id === clientId && !d.isDeleted),
    [clients, clientId]
  );

  const handleFileUpload = async (files: FileValue[], fieldName: keyof Client) => {
    if (!client || files.length === 0) return;

    const file = files[0];
    if (!(file instanceof File)) return;

    const isImage = file.type.startsWith('image/');
    const maxSizeMB = isImage ? 2 : 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      toast.error('Archivo muy grande', {
        description: `El archivo debe ser menor a ${maxSizeMB}MB. Tamaño actual: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      });
      return;
    }

    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    const validDocTypes = ['application/pdf'];
    const validTypes =
      fieldName === 'photoUrl' ? validImageTypes : [...validImageTypes, ...validDocTypes];

    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de archivo no válido', {
        description: `Solo se permiten: ${validTypes.map(t => t.split('/')[1]).join(', ')}`,
      });
      return;
    }

    setUploadingState(prev => ({ ...prev, [fieldName]: true }));
    const oldFileUrl = client[fieldName] as string | undefined;

    try {
      const newFileUrl = await uploadFile(file, `driver_documents`, true, client.id);
      await updateClient(client.id, { [fieldName]: newFileUrl });

      if (oldFileUrl) {
        await deleteFileByUrl(oldFileUrl).catch(e =>
          console.warn(`Could not delete old file: ${oldFileUrl}`, e)
        );
      }

      toast.success('Documento actualizado', {
        description: 'El documento se ha subido y guardado correctamente.',
      });
    } catch (error) {
      console.error(`Failed to upload ${fieldName}:`, error);
      toast.error('Error al subir', {
        description: 'No se pudo subir el archivo. Inténtalo de nuevo.',
      });
    } finally {
      setUploadingState(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const handleDownload = useCallback(async (url: string | undefined, defaultFilename: string) => {
    if (!url) {
      toast.error('Error', { description: 'Documento no encontrado.' });
      return;
    }

    setDownloadingState(prev => ({ ...prev, [url]: true }));
    const toastId = toast.loading('Preparando descarga...');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No autenticado');

      const response = await fetch('/api/download-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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

      toast.success('Descarga iniciada', { id: toastId, description: `Descargando ${filename}...` });
    } catch (error: any) {
      toast.error('Error de descarga', { id: toastId, description: error.message });
    } finally {
      setDownloadingState(prev => ({ ...prev, [url]: false }));
    }
  }, []);

  const handleShare = useCallback(
    async (url: string | undefined, defaultFilename: string, title: string) => {
      if (!url) {
        toast.error('Error', { description: 'Documento no encontrado para compartir.' });
        return;
      }
      const filename = getFileNameFromUrl(url, defaultFilename);

      if (!navigator.share) {
        toast.info('No soportado', {
          description: 'La función de compartir no está soportada en este navegador.',
        });
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
            toast.info('No compartible', {
              description: 'Este tipo de archivo no se puede compartir en tu navegador.',
            });
            return;
          }
        } else if (url.startsWith('http')) {
          shareData.url = url;
          shareData.text = `Ver documento: ${filename}`;
        } else {
          toast.info('No compartible', {
            description: 'Este tipo de documento no se puede compartir. Intenta descargar primero.',
          });
          return;
        }

        await navigator.share(shareData);
        toast.success('Compartido', { description: `${filename} compartido exitosamente.` });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Error al compartir:', error);
        toast.error('Error al compartir', {
          description: 'Ocurrió un error inesperado al intentar compartir.',
        });
      }
    },
    []
  );

  const DocumentCard = ({
    title,
    docUrl,
    defaultFileName,
    fieldName,
    hint,
    isClientPhoto = false,
    isUploading = false,
  }: {
    title: string;
    docUrl?: string | File | undefined;
    defaultFileName: string;
    fieldName: keyof Client;
    hint: string;
    isClientPhoto?: boolean;
    isUploading?: boolean;
  }) => {
    const getPreviewUrl = (doc: string | File | undefined): string | null => {
      if (!doc) return null;
      if (typeof doc === 'string') return doc;
      if (doc instanceof File) return URL.createObjectURL(doc);
      return null;
    };

    const previewUrl = getPreviewUrl(docUrl);
    const cleanUrl = typeof docUrl === 'string' ? docUrl.split('?')[0] : '';

    const isPdf =
      (typeof docUrl === 'string' &&
        (cleanUrl.endsWith('.pdf') || docUrl?.startsWith('data:application/pdf'))) ||
      (docUrl instanceof File && docUrl.type === 'application/pdf');
    const isImage =
      (typeof docUrl === 'string' &&
        (/\.(jpg|jpeg|png|gif|heic|webp)$/i.test(cleanUrl) || docUrl?.startsWith('data:image'))) ||
      (docUrl instanceof File && docUrl.type.startsWith('image/'));

    const fileName = docUrl
      ? typeof docUrl === 'string'
        ? getFileNameFromUrl(docUrl, defaultFileName)
        : docUrl.name
      : defaultFileName;
    const previewContainerClass = isClientPhoto
      ? 'h-28 w-28 rounded-full relative'
      : 'h-36 w-full relative';

    const isDownloading = typeof docUrl === 'string' ? downloadingState[docUrl] : false;

    return (
      <article className="flex flex-col overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_14px_40px_rgba(0,0,0,.2)]">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2">
            {isClientPhoto ? (
              <UserCircle className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
            ) : isPdf ? (
              <FileTextIcon className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
            ) : (
              <ImageIcon className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
            )}
            <h3 className="font-heading text-sm font-semibold text-white">{title}</h3>
          </div>
          {docUrl && <p className="mt-1 truncate text-[11px] text-white/40">{fileName}</p>}
        </div>

        <div className="flex min-h-[140px] flex-grow items-center justify-center bg-white/[0.02] p-4">
          {isUploading ? (
            <div className="flex flex-col items-center justify-center text-white/40">
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
              <p className="text-xs">Subiendo...</p>
            </div>
          ) : previewUrl ? (
            isImage ? (
              <div className={previewContainerClass}>
                <Image
                  src={previewUrl}
                  alt={title}
                  fill
                  style={{ objectFit: 'cover' }}
                  className="rounded-xl"
                  data-ai-hint={hint}
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
            ) : isPdf ? (
              <div className="text-center">
                <FileTextIcon className="mx-auto mb-2 h-12 w-12 text-[#d7ff3f]/60" strokeWidth={1.5} />
                <p className="text-xs text-white/40">Archivo PDF</p>
              </div>
            ) : (
              <div className="text-center">
                <AlertTriangleIcon className="mx-auto mb-2 h-12 w-12 text-rose-300/60" strokeWidth={1.5} />
                <p className="text-xs text-white/40">Formato no soportado</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center text-white/35">
              {isClientPhoto ? (
                <UserCircle className="mb-2 h-9 w-9" strokeWidth={1.5} />
              ) : (
                <UploadCloudIcon className="mb-2 h-9 w-9" strokeWidth={1.5} />
              )}
              <p className="text-xs">Sin documento</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-white/[0.06] p-3">
          <MultipleFileInput
            onFilesSelected={files => handleFileUpload(files, fieldName)}
            accept={isClientPhoto ? 'image/*' : 'image/*,application/pdf'}
            disabled={isUploading || isDownloading}
            initialValue={docUrl ? [docUrl] : []}
            multiple={false}
            folder="driver_documents"
            entityId={client?.id}
          >
            <Button
              className="h-10 w-full rounded-xl border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08] hover:text-white"
              variant="outline"
              disabled={isUploading || isDownloading}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
              ) : (
                <UploadCloudIcon className="mr-2 h-4 w-4" strokeWidth={1.75} />
              )}
              {docUrl ? 'Cambiar' : 'Subir'}
            </Button>
          </MultipleFileInput>
          {docUrl && typeof docUrl === 'string' && !isUploading && (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleShare(docUrl, defaultFileName, title)}
                disabled={isDownloading}
                className="h-9 rounded-lg text-white/50 hover:bg-white/[0.06] hover:text-white"
              >
                <Share2Icon className="mr-1.5 h-4 w-4" strokeWidth={1.75} /> Compartir
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(docUrl, defaultFileName)}
                disabled={isDownloading}
                className="h-9 rounded-lg text-white/50 hover:bg-white/[0.06] hover:text-white"
              >
                {isDownloading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.75} />
                ) : (
                  <DownloadIcon className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                )}
                Descargar
              </Button>
            </div>
          )}
        </div>
      </article>
    );
  };

  if (loadingData) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-[30px] bg-[#080a0f] text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-[30px] bg-[#080a0f] text-center text-white">
        <p className="font-heading text-lg font-semibold">Cliente no encontrado</p>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/clients')}
          className="rounded-xl border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
          Volver a clientes
        </Button>
      </div>
    );
  }

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/dashboard/clients/${clientId}`)}
          className="h-9 w-fit rounded-xl px-2 text-white/50 hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
          Volver al cliente
        </Button>

        <header>
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
            Clientes · Documentos
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            Documentos
          </h1>
          <p className="mt-1 text-sm text-white/45">
            {client.firstname} {client.lastname}
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DocumentCard
            title="Foto del cliente"
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
            title="Licencia de conducir"
            docUrl={client.licenseImageUrl}
            defaultFileName={`licencia_${client.firstname}_${client.lastname}`}
            fieldName="licenseImageUrl"
            hint="driver license document"
            isUploading={uploadingState['licenseImageUrl']}
          />
        </div>
      </div>
    </div>
  );
}
