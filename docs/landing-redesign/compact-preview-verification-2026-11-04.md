# Verificación de la landing compacta del PR #137

Versión visual revisada: `c98d72e986e8d597ade9caf5f8cb492d07de1d91`.
Deployment Preview: `dpl_3vintNE1im371HX6Ex7mFGPMSs68`, estado READY.
URL: https://fleetease-i5k4d6coc-godinezjosejuan1-4393s-projects.vercel.app/

El preview conserva protección de Vercel; requiere acceso de Vercel o el enlace temporal compartido en la conversación. No se publican tokens de acceso en el repositorio.

## Resultado medido

| Medición de escritorio (1363 × 936) | Anterior | Final |
| --- | ---: | ---: |
| Altura del documento | 7178 px | 3393 px |
| Inicio de precios desde el documento | 5150 px | 1594 px |
| Reducción de altura | | 52.73% |

Las mediciones corresponden a preguntas cerradas y una pestaña activa. No implican una mejora de conversión medida.

## Recorrido comprobado

- Principal: hero con captura real de QA, imagen cargada y enlace para ampliar. Pestañas Operación/Finanzas/Mantenimiento cambian el título, contenido y captura. Clic en Finanzas y flecha derecha a Mantenimiento comprobados.
- FAQ: abrir “¿Puedo empezar sin pagar?” muestra la respuesta. Cuatro preguntas comparten datos con JSON-LD.
- Funciones: acceso sin sesión de la aplicación, descripción y capturas completas disponibles. Navegación principal a Precios llega a `/#pricing`, con inicio de sección en Y=80 tras montar el contenido.
- Soluciones: contenido por audiencia (primer vehículo, renta para conductores, flotillas/socios) y enlace al servicio local.
- Administración: acceso público al contenido y al formulario `/contacto-ventas?tipo=administracion`; el interés “Administración de vehículos de renta” aparece seleccionado. No se envió una solicitud comercial.
- Menú: a ancho intermedio se abre con Enter, el enlace Precios navega y lo cierra. A ancho estrecho Escape lo cierra y devuelve foco a “Abrir menú”.
- Las pruebas verifican rutas exactas de marketing y mantienen autenticación en rutas privadas y rutas con nombres similares. Las fórmulas, precios y procesos de negocio quedan sin cambios.

## Reflujo y estilos

Se observaron 1363, 779 y 340 píxeles CSS de ancho. Los dos últimos se obtuvieron con zoom del navegador, no mediante emulación de dispositivos físicos. No hubo desbordamiento horizontal. El viewport estrecho tiene menor altura que un teléfono; esta prueba comprueba reflujo y controles, no certifica comportamiento en iOS/Android.

A 779 px el encabezado usa menú compacto y precios muestra tres columnas de unos 230 px; no queda un plan aislado en segunda fila. A 340 px las pestañas miden 44 px de alto y el contenido de Finanzas se selecciona por teclado.

Colores calculados: pestaña inactiva rgba(255,255,255,0.68) sobre superficie oscura; activa rgb(8,10,15) sobre rgb(215,255,63). Se corrigen las dos reglas de estilos que confundían clases condicionales con clases activas.

## Comprobaciones y alcance

- PASS funcional: navegación, pestañas, FAQ, menú y selección del asunto de ventas comprobados como se detalla arriba.
- PASS integridad: rutas privadas conservadas y planes/cálculos sin cambios; 72 pruebas dirigidas correctas.
- PASS presentación: identidad negra/lima preservada, capturas reales de QA y reflujo sin overflow en los anchos observados.
- PASS movimiento por inspección de código: se elimina el revelado del showcase completo, la transición de pestañas usa preferencias de movimiento y menú/CTA aplican useReducedMotion. No se simuló la preferencia del sistema en esta sesión.
- PASS compilación: build de producción y TypeScript sin errores. No se afirma haber ejecutado un lint que no se ejecutó.
- Consola de la última página: sin errores de aplicación observados; el entorno produjo mensajes de su extensión del navegador, separados de la aplicación.
- GitHub Actions de c98d72e: quality gate, E2E smoke, MCP read-only y Lighthouse CI completados con success.

Suite completa local: 345 pruebas correctas y 5 fallos existentes: límite inclusivo de `financial-metrics` y cuatro casos de `auth-persistence` (sesión persistente, sesión por pestaña, limpieza de ámbito inactivo y cierre de sesión). Su reproducción en baseline ya consta en el estado de capturas. No se presentan como corregidos por este trabajo.

Revisión independiente de código completada; la colisión CSS se corrigió y tuvo prueba fallida/correcta. Nota menor conservada: sizes describe el contenedor, aunque el recorte visual amplía la imagen un 23%; se mantienen variantes de hasta 1440 px y acceso a la captura completa. No se añadieron dependencias ni imágenes generadas.

Pendientes fuera de esta validación: dispositivos físicos, medición real de conversiones y revisión visual del dashboard autenticado con arrastre/recarga. No se fusionó el PR ni se desplegó producción.
