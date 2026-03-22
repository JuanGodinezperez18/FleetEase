/**
 * Script de debugging para identificar qué está bloqueando la UI
 * después de cerrar un modal
 */

export function debugBlockingElements(): void {
  console.log('========== DEBUGGING UI BLOQUEADA ==========');

  // 1. Inspeccionar el body
  console.log('\n1. BODY:');
  console.log('  - inert:', document.body.hasAttribute('inert'));
  console.log('  - aria-hidden:', document.body.getAttribute('aria-hidden'));
  console.log('  - pointer-events:', window.getComputedStyle(document.body).pointerEvents);
  console.log('  - overflow:', window.getComputedStyle(document.body).overflow);
  console.log('  - z-index:', window.getComputedStyle(document.body).zIndex);

  // 2. Buscar elementos con z-index alto que puedan estar bloqueando
  console.log('\n2. ELEMENTOS CON Z-INDEX ALTO:');
  const allElements = document.querySelectorAll('*');
  const highZIndexElements: { el: Element; zIndex: string; rect: DOMRect }[] = [];

  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
    const zIndex = parseInt(style.zIndex);
    if (zIndex > 40) {
      const rect = el.getBoundingClientRect();
      highZIndexElements.push({
        el,
        zIndex: style.zIndex,
        rect
      });
    }
  });

  highZIndexElements
    .sort((a, b) => parseInt(b.zIndex) - parseInt(a.zIndex))
    .slice(0, 10)
    .forEach(({ el, zIndex, rect }) => {
      console.log(`  - z-index: ${zIndex}`, {
        tag: el.tagName,
        classes: el.className,
        visible: rect.width > 0 && rect.height > 0,
        pointerEvents: window.getComputedStyle(el).pointerEvents,
        position: `${rect.top}, ${rect.left}, ${rect.width}x${rect.height}`,
        element: el
      });
    });

  // 3. Buscar overlays invisibles
  console.log('\n3. OVERLAYS/BACKDROPS:');
  const possibleOverlays = document.querySelectorAll('[class*="overlay"], [class*="backdrop"], [class*="modal"], [style*="fixed"], [style*="absolute"]');
  console.log(`  - Total elementos con posicionamiento: ${possibleOverlays.length}`);

  possibleOverlays.forEach(el => {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    // Si es fixed/absolute, tiene alto z-index y cubre la pantalla
    if ((style.position === 'fixed' || style.position === 'absolute') &&
        parseInt(style.zIndex) > 0 &&
        rect.width > window.innerWidth * 0.8) {
      console.log('  ⚠️ POSIBLE BLOQUEADOR:', {
        tag: el.tagName,
        classes: el.className,
        position: style.position,
        zIndex: style.zIndex,
        opacity: style.opacity,
        visibility: style.visibility,
        display: style.display,
        pointerEvents: style.pointerEvents,
        dimensions: `${rect.width}x${rect.height}`,
        element: el
      });
    }
  });

  // 4. Inspeccionar document y html
  console.log('\n4. DOCUMENT/HTML:');
  const html = document.documentElement;
  console.log('  - html pointer-events:', window.getComputedStyle(html).pointerEvents);
  console.log('  - html overflow:', window.getComputedStyle(html).overflow);
  console.log('  - html user-select:', window.getComputedStyle(html).userSelect);

  // 5. Buscar elementos con pointer-events: none
  console.log('\n5. ELEMENTOS CON pointer-events: none:');
  const noPointerElements = Array.from(allElements).filter(el => {
    const style = window.getComputedStyle(el);
    return style.pointerEvents === 'none' && el.getBoundingClientRect().width > 100;
  });
  console.log(`  - Total: ${noPointerElements.length}`);
  noPointerElements.slice(0, 5).forEach(el => {
    console.log('    -', {
      tag: el.tagName,
      classes: el.className,
      element: el
    });
  });

  // 6. Test de click en el centro de la pantalla
  console.log('\n6. TEST DE ELEMENTO EN CENTRO DE PANTALLA:');
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const elementAtCenter = document.elementFromPoint(centerX, centerY);
  if (elementAtCenter) {
    const style = window.getComputedStyle(elementAtCenter);
    console.log('  - Elemento en el centro:', {
      tag: elementAtCenter.tagName,
      classes: elementAtCenter.className,
      zIndex: style.zIndex,
      pointerEvents: style.pointerEvents,
      opacity: style.opacity,
      element: elementAtCenter
    });
  }

  console.log('\n========== FIN DEBUGGING ==========\n');
}

/**
 * Limpieza nuclear - elimina CUALQUIER cosa que pueda estar bloqueando
 */
