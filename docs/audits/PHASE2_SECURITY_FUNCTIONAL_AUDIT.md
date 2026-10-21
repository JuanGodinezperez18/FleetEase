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
| AUD2-001a | `jspdf` resuelve a **3.0.4** (declarado `^3.0.3`) y el audit lo sitúa en el rango vulnerable `<=4.2.0`; advisories críticos incluyen path traversal/LFI e inyección en PDF. Se usa en `src/hooks/use-export-data.ts` mediante import dinámico; `src/lib/reports/pdf-generator.ts` lo importa sólo como tipo. El arreglo sugerido es `4.2.1`, que cruza la versión mayor. | Crítica | Preparar actualización aislada de jsPDF y revisar compatibilidad con `jspdf-autotable@5`; no cambiar sin generar lockfile y probar exportación. | Pruebas de reportes/exportación y build | Pendiente |
| AUD2-001b | `seroval` resuelve a **1.5.6**, transitivo de `solid-js@1.9.15`, que entra por `@tanstack/react-query-devtools`; el paquete de Devtools está declarado en `dependencies`, pero la búsqueda del código no encontró importaciones de `ReactQueryDevtools` ni del paquete. El audit marca vulnerables las versiones `<=1.6.2`. | Crítica | Confirmar que Devtools no se usa en runtime; candidato a retirar la dependencia no usada. Si se conserva, actualizar `seroval` mediante una resolución compatible y lockfile reproducible. | Audit + build; verificar ausencia de uso de Devtools | Pendiente |
| AUD2-001c | Next resuelve a **16.3.6** y está fijado explícitamente en `package.json`; el rango del audit `16.0.0–16.3.7` lo incluye. El arreglo sugerido es `16.4.2`. | Alta | Actualizar Next y `eslint-config-next` en un bloque dedicado; revisar `src/proxy.ts`, rutas API, compilación y despliegue antes de integrar. | Regresión, E2E smoke y build | Pendiente |
| AUD2-001d | `sharp` resuelve a **0.34.5**; Next 16.3.6 declara dependencia opcional `sharp@^0.35.4`, mientras el proyecto también declara `sharp@^0.34.5`. El audit informa advisories de dependencias nativas libvips/libheif/librsvg. | Alta | Revisar actualización explícita de sharp y consistencia con Next; confirmar compatibilidad de binarios en CI/Vercel. | Build + pruebas de optimización de imágenes | Pendiente |
| AUD2-001e | `braces`/Tailwind y `postcss-selector-parser` aparecen en el reporte; el arreglo sugerido por npm implica Tailwind 4, cambio mayor de configuración. | Alta/moderada | No migrar Tailwind automáticamente; revisar actualización transitiva compatible y separar migración mayor si no hay fix seguro. | Build + revisión visual de pantallas clave | Pendiente |
| AUD2-001f | `uuid` resuelve a **9.0.1** y tiene usos reales en `src/app/api/upload/route.ts` y `src/app/dashboard/finanzas/income/components/MassIncomeForm.tsx`. El audit marca `uuid <11.1.1`; no es una dependencia sin uso. | Moderada | Probar una actualización a la primera versión corregida compatible con los imports actuales; evitar salto directo a 14 sin verificar ESM/API. | Tests de generación de IDs, subida y captura de ingresos + build | Pendiente |
| AUD2-002 | La prueba E2E actual sólo verifica página pública y redirección anónima. Las pruebas de proxy cubren varias denegaciones, pero falta cobertura de rutas autenticadas, roles y aislamiento multi-tenant de los endpoints de datos. | Alta | Ampliar pruebas de autorización por endpoint y rol; revisar cada handler que usa service-role. | Pruebas por endpoint/rol | En curso |
| AUD2-003 | Aikido Security figuró como omitido en la ejecución anterior; no se puede considerar aprobado con ese estado. | Pendiente de triage | Inspeccionar configuración y ejecución; registrar evidencia o causa de omisión. | Confirmar check ejecutado y resultado | Pendiente |
| AUD2-004 | `notifications/send` aceptaba un `userId` arbitrario y sólo validaba `companyId` si el cliente lo enviaba; podía escribir una notificación a un usuario de otra empresa usando service-role. `notifications/broadcast` también aceptaba IDs de `selectedUsers` sin comprobar que todos pertenecieran a `companyId`. | Alta (aislamiento multi-tenant) | Añadida validación de empresa/estado del destinatario en `send`, y comprobación de todos los IDs contra usuarios activos de la empresa en `broadcast`. Añadida función pura de alcance con pruebas unitarias. | Quality gate, E2E smoke, MCP read-only y Lighthouse completados correctamente para el commit `036d368a90be77d4472b718970d42b19380b655c`; el build/type-check/tests están cubiertos por quality gate. Falta prueba HTTP de integración con identidades de dos empresas. | Corregido en rama; CI verde, prueba de integración pendiente |

| AUD2-005 | `src/app/api/delete-file/route.ts` limpia referencias de `vehicles` y `clients` con filtro `company_id`, pero después ejecuta `documents.delete().eq('file_url', fileUrl)` sin filtro de empresa. Usa service-role. | Media (integridad entre empresas) | Confirmar el esquema real de `documents` y sus referencias antes de modificar; si existe `company_id`, restringir el borrado a la empresa del usuario. No tocar la BD. | Prueba que el borrado de un archivo de una empresa no altere referencias de otra | Hallazgo de revisión estática; requiere confirmar esquema y reproducir |

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
