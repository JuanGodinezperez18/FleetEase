
"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { compressImageIfNeeded } from '@/lib/image-compression';
import { normalizeProviderFileMime } from '@/lib/security/validation';

export type StorageFolderPath =
  | "vehicle_images"
  | "vehicle_documents"
  | "driver_documents"
  | "financial_receipts"
  | "general_documents"
  | "contract_templates"
  | "company_logos";

function isNetworkFetchError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed')
  );
}

export function useStorage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File, folder: StorageFolderPath, compress: boolean = true, entityId?: string) => {
    setLoading(true);
    setError(null);
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) console.log(`[useStorage] Iniciando subida para: ${file.name}, a carpeta: ${folder}, entityId: ${entityId}`);

    try {
      // Google Drive / Android a menudo entregan application/octet-stream.
      // Normalizamos antes de comprimir para que las imágenes se detecten bien.
      let fileToUpload = normalizeProviderFileMime(file);

      if (compress && fileToUpload.type.startsWith('image/')) {
        if (isDev) console.log(`[useStorage] Comprimiendo imagen...`);
        fileToUpload = (await compressImageIfNeeded(fileToUpload)) ?? fileToUpload;
        if (isDev) console.log(`[useStorage] Compresión finalizada.`);
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No autenticado para subir archivo.');

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('folder', folder);
      if (entityId) {
        formData.append('entityId', entityId);
      }
      formData.append('originalName', file.name);

      if (isDev) console.log('[useStorage] Enviando archivo a /api/upload...');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let serverMessage = `Error en el servidor: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData?.error) serverMessage = errorData.error;
        } catch {
          // body no JSON
        }
        throw new Error(serverMessage);
      }

      const { downloadUrl } = await response.json();
      if (!downloadUrl) {
        throw new Error("La API no devolvió una URL de descarga.");
      }

      if(isDev) console.log('[useStorage] Subida exitosa. URL de descarga:', downloadUrl);
      return downloadUrl as string;
    } catch (err: unknown) {
      let errorMsg = err instanceof Error ? err.message : 'Error desconocido al subir el archivo.';

      if (isNetworkFetchError(err)) {
        errorMsg =
          'No se pudo conectar con el servidor al subir el archivo. ' +
          'Si viene de Google Drive u otro proveedor, pruébalo de nuevo o descárgalo primero al dispositivo.';
      }

      setError(errorMsg);
      console.error("[useStorage] Error detallado en uploadFile:", err);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const deleteFileByUrl = async (fileUrl: string) => {
    if (!fileUrl) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No autenticado para eliminar archivo.');

      const response = await fetch('/api/delete-file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileUrl })
      });

      if (!response.ok) {
        const errorData = await response.text().catch(() => response.statusText);
        console.warn(`No se pudo eliminar el archivo del storage: ${errorData}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`Error al intentar eliminar archivo: ${message}`);
    }
  };

  const getShareableUrl = async (fileUrl: string): Promise<string> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No autenticado');

      const response = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileUrls: [fileUrl] }),
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Error generando URL temporal');
      }

      const payload = await response.json() as { signedUrls?: Record<string, string> };
      const url = payload.signedUrls?.[fileUrl];
      if (!url) throw new Error('El archivo no está disponible para esta empresa.');
      return url;
    } catch (err: unknown) {
      console.error('Error en getShareableUrl:', err);
      throw err;
    }
  };

  const downloadFile = async (fileUrl: string, fileName?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('No autenticado');

      const signedUrl = await getShareableUrl(fileUrl);

      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error('Error descargando archivo');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || extractFileNameFromUrl(fileUrl);
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Archivo descargado');
    } catch (err: unknown) {
      console.error('Error en downloadFile:', err);
      toast.error('Error al descargar archivo');
      throw err;
    }
  };

  const getPreviewUrl = async (fileUrl: string | File): Promise<string> => {
    if (fileUrl instanceof File || fileUrl.startsWith('blob:') || fileUrl.startsWith('data:')) {
      return fileUrl as string;
    }

    try {
      return await getShareableUrl(fileUrl);
    } catch (err) {
      console.warn('Error obteniendo preview, usando URL original:', err);
      return fileUrl;
    }
  };

  return { 
    uploadFile, 
    deleteFileByUrl, 
    getShareableUrl, 
    downloadFile, 
    getPreviewUrl,
    loading, 
    error 
  };
}

function extractFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    return decodeURIComponent(lastPart);
  } catch {
    return 'archivo';
  }
}
