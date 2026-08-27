/**
 * Utilidades de compresión de imágenes previa a la subida.
 *
 * Se apoya en `browser-image-compression` (dependencia ya instalada) y centraliza
 * la configuración para que todos los flujos de subida compriman de forma consistente.
 */
import imageCompression from 'browser-image-compression';

export interface ImageCompressionOptions {
  /** Tamaño máximo objetivo en MB. */
  maxSizeMB?: number;
  /** Dimensión máxima (ancho o alto) en píxeles. */
  maxWidthOrHeight?: number;
  /** Usar Web Worker para no bloquear el hilo principal. */
  useWebWorker?: boolean;
}

const DEFAULT_OPTIONS: Required<
  Pick<ImageCompressionOptions, 'maxSizeMB' | 'maxWidthOrHeight' | 'useWebWorker'>
> = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

/**
 * Formatos que el navegador puede decodificar y por tanto comprimir en el cliente.
 * HEIC (fotos de iPhone) queda fuera: el navegador no puede decodificarlo,
 * así que se sube el original y el servidor se encarga.
 */
const BROWSER_COMPRESSIBLE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/avif',
]);

/** Devuelve `true` si el archivo es una imagen comprimible en el cliente. */
export function isCompressibleImage(file: File): boolean {
  return file.type.startsWith('image/') && BROWSER_COMPRESSIBLE_TYPES.has(file.type.toLowerCase());
}

/**
 * Comprime una imagen en el cliente ANTES de subirla.
 *
 * - Devuelve `null` si el archivo no es una imagen.
 * - Devuelve el archivo original si no es comprimible (ej. HEIC) o si ya es pequeño.
 * - Nunca lanza errores: si la compresión falla, sube el original.
 */
export async function compressImageIfNeeded(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File | null> {
  if (!file.type.startsWith('image/')) return null;
  if (!isCompressibleImage(file)) return file;

  const merged = { ...DEFAULT_OPTIONS, ...options };

  // Si ya es pequeño (≤512KB), no tiene sentido comprimir.
  if (file.size <= 512 * 1024) {
    return file;
  }

  try {
    const compressed = await imageCompression(file, merged);
    if (compressed && compressed.size < file.size) {
      return compressed;
    }
    return file;
  } catch (err) {
    console.warn('[image-compression] No se pudo comprimir la imagen, se sube el original:', err);
    return file;
  }
}
