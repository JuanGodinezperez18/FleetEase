import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';

const storage = getStorage();

/**
 * Carpetas permitidas en Firebase Storage
 */
export type StorageFolderPath = 
  | "vehicle_images" 
  | "driver_documents" 
  | "financial_receipts" 
  | "general_documents"
  | "contract_templates";

export interface UploadOptions {
  /** Carpeta destino en Storage */
  folder: StorageFolderPath;
  /** Generar ID único automáticamente (default: true) */
  generateUniqueId?: boolean;
  /** Callback de progreso (opcional) */
  onProgress?: (progress: number) => void;
}

export interface UploadResult {
  /** URL pública del archivo */
  downloadURL: string;
  /** Path completo en Storage */
  fullPath: string;
  /** Nombre del archivo */
  fileName: string;
}

/**
 * Sube un archivo a Firebase Storage
 * 
 * @param file - Archivo a subir
 * @param options - Opciones de carga
 * @returns Promise con URL y metadata
 * 
 * @example
 * ```
 * const result = await uploadFile(file, { 
 *   folder: 'vehicle_images',
 *   onProgress: (p) => console.log(`${p}%`)
 * });
 * console.log(result.downloadURL);
 * ```
 */
export const uploadFile = async (
  file: File, 
  options: UploadOptions
): Promise<UploadResult> => {
  if (!file) {
    throw new Error("No se proporcionó ningún archivo para subir.");
  }

  const { folder, generateUniqueId = true } = options;
  
  // Generar nombre único si se solicita
  const fileName = generateUniqueId 
    ? `${uuidv4()}-${file.name}` 
    : file.name;
  
  const storageRef = ref(storage, `${folder}/${fileName}`);
  
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      downloadURL,
      fullPath: snapshot.ref.fullPath,
      fileName,
    };
  } catch (error) {
    console.error(`Error subiendo archivo a ${folder}:`, error);
    throw new Error(`No se pudo subir el archivo: ${(error as Error).message}`);
  }
};

/**
 * Elimina un archivo de Firebase Storage
 * 
 * @param url - URL completa del archivo o path relativo
 * @returns Promise<void>
 */
export const deleteFile = async (url: string): Promise<void> => {
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (error) {
    console.warn(`No se pudo eliminar archivo ${url}:`, error);
    // No lanzar error para evitar que falle la operación principal
  }
};

/**
 * Elimina múltiples archivos en batch
 * 
 * @param urls - Array de URLs a eliminar
 * @returns Promise con resultados individuales
 */
export const deleteFiles = async (urls: string[]): Promise<{
  succeeded: string[];
  failed: string[];
}> => {
  const results = await Promise.allSettled(
    urls.map(url => deleteFile(url))
  );
  
  const succeeded: string[] = [];
  const failed: string[] = [];
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      succeeded.push(urls[index]);
    } else {
      failed.push(urls[index]);
    }
  });
  
  return { succeeded, failed };
};
