# Auditoría Fase 2 — seguimiento de hallazgos

## 11-nov — seguimiento de reintentos de crédito

C3/C4 y N3 siguen parciales. El formulario de Pagos reutiliza la clave de solicitud mientras está abierto, y la nueva RPC protege el reintento con una restricción única por empresa y solicitud. El servicio financiero existente sigue siendo la fuente de verdad de los saldos y cuotas. La migración `20261107235137` está preparada. La validación en preview depende de su disponibilidad en la base conectada. [Evidencia](./FUNCTIONAL_TESTS_2026-11-06.md) y [alcance de N3](./REAUDIT_2026-11-05.md).

## 7-nov — pruebas por interfaz del PR #145 en preview

Frontend probado: `39bca19e44b6dc75e188cee3788ea95d51efc7ca`, despliegue `dpl_7nvjs95TxtPB6NUBDzPkiv25rjLG` READY. Se restableció Vercel mediante GitHub y se inició sesión segura de FleetEase como **QA Administrador**. El bloqueo de acceso al preview descrito en actualizaciones anteriores queda superado.

| Comprobación | Evidencia observada |
| --- | --- |
| Fecha inicial y límite | Formulario Agregar crédito: value y max `2026-11-07`, día de Monterrey durante la prueba. |
| Vista previa de cuotas | Dos pagos de $5 muestran total $10 y fechas 7/14-nov, empezando en la fecha seleccionada, sin desplazamiento al lunes. No se creó crédito. |
| Límite nativo de fecha | Introducir 8-nov en el campo con max 7-nov produce `validity.rangeOverflow=true`. Esta observación demuestra la restricción del campo, no una escritura rechazada por RPC ni un mensaje nuevo de esquema. |
| Fechas civiles del detalle | Crédito QA Cliente 12 `6440dff1-436c-4abd-b9f5-3e6e63f068cb`: inicio 12/09/2026; cuotas 1/2/9 vencen 12/09, 19/09 y 07/11; sus fechas pagadas 13/09, 13/09 y 18/09. Consulta SELECT con filtros de empresa/id confirmó exactamente estos DATE de BD. No se alteró el crédito. |
| VIN y placa inválidos | En alta: `CORTO` y VIN de 17 terminado en I muestran error VIN; placa `ABC/123` muestra error de formato. |
| Placa duplicada | `qademo002` muestra «Esta placa ya está registrada», comparando contra QADEMO002. |
| Formatos admitidos | Placa ` abc-123-a ` y VIN ` 1hgcm82633a00435s ` quedan sin error, ambos aria-invalid=false. Se confirma aceptación visible, no normalización persistida. |
| Compatibilidad histórica | En edición de QADEMO002, VIN original `QA000000000000002`: sustituir temporalmente por CORTO muestra error; restaurar el original quita el error. Se canceló sin guardar. |
| Recarga | La sesión QA continúa autenticada y Vehículos conserva «21 en esta vista». |

**Alcance y límites:** todos los formularios se cancelaron. No se pulsó Guardar vehículo/Crear crédito, no se enviaron altas ni ediciones, no se subieron archivos, no se ejecutó SQL de escritura y no hubo transferencias. Esta prueba cubre las validaciones y presentaciones cambiadas en PR #145; no sustituye un ciclo persistente de alta/edición ni pruebas de otros roles, concurrencia o cambio de día real. No se exportan capturas financieras.

**Regresión del código probado:** 14 suites/55 pruebas locales aprobadas (25 nuevas), TypeScript/build aprobados. Cuatro workflows del HEAD: quality #1008, E2E #278, MCP #453, Lighthouse #2299, todos aprobados, incluidos permisos/atomicidad y liquidación/historial en PostgreSQL 17. PR #145 sin fusionar y sin conflictos al verificar. Inventario CI: producción sin vulnerabilidades; tooling 26 avisos, 23 moderados/3 bajos, ninguno alto/crítico.

**Conclusión del alcance:** no se encontraron bloqueadores nuevos en los comportamientos probados del PR #145. C2/M4 avanzan con evidencia UI; el cierre global de la reauditoría conserva pendientes de reportes/exports, reversión tras liquidación, multas/proveedor, concurrencia, roles, Storage/enlaces, sesiones completas/Redis, atomicidad de administración y drift. No marcar C1–C5 cerrados por este bloque.


## 7-nov — continuación posterior a la fusión del PR #144

PR #144 fusionado en `81f7fdf16a4f6d537d744fd9a6a37e62f40960d6`. Este bloque corrige dos defectos observados en sus pruebas de interfaz y conecta validaciones pendientes del formulario real de vehículos. No modifica producción ni requiere migraciones.

- **C2, fechas de crédito:** el alta propone/limita el día de Monterrey; el esquema rechaza fechas imposibles y futuras. Editar conserva una fecha DATE sin convertirla a UTC. El detalle conserva el día civil en inicio, vencimiento, fecha pagada e historial. La RPC de pago usa el día de Monterrey cuando el consumidor omite fecha.
- **Calendario de crédito:** la vista previa ahora refleja el contrato persistente de `create_credit_atomic`: primera cuota en startDate, siguientes cada siete días. Se elimina el desplazamiento local al lunes. No se cambia el calendario guardado, importes ni fórmulas de BD.
- **M4, captura de vehículos:** el esquema real utiliza VIN de 17 caracteres sin I/O/Q, conservando S y normalizando mayúsculas/espacios. La placa acepta 3–10 letras/números, con guiones entre grupos; validación sintáctica, sin afirmar verificación registral. Duplicados canónicos se comparan dentro de los vehículos activos del tenant. Identificadores históricos sin modificar conservan la validación previa de duplicados exactos; los cambios deben cumplir las reglas nuevas. No se reescriben filas históricas.
- **Pruebas:** cinco suites nuevas, 25 pruebas aprobadas en America/Mexico_City. El caso original de fecha de edición/previsualización/futuro falló antes de la corrección y pasa después. Hay pruebas del payload enviado, cuatro fechas del detalle, fecha por defecto de RPC, esquema real de vehículo, formatos, duplicados y conservación de datos históricos. TypeScript aprobado. CI incluye estas suites. La comprobación de interfaz en un nuevo preview queda pendiente; no se presenta Jest como prueba en producción.

**Criterios pendientes para cierre global:**

| Grupo | Evidencia todavía necesaria |
| --- | --- |
| C1, reportes | Conciliar casos representativos entre detalle, resumen, PDF/Excel y entidades borradas/sin entidad; conservar el motor existente. |
| C2, fechas | Probar formularios/API y cambio de día en vivo, incluido este nuevo frontend. |
| C3/C4, ciclos | Reversión de crédito liquidado, multas/proveedor en vivo, concurrencia y otros roles. |
| C5/M1, BD | Reconciliar drift global contra migraciones; no volver a ejecutar las ya aplicadas de PR143/144. |
| A1/A2/N5 | Evidencia de Redis y límites efectivos en ejecución, no sólo variables configuradas. |
| M2 | Categorías semánticas al crear una empresa nueva. |
| M3/M6/N2 | Subida binaria, lectura por segunda empresa y enlaces de un uso/vencimiento/regeneración. |
| M5/M7/B5 | Flujos por rol, expiración/refresh, logout entre pestañas y reapertura de navegador. |
| B4 | Inventario actualizado de dependencias y excepciones justificadas. |
| N3/N9 | Atomicidad/reintentos del gasto de administración y confianza de IP limitada al despliegue admitido. |

**Diseño de reversión pendiente, sin ejecutar:** no basta con volver a poner rented al vehículo sold. Antes de habilitar la reversión deben existir evidencia de la asignación/propiedad previa, bloqueo de crédito/vehículo/cliente, comprobación de que no hubo reasignación u otra entrega, y creación de un intervalo nuevo sin reabrir historia cerrada. Si falta evidencia o hay conflicto, rechazar sin efectos. Probar rollback integral, dos sesiones concurrentes, tenant/rol y ciclos repetidos. Los créditos históricos sin evidencia recuperable requieren revisión individual; no crear un backfill supuesto. C3/C4 siguen parciales y no se declara terminada la auditoría.