export function nuclearCleanup(): void {
  console.log('[Nuclear Cleanup] Iniciando limpieza nuclear...');

  try {
    // 1. Limpiar TODOS los atributos del body
    const bodyAttributes = document.body.attributes;
    const attrsToRemove: string[] = [];
    for (let i = 0; i < bodyAttributes.length; i++) {
      const attr = bodyAttributes[i];
      if (attr.name.startsWith('data-') ||
          attr.name === 'inert' ||
          attr.name === 'aria-hidden' ||
          attr.name.includes('radix')) {
        attrsToRemove.push(attr.name);
      }
    }
    attrsToRemove.forEach(attr => document.body.removeAttribute(attr));

    // 2. Resetear TODOS los estilos del body
    document.body.style.cssText = '';
    document.body.removeAttribute('style');

    // 3. Resetear estilos del html
    document.documentElement.style.cssText = '';
    document.documentElement.removeAttribute('style');

    // 4. Verificar si hay modales abiertos
    const openDialogs = document.querySelectorAll('[role="dialog"][data-state="open"]');
    console.log('[Nuclear Cleanup] Modales abiertos:', openDialogs.length);

    if (openDialogs.length === 0) {
      // Si NO hay modales abiertos, eliminar CUALQUIER DialogContent/DialogOverlay

      // Eliminar DialogContent huérfanos de forma segura
      const dialogContents = document.querySelectorAll('[role="dialog"], [data-radix-dialog-content]');
      console.log('[Nuclear Cleanup] DialogContent encontrados:', dialogContents.length);
      dialogContents.forEach(content => {
        if (content.parentNode) {
          try {
            console.log('[Nuclear Cleanup] Eliminando DialogContent huérfano');
            content.remove();
          } catch (e) {
            // Ignorar si ya fue eliminado
          }
        }
      });

      // Eliminar overlays con las clases típicas de forma segura
      const fixedOverlays = document.querySelectorAll('.fixed.z-50, .fixed.inset-0');
      console.log('[Nuclear Cleanup] Fixed overlays encontrados:', fixedOverlays.length);
      fixedOverlays.forEach(overlay => {
        if (overlay.parentNode) {
          try {
            const rect = overlay.getBoundingClientRect();
            // Si es grande (cubre pantalla), probablemente es un overlay o DialogContent
            if (rect.width > window.innerWidth * 0.3 || rect.height > window.innerHeight * 0.3) {
              console.log('[Nuclear Cleanup] Eliminando elemento fixed:', overlay.className || overlay.tagName);
              overlay.remove();
            }
          } catch (e) {
            // Ignorar si ya fue eliminado o hay error de getBoundingClientRect
          }
        }
      });
    }

    // 4b. Limpiar elementos con z-index alto que cubran la pantalla de forma segura
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      if (el.parentNode) {
        try {
          const style = window.getComputedStyle(el);
          const zIndex = parseInt(style.zIndex);

          if (zIndex >= 50 && (style.position === 'fixed' || style.position === 'absolute')) {
            const rect = el.getBoundingClientRect();
            // Si cubre más del 50% de la pantalla y NO hay modales abiertos
            if (openDialogs.length === 0 && rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5) {
              console.log('[Nuclear Cleanup] Eliminando elemento con z-index alto:', zIndex, el.className || el.tagName);
              el.remove();
            }
          }
        } catch (e) {
          // Ignorar si hay error al obtener estilos o eliminar
        }
      }
    });

    // 5. Forzar re-enable de eventos AGRESIVAMENTE
    document.body.style.pointerEvents = 'auto !important';
    document.body.style.setProperty('pointer-events', 'auto', 'important');
    document.documentElement.style.pointerEvents = 'auto';

    // 6. Usar setInterval para FORZAR pointer-events durante 2 segundos
    let attempts = 0;
    const maxAttempts = 20; // 20 intentos = 2 segundos
    const intervalId = setInterval(() => {
      attempts++;

      if (document.body.style.pointerEvents === 'none' ||
          window.getComputedStyle(document.body).pointerEvents === 'none') {
        console.warn('[Nuclear Cleanup] ⚠️ Body tiene pointer-events: none, forzando auto...');
        document.body.style.pointerEvents = 'auto';
        document.body.style.setProperty('pointer-events', 'auto', 'important');
      }

      if (attempts >= maxAttempts) {
        clearInterval(intervalId);
        console.log('[Nuclear Cleanup] Monitor de pointer-events finalizado');
      }
    }, 100);

    console.log('[Nuclear Cleanup] Completada - monitoreando pointer-events por 2 segundos');
  } catch (error) {
    console.error('[Nuclear Cleanup] Error:', error);
  }
}
