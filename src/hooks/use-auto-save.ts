// src/hooks/use-auto-save.ts
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface UseAutoSaveOptions<T> {
  data: T;
  storageKey: string;
  onSave?: (data: T) => Promise<void>;
  saveDelay?: number;
  enableToast?: boolean;
  isDirty?: boolean;
}

/**
 * Hook para auto-guardado de formularios
 * - Guarda automáticamente después de un delay de inactividad
 * - Opcionalmente guarda en localStorage como borrador
 * - Notifica al usuario del auto-guardado
 */
export function useAutoSave<T extends Record<string, any>>({
  data,
  storageKey,
  onSave,
  saveDelay = 2000,
  enableToast = true,
  isDirty = true,
}: UseAutoSaveOptions<T>) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<T | null>(null);

  // Guardar en localStorage
  const saveToLocalStorage = useCallback((dataToSave: T) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      if (enableToast) {
        toast.info('Borrador guardado automáticamente', {
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Error guardando borrador:', error);
    }
  }, [storageKey, enableToast]);

  // Efecto para auto-guardado
  useEffect(() => {
    // No guardar si no hay cambios o datos no han cambiado
    if (!isDirty || !data) return;

    // Verificar si los datos realmente cambiaron
    const dataString = JSON.stringify(data);
    if (dataString === JSON.stringify(previousDataRef.current)) {
      return;
    }

    // Limpiar timer anterior
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Programar nuevo guardado
    timerRef.current = setTimeout(() => {
      // Guardar en localStorage siempre
      saveToLocalStorage(data);

      // Guardar en servidor si hay callback
      if (onSave) {
        void Promise.resolve(onSave(data)).catch(console.error);
      }

      previousDataRef.current = data;
    }, saveDelay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, onSave, saveDelay, isDirty, saveToLocalStorage]);

  // Cargar borrador guardado
  const loadDraft = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved) as T;
      }
    } catch (error) {
      console.error('Error cargando borrador:', error);
    }
    return null;
  }, [storageKey]);

  // Limpiar borrador
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      previousDataRef.current = null;
    } catch (error) {
      console.error('Error limpiando borrador:', error);
    }
  }, [storageKey]);

  // Guardado inmediato (forzado)
  const saveNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    if (isDirty && data) {
      saveToLocalStorage(data);
      
      if (onSave) {
        return onSave(data);
      }
    }
    
    return Promise.resolve();
  }, [data, isDirty, onSave, saveToLocalStorage]);

  return {
    loadDraft,
    clearDraft,
    saveNow,
  };
}