## 7-nov — pruebas por interfaz para revisión de fusión del PR #144

**Resultado para este PR: listo para revisión de fusión, sin cerrar C3/C4 globales.** HEAD de código `ade5ec83`, sin conflictos con master; quality #1005, E2E #276, MCP #451 y Lighthouse #2296 aprobados. Preview exacto READY `dpl_23T72QfEnPizWHbgE7opQqiwJa1d`. La prueba interactiva se realizó en www.fleetease.com.mx con sesión QA Administrador y la migración aplicada, usando dos clientes/vehículos nuevos desechables. El frontend de este PR no cambia respecto de producción; su corrección está en las cinco funciones SQL ya aplicadas. No se presenta esta prueba como navegación del hostname del preview.

- Alta por UI de crédito de $10 (2 cuotas de $5) para QA144 Liquidacion: aprobada. Abono $4 desde Pagos, edición a $5 desde historial y segundo pago $5: aprobados. BD confirmó crédito completed, pagado $10, saldo cero, 2 cuotas pagadas, vehículo sold/libre y cero asignaciones abiertas. La tabla de créditos mostró completed/$0 tras volver al módulo y el selector de pagos dejó de ofrecer ese crédito.
- Alta por UI de otro crédito de $10 para QA144 Cancelacion, abono $4 y cancelación desde su menú con motivo: aprobados. Modal confirmó cliente y vehículo liberados. BD confirmó cancelled, nota de crédito $6, motivo conservado en nota e historial, vehículo active/sin cliente/sin bloqueo. Recarga mostró ambos estados persistidos.
- Los recursos iniciales se prepararon por SQL como authenticated QA; alta de créditos, pagos, edición y cancelación se hicieron desde UI. No hubo transferencia de dinero.

**Limpieza de fixtures:** clientes `903d1065-59f2-4945-8ff7-16f8c295ae7e` y `e015c82b-bc21-47b9-bd85-4f0e422adb4c`; vehículos `5fef06fa-b7b2-48d4-9443-914ddf2f4e77` y `e765d561-02e4-40ac-92d6-3eef1ba98957`; créditos `760e16db-edfe-4634-b70d-700c802a2031` y `3215b28b-2e56-4585-80af-08d857a8c41b`. Se archivó mediante SQL privilegiado, en una sola transacción y con filtros de empresa/ids, exclusivamente el grafo sintético: clientes, vehículos, créditos, seis registros financieros, cuotas, asignaciones de pagos y kilometrajes nuevos. Sin borrado físico; se conservan historial cerrado y auditoría. Esto es limpieza de fixtures, **no prueba de reversión funcional de crédito completado**. Verificación BD: cero registros financieros activos de esos clientes. Recarga UI volvió a los cuatro créditos originales y cero créditos activos.

**Pendientes fuera del cierre de este PR:** reversión después de liquidación continúa bloqueada con rollback y ya está acotada en el fixture. Se observó en el detalle de crédito que el DATE civil 7-nov se presenta como 6-nov y que la vista previa anuncia primer pago 9-nov mientras las cuotas de BD empiezan el 7-nov; son comportamientos preexistentes en frontend/contrato de alta, no modificados por este SQL. Registrar su seguimiento sin afirmar C2 resuelto. Multas/proveedor, concurrencia y otras sesiones de roles conservan sus pendientes.


## 7-nov — migración PR #144 aplicada y verificada en BD real

Juan autorizó la aplicación. Supabase registró `respect_credit_assignment_lifecycle` como versión `20261107130143` (fuente `20261107053703_respect_credit_assignment_lifecycle.sql`). Preflight: cinco funciones coincidían con el snapshot revisado y las seis tablas conservaban RLS. Los cuatro workflows de `c8bc9e0f` aprobaron: quality #1004, E2E #275, MCP #450 y Lighthouse #2295. PR #144 permanece abierto, sin fusionar.

Prueba posterior como authenticated QA Administrador en Supabase real: crear crédito temporal $10, abono $4, editar a $5 y liquidar con otros $5 aprobados. Crédito completed/saldo cero, vehículo sold y sin bloqueo, historial cerrado. Se comprobó además que intentar borrar el último pago sigue rechazado por historia cerrada y revierte la eliminación. Otro crédito temporal con abono $4 se canceló por la RPC: nota $6, motivo conservado, vehículo active/liberado. Resultado `PASS_COMPLETION_AND_PARTIAL_CANCELLATION_ROLLED_BACK`.

Cada escenario se revirtió completo mediante subtransacción y rollback final. Verificación independiente posterior: cero créditos activos QA, cero movimientos QA144, vehículo original rented con su cliente, sin bloqueo ni crédito asociado y una asignación abierta, igual al estado previo. No hubo operaciones de dinero ni cambios financieros persistentes. Esta evidencia es BD/RPC real, **no prueba UI de liquidación**.

