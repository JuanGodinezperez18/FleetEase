import React from 'react';

/**
 * Restaura inmediatamente la interacción del body
 * Usar SIEMPRE al cerrar un modal para evitar que la página quede bloqueada
 */
export function restoreBodyInteraction(): void {
  document.body.style.pointerEvents = 'auto';
  document.body.style.setProperty('pointer-events', 'auto', 'important');
  document.body.removeAttribute('inert');
  document.body.removeAttribute('data-inert');
  document.body.removeAttribute('aria-hidden');

  document.documentElement.style.pointerEvents = 'auto';
  document.documentElement.style.setProperty('pointer-events', 'auto', 'important');
  document.documentElement.removeAttribute('inert');
  document.documentElement.removeAttribute('data-inert');
}

/**
 * Utilidad para limpiar artefactos de Radix UI que pueden quedar después de cerrar modales/dialogs
 *
 * Este problema ocurre cuando Radix UI Dialog/Modal deja elementos en el DOM que bloquean
 * la interacción con la aplicación:
 * - El overlay puede quedar en el DOM
 * - El body puede quedar con atributo `inert` que bloquea toda interacción
 * - El body puede tener `pointer-events: none` o `overflow: hidden`
 * - Portales huérfanos pueden quedar en el DOM
 */
export function cleanupRadixUIArtifacts(): void {
  try {
    console.log('[Cleanup] Restaurando interacción del body...');

    // SOLO restaurar el body - dejar que React limpie TODO el DOM
    restoreBodyInteraction();

    // Contar modales abiertos
    const openDialogs = document.querySelectorAll('[role="dialog"][data-state="open"]');
    console.log('[Cleanup] Modales abiertos:', openDialogs.length);

    // Si no hay modales abiertos, restaurar overflow del body
    if (openDialogs.length === 0) {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.classList.remove('overflow-hidden');
    }

    // Verificar estado final
    const finalBodyPointerEvents = window.getComputedStyle(document.body).pointerEvents;
    console.log('[Cleanup] Estado final del body:', {
      pointerEvents: finalBodyPointerEvents,
      hasOpenDialogs: openDialogs.length > 0
    });

  } catch (error) {
    console.error('[cleanupRadixUIArtifacts] Error durante limpieza:', error);
  }
}

/**
 * Hook de React para limpiar artefactos cuando un modal se cierra
 * @param isOpen Estado del modal (true = abierto, false = cerrado)
 * @param delay Delay en ms antes de ejecutar la limpieza (default: 200ms)
 */
export function useRadixCleanup(isOpen: boolean, delay: number = 200): void {
  if (typeof window === 'undefined') return;

  React.useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        cleanupRadixUIArtifacts();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, delay]);
}
