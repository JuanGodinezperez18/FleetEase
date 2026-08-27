// src/components/accessibility/live-region.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  atomic?: boolean;
  className?: string;
  clearAfter?: number | null; // ms, null para no limpiar automáticamente
}

/**
 * Componente Live Region para anunciar cambios a screen readers
 * Usar para notificaciones que no son visibles pero deben anunciarse
 */
export function LiveRegion({
  message,
  politeness = 'polite',
  atomic = true,
  className,
  clearAfter = 3000,
}: LiveRegionProps) {
  const [displayMessage, setDisplayMessage] = useState(message);

  useEffect(() => {
    setDisplayMessage(message);

    if (clearAfter && message) {
      const timer = setTimeout(() => {
        setDisplayMessage('');
      }, clearAfter);

      return () => clearTimeout(timer);
    }
  }, [message, clearAfter]);

  if (!displayMessage) return null;

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      className={cn('sr-only', className)}
    >
      {displayMessage}
    </div>
  );
}

/**
 * Hook para gestionar announcements de accesibilidad
 */
export function useAnnounce() {
  const [message, setMessage] = useState<string>('');

  const announce = useCallback((
    newMessage: string,
    politeness: 'polite' | 'assertive' = 'polite'
  ) => {
    // Limpiar primero para forzar re-anuncio
    setMessage('');
    
    // Pequeño delay para asegurar que el screen reader detecte el cambio
    setTimeout(() => {
      setMessage(newMessage);
    }, 100);
  }, []);

  const announcePolite = useCallback((msg: string) => {
    announce(msg, 'polite');
  }, [announce]);

  const announceAssertive = useCallback((msg: string) => {
    announce(msg, 'assertive');
  }, [announce]);

  return {
    message,
    announce,
    announcePolite,
    announceAssertive,
    clear: useCallback(() => setMessage(''), []),
  };
}

/**
 * Componente wrapper para focus management
 */
interface FocusTrapProps {
  children: React.ReactNode;
  isActive: boolean;
  onEscape?: () => void;
  initialFocusRef?: React.RefObject<HTMLElement>;
  returnFocusRef?: React.RefObject<HTMLElement>;
}

export function FocusTrap({
  children,
  isActive,
  onEscape,
  initialFocusRef,
  returnFocusRef,
}: FocusTrapProps) {
  useEffect(() => {
    if (!isActive) return;

    const previousActiveElement = document.activeElement as HTMLElement;
    
    // Guardar referencia para return focus
    if (returnFocusRef) {
      returnFocusRef.current = previousActiveElement;
    }

    // Focar elemento inicial
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    }

    // Handler para tecla Escape
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape?.();
      }

      // Tab trap para modales
      if (event.key === 'Tab') {
        const focusableElements = document.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Return focus al elemento original
      if (returnFocusRef?.current) {
        returnFocusRef.current.focus();
      } else if (previousActiveElement) {
        previousActiveElement.focus();
      }
    };
  }, [isActive, onEscape, initialFocusRef, returnFocusRef]);

  if (!isActive) return <>{children}</>;

  return <>{children}</>;
}
