// src/hooks/use-keyboard-shortcuts.ts
'use client';

import { useEffect, useCallback, useRef } from 'react';
import type { DependencyList } from 'react';

interface KeyboardShortcut {
  key: string;
  handler: () => void;
  description?: string;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  ignoreInputFields?: boolean;
}

/**
 * Hook para gestionar keyboard shortcuts
 * Soporta combinaciones con Ctrl/Cmd, Alt, Shift
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  { enabled = true, ignoreInputFields = true }: UseKeyboardShortcutsOptions = {}
) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Ignorar si estamos en un input field y está configurado
    if (ignoreInputFields) {
      const target = event.target;
      const element = target instanceof HTMLElement ? target : null;
      const tagName = element?.tagName.toLowerCase();
      const isInputField = 
        tagName === 'input' || 
        tagName === 'textarea' || 
        tagName === 'select' ||
        element?.isContentEditable;

      // Permitir Escape siempre
      if (isInputField && event.key !== 'Escape') {
        return;
      }
    }

    // Buscar shortcut matching
    const shortcut = shortcutsRef.current.find(s => {
      // Normalizar key
      const eventKey = event.key.toLowerCase();
      const shortcutKey = s.key.toLowerCase();

      // Verificar modificadores
      const hasCtrl = event.ctrlKey || event.metaKey;
      const hasAlt = event.altKey;
      const hasShift = event.shiftKey;

      // Parsear shortcut key (ej: "ctrl+enter", "escape", "ctrl+s")
      const parts = shortcutKey.split('+').map(p => p.trim().toLowerCase());
      const needsCtrl = parts.includes('ctrl') || parts.includes('cmd') || parts.includes('meta');
      const needsAlt = parts.includes('alt');
      const needsShift = parts.includes('shift');

      const keyOnly = parts.find(p => !['ctrl', 'cmd', 'meta', 'alt', 'shift'].includes(p));

      return (
        (needsCtrl ? hasCtrl : !needsCtrl) &&
        (needsAlt ? hasAlt : !needsAlt) &&
        (needsShift ? hasShift : !needsShift) &&
        keyOnly && eventKey === keyOnly
      );
    });

    if (shortcut) {
      if (shortcut.preventDefault) {
        event.preventDefault();
      }
      if (shortcut.stopPropagation) {
        event.stopPropagation();
      }
      shortcut.handler();
    }
  }, [enabled, ignoreInputFields]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  // Helper para registrar shortcut temporal
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    // Los shortcuts se actualizan vía ref automáticamente
  }, []);

  return {
    registerShortcut,
  };
}

/**
 * Hook específico para formularios
 * Shortcuts comunes: Ctrl+Enter (guardar), Escape (cerrar)
 */
export function useFormKeyboardShortcuts(options: {
  onSave?: () => void;
  onClose?: () => void;
  onReset?: () => void;
  enabled?: boolean;
}) {
  const { onSave, onClose, onReset, enabled = true } = options;

  useKeyboardShortcuts([
    {
      key: 'ctrl+enter',
      handler: () => onSave?.(),
      description: 'Guardar formulario',
      preventDefault: true,
    },
    {
      key: 'escape',
      handler: () => onClose?.(),
      description: 'Cerrar formulario',
      preventDefault: true,
    },
    ...(onReset ? [{
      key: 'ctrl+shift+r',
      handler: () => onReset?.(),
      description: 'Resetear formulario',
      preventDefault: true,
    }] as KeyboardShortcut[] : []),
  ], { enabled });
}
