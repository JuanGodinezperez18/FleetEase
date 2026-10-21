# Auditoría Fase 2 — seguimiento de hallazgos

## Objetivo
Concentrar los hallazgos reproducibles y las correcciones de seguridad/funcionalidad en una rama y PR independientes. Cada cambio debe validarse antes de fusionarse a `master` y desplegarse a producción.

## Reglas de trabajo
- No modificar producción directamente ni alterar/limpiar la base de datos de pruebas.
- Corregir por bloques pequeños; documentar evidencia, causa, solución y prueba.
- No ejecutar `npm audit fix --force` ni migraciones mayores de framework/estilos sin revisar compatibilidad.
- No marcar como aprobada una verificación omitida. El paso actual de `npm audit` tiene `continue-on-error: true`, por lo que el workflow verde no significa que no existan vulnerabilidades.
- Fusionar cada bloque validado para no volver a trabajar soluciones ya integradas.

## Hallazgos confirmados

| ID | Hallazgo y evidencia | Severidad | Corrección/plan | Prueba | Estado |
|---|---|---|---|---|---|
| AUD2-001 | El log de `npm audit --omit=dev --audit-level=high` del 20-oct-2026 reporta **13 vulnerabilidades de producción: 3 moderadas, 7 altas y 3 críticas**. El step terminó con exit code 1, pero el workflow continúa por `continue-on-error: true`. | Bloqueante para cerrar auditoría | Revisar cada advisory y rango afectado; separar actualizaciones compatibles de cambios mayores. No aplicar `--force`. | Repetir audit tras cada cambio y verificar build/tests | Confirmado; sin corregir |
| AUD2-001a | `jspdf` está en rango vulnerable `<=4.2.0`; advisories críticos incluyen path traversal/LFI e inyección en PDF. La salida propone `jspdf@4.2.1`, que puede requerir migración mayor respecto a la versión instalada `^3.0.3`. | Crítica | Confirmar versión resuelta y uso real; migrar controladamente a una versión corregida compatible y revisar generadores de PDF. | Pruebas de reportes/exportación y build | Pendiente |
| AUD2-001b | `seroval <=1.6.2` aparece como crítico transitivo de `solid-js`; `npm audit` indica que `npm audit fix` puede resolverlo sin `--force`. | Crítica | Inspeccionar árbol de dependencia y aplicar actualización lockfile-only compatible si procede. | Audit + pruebas + build | Pendiente |
| AUD2-001c | `next 16.0.0–16.3.7` aparece afectado por advisories de caché/SSRF/información; el proyecto declara Next `16.3.6`. La salida propone `16.4.2` fuera del rango declarado. | Alta | Evaluar actualización explícita de Next y compatibilidad de proxy, rutas, build y deploy. | Regresión, E2E smoke y build | Pendiente |
| AUD2-001d | `sharp` y dependencias nativas presentan advisories de libvips/libheif/librsvg; el audit sugiere una versión fuera del rango instalado. | Alta | Revisar versión corregida, soporte de plataforma y pipeline de imágenes antes de cambiar. | Build + pruebas de carga/optimización de imágenes | Pendiente |
| AUD2-001e | `braces`/Tailwind y `postcss-selector-parser` aparecen en el reporte; el arreglo sugerido por npm implica Tailwind 4, cambio mayor de configuración. | Alta/moderada | No migrar Tailwind automáticamente; revisar actualización transitiva compatible y separar migración mayor si no hay fix seguro. | Build + revisión visual de pantallas clave | Pendiente |
| AUD2-001f | `uuid <11.1.1` aparece afectado; el fix sugerido por audit cruza a uuid 14, un cambio mayor. | Moderada | Identificar imports y compatibilidad ESM/API; actualizar sólo con pruebas de regresión. | Tests de usos de UUID + build | Pendiente |
| AUD2-002 | La prueba E2E actual sólo verifica página pública y redirección anónima. Las pruebas de proxy cubren varias denegaciones, pero falta cobertura de rutas autenticadas, roles y aislamiento multi-tenant de los endpoints de datos. | Alta | Ampliar pruebas de autorización por endpoint y rol; revisar cada handler que usa service-role. | Pruebas por endpoint/rol | En curso |
| AUD2-003 | Aikido Security figuró como omitido en la ejecución anterior; no se puede considerar aprobado con ese estado. | Pendiente de triage | Inspeccionar configuración y ejecución; registrar evidencia o causa de omisión. | Confirmar check ejecutado y resultado | Pendiente |
| AUD2-004 | `notifications/send` aceptaba un `userId` arbitrario y sólo validaba `companyId` si el cliente lo enviaba; podía escribir una notificación a un usuario de otra empresa usando service-role. `notifications/broadcast` también aceptaba IDs de `selectedUsers` sin comprobar que todos pertenecieran a `companyId`. | Alta (aislamiento multi-tenant) | Añadida validación de empresa/estado del destinatario en `send`, y comprobación de todos los IDs contra usuarios activos de la empresa en `broadcast`. Añadida función pura de alcance con pruebas unitarias. | Jest unitario + type-check + build; verificar 403 para destinatarios de otra empresa | Corregido en rama; validación CI pendiente |

## Contexto del quality gate
El workflow `.github/workflows/quality-gate.yml` ejecuta `npm audit --omit=dev --audit-level=high` con `continue-on-error: true`. Por diseño, el workflow puede terminar exitoso aunque la auditoría de dependencias falle. Debe cambiarse esa política cuando el backlog esté triageado y exista una estrategia para evitar falsos bloqueos, no ocultar el resultado.

## Alcance inicial
- [ ] Triar y corregir las vulnerabilidades de producción, empezando por las críticas.
- [ ] Ampliar pruebas de acceso a rutas protegidas y aislamiento entre empresas sin usar datos reales.
- [ ] Revisar autenticación/autorización en los endpoints; el proxy no debe ser la única barrera.
- [ ] Investigar la omisión de Aikido.
- [ ] Añadir prueba de regresión por cada defecto confirmado.

## Criterio de salida
No cerrar la fase hasta que cada cambio tenga evidencia de prueba, los workflows requeridos estén realmente ejecutados y en verde, y no queden riesgos altos/críticos sin resolver o con excepción documentada. Los cambios de infraestructura o de plan de Supabase se registrarán aparte; no se aplicarán sin autorización.
