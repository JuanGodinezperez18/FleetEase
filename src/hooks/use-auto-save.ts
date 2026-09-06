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
 * Hook para auto-guardado de formularios.
 * Los formularios pueden conservar el borrador en localStorage sin interrumpir
 * al usuario con una notificación en cada cambio.
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
  const shouldNotify = enableToast && storageKey !== 'expense-form-draft';

  const saveToLocalStorage = useCallback((dataToSave: T) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      if (shouldNotify) {
        toast.info('Borrador guardado automáticamente', { duration: 2000 });
      }
    } catch (error) {
      console.error('Error guardando borrador:', error);
    }
  }, [storageKey, shouldNotify]);

  useEffect(() => {
    if (!isDirty || !data) return;
    const dataString = JSON.stringify(data);
    if (dataString === JSON.stringify(previousDataRef.current)) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      saveToLocalStorage(data);
      if (onSave) void Promise.resolve(onSave(data)).catch(console.error);
      previousDataRef.current = data;
    }, saveDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, onSave, saveDelay, isDirty, saveToLocalStorage]);

  const loadDraft = useCallback((): T | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved) as T;
    } catch (error) {
      console.error('Error cargando borrador:', error);
    }
    return null;
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      previousDataRef.current = null;
    } catch (error) {
      console.error('Error limpiando borrador:', error);
    }
  }, [storageKey]);

  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isDirty && data) {
      saveToLocalStorage(data);
      if (onSave) return onSave(data);
    }
    return Promise.resolve();
  }, [data, isDirty, onSave, saveToLocalStorage]);

  return { loadDraft, clearDraft, saveNow };
}
