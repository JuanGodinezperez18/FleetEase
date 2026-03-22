/**
 * Guardián permanente que previene que el body se bloquee con pointer-events: none
 *
 * Usa MutationObserver para detectar cambios EN TIEMPO REAL (0ms de delay)
 * y un interval de respaldo cada 50ms.
 */

let guardianActive = false;
let monitorInterval: NodeJS.Timeout | null = null;
let mutationObserver: MutationObserver | null = null;

function fixBodyPointerEvents(): void {
  const openDialogs = document.querySelectorAll('[role="dialog"][data-state="open"]');

  // Solo arreglar si NO hay modales abiertos
  if (openDialogs.length === 0) {
    // 1. Arreglar pointer-events del body
    const computedStyle = window.getComputedStyle(document.body);
    const pointerEvents = computedStyle.pointerEvents;

    if (pointerEvents === 'none') {
      console.warn('[BodyLockGuardian] ⚠️ BLOQUEO DETECTADO - Restaurando INMEDIATAMENTE...');

      // Forzar restauración INMEDIATA
      document.body.style.pointerEvents = 'auto';
      document.body.style.setProperty('pointer-events', 'auto', 'important');
      document.body.removeAttribute('inert');
      document.body.removeAttribute('data-inert');
    }

    // 2. IMPORTANTE: NO eliminar elementos del DOM aquí
    // Dejar que React maneje la limpieza del DOM para evitar conflictos
    // Solo restaurar estilos y atributos del body

    // Ocultar overlays y dialogs con CSS en lugar de eliminarlos
    const orphanedOverlays = document.querySelectorAll('[data-radix-dialog-overlay][data-state="closed"]');
    orphanedOverlays.forEach(overlay => {
      if (overlay instanceof HTMLElement) {
        overlay.style.display = 'none';
        overlay.style.pointerEvents = 'none';
      }
    });

    const orphanedDialogs = document.querySelectorAll('[role="dialog"][data-state="closed"]');
    orphanedDialogs.forEach(dialog => {
      if (dialog instanceof HTMLElement) {
        dialog.style.display = 'none';
        dialog.style.pointerEvents = 'none';
      }
    });
  }
}

export function startBodyLockGuardian(): void {
  if (guardianActive) {
    console.log('[BodyLockGuardian] Ya está activo');
    return;
  }

  console.log('[BodyLockGuardian] Iniciando guardián permanente con MutationObserver...');
  guardianActive = true;

  // 1. MutationObserver para detectar cambios EN TIEMPO REAL (0ms delay)
  mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        if (mutation.attributeName === 'style' ||
            mutation.attributeName === 'inert' ||
            mutation.attributeName === 'data-inert') {
          // Cambio detectado, verificar inmediatamente
          fixBodyPointerEvents();
          break;
        }
      }
    }
  });

  // Observar cambios en el body
  mutationObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['style', 'inert', 'data-inert', 'aria-hidden']
  });

  // 2. Interval de respaldo cada 200ms (balance entre responsividad y rendimiento)
  monitorInterval = setInterval(() => {
    fixBodyPointerEvents();
  }, 200);

  console.log('[BodyLockGuardian] Guardián activo - MutationObserver + monitor cada 200ms');
}

export function stopBodyLockGuardian(): void {
  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  guardianActive = false;
  console.log('[BodyLockGuardian] Guardián detenido');
}

// DESHABILITADO: El guardián causa conflictos con React al eliminar nodos del DOM
// Solo se iniciará si se llama explícitamente a startBodyLockGuardian()
//
// La limpieza de Radix UI se maneja mejor a través de:
// - cleanupRadixUIArtifacts() en cleanup-radix.ts
// - Los useEffect de form-modal.tsx con delays apropiados
//
// Si experimentas bloqueos del body, usa cleanupRadixUIArtifacts() manualmente
// en lugar de confiar en este guardián automático.

/*
// Código deshabilitado - descomentar solo para debugging
if (typeof window !== 'undefined') {
  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      startBodyLockGuardian();
    });
  } else {
    startBodyLockGuardian();
  }
}
*/
