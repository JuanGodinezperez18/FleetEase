"use client";

import React, { useEffect, useRef, useState } from 'react';

interface DOMSafeWrapperProps {
  children: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Wrapper que previene errores DOM de Radix UI en Next.js 15
 * Maneja correctamente el ciclo de vida de portales y elementos DOM
 */
export function DOMSafeWrapper({ children, isOpen, onOpenChange }: DOMSafeWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Manejo seguro del montaje
  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Manejo controlado de la visibilidad
  useEffect(() => {
    if (!isMounted) return;

    if (isOpen) {
      // Mostrar inmediatamente
      setIsVisible(true);
    } else if (isVisible) {
      // Ocultar con delay para permitir animaciones
      timeoutRef.current = setTimeout(() => {
        if (isMounted) {
          setIsVisible(false);
        }
      }, 200);
    }
  }, [isOpen, isVisible, isMounted]);

  // Cleanup de portales orphaned
  useEffect(() => {
    const cleanup = () => {
      try {
        // Limpiar portales de Radix que pueden quedar huérfanos
        const portals = document.querySelectorAll('[data-radix-portal]');
        portals.forEach(portal => {
          if (portal.parentNode && portal.childNodes.length === 0) {
            portal.parentNode.removeChild(portal);
          }
        });

        // Limpiar elementos select content huérfanos
        const selectContents = document.querySelectorAll('[data-radix-select-content]');
        selectContents.forEach(content => {
          if (content.parentNode && !document.contains(content)) {
            try {
              content.parentNode.removeChild(content);
            } catch (e) {
              // Silenciar errores de elementos ya removidos
            }
          }
        });
      } catch (error) {
        // Silenciar errores de cleanup
        console.debug('Portal cleanup:', error);
      }
    };

    // Cleanup periódico
    const intervalId = setInterval(cleanup, 5000);

    return () => {
      clearInterval(intervalId);
      cleanup();
    };
  }, []);

  // No renderizar hasta que esté montado
  if (!isMounted) {
    return null;
  }

  // No renderizar contenido si no es visible
  if (!isVisible) {
    return null;
  }

  return (
    <div ref={wrapperRef} data-dom-safe-wrapper>
      {children}
    </div>
  );
}

// Hook para usar con modales
export function useDOMSafeModal(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const openModal = () => {
    if (isMounted) {
      setIsOpen(true);
    }
  };

  const closeModal = () => {
    if (isMounted) {
      setIsOpen(false);
    }
  };

  const toggleModal = () => {
    if (isMounted) {
      setIsOpen(prev => !prev);
    }
  };

  return {
    isOpen: isMounted ? isOpen : false,
    openModal,
    closeModal,
    toggleModal,
    setIsOpen: (open: boolean) => isMounted && setIsOpen(open)
  };
}
