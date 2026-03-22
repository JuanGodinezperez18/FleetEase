"use client";

import { useState, useEffect } from 'react';

/**
 * Hook para manejar el estado del command palette globalmente
 * Se activa con Cmd+K / Ctrl+K
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K o Ctrl+K para abrir/cerrar
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    open,
    setOpen,
    toggle: () => setOpen(prev => !prev),
    close: () => setOpen(false),
  };
}
