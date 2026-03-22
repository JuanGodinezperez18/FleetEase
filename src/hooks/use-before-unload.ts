// src/hooks/use-before-unload.ts
'use client';

import { useEffect, useCallback, useRef } from 'react';

interface UseBeforeUnloadOptions {
  isDirty?: boolean;
  message?: string;
  enabled?: boolean;
}

/**
 * Hook para mostrar confirmación antes de cerrar/recargar página
 * Útil para formularios con cambios sin guardar
 */
export function useBeforeUnload({
  isDirty = false,
  message = 'Tienes cambios sin guardar. ¿Seguro que deseas salir?',
  enabled = true,
}: UseBeforeUnloadOptions) {
  const messageRef = useRef(message);
  messageRef.current = message;

  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    if (isDirty && enabled) {
      event.preventDefault();
      event.returnValue = messageRef.current;
      return messageRef.current;
    }
  }, [isDirty, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Agregar listener para beforeunload
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Agregar listener para popstate (navegación con botón atrás)
    const handlePopState = () => {
      if (isDirty) {
        const confirmed = window.confirm(messageRef.current);
        if (!confirmed) {
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Push state inicial para poder interceptar navegación atrás
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handleBeforeUnload, isDirty, enabled]);

  // Hook para navegación programática
  const navigateWithConfirmation = useCallback(async (
    navigateFn: () => void | Promise<void>
  ): Promise<boolean> => {
    if (!isDirty) {
      await navigateFn();
      return true;
    }

    const confirmed = window.confirm(messageRef.current);
    if (confirmed) {
      await navigateFn();
      return true;
    }

    return false;
  }, [isDirty]);

  return {
    navigateWithConfirmation,
  };
}