Permisos posteriores: anon no ejecuta la RPC de pago y authenticated no ejecuta el recalculador interno. Advisors antes/después conserva los mismos 16 avisos SECURITY DEFINER, protección de contraseña filtrada deshabilitada y el INFO intencional de tabla privada con RLS sin políticas. Sin nuevos avisos. Referencias: [SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [RLS privado](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

C3/C4 siguen parciales. La migración ya no está pendiente; faltan UI con recursos QA desechables, reversión de crédito completado, multas/proveedor en vivo, concurrencia y sesiones de otros roles. La preparación sin aplicar descrita debajo es historial anterior a esta autorización/aplicación.


## Continuación posterior a PR #143 — liquidación y cancelación de crédito

PR #143 integrado como `07db9eac19e9f603aeb8300f5f6b0c56e11c3799`. Producción READY `dpl_CLCkmfWm4Sw6BFJVZcXLZLNQFdMj`. Los cuatro workflows del HEAD `3f881753` aprobaron, incluido Lighthouse #2292. La migración de pagos anterior sigue aplicada (`20261106224056`).

**Hallazgo real nuevo, C3/C4:** en Supabase, como authenticated QA Administrador y dentro de una transacción revertida, se creó un crédito temporal de $10, se abonaron $4 y se editaron a $5. El último pago de $5 falló con `23514 CLIENT_ASSIGNMENT_MUST_BE_ENDED_IN_HISTORY` en `finalize_completed_credit_vehicle`: el trigger limpiaba el cliente antes de cerrar `vehicle_assignment_logs`. Toda la transacción se revirtió; no se conservaron crédito, pagos ni cambios al vehículo QA. La UI del preview anterior se inspeccionó con admin QA, sin enviar el formulario de alta; no equivale a una prueba UI de liquidación.

**Corrección preparada, NO aplicada:** `20261107053703_respect_credit_assignment_lifecycle.sql`, creada con CLI. El cierre histórico precede a la liberación de cliente/vehículo en los triggers de liquidación y cancelación/desactivación. La RPC de cancelación cierra primero con su motivo y empresa para conservar el motivo solicitado. Se retiran dos escrituras redundantes de vehículo en ramas de crédito completado de pago/recálculo: sobrescribían `sold` con `active`. El trigger de finalización conserva la autoridad de la entrega por crédito liquidado. Sin cambios a importes, fórmulas protegidas, RLS, permisos externos ni backfill. SECURITY DEFINER mantiene search_path vacío y funciones internas sin EXECUTE para clientes.

**Validación aislada:** `supabase/tests/credit_assignment_lifecycle.sql` reproduce RED con funciones del catálogo vivo y guardas reales de historial, y pasa con el nuevo SQL en PGlite 0.5.15. Cubre abono parcial, edición, eliminación del parcial, liquidación, edición que liquida, conservación de `sold`, cierre de historial y liberación de recursos. Fallo deliberado de auditoría después de liquidar restaura crédito/pago/cuotas/historial/vehículo. Cancelación por RPC tras pago $4 conserva nota de $6 y motivo; rechaza empresa ajena. Desactivación cierra historia. Revisión independiente sin bloqueadores tras corregir pérdida del motivo. CI PostgreSQL 17 real y aislado aprobado para `bf9ebde7`: job `128317637545`, quality gate #1003 / run `42343990946`. También aprobaron quality completo, E2E #274 y MCP #449; Lighthouse #2294 seguía en curso al registrar esta evidencia. [PR #144](https://github.com/JuanGodinezperez18/FleetEase/pull/144). Esta actualización sólo cambia documentación.

**Límite explícito:** borrar/reducir un pago de crédito ya completado sigue bloqueado por historial cerrado. El fixture verifica rechazo y rollback, no lo presenta como reversión aprobada. Reabrir una entrega de propiedad requiere tratamiento específico; no se fabrica ni reabre historia en esta corrección. Multas, proveedor en vivo, concurrencia y otras sesiones de roles siguen pendientes. Advisors fue consultado antes del diagnóstico; no hubo DDL ni nuevas migraciones en producción en este bloque.

Fuente de verdad: `financial_records` y `financial_payment_credit_allocations`, RPC y agregados existentes. Escritores: pago/edición/borrado/cancelación y triggers de crédito/asignación. Consumidores: cuotas/saldos, cliente, vehículo e historial de asignaciones. La duplicación encontrada era de liberación/estado del vehículo, no un motor financiero. Se conservan fuente y fórmulas de conciliación existentes.


## Actualización PR #143 — migración aplicada y validación en vivo

Con autorización expresa de Juan se aplicó `scope_atomic_payment_edits` en Supabase, versión `20261106224056` (fuente `20261106214659_scope_atomic_payment_edits.sql`). La preparación descrita debajo es historial anterior a esta aplicación. Los cuatro workflows de `5b3c0a97` aprobaron; el fixture SQL también aprobó en PostgreSQL 17 aislado.

En preview READY `dpl_8aUZLiDTDeVKtMTrJDcowVKXsYL2`, sesión QA Administrador: pago ordinario creado por UI por $4 y editado a $5; devolución expense creada por $1, visible en historial y editada a $2. BD confirmó importes y vínculos. El borrado especializado UI de devolución restauró garantía disponible a $3; el pago también se eliminó por UI. Raw UPDATE con GUC falsificado y sobrepago por RPC fueron rechazados en una transacción revertida. No quedaron autorizaciones técnicas.

Limpieza: cargo `ae9b81f6-f326-42b8-a388-c668ccfe2aab`, garantía `e5cd6e7b-9600-45f2-9dd0-1799ba85ecba`, pago `62ad1b97-61d6-443e-9b34-48752328eebb` y devolución `035cceb3-424e-419b-8ae9-51c93befe030`: los cuatro con is_deleted=true, sin borrado físico. Recarga UI confirmó $0 y cero registros. Sólo movimientos QA nuevos; sin transferencias de dinero ni cambios persistentes a datos anteriores.

Hallazgo adicional: a las 05:00 UTC del 7-nov todavía era 6-nov en Monterrey, pero el alta proponía 7-nov por toISOString. Alta y edición ahora usan el helper de fecha de negocio, validan fecha vacía/futura y limitan el calendario. Regresiones RED/GREEN: ocho suites, 23/23 pruebas aprobadas y TypeScript aprobado. Revisión independiente sin bloqueadores; ambas suites afectadas también pasaron con TZ=America/Mexico_City (6 pruebas). Este ajuste de fechas todavía requiere CI/preview del nuevo commit; no se presenta como probado en vivo.

Advisors posteriores: persisten 16 WARN de funciones SECURITY DEFINER accesibles a authenticated y protección de contraseñas filtradas deshabilitada. INFO nuevo por RLS sin políticas en la tabla privada es intencional: denegar acceso directo; no crear política permisiva.

C3 sigue parcial: edición y devolución ordinarias tienen evidencia UI. Crédito, multa, proveedor en vivo, concurrencia y sesiones de otros roles siguen pendientes. PR #143 aún no fusionado. No se alteraron fórmulas financieras ni se hizo backfill.


## Objetivo
Concentrar los hallazgos reproducibles y las correcciones de seguridad/funcionalidad en una rama y PR independientes. Cada cambio debe validarse antes de fusionarse a `master` y desplegarse a producción.

## Reglas de trabajo
- No modificar producción directamente ni alterar/limpiar la base de datos de pruebas.
- Corregir por bloques pequeños; documentar evidencia, causa, solución y prueba.
- No ejecutar `npm audit fix --force` ni migraciones mayores de framework/estilos sin revisar compatibilidad.
- No marcar como aprobada una verificación omitida. El paso informativo de `npm audit` dentro de `quality` conserva `continue-on-error: true`; el job separado `Dependency security gate` valida las dependencias de producción, cuyo audit local actual no reporta vulnerabilidades.
- Fusionar cada bloque validado para no volver a trabajar soluciones ya integradas.

## Hallazgos confirmados

| ID | Hallazgo y evidencia | Severidad | Corrección/plan | Prueba | Estado |
|---|---|---|---|---|---|
| AUD2-001 | El HEAD anterior presentaba 7 advisories de producción. `npm audit --omit=dev --audit-level=high` termina en `found 0 vulnerabilities`; las actualizaciones y el lockfile se generaron con npm, sin `--force` ni edición manual. El audit completo reporta **10 avisos en dependencias de desarrollo**: 7 altos vinculados a `braces` sin versión corregida y 3 moderados por metadatos de advisory desactualizados para `postcss-selector-parser@6.1.5`, que sí tiene un backport oficial. | Riesgo limitado a herramientas de build/lint; `braces` aún sin release corregido | Mantener el gate de producción; no usar overrides incompatibles ni migraciones mayores sólo para silenciar el audit. | En el HEAD actual se repitió el audit completo; CI remoto de la rama pasó. | Producción limpia; un advisory real de desarrollo pendiente de upstream y un falso positivo de metadatos |
| AUD2-001g | `dompurify` vulnerable hasta `3.4.16` se resolvió a **3.4.17** mediante `npm audit fix` sin `--force`. | Crítica | Corregido en lockfile; mantener las políticas de sanitización existentes. | Audit de producción, regresiones, type-check y build pasan. | Corregido localmente; CI remoto pendiente |
| AUD2-001a | `jspdf` estaba en el rango vulnerable `<=4.2.0` y se actualizó a **4.2.1**; se usa en `src/hooks/use-export-data.ts` mediante import dinámico y `jspdf-autotable@5`. | Crítica | Actualización mayor aislada y lockfile regenerado por npm. | Regresiones, type-check y build pasan; smoke check generó un PDF con AutoTable. | Corregido localmente; CI remoto pendiente |
| AUD2-001b | `seroval` transitivo de `solid-js` se actualizó de **1.5.6** a **1.6.12** mediante `npm audit fix` sin `--force`; `@tanstack/react-query-devtools` permanece declarado. | Crítica | Fix compatible en lockfile; no se retiró Devtools en este bloque. | Audit de producción, type-check y build pasan. | Corregido localmente; CI remoto pendiente |
| AUD2-001c | Next se actualizó de **16.3.6** a **16.4.2** y `eslint-config-next` se alineó a **16.4.2**. | Alta | Framework actualizado en un bloque dedicado; Next permanece fijado exactamente en `package.json`. | Regresiones, type-check y build de producción pasan localmente. | Corregido localmente; CI remoto pendiente |
| AUD2-001d | `sharp` se actualizó de **0.34.5** a **0.35.5**, versión corregida y alineada con Next 16.4.2. | Alta | Dependencia y binarios se actualizaron por instalación npm reproducible. | Regresiones, type-check y build pasan localmente; falta prueba visual específica de optimización de imágenes en Vercel. | Corregido localmente; validación de despliegue pendiente |
| AUD2-001e | `braces@3.0.3` sigue en el árbol de desarrollo por Tailwind 3 y `eslint-config-next`. El advisory aún no publica una versión corregida; las rutas de glob de Tailwind y ESLint usan patrones del repositorio/configuración, no entradas de usuarios. `postcss-selector-parser@6.1.5` también aparece en `npm audit` por un rango de advisory que sólo reconoce la corrección `>=7.1.6`; el release oficial `6.1.5` documenta el backport de seguridad para la rama 6.x, compatible con `postcss-nested@6.2.0`. | Alto para `braces` en herramientas de desarrollo; moderado sólo por metadatos obsoletos del parser ya corregido | Se conserva Tailwind 3 y las reglas de Next. No hay release compatible que resuelva `braces`; no se fuerza una migración mayor ni una versión del parser fuera del rango declarado. `npm audit --omit=dev --audit-level=high` reporta cero. | Audit de producción limpio; audit completo del HEAD da 10 avisos, de los cuales el parser instalado ya contiene el backport oficial. CI del HEAD pasó. | `braces` pendiente de upstream; parser corregido en el lockfile, pendiente de que npm/GitHub actualice el advisory |
| AUD2-001f | `uuid` se actualizó de **9.0.1** a **14.0.3**; los imports `v4` existentes están en `src/app/api/upload/route.ts` y `src/app/dashboard/finanzas/income/components/MassIncomeForm.tsx`. | Moderada | Actualización mayor con los imports existentes. | Regresiones, type-check y build pasan localmente. | Corregido localmente; CI remoto pendiente |
| AUD2-002 | La prueba E2E actual sólo verifica página pública y redirección anónima. | Alta | Añadidas pruebas de contrato de los handlers `notifications/send` y `notifications/broadcast` con administrador de empresa A y destinatario de empresa B; verifican rechazo antes de insertar. La consulta Supabase se simula en estas pruebas. | `tenant-isolation.test.ts`; quality gate debe repetir en el nuevo HEAD. | Cobertura de handlers añadida; entorno Supabase con dos identidades no ejecutado |
| AUD2-003 | Aikido Security figuró como omitido y no existe configuración o workflow de Aikido en este repositorio. | Pendiente de triage | No se debe presentar como aprobado. Habilitar la app/check de Aikido en GitHub para obtener evidencia. | Los cuatro workflows configurados del HEAD anterior pasaron; ninguno es Aikido. | Sin escaneo Aikido verificable; requiere integración externa |
| AUD2-004 | `notifications/send` y `notifications/broadcast` podían escribir con service-role usando IDs de destinatarios de otra empresa. | Alta (aislamiento multi-tenant) | Validan que los destinatarios existan, estén activos y pertenezcan a la empresa seleccionada antes de insertar. | Añadidas pruebas de contrato para ambos handlers que prueban destinatario de empresa B frente a admin/empresa A y confirman que no se inserta. | Corregido y cubierto por pruebas de handler; integración Supabase real pendiente |

| AUD2-005 | `src/app/api/delete-file/route.ts` limpiaba referencias de `vehicles` y `clients` con filtro `company_id`, pero ejecutaba `documents.delete().eq('file_url', fileUrl)` sin filtro de empresa usando service-role. El tipo `Database['public']['Tables']['documents']` confirma que la tabla tiene `company_id`. | Media (integridad entre empresas) | Corregido en la rama: el borrado de referencias de `documents` ahora filtra tanto por `company_id` del perfil como por `file_url`. No se alteró la BD. | Quality gate pendiente para el commit actual | Corregido en código; CI pendiente |

| AUD2-006 | Los endpoints `upload`, `upload-inspection`, `upload-assignment-photo`, `seguimiento/upload-foto`, `download-file`, `delete-file`, `stripe/portal`, `stripe/checkout`, `notifications/send` y `notifications/broadcast` validaban el token, pero varios no bloqueaban explícitamente perfiles `users.is_deleted=true`; usan service-role, por lo que no deben depender sólo del proxy/middleware. | Alta (cuenta desactivada con sesión aún válida) | Corregido en la rama: los endpoints de subida/notificaciones rechazan perfiles desactivados; descarga y eliminación deniegan acceso si el perfil está desactivado; portal y checkout también rechazan al actor desactivado. Sin cambios en BD. | Quality gate + pruebas de regresión de API con perfil desactivado pendientes | Corregido en código; CI pendiente |

| AUD2-007 | `src/app/api/admin/users/update-password/route.ts` permitía a un admin de empresa solicitar cambio de contraseña para otro usuario con `company_id=null`, porque la condición de aislamiento omitía ese caso. Eso podía alcanzar una cuenta `super_admin` sin empresa. | Crítica (control de cuentas privilegiadas) | Corregido en la rama: política `canAdministerTargetUser` permite que sólo `super_admin` administre cuentas `super_admin`; los admins de empresa sólo pueden actuar sobre usuarios de su misma empresa no nula. Añadidas pruebas unitarias para empresa cruzada, target sin empresa, super-admin y self-target. | Quality gate, type-check y build del nuevo commit pendientes | Corregido en código; CI pendiente |
| AUD2-008 | `src/app/api/storage/signed-url/route.ts` comprobaba el token y la pertenencia de la ruta a la empresa, pero no rechazaba explícitamente `users.is_deleted=true` antes de emitir URLs firmadas con service-role. | Alta (acceso a archivos tras desactivación) | Corregido en la rama: consulta `is_deleted` y devuelve 403 a perfiles desactivados. | Quality gate y prueba API para perfil desactivado pendientes | Corregido en código; CI pendiente |

| AUD2-009 | `src/lib/admin-api-auth.ts` sólo aplicaba aislamiento multi-tenant si `targetCompanyId` era truthy y el perfil del actor tenía `company_id`; pasar `null` evitaba la comprobación. Afectaba rutas que buscan un usuario por email/ID antes de autorizar, como restablecimiento de contraseña y reenvío de bienvenida, y podía permitir que un admin de empresa alcanzara objetivos sin empresa. | Alta (autorización multi-tenant) | Corregido en la rama: política `canAccessTargetCompany` falla de forma cerrada cuando una ruta especifica explícitamente un destino `null`, y exige empresa no nula coincidente para admins de empresa. Añadidas pruebas unitarias para empresa distinta, target nulo y super-admin. | Los cuatro workflows pasaron en `0e5b97798a1d1f8d4c34fc678517c1703bf5341b`; los cambios posteriores deben volver a validarse. | Corregido en código; validación del HEAD actual pendiente |

| AUD2-010 | `send-password-reset` y `resend-welcome` podían intentar generar enlaces de recuperación para perfiles ya desactivados; consultaban el usuario sin filtrar `is_deleted`. | Media (ciclo de vida de cuenta) | Corregido en la rama: ambas rutas consultan `is_deleted` y devuelven 404 para perfiles inexistentes o inactivos antes de autorizar la operación. | Los cuatro workflows pasaron en `0e5b97798a1d1f8d4c34fc678517c1703bf5341b`; los cambios posteriores deben volver a validarse. | Corregido en código; validación del HEAD actual pendiente |
| AUD2-011 | `update-password` no rechazaba explícitamente perfiles objetivo con `is_deleted=true`; `delete` permitía repetir una desactivación sobre un perfil ya inactivo. | Baja/media (estado de cuenta) | Corregido en la rama: ambas rutas consultan `is_deleted` y rechazan objetivos inactivos antes de continuar. | Los cuatro workflows pasaron en `0e5b97798a1d1f8d4c34fc678517c1703bf5341b`; los cambios posteriores deben volver a validarse. | Corregido en código; validación del HEAD actual pendiente |

| AUD2-013 | `src/app/api/admin/users/delete/route.ts` consultaba el ID objetivo antes de autenticar al actor, lo que podía permitir enumerar cuentas mediante diferencias entre respuestas. Además, el cambio de estado no comprobaba que una fila se hubiera actualizado y se ignoraba un error al sincronizar los metadatos de Auth. | Media/alta (enumeración y consistencia de estado) | Corregido en la rama: primero se exige admin autenticado, luego se valida el objetivo con la política compartida de alcance multi-tenant y privilegios; la actualización vuelve a comprobar tenant/estado, trata correctamente `company_id IS NULL`, exige fila actualizada y reporta fallo si no puede sincronizar metadatos de Auth. | CI del HEAD `0b384d787a0fc3f2824ba83bc0fe66c971832878` pendiente; se requiere revisar regresión de desactivación y autorización. | Corregido en código; validación pendiente |\n| AUD2-012 | `send-password-reset` y `resend-welcome` usaban `supabaseAdmin.auth.admin.generateLink()` y luego respondían como si el correo se hubiera enviado. `generateLink` genera un enlace; no envía el correo. La interfaz mostraba un éxito falso. | Alta (flujo de recuperación) | Corregido en la rama: ambos endpoints generan el enlace de recuperación, lo envían mediante el helper transaccional `sendEmail` de Resend y sólo devuelven éxito si Resend confirma un ID de envío. Se usa la ruta `/dashboard/reset-password` y un dominio público FleetEase como fallback, sin `localhost` en producción. | Requiere CI y pruebas de integración con Resend configurado; no se envió ningún correo durante la auditoría. | Corregido en código; validación pendiente |

## Contexto del quality gate
El workflow `.github/workflows/quality-gate.yml` ejecuta un job independiente `Dependency security gate` con `npm audit --omit=dev --audit-level=high` sin `continue-on-error`, por lo que bloquea la PR si quedan vulnerabilidades altas/críticas. El paso duplicado dentro de `quality` sigue siendo informativo (`continue-on-error: true`) para que se puedan consultar sus resultados sin impedir que se ejecuten las regresiones.

Evidencia actual de dependencia (GitHub Actions run `39893868322`, commit temporal de diagnóstico `eeb3cb26e16ca0a4c80b36a5939cc9c72dbcaeb8`): en un runner aislado se ejecutó `npm audit fix` **sin `--force`**, y se subió un artefacto de vista previa, sin aplicar cambios al árbol de trabajo del PR. El snapshot resultante bajó de 7 a 4 vulnerabilidades de producción: 2 críticas (`jspdf`, `next`), 1 alta (`sharp`) y 1 moderada (`uuid`). `dompurify` quedó en `3.4.17` y `seroval` en `1.6.12`, sin aparecer en el reporte posterior. El preview no se ha incorporado a la rama; las actualizaciones de dependencias mayores y la regeneración final del lockfile siguen pendientes. La puerta de seguridad continúa siendo bloqueante hasta que el lockfile comprometido pase `npm audit --omit=dev --audit-level=high`.

Una segunda prueba aislada en el run `39894254487` probó las actualizaciones directas `jspdf@^4.2.1`, `next@16.4.2`, `sharp@^0.35.5` y `uuid@^11.1.1`. `npm install` terminó correctamente y regeneró un lockfile en el runner, pero el audit aún falló por tres vulnerabilidades críticas de `dompurify` y `seroval`; por ello las pruebas, type-check y build se omitieron en esa ejecución. El artefacto confirma que no basta con actualizar sólo los cuatro paquetes directos.

Una tercera ejecución aislada aplica `npm audit fix` sin `--force` después de las actualizaciones directas y ejecutará audit, regresiones, type-check y build si el audit pasa. Al registrar esta nota, esa ejecución todavía no ha terminado y no se ha incorporado ningún lockfile candidato a la rama. Los jobs temporales se retiran del workflow en commits posteriores para que no queden como parte permanente de la solución.

## Alcance inicial
- [ ] Triar y corregir las vulnerabilidades de producción, empezando por las críticas.
- [ ] Ampliar pruebas de acceso a rutas protegidas y aislamiento entre empresas sin usar datos reales.\n- [ ] Añadir/ejecutar regresión de `admin/users/delete` para actor no autenticado, tenant cruzado, self-target y sincronización fallida de Auth.
- [ ] Revisar autenticación/autorización en los endpoints; el proxy no debe ser la única barrera.
- [ ] Investigar la omisión de Aikido.
- [ ] Añadir prueba de regresión por cada defecto confirmado.

## Criterio de salida
No cerrar la fase hasta que cada cambio tenga evidencia de prueba, los workflows requeridos estén realmente ejecutados y en verde, y no queden riesgos altos/críticos sin resolver o con excepción documentada. Los cambios de infraestructura o de plan de Supabase se registrarán aparte; no se aplicarán sin autorización.


### Actualización de remediación aislada — 2026-10-23
La ejecución aislada `39894350704` terminó en fallo durante `npm audit fix` (sin `--force`). El log detallado mostró entonces avisos de desarrollo en `basic-ftp` / `extract-zip` por Puppeteer, `braces` y `postcss-selector-parser`. Esa evidencia corresponde al snapshot anterior y no certificaba el audit de producción.

El candidato descargado contiene `jspdf@4.2.1`, `next@16.4.2`, `sharp@0.35.5`, `uuid@11.1.1`, `dompurify@3.4.17` y `seroval@1.6.12`. No se incorporó su `package.json` ni su `package-lock.json` a la rama. La validación de compatibilidad de jsPDF, pruebas, type-check y build con ese árbol sigue pendiente. El workflow temporal de validación se retiró y no debe quedar como solución permanente.

### Continuación de remediación en PR #73
La rama incorpora ahora `jspdf@4.2.1`, `next@16.4.2`, `eslint-config-next@16.4.2`, `sharp@0.35.5` y `uuid@14.0.3`; `npm audit fix` sin `--force` resolvió `dompurify@3.4.17` y `seroval@1.6.12`. Tailwind 3 y su plugin de animación se movieron a `devDependencies` porque sólo se cargan desde la configuración de compilación CSS. `package-lock.json` se generó con npm; no se editó manualmente.

Validación reproducida en un checkout limpio del árbol combinado (`9f1b337`, incluida la base actual de `master`): `npm ci` terminó; `npm audit --omit=dev --audit-level=high` encontró cero vulnerabilidades; las cuatro suites del quality gate pasaron (**51 tests**); `npm run type-check` pasó; y `npm run build` terminó con Next.js 16.4.2. Smoke checks directos de DOMPurify, UUID 14, jsPDF 4 + AutoTable 5 y Sharp 0.35 también pasaron. El build emitió dos advertencias preexistentes de clases Tailwind ambiguas (`duration-[var(--fe-motion-base)]` y `duration-[var(--fe-motion-fast)]`). El audit completo de ese snapshot reportó 20 vulnerabilidades de desarrollo; el snapshot más reciente las redujo a 10 al retirar Puppeteer sin uso y actualizar `@types/jest`.

La PR debe seguir en borrador hasta que CI remoto confirme el HEAD, se complete el triage de dependencias de desarrollo y se cubran los pendientes de aislamiento HTTP entre empresas, correo Resend y revisión Aikido. No se ejecutaron despliegues, envíos de correo ni operaciones sobre producción o la base de datos.

### Remediación de herramientas de desarrollo
Se retiró `puppeteer-core`: no existían referencias en el código ni workflows, y el smoke E2E ya usa `playwright-core` con Chrome de la acción de CI. Esto elimina las ramas `basic-ftp` y `extract-zip`. Se actualizó `@types/jest` de 29 a 30 para alinearlo con Jest 30 y quitar su árbol duplicado `expect` 29. El lockfile fue actualizado exclusivamente por npm.

El audit completo se mantiene en **10 avisos** (3 moderados y 7 altos), mientras que el audit de producción está limpio. Los avisos se reducen a dos causas: `braces@3.0.3`, sin release corregido hasta la fecha, y `postcss-selector-parser@6.1.5`, cuyo backport oficial de seguridad para la rama 6.x no está reflejado en el rango de GitHub Advisory que usa `npm audit`. `braces` sólo procesa patrones fijos del toolchain en este repositorio; no recibe globs de usuarios. No se cambia Tailwind ni la configuración lint por una migración mayor, y no se fuerza el parser 7 fuera del rango de `postcss-nested@6`. Referencias upstream: [advisory de braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [respuesta del mantenedor](https://github.com/micromatch/braces/issues/70) y [releases del parser](https://github.com/postcss/postcss-selector-parser/releases).

### Continuación — 2026-10-23
En el HEAD `c7fdfdda5bbc36f97fd998398ddc769c4ae47d14`, GitHub Actions terminó con éxito los cuatro workflows configurados: quality gate, E2E smoke, MCP read-only y Lighthouse. El job de dependencias pasó `npm audit --omit=dev --audit-level=high`. Se añadieron pruebas de contrato para el aislamiento multi-tenant de `notifications/send` y `notifications/broadcast`, y para el flujo de recuperación/bienvenida mediante el transporte HTTP de Resend simulado. El quality gate ahora incluye estas pruebas.

Validación local de esta continuación: 6 suites del quality gate, 57 tests, `npm run type-check` y `git diff --check` pasaron. Falta el resultado remoto del nuevo HEAD.

No hay configuración de Aikido en el repositorio, así que no existe un resultado de escaneo Aikido verificable. Las nuevas pruebas no usan una instancia real de Supabase ni envían correos: se necesita una cuenta/proyecto de prueba y credenciales de Resend para validar esas integraciones externas. La PR permanece en borrador hasta obtener esa evidencia y habilitar Aikido.


---

# Estado vigente C1–C5 — actualización posterior al PR #124 (2026-11-04)

> **7-nov, UI del PR #144 aprobada:** alta, abono, edición, liquidación y cancelación parcial con recursos QA nuevos; BD confirma historial/vehículo/nota/motivo. Fixtures archivados lógicamente, recarga vuelve a cuatro créditos originales. Listo para revisión de fusión del alcance de este PR; C3/C4 globales parciales. Detalle al inicio.

> **7-nov, PR #144 aplicado con autorización:** versión Supabase `20261107130143`. Liquidación y cancelación parcial aprobadas por RPC como admin QA en BD real, todo revertido. Permisos y advisors conservados. Cuatro workflows de c8bc9e0f aprobados. Faltan UI y reversión tras liquidación; C3/C4 parciales. Véase evidencia al inicio.

> **Estado posterior a PR #143:** integrado y producción READY, cuatro workflows aprobados. Nuevo bloqueo real de liquidación por orden de cierre de asignación. Corrección preparada en `20261107053703_respect_credit_assignment_lifecycle.sql`, sin aplicar. Detalle y límites en la actualización al inicio del documento. C3/C4 siguen parciales.

> **Continuación tras PR #142:** producción READY, fecha/referencia y edición de referencia verificadas con admin QA. Garantía UI 3 → 0 → 3 al aplicar/eliminar. Devolución expense omitida de historial y PAYMENT_NOT_FOUND confirmados. Migración `20261106214659_scope_atomic_payment_edits.sql` preparada, **no aplicada**: capacidad privada por transacción para importe y soporte acotado de devoluciones con vínculo. Roles/tenant/rollback probados en SQL aislado; reconciliador de proveedor también. 20/20 regresiones, TypeScript/build aprobados. Cinco movimientos nuevos eliminados lógicamente y recarga en cero. PostgreSQL 17 CI aprobado para `8371c608` (job 128182617017). C3 parcial; faltan aplicación autorizada y UI del cambio. [Evidencia](./FUNCTIONAL_TESTS_2026-11-06.md).

> **Continuación tras PR #141, 6-nov:** Pagos UI con admin QA: parcial $4 + liquidación $6, borrado lógico por botones e historial 10 → 6 → 0 tras recarga aprobados. Cargo y pagos nuevos eliminados lógicamente. **Edición de importe bloqueada** por `FINANCIAL_SENSITIVE_FIELDS_IMMUTABLE`, reproducida en BD. Referencia persistida omitida por consulta y DATE mostrado con un día menos: correcciones de lectura/presentación en rama, dos regresiones RED/GREEN y TypeScript aprobado; CI/preview pendientes. No se relaja el trigger financiero. C3 sigue parcial. [Evidencia](./FUNCTIONAL_TESTS_2026-11-06.md).

> **C3 verificado en producción, 6-nov:** PR #140 fusionado (`a8acefe8`), despliegue READY y cuatro workflows aprobados para `8e4d1bda`. QA Administrador borró por UI el ingreso de $1 y un vehículo nuevo desechable; BD y recarga confirman borrados lógicos y totales originales. Ciclo de pagos de cliente en BD aprobado y revertido: cargo $10, abonos $4/$6, pagos activos 10 → 6 → 0 al eliminarlos por RPC especializada. C3 parcial por pagos UI, crédito/proveedor/multa/depósito, concurrencia y roles restantes. Detalle en [FUNCTIONAL_TESTS_2026-11-06.md](./FUNCTIONAL_TESTS_2026-11-06.md).

> **C3 aplicado con autorización, 6-nov:** `soft_delete_tenant_record_rpc`, versión viva `20261106173252`. RPC probada en BD real como authenticated con transacción revertida: borrados ordinarios confirmados y ocultos, rechazos de repetición/empresa/tabla/pago/vehículo asignado. Tipos regenerados. UI de preview aprobada con Super Admin en empresa QA: ingreso de $1 eliminado, BD confirma borrado lógico y recarga vuelve a 18 ingresos/$45,700. Falta integrar el PR #140 y E2E con admin de empresa, vehículos y reversiones; C3 permanece parcial. Advisors añade el aviso esperado por esta RPC SECURITY DEFINER (16 frente a 15). Evidencia en [FUNCTIONAL_TESTS_2026-11-06.md](./FUNCTIONAL_TESTS_2026-11-06.md).

> **Pruebas funcionales 6-nov-2026:** C3 reproducido y abierto: ingreso QA no se borra por UI/UPDATE authenticated (42501 RLS). Corrección RPC propuesta con migración nueva no aplicada; requiere despliegue coordinado. Fechas, guardas/ciclo de asignación en BD, descarga, permisos de metadatos Storage, recarga y segunda pestaña tienen evidencia parcial. Sólo se limpió el ingreso nuevo de $1. Detalle y límites en [FUNCTIONAL_TESTS_2026-11-06.md](./FUNCTIONAL_TESTS_2026-11-06.md).

> **Actualización operativa 6-nov-2026:** las migraciones de C2, C4 y storage M-3/N2 ya se aplicaron con autorización del usuario y se verificaron en catálogo. Versiones: `20261106162226`, `20261106162306` y `20261106163500`. Se confirmaron cuatro triggers activos, índice único válido, 12 buckets (10 privados/2 públicos) y 28 políticas nuevas. Esto sustituye los pendientes de aplicación descritos más abajo; las pruebas funcionales y el resto de hallazgos siguen abiertos. Evidencia y correspondencia con los SQL originales en [REAUDIT_2026-11-05.md](./REAUDIT_2026-11-05.md).

> **Seguimiento del 2026-11-05 en rama, sin integración ni escrituras en producción:** [REAUDIT_2026-11-05.md](./REAUDIT_2026-11-05.md). Parte de la pestaña `Re-auditoría 5-nov` del Excel v2 y documenta correcciones, verificaciones de solo lectura y límites. La BD conectada no registra las migraciones de C2, C4 y storage; Upstash sí tiene ambas variables en production/preview. No declarar estos hallazgos cerrados por cambios de código.

> **Esta sección sustituye el estado anterior de C1 y la referencia a PR #129.** La sección del 2026-11-03 se conserva como historial de la reauditoría, no como estado actual de implementación. Para el estado operativo, verificar siempre el HEAD actual de `master` y los PRs enlazados.

## Evidencia de integración

- Base actual consultada para esta actualización: `master` en `73125a88dd9eb688a7e9c7b23362ff3779981991` (2026-11-04).
- **PR #124** — [fix: make financial reports reconcile from their detail](https://github.com/JuanGodinezperez18/FleetEase/pull/124) — integrado el 2026-11-03 mediante merge commit `27fe0b37d526b38503547b52ddb24fe4725c52e3`.
- La implementación integrada usa `calculateFinancialReconciliation` en `src/lib/financial-metrics.ts` como cálculo de conciliación de reportes, con desglose del costo de vehículos vendidos, movimientos incluidos/excluidos y motivos de exclusión.
- El PR #129 propuso un segundo cálculo canónico (`calculateFinancialReportMetrics`) y cambios solapados en los mismos reportes/exports. Su rama divergió de `master` (33 commits por delante y 24 por detrás al revisarla) y no debe integrarse completa ni usarse como fuente de verdad. La rama conserva ideas/cambios que podrían evaluarse por separado, pero requieren adaptación a las APIs ya integradas por #124.

## Matriz operativa actual

| ID | Estado actual | Pendiente para cierre definitivo |
|---|---|---|
| C1 | **Implementación integrada por PR #124; validación funcional pendiente.** No declarar cerrado sólo por el merge. | Probar con un conjunto de datos representativo y autorizado que el desfase histórico de $495,000 desaparezca; verificar igualdad entre detalle, resumen, métricas por vehículo, PDF y Excel; confirmar `netProfit = totalIncome - totalExpenses` y revisar movimientos incluidos/excluidos. |
| C2 | **Corregido en código/migración; confirmación de producción pendiente.** PR #122. | Verificar, sólo lectura inicialmente, que la migración esté aplicada y revisar el registro futuro identificado por la auditoría. No modificar datos reales sin autorización. |
| C3 | **Parcial y abierto.** PR #121 mejoró el aviso de error, pero falta demostrar filas afectadas y corregir/confirmar permisos RLS/GRANTs. | Comprobar `.select('id', { count: 'exact' })` en las operaciones pertinentes, tratar cero filas como fallo explícito y validar en entorno controlado. |
| C4 | **Corregido en código/migración; confirmación de producción pendiente.** PR #123 y migración `20261102190000_enforce_vehicle_assignment_history.sql`. | Confirmar aplicación de migración y revisar solapamientos históricos mediante consulta de sólo lectura. |
| C5 | **Migraciones versionadas; drift de BD viva pendiente.** | Comparar esquema e historial de migraciones; investigar duplicidad de migraciones shared-links sin reescribir migraciones ya aplicadas. |

## Reglas de ejecución

1. No reintroducir `calculateFinancialReportMetrics` como segundo motor de cálculo sin demostrar que no duplica ni contradice `calculateFinancialReconciliation`.
2. Toda mejora rescatada del PR #129 debe adaptarse a la implementación integrada por #124 y llegar en un PR nuevo, pequeño y con pruebas específicas. No rebasar ni fusionar el PR #129 completo.
3. C1 sólo se cierra con evidencia funcional sobre datos autorizados y conciliación entre todas las salidas; CI verde por sí solo no prueba que el desfase de $495,000 haya desaparecido.
4. C2, C4 y C5 requieren confirmación de estado de producción; no ejecutar migraciones ni SQL de escritura durante la revisión.
5. C3 se mantiene independiente de C1. No realizar borrados reales durante pruebas de auditoría.
6. Cada cambio de estado debe incluir PR, commit, pruebas ejecutadas y enlace/resultado de workflows. Si una prueba no se ejecutó, indicarlo expresamente.
7. No utilizar credenciales de producción ni modificar producción sin autorización explícita.

---

# Estado B-1–B-5 — informe consolidado (2026-11-04)

**Fuente:** `FleetEase_Informe_Auditoria.pdf`, cierre 2026-11-03, sección 5.3. Los IDs de esta sección **no corresponden a B1–B4 del informe del 2026-10-30**, que describía otros problemas. Base inspeccionada: `master` `9ddae5ac` (incluye PR #134). Rama: `fix/audit-low-findings-b1-b5`.

| ID | Causa confirmada | Corrección y evidencia | Estado |
|---|---|---|---|
| B-1 | Sidebar enlazaba `/dashboard/reports/history`, ruta inexistente, sin historial persistente | Retirado el enlace y su import de icono. `/dashboard/reports` se conserva; no se fabrica un historial sin datos | Corregido y verificado por smoke Chrome en `533c7b7`; revisión de preview pendiente |
| B-2 | `sendInternalMessage` resolvía con un toast “Función no implementada”; UI mostraba éxito después. `users` era una lista vacía y el envío push carecía de Authorization | Retirada la pestaña Usuarios, las ramas internas/push del compositor y el método simulado del contrato/proveedor. Se conservan plantillas y vista previa/compartir de clientes y socios. Las APIs de notificación existentes no se modifican | Corregido por retirada de acción no disponible; mensajería interna/push sigue como capacidad futura |
| B-3 | Guía con mocks/instrucciones obsoletos y roadmap con capacidades completadas sin evidencia y métricas no medidas | Reescritos `TESTING_GUIDE.md` y `ROADMAP-FUTURAS-MEJORAS.md` con estados, archivos de evidencia, comandos reales y límites. AGENTS registra las nuevas ubicaciones y fuente de auditoría | Corregido documentalmente en rama |
| B-4 | Avisos de dependencias de desarrollo; conteos del informe ya desactualizados | `npm audit fix --legacy-peer-deps --ignore-scripts` sin force actualizó 3 paquetes compatibles. Runtime: **0** avisos. Inventario completo: **26** (23 moderados, 3 bajos), con excepciones de tooling abajo. Se conserva gate bloqueante de runtime y se añade artefacto completo + política trimestral en `docs/DEPENDENCY_MAINTENANCE.md` | Tratado con excepciones explícitas; no declarar cero vulnerabilidades de desarrollo |
| B-5 | Proxy permitía scripts inline sin nonce para compatibilidad con HTML público estático; raíz común impedía aislar render dinámico | Grupos `(public)` y `(protected)` separan documentos raíz sin cambiar URLs. Raíz protegida dinámica lee nonce aleatorio de 24 bytes generado en proxy, propagado a Next Script/tema/GA. `script-src` y `script-src-elem` sin unsafe-inline en portales; respuestas privadas no-store. Raíz pública sin headers/cookies y landing estática | Corregido; contrato, HTML e hidratación Chrome aprobados en `533c7b7`; revisión de preview pendiente |

## B-4: excepciones verificadas, exposición y reevaluación

Medición local del 2026-11-04, Node 24.22.1/npm 11.9.0; CI usa Node 22. `npm audit --omit=dev --json` reportó cero avisos; `npm audit --json` reportó 26, agrupados por tres causas transitivas. Los números de severidad históricos de otras secciones no sustituyen este snapshot.

| Advisory / causa | Cadena y exposición | Decisión |
|---|---|---|
| [deepmerge prototype poisoning](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), bajo | `jest-config` → deepmerge; configuración de pruebas del repositorio, sin entrada de usuarios del SaaS | No aceptar el downgrade sugerido a Jest 25. Reevaluar al publicar upstream una versión compatible corregida |
| [glob AbortSignal cancellation](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), moderado | Jest/reporters y tooling de cobertura; glob de archivos de pruebas | Mantener el toolchain compatible y límites de tiempo de CI. No forzar glob 14 sobre consumidores de otra versión mayor |
| [minimatch amplification](https://github.com/advisories/GHSA-g3hv-75wg-m249), moderado | ESLint/typescript-eslint y glob/test-exclude; patrones fijos del repositorio | No aceptar downgrade de eslint-config-next a 15 ni override minimatch 11 incompatible. Revisar siguiente release de los consumidores |

Estas excepciones se limitan al tooling de este snapshot; no permiten procesar repositorios/patrones no confiables como parte del SaaS. Política de revisión trimestral y reevaluación anticipada al salir un parche en `docs/DEPENDENCY_MAINTENANCE.md`. El inventario completo en CI es informativo; sus errores de obtención sí fallan el paso.

## Validación local y límites

- Pruebas nuevas de CSP: se observaron **5 fallos esperados antes de implementar**; luego pasan las **37 pruebas** de middleware (nonce por petición, políticas pública/protegida, roles y sustitución de nonce suministrado por el cliente).
- Quality gate existente: **8 suites / 66 tests pasan**.
- Suite Jest completa: **29 suites pasan, 2 fallan; 310 tests pasan y 5 fallan**. Reproducidos los mismos 5 fallos en checkout intacto de `master` `9ddae5ac`: cuatro de `src/__tests__/lib/auth-persistence.test.ts` (mock global localStorage sin almacenamiento real) y uno de `src/__tests__/lib/financial-metrics.test.ts` (`filterRecordsByDateRange`, límite final). No se alteraron las fórmulas ni estos tests para ocultarlos.
- Type-check pasa. Build de producción pasa; `/` y páginas públicas siguen estáticas, portales dinámicos. Persisten las dos advertencias Tailwind preexistentes de `duration-[var(--fe-motion-*)]`.
- `node scripts/csp-smoke.mjs --http-only`: HTML protegido con **8 scripts inline cuyo nonce coincide**, autenticación con fixtures aislados de Supabase, cache no-store y respuesta pública sin nonce. No hay datos, mensajes ni escrituras reales.
- Chromium local no pudo iniciar por restricción del entorno (`socket() failed: Operation not permitted`). No declarar hidratación de navegador aprobada. `scripts/csp-smoke.mjs` se añade al workflow E2E para comprobar arranque, tema, interacción con pestañas, ausencia de acciones retiradas y rechazo de script inyectado en Chrome de CI.
- La separación de documentos raíz produce recarga completa al cruzar entre zona pública y portales; la navegación dentro de cada zona permanece con App Router. Revisar login/logout y preview antes de fusionar.
- Sin migraciones, SQL, cambios de datos ni modificaciones de producción. El estado de C1–C5 no cambia por esta remediación.

**Puerta de salida:** revisar CI/preview sobre el HEAD exacto del PR, confirmar el smoke de Chrome y conservar abiertos los fallos de regresión preexistentes y las excepciones de tooling descritas. No fusionar automáticamente.

### Seguimiento del smoke protegido y arranque sin caché

En `6c7e6e4`, [quality gate](https://github.com/JuanGodinezperez18/FleetEase/actions/runs/41919075503) y [MCP](https://github.com/JuanGodinezperez18/FleetEase/actions/runs/41919075328) pasaron. El diagnóstico de suite completa en Node 22 reportó **311 tests aprobados y 4 fallos**, todos en auth-persistence; el caso financiero de límite de fecha que falla localmente sí pasó en ese runner (diferencia dependiente del entorno, no se modifica su fórmula).

El [smoke con diagnósticos](https://github.com/JuanGodinezperez18/FleetEase/actions/runs/41919703783) confirmó una carrera de arranque preexistente en `auth-provider-supabase.tsx`: sin perfil cacheado, se llamaba a `finishLoading()` antes de completar `loadProfile()`. El layout veía una sesión provisionalmente anónima, navegaba a login y luego al dashboard, abandonando `/dashboard/messages`. Se corrige esperando el perfil antes de liberar loading, preservando la ruta solicitada. Si el endpoint rechaza el perfil, el estado termina anónimo. Se conservan el límite de arranque y la validación del servidor.

La prueba `src/__tests__/contexts/auth-boot.test.tsx` falló con la implementación anterior y pasa con la corrección (**2 tests**). Se añade al quality gate. El smoke consulta eventos reales `securitypolicyviolation` en lugar de confundir errores MIME de scripts exclusivos de Vercel con violaciones CSP; Stripe status se simula en el navegador, sin claves ni llamadas financieras reales. La nueva ejecución de Chrome sigue siendo la puerta para acreditar la hidratación protegida y el bloqueo de inyección.


### Evidencia final de código — `533c7b72468ba81c16b96222f353d514decec68d`

- [Quality gate, ejecución 975](https://github.com/JuanGodinezperez18/FleetEase/actions/runs/41920545366): aprobado, incluidas **9 suites / 68 pruebas**, TypeScript, build y gate de dependencias de producción.
- [E2E Chrome, ejecución 254](https://github.com/JuanGodinezperez18/FleetEase/actions/runs/41920545465): aprobado. El log confirma hidratación pública y protegida, interacción Clientes/Socios, ausencia de acciones retiradas, nonce coincidente, cache privada y bloqueo de script inline inyectado. Sesión sin caché y servicios simulados; sin escrituras reales.
- [MCP, ejecución 429](https://github.com/JuanGodinezperez18/FleetEase/actions/runs/41920545363): aprobado. Pruebas MCP **27/27** y build pasan. El paso de suite completa sigue siendo diagnóstico: **313 tests pasan, 4 fallan** en auth-persistence por el mock de localStorage ya documentado; el workflow verde no acredita suite completa verde.
- [Lighthouse y presupuesto de bundle, ejecución 2266](https://github.com/JuanGodinezperez18/FleetEase/actions/runs/41920545411): consultar el resultado final del enlace. El presupuesto de bundle ya pasó al registrar esta evidencia; Lighthouse seguía en ejecución. Las ejecuciones anteriores 2264/2265 también pasaron.

B-1, B-2, B-3 y B-5 tienen remediación de código/documentación y evidencia de regresión en la rama. B-4 queda tratado con las excepciones de tooling descritas, sin vulnerabilidades de runtime en el snapshot medido. El PR #136 permanece en borrador para revisión; no se fusionó ni se cambió producción. Esta evidencia corresponde al SHA de implementación indicado; las actualizaciones posteriores de esta sección sólo documentan resultados y no cambian el comportamiento probado.

### Actualización de PR #136 con master — 2026-11-05

Se integra `master` `284e03ed` (incluye #137 y #138) en la rama de #136, cuyo HEAD previo era `b3e883e7`. No se fusiona el PR a master ni se modifica producción.

- Resueltos los conflictos de `quality-gate.yml`, `next.config.mjs` y `data-provider-supabase.tsx`: se conservan auth-boot y las regresiones de reauditoría, CSP con nonce protegido y política pública estática, borrado lógico con conteo/empresa y prevalidación de administración. Se mantiene la retirada de mensajería simulada.
- Los cambios recientes de reportes y vehículos se conservan en sus rutas `(protected)`. La nueva página `administracion-de-vehiculos-monterrey` se ubica en `(public)` con idéntico contenido y URL.
- El smoke HTTP reprodujo **503 en `/api/auth/profile`** al integrar el nuevo rate limiting sin Redis. Se añade simulador Redis exclusivamente al preload de pruebas; no se cambia el fail-closed de producción. El smoke de navegador establece la misma sesión ficticia en cookie y localStorage y deja vacío el perfil cacheado para verificar el arranque en frío.
- Instalación reproducible aprobada (`npm ci --legacy-peer-deps`); **15 suites / 117 pruebas de los dos grupos de CI aprobadas**. TypeScript y build de producción con credenciales CI ficticias aprobados.
- Suite completa local: **369 aprobadas y 5 fallidas**, los mismos cuatro casos de auth-persistence/mock localStorage y el límite inclusivo de financial-metrics ya documentados. No se modifican para ocultarlos.
- Smoke HTTP de CSP aprobado tras el ajuste: página pública nueva 200, perfil simulado 200, scripts inline protegidos con nonce coincidente, no-store y política pública sin nonce.
- Chromium local no pudo iniciarse por restricciones del entorno (`socket() Operation not permitted`). La validación de hidratación y bloqueo de inyección se ejecuta en el workflow E2E de Chrome de GitHub. No afirmar validación local de navegador ni prueba con cuenta real.

La actualización conserva los límites operativos de #138: migraciones, E2E con cuenta real y persistencia/refresh entre los dos clientes siguen sin cierre por esta resolución de conflictos.


## C1 — Rentabilidad operativa autorizada (2026-11-12)

La rentabilidad mide los ingresos de renta y servicios menos los gastos de la operación en el periodo. El costo de adquisición se conserva en la ficha del vehículo. Las ventas financiadas y los cobros se presentan como cartera y cobranza. El cargo de administración sigue siendo gasto del socio e ingreso de la empresa; los pagos al socio afectan su saldo a pagar.

`calculateFinancialReconciliation` es la fuente compartida del cálculo. Los cambios se aplican al tablero, análisis financiero, fichas, portal del socio, reportes y exportaciones. El ejemplo histórico de $647,100 corresponde a la definición anterior.

**Validación QA y despliegue:** El [PR #150](https://github.com/JuanGodinezperez18/FleetEase/pull/150) se probó en QA FleetEase Demo del 2 de septiembre al 30 de noviembre de 2026. El resumen, detalle y consulta de solo lectura coincidieron en $565,400 de ingresos, $128,400 de gastos y $437,000 de utilidad operativa. Las 2 ventas financiadas y los 13 cobros sumaron $598,000 cada uno y se mostraron por separado. PDF y Excel se descargaron desde el preview. Pasaron los cuatro workflows en el commit de rama `21e46282`. Vercel publicó el merge `91a92e13` en producción. La conciliación de importes se verificó en QA.
