# Pruebas funcionales de reauditoría — 6 de noviembre de 2026

## Continuación posterior a PR #143 — liquidación y cancelación de crédito

PR #143 integrado como `07db9eac19e9f603aeb8300f5f6b0c56e11c3799`. Producción READY `dpl_CLCkmfWm4Sw6BFJVZcXLZLNQFdMj`. Los cuatro workflows del HEAD `3f881753` aprobaron, incluido Lighthouse #2292. La migración de pagos anterior sigue aplicada (`20261106224056`).

**Hallazgo real nuevo, C3/C4:** en Supabase, como authenticated QA Administrador y dentro de una transacción revertida, se creó un crédito temporal de $10, se abonaron $4 y se editaron a $5. El último pago de $5 falló con `23514 CLIENT_ASSIGNMENT_MUST_BE_ENDED_IN_HISTORY` en `finalize_completed_credit_vehicle`: el trigger limpiaba el cliente antes de cerrar `vehicle_assignment_logs`. Toda la transacción se revirtió; no se conservaron crédito, pagos ni cambios al vehículo QA. La UI del preview anterior se inspeccionó con admin QA, sin enviar el formulario de alta; no equivale a una prueba UI de liquidación.

**Corrección preparada, NO aplicada:** `20261107053703_respect_credit_assignment_lifecycle.sql`, creada con CLI. El cierre histórico precede a la liberación de cliente/vehículo en los triggers de liquidación y cancelación/desactivación. La RPC de cancelación cierra primero con su motivo y empresa para conservar el motivo solicitado. Se retiran dos escrituras redundantes de vehículo en ramas de crédito completado de pago/recálculo: sobrescribían `sold` con `active`. El trigger de finalización conserva la autoridad de la entrega por crédito liquidado. Sin cambios a importes, fórmulas protegidas, RLS, permisos externos ni backfill. SECURITY DEFINER mantiene search_path vacío y funciones internas sin EXECUTE para clientes.

**Validación aislada:** `supabase/tests/credit_assignment_lifecycle.sql` reproduce RED con funciones del catálogo vivo y guardas reales de historial, y pasa con el nuevo SQL en PGlite 0.5.15. Cubre abono parcial, edición, eliminación del parcial, liquidación, edición que liquida, conservación de `sold`, cierre de historial y liberación de recursos. Fallo deliberado de auditoría después de liquidar restaura crédito/pago/cuotas/historial/vehículo. Cancelación por RPC tras pago $4 conserva nota de $6 y motivo; rechaza empresa ajena. Desactivación cierra historia. Revisión independiente sin bloqueadores tras corregir pérdida del motivo. Se añade la misma prueba a CI PostgreSQL 17; resultado remoto pendiente en esta actualización.

**Límite explícito:** borrar/reducir un pago de crédito ya completado sigue bloqueado por historial cerrado. El fixture verifica rechazo y rollback, no lo presenta como reversión aprobada. Reabrir una entrega de propiedad requiere tratamiento específico; no se fabrica ni reabre historia en esta corrección. Multas, proveedor en vivo, concurrencia y otras sesiones de roles siguen pendientes. Advisors fue consultado antes del diagnóstico; no hubo DDL ni nuevas migraciones en producción en este bloque.

Fuente de verdad: `financial_records` y `financial_payment_credit_allocations`, RPC y agregados existentes. Escritores: pago/edición/borrado/cancelación y triggers de crédito/asignación. Consumidores: cuotas/saldos, cliente, vehículo e historial de asignaciones. La duplicación encontrada era de liberación/estado del vehículo, no un motor financiero. Se conservan fuente y fórmulas de conciliación existentes.


## Actualización PR #143 — migración aplicada y validación en vivo

Con autorización expresa de Juan se aplicó `scope_atomic_payment_edits` en Supabase, versión `20261106224056` (fuente `20261106214659_scope_atomic_payment_edits.sql`). La preparación descrita debajo es historial anterior a esta aplicación. Los cuatro workflows de `5b3c0a97` aprobaron; el fixture SQL también aprobó en PostgreSQL 17 aislado.

En preview READY `dpl_8aUZLiDTDeVKtMTrJDcowVKXsYL2`, sesión QA Administrador: pago ordinario creado por UI por $4 y editado a $5; devolución expense creada por $1, visible en historial y editada a $2. BD confirmó importes y vínculos. El borrado especializado UI de devolución restauró garantía disponible a $3; el pago también se eliminó por UI. Raw UPDATE con GUC falsificado y sobrepago por RPC fueron rechazados en una transacción revertida. No quedaron autorizaciones técnicas.

Limpieza: cargo `ae9b81f6-f326-42b8-a388-c668ccfe2aab`, garantía `e5cd6e7b-9600-45f2-9dd0-1799ba85ecba`, pago `62ad1b97-61d6-443e-9b34-48752328eebb` y devolución `035cceb3-424e-419b-8ae9-51c93befe030`: los cuatro con is_deleted=true, sin borrado físico. Recarga UI confirmó $0 y cero registros. Sólo movimientos QA nuevos; sin transferencias de dinero ni cambios persistentes a datos anteriores.

Hallazgo adicional: a las 05:00 UTC del 7-nov todavía era 6-nov en Monterrey, pero el alta proponía 7-nov por toISOString. Alta y edición ahora usan el helper de fecha de negocio, validan fecha vacía/futura y limitan el calendario. Regresiones RED/GREEN: ocho suites, 23/23 pruebas aprobadas y TypeScript aprobado. Revisión independiente sin bloqueadores; ambas suites afectadas también pasaron con TZ=America/Mexico_City (6 pruebas). Este ajuste de fechas todavía requiere CI/preview del nuevo commit; no se presenta como probado en vivo.

Advisors posteriores: persisten 16 WARN de funciones SECURITY DEFINER accesibles a authenticated y protección de contraseñas filtradas deshabilitada. INFO nuevo por RLS sin políticas en la tabla privada es intencional: denegar acceso directo; no crear política permisiva.

C3 sigue parcial: edición y devolución ordinarias tienen evidencia UI. Crédito, multa, proveedor en vivo, concurrencia y sesiones de otros roles siguen pendientes. PR #143 aún no fusionado. No se alteraron fórmulas financieras ni se hizo backfill.


## Continuación tras PR #142 — edición atómica y devoluciones

Base integrada `384f7e89ab76439007853533c11077ca3d908c4e`; producción READY `dpl_9bRrFZyGRgrDTNbpAPpegKgD37GW`. Sesión real QA Administrador, empresa QA FleetEase Demo. Se utilizaron únicamente cinco movimientos nuevos desechables.

**CI posterior a publicar:** para HEAD `8371c608616e2b54e21cc2c4f3e63eb6526e826e`, job `Atomic payment SQL regression` **128182617017** aprobado en PostgreSQL 17 real y aislado (quality gate #999, run 42302228582). Preview `dpl_J43v9XgX2eACeu8ryyLxNKWtzBtQ` READY. Esto amplía la prueba local PGlite y no aplica la migración al proyecto Supabase. El cambio posterior sólo registra esta evidencia documental.

### Evidencia en vivo

- PR #142 verificado: cargo del 6-nov aparece `06/11/2026`; pago de $2 conserva referencia en tabla, búsqueda y editor. Cambiar sólo la referencia a `QA-EDIT2-REF-OK` tuvo éxito por UI y persistió con importe/vínculo $2.
- Aplicación de depósito: ingreso de garantía $3, aplicado por UI al cargo nuevo. BD confirmó dos vínculos del mismo pago: `security_deposit_application` a la garantía y `client_payment_to_financial_record` al cargo, ambos $3. La disponibilidad UI pasó 3 → 0. El botón eliminó ese pago; BD confirmó borrado lógico y la disponibilidad volvió a 3.
- Devolución parcial de $1 por UI persistió como **expense**, categoría `Devolución de Depósito`, referencia `QA-EDIT2-REFUND`. El historial la excluyó y conservó sólo el pago ordinario de $2. La RPC de edición sobre ese id como authenticated reprodujo `PAYMENT_NOT_FOUND`, incluso sin cambiar el importe. No se presenta ese caso como aprobado.
- Los botones de editar/eliminar del historial carecían de nombre accesible. Se añaden etiquetas y título en móvil/escritorio sin cambiar el flujo.

### Corrección preparada, no aplicada a producción

Migración generada por CLI: `20261106214659_scope_atomic_payment_edits.sql`. Mantiene firmas de edición y eliminación. El trigger sigue SECURITY INVOKER y conserva las guardas de identidad, empresa, categoría, relaciones y semántica. Una tabla en `fleetease_private`, con RLS sin políticas y sin permisos de escritura de clientes, almacena una autorización de un uso ligada a transacción/backend/pago/empresa/actor/importes exactos. Sólo la RPC privilegiada la crea después de validar el perfil activo admin/editor/super_admin y bloquear el pago. El trigger consume esa transición; raw UPDATE, flags GUC y otras modificaciones sensibles siguen rechazados. La limpieza de esta autorización técnica no elimina historial financiero. Se conserva la excepción previa de super_admin; su contrato requiere empresa en perfil, igual que antes.

La RPC normaliza importe a los mismos dos decimales de `financial_records.amount` antes de autorizar/asignar/auditar, y rechaza cero resultante, NaN e infinitos. Además de pagos, admite exclusivamente gastos con categoría normalizada de devolución y vínculo propio `security_deposit_refund`; los gastos ordinarios y devoluciones huérfanas se rechazan. La rama de aplicación de garantía exige type=payment para no capturar devoluciones expense por su descripción. UI incluye esas devoluciones en el historial. No se altera la clasificación expense en BD ni fórmulas protegidas.

Fuente de verdad: financial_records y sus vínculos/asignaciones. Escritores: RPC existentes de pagos, garantía y devolución. Consumidores afectados: historial/editor, saldos del cliente, CxP y compras. Se reutiliza el reconciliador existente de proveedor; no se crea otro cálculo de saldo. La selección/roles se validan en BD, no mediante metadatos editables ni ocultando controles.

### Validación y límites

- Fixture `supabase/tests/atomic_payment_edit.sql` en PGlite 0.5.15: baseline RED `FINANCIAL_SENSITIVE_FIELDS_IMMUTABLE`; con la migración, `ATOMIC_PAYMENT_EDIT_PASS`.
- Prueba edición 4 → 5 (entrada 5.001 normalizada), disminución/reasignación, referencia sin cambio de importe, aplicación de garantía 3 → 2, devolución expense 1 → 2 y reversión. Cubre nombre de categoría con espacios y descripción que contiene «Depósito aplicado».
- Rechaza raw UPDATE, GUC falsificado, escritura de autorizaciones, sobrepago, cero/redondeo a cero/NaN/infinito, pago/cargo de empresa ajena, otro cliente, ingreso/gasto ordinario, devolución sin vínculo, cliente/socio/perfil eliminado/ausente y falta de auth. Admin/editor y superadmin con empresa pasan. Anon no ejecuta las RPC.
- Fallo deliberado de auditoría **después** del UPDATE comprueba rollback conjunto de importe, vínculos, auditoría y autorización. No quedan autorizaciones tras éxito, sin cambio de importe ni fallo.
- El fixture incorpora una copia del reconciliador vivo de proveedor: edición parcial $5, total $12 y eliminación cambian CxP/compra de partially_paid a paid y pending. Es prueba SQL aislada, **no UI ni BD productiva de proveedor**. Crédito falla cerrado mediante stub y sigue sin validar sus recálculos completos.
- Regresión de interfaz RED/GREEN para devolución omitida y acciones accesibles. Siete suites relevantes: **20/20 pruebas aprobadas**. TypeScript y build aprobados; advertencias Tailwind existentes. Job nuevo CI ejecuta el fixture con psql en PostgreSQL 17 aislado; aprobado posteriormente para `8371c608` como consta arriba. No se repitió la suite completa anterior ni se afirma lint aprobado.
- Revisión independiente detectó precisión y normalización de categoría; ambos casos corregidos y añadidos al fixture. No se encontraron bypass de capacidad/tenant/roles. Advisors previo mantiene 16 funciones SECURITY DEFINER accesibles a authenticated y protección de contraseñas filtradas deshabilitada. Repetir después de aplicar el SQL; no se afirma una revisión posterior a una migración aún no aplicada.

**Limpieza verificada:** cargo `ae9fec99-95e3-4d4a-bc35-d17600068c48` ($11), garantía `cf222d9d-bb67-4343-b558-b3a48553733f` ($3), pago directo `928e3d0f-102c-442b-a869-6bb0fa61fa2d` ($2), aplicación `9baf487f-3367-4ca5-b4ba-2ea71591c036` ($3), devolución `9e32c478-537e-4c04-9643-fbe7883a3de2` ($1): los cinco tienen is_deleted=true. Los dos pagos se retiraron por sus botones UI. Devolución/cargo/garantía se retiraron por la RPC ordinaria para limpiar únicamente estas filas nuevas; **no equivale a probar el nuevo borrado especializado de devolución**. No se modificaron datos históricos de forma persistente ni se transfirió dinero. Tras recarga, vista Pagos $0/cero filas y garantía disponible $0; aplicaciones activas sobre los dos cargos nuevos suman 0.

**Estado:** C3 parcial hasta aplicar la migración tras revisión/autorización y probar por UI la edición de importes, edición/reversión de devoluciones y otros roles. Crédito, multa, proveedor en vivo, concurrencia y demás pendientes de C1–C5 siguen abiertos. La migración no hace backfill ni cambia datos existentes. No retirar la tabla privada mientras el trigger la referencie; una reversión posterior requiere migración coordinada de las funciones. El resto del documento conserva el historial anterior.

## Continuación tras PR #141 — pagos desde UI con administrador QA

Base integrada: PR #141, merge `8b99fd1aa608522d1d8b5aadb3d82d437c34bcc2`. Sesión de producción: QA Administrador. Sólo se utilizó QA FleetEase Demo y registros nuevos desechables.

| Caso | Evidencia real | Resultado |
|---|---|---|
| Parcial | Cargo $10, pago UI $4. BD confirma vínculo `client_payment_to_financial_record` y `amount_applied=4`; selector muestra pendiente $6. | Aprobado |
| Editar importe | UI intentó cambiar $4 a $5. El importe permaneció en $4. La misma RPC bajo authenticated en transacción reproduce `P0001 FINANCIAL_SENSITIVE_FIELDS_IMMUTABLE` en `enforce_financial_record_integrity`. | **Bloqueado, abierto** |
| Liquidación | Segundo pago UI $6, BD confirma segundo vínculo por $6; historial total $10, dos pagos. | Aprobado |
| Eliminar parcial | Botón UI elimina lógicamente el pago $4; BD lo confirma y el historial baja a $6. | Aprobado |
| Eliminar restante | Botón UI elimina lógicamente el pago $6; BD lo confirma. Tras recarga: $0 y cero pagos en esta vista. | Aprobado |
| Fecha civil | BD `2026-11-06`, selector e historial muestran `5/11/2026` en la zona del navegador. | Fallo de presentación confirmado |
| Referencia | BD conserva `QA-PAYUI-1106-P1` y `QA-PAYUI-1106-P2`; historial muestra «—» y edición empieza con referencia vacía. | Fallo de lectura confirmado |

**Causas y cambios de esta rama.** El proveedor de datos omitía `reference_code`, `source_record_id/type` y `related_record_id/type` en la proyección de `financial_records`, aunque el mapper y el tipo ya los admiten. Se añaden a la misma consulta, preservando empresa, borrado lógico y paginación. Así la referencia persistida vuelve al historial, búsqueda y formulario de edición. La presentación convertía DATE mediante `new Date('YYYY-MM-DD')`, interpretado como UTC; se usa el helper compartido `formatDate`, que trata fechas civiles como hora local, en historial y selectores de pagos, incluidas compras y vencimientos. No se modifican fechas guardadas, filtros ni fórmulas financieras.

**Bloqueo de edición pendiente.** La RPC especializada intenta modificar `amount`, pero el trigger de integridad prohíbe ese campo al admin incluso dentro de la RPC SECURITY DEFINER. No se retira ni se relaja esa protección en este bloque. Requiere una corrección de BD acotada al flujo atómico y pruebas de permisos, reversión, vínculos y recálculos. Esta rama no corrige ni declara aprobado ese caso. Las referencias de la edición fallida no se persistieron.

**Regresión local:** una prueba ejecuta la consulta real del proveedor contra una respuesta simulada que respeta su proyección y comprueba referencia, trazabilidad y filtros. Otra renderiza el historial con DATE `2026-11-06` en America/Mexico_City. Ambas fallaron antes del cambio por el comportamiento observado y pasan después. Son pruebas con dependencias simuladas, no E2E del cliente corregido. TypeScript y build de producción aprobados (variables CI ficticias). Las dos regresiones pasan en America/Mexico_City y UTC. Lint no pudo ejecutarse: ESLint 9 no encuentra configuración flat y el modo legacy falla por referencia circular del plugin React en la configuración existente; no se presenta como aprobado. Se conserva la suite completa anterior de 369 aprobadas/5 fallidas conocidas, sin afirmar una nueva ejecución completa. Validación CI y preview del nuevo HEAD pendientes al abrir el PR.

**Limpieza:** cargo `be57ebb8-68c2-4778-baf9-73a54ff221f8`, descripción `QA-REAUDIT-20261106-PAYUI`; pagos `4444bdb2-f879-401b-a87a-279ae135b45a` ($4) y `6ab59c10-3f15-430f-8694-19aa6d1e8407` ($6). Ambos pagos quedaron eliminados por sus botones UI. El cargo se retiró mediante `soft_delete_tenant_record` como authenticated QA. Los tres tienen `is_deleted=true`. Se conservaron vínculos y auditoría, sin borrado físico ni cambios persistentes a registros previos. La vista Pagos volvió a su estado inicial tras recarga. No se afirma que los datos históricos de pago en BD sean cero ni se presenta esta prueba como conciliación de todo el cliente.

**C3 continúa parcial:** ahora hay evidencia UI de alta parcial/completa y borrado de pagos ordinarios de cliente. Siguen abiertos edición de importe, reversiones de crédito/proveedor/multa/depósito, concurrencia y otros roles. C1 y C5 conservan sus pendientes. El resto del documento es historial anterior a esta continuación.

## C3 — verificación posterior a integración en producción

El PR #140 se fusionó como `a8acefe84f231e4dede0881a79b7cac1987eacaa`. El despliegue de producción `dpl_78vLV9JwSwoGo3GNgCBH3pLqy8vM` pasó a READY con ese commit. Los cuatro workflows del HEAD final `8e4d1bda` aprobaron: quality gate #993, E2E #268, MCP #443 y Lighthouse #2284.

**Borrado de ingreso con admin de empresa, aprobado en producción.** La sesión visible era QA Administrador, rol Administrador, en `www.fleetease.com.mx`. Se reactivó sólo la fila desechable de $1 `e78b3859-d673-46cd-91b9-fa2870ee49e8` con filtros de id/empresa/descripción/importe para repetir el caso original. El botón Eliminar completó el borrado. BD confirmó `is_deleted=true`; tras recarga había cero filas con el marcador, 18 ingresos y $45,700. No se ejecutó limpieza administrativa después del botón.

**Borrado de vehículo con admin de empresa, aprobado en producción.** Se insertó un vehículo nuevo, sin asignación, documentos ni crédito, costo 0, placa `QAC31106`, id `5a412713-1326-4dde-ad20-df966bc5ec59`, sólo en QA FleetEase Demo. El botón Eliminar mostró éxito; BD confirmó `is_deleted=true`. Tras recarga el vehículo no aparecía y el total volvió de 22 a los 21 registros originales (20 activos/rentados). No se eliminó ningún vehículo preexistente. Durante la transición del modal se observó brevemente el nombre `undefined undefined`; no afectó persistencia y queda como observación UX separada.

**Ciclo de pagos de cliente, aprobado en BD real y revertido.** Bajo rol authenticated y claims del admin QA se creó un cargo desechable de $10 mediante `create_financial_record`, se registraron $4 y $6 mediante `create_financial_payment` y se verificó el importe aplicado mediante los vínculos a pagos activos. Secuencia observada: 4 → 10. La RPC de borrado ordinario rechazó el pago. `delete_financial_payment_atomic` retiró el primer pago y el importe aplicado quedó en 6; al retirar el segundo quedó en 0. Todas las aserciones pasaron antes de lanzar deliberadamente `QA_PAYMENT_LIFECYCLE_PASS_ROLLED_BACK`; la transacción completa se revirtió, incluidos cargos, pagos, vínculos y auditoría. Se confirmó cero cargos con el marcador de esa prueba. No equivale a E2E de pagos ni prueba de recálculo de crédito/proveedor.

**Estado C3: parcial, con borrados ordinarios de ingreso/vehículo validados en producción como admin.** Pendientes: edición y borrado de pagos desde UI, recálculo de créditos/parcialidades y proveedor, reversión de multa/depósito, concurrencia y otros roles. La fórmula protegida no se cambió. No se aplicaron migraciones adicionales en esta verificación.

Las secciones siguientes conservan el historial anterior al despliegue y deben leerse con esta actualización como estado vigente.

## Aplicación autorizada de C3 y prueba en BD real

Con autorización expresa del usuario, se aplicó sin alterar el SQL del PR #140 la migración `soft_delete_tenant_record_rpc`. Supabase la registró como **20261106173252** (archivo original `20261106165829_soft_delete_tenant_record_rpc.sql`). La función existe, `search_path` está vacío, anon carece de EXECUTE y authenticated lo tiene. RLS permanece habilitado en ambas tablas.

En BD real, con rol authenticated y claims del administrador QA, pasaron: borrado ordinario de ingreso (devuelve 1 y la fila queda oculta), rechazo de repetición, empresa ajena, tabla arbitraria, vehículo asignado y pago financiero; borrado de vehículo disponible (devuelve 1 y queda oculto). Se ejecutó todo dentro de una transacción revertida. Se verificó después que el ingreso QA anterior sigue eliminado y el vehículo disponible volvió a su estado original, sin eliminar.

El contrato de la RPC se regeneró desde el esquema vivo y se incorporó únicamente esa entrada a los tipos de Supabase, evitando cambios ajenos por drift. Se retiró el contrato/cast local del helper.

Los cuatro workflows del commit `041c1819` terminaron en success: quality gate #992, E2E #267, MCP #442 y Lighthouse #2283. Su preview READY se probó tras iniciar sesión de forma segura. La cuenta elegida por el usuario tiene rol Super Admin y la empresa seleccionada fue QA FleetEase Demo. Sólo se reactivó el ingreso desechable anterior de $1 mediante operación administrativa acotada por id/empresa/descripción/importe. **El botón Eliminar del preview lo borró correctamente:** en BD quedó `is_deleted=true`; tras recarga desapareció del listado y volvieron **18 ingresos y $45,700**. Esta segunda limpieza sí ocurrió a través de la aplicación corregida, sin limpieza administrativa posterior.

La prueba UI demuestra el flujo con Super Admin; la prueba de BD real con claims del administrador QA demuestra la transición afectada por RLS. No se presenta como E2E con rol admin de empresa. **C3 sigue parcial hasta integrar/desplegar y repetir UI con ese rol, vehículos y reversiones.** El PR #140 todavía no está fusionado; producción conserva el cliente anterior. Los secretos del inicio de sesión no se leyeron ni se guardaron en los artefactos.

Advisors: el aviso de funciones SECURITY DEFINER ejecutables por authenticated pasa de 15 a 16, exclusivamente por la nueva RPC intencional y acotada. No es una auditoría sin avisos. La protección de contraseñas filtradas continúa deshabilitada, sin cambios. La revisión independiente previa comprobó las guardas de pagos/créditos y vehículos protegidos.

Las secciones siguientes conservan el diagnóstico y la secuencia de preparación anterior a esta aplicación.

Base integrada: `ad18f2b90b46d0c455ca22d1a0f6730a748f6d94` (PR #139, documental), posterior al merge de #136 `3f11c7414b4b1056407fa9c8365a4c0a592da56e`. Navegador: `www.fleetease.com.mx`, sesión existente de QA Administrador en QA FleetEase Demo. El usuario autorizó estas pruebas. Las consultas de permisos usaron `SET LOCAL ROLE authenticated` y claims del usuario QA dentro de transacciones; no sustituyen un login ni una llamada REST con JWT real.

## Resultados en el entorno desplegado

| Área | Resultado observado | Límite de la evidencia |
|---|---|---|
| C2, fecha futura en UI | Ingreso con fecha `2027-01-01`: “La fecha no puede ser futura.” No se guardó. | Un formulario, sin prueba del cambio de día. |
| C2, guarda de BD | UPDATE de fecha al día siguiente, con rol authenticated: `22023 FINANCIAL_DATE_IN_FUTURE`. | Se probó UPDATE; INSERT y todos los formularios pendientes. |
| Alta válida | Ingreso de $1 con descripción `QA-REAUDIT-20261106-C2-C3`, fecha `2026-11-06`, persistió en BD y listado. | Sólo flujo de ingreso ordinario. |
| C3, borrado | Dos intentos desde UI fallaron. La fila seguía activa tras recarga. UPDATE directo como authenticated reprodujo `42501 new row violates row-level security policy for table financial_records`. | **C3 abierto.** La corrección previa sin RETURNING no basta. |
| C4, guardas de BD | Futuro: `22023 ASSIGNMENT_DATE_IN_FUTURE`; antes del alta: `23514 ASSIGNMENT_BEFORE_VEHICLE_CREATION`; fin anterior: `23514 ASSIGNMENT_END_MUST_FOLLOW_START`. | Operaciones rechazadas y revertidas. No concurrencia real. |
| C4, historial | Atajo de cliente: `23514 CLIENT_VEHICLE_ASSIGNMENT_REQUIRES_HISTORY`; atajo de vehículo: `23514 VEHICLE_CLIENT_ASSIGNMENT_REQUIRES_HISTORY`; solapamiento: `23P01 VEHICLE_ASSIGNMENT_PERIOD_OVERLAP`. | No se modificaron asignaciones históricas de forma persistente. |
| C4, ciclo válido | En transacción: asignar vehículo/cliente disponibles, comprobar ambos vínculos, finalizar y comprobar ambos vínculos liberados. Todas las aserciones pasaron antes de la excepción deliberada `QA_PASS_ASSIGNMENT_CREATE_END_ROLLED_BACK`. | Prueba de BD, no E2E completo. Cero filas de prueba persistentes. |
| Documentos | Descarga de tarjeta de circulación desde ficha QA inició y produjo archivo descargado. | No se modificó ni compartió el documento. |
| Storage RLS | En siete buckets: INSERT/SELECT/UPDATE de metadatos bajo prefijo propio permitido. INSERT con prefijo de otra empresa y UPDATE para mover a ese prefijo rechazados. Los 28 resultados booleanos fueron true. | Metadatos en transacción revertida; no prueba de upload binario ni de una segunda sesión de empresa. |
| Storage anónimo | Rol anon obtuvo cero objetos de esos buckets privados; authenticated QA veía nueve objetos propios en vehicle-documents. | No se probó expiración ni enlaces compartidos de un uso. |
| Sesión | Recarga de ruta protegida y segunda pestaña mantuvieron QA Administrador y cargaron datos. | Sesión preexistente. No login nuevo, logout entre pestañas, expiración ni reinicio del navegador. |

Buckets probados: `vehicle-documents`, `driver-documents`, `financial-receipts`, `general-documents`, `contract-templates`, `client-documents`, `clients`. Las dos pruebas de metadatos terminaron mediante excepción deliberada con el JSON de resultados, revirtiendo la transacción completa. Un error de herramienta con esos marcadores no representa un fallo del caso.

## Limpieza acotada

La única fila financiera creada fue `e78b3859-d673-46cd-91b9-fa2870ee49e8`, $1. Tras reproducir el fallo, se marcó `is_deleted=true` con operación administrativa autenticada, restringida por id, empresa, descripción e importe. No se presentó esa limpieza como éxito del borrado de la aplicación.

Se verificó en BD `is_deleted=true`; authenticated ya no ve la fila. En la segunda pestaña: **18 ingresos y $45,700**, los mismos totales anteriores al ensayo. Cero asignaciones con el marcador de prueba y cero metadatos nuevos. Los registros QA anteriores y el movimiento histórico futuro permanecen intactos.

## Corrección propuesta de C3

`src/lib/soft-delete.ts` pasa a una RPC acotada y requiere la migración `20261106165829_soft_delete_tenant_record_rpc.sql`. En la primera prueba la migración aún no estaba aplicada; la actualización superior documenta su aplicación autorizada y las pruebas posteriores.

La operación valida identidad, perfil activo en BD, rol admin/editor/super_admin, empresa explícita, tabla permitida y exactamente una fila. Mantiene SELECT RLS y los filtros de empresa. SECURITY DEFINER es necesario para esta transición porque SELECT RLS rechaza la fila nueva eliminada; la elevación queda limitada a dos UPDATE estáticos, `search_path=''`, revocación de PUBLIC/anon y grant sólo a authenticated. No usa metadatos editables del JWT para decidir permisos.

La rama financiera acepta únicamente ingresos/gastos sin vínculo ni flags de crédito. **Pagos, créditos otorgados y registros vinculados a crédito requieren sus flujos especializados de reversión/cancelación.** La rama de vehículos bloquea la fila y rechaza cliente, historial abierto, vínculo inverso de cliente, bloqueo/vínculo de crédito o crédito activo. El lock se coordina con el de la guarda de asignaciones. No se alteran fórmulas protegidas ni cálculos de saldos.

Fuente de verdad: `financial_records`, `vehicles`, asignaciones y créditos en BD. Escritores: helper/RPC de borrado ordinario y RPC existentes para pagos/créditos. Consumidores: proveedor de datos, dashboard, ingresos/gastos, reportes y rentabilidad. No se añadió un segundo cálculo. El borrado ordinario se limita a una fila; las reversiones financieras quedan fuera y requieren su prueba integrada.

La migración, la regeneración del contrato y la prueba del botón desde el preview con Super Admin ya están completadas. Sigue pendiente integrar/desplegar el cliente y repetir UI con rol admin de empresa. Los tipos de la RPC proceden del esquema vivo; no queda cast local.

## Regresión aislada y validación local

`supabase/tests/soft_delete_tenant_record.sql` se ejecutó en PostgreSQL aislado mediante PGlite 0.5.15. Crea roles/esquemas/tablas mínimos y reproduce las políticas SELECT/UPDATE del caso real; **no cargar este fixture en la BD de la aplicación**. Puede ejecutarse con psql en una base vacía y `ON_ERROR_STOP=1`; `\ir` carga el SQL real de migración y termina con ROLLBACK.

El fixture reproduce el 42501 del UPDATE directo y verifica borrado ordinario confirmado, fila oculta, repetición, empresa ajena, id ajeno, tabla arbitraria, empresa ausente, usuario sin perfil, perfil eliminado, rol client, ausencia de auth, revocación anon y superadmin. Incluye rechazo/preservación de cuatro movimientos financieros protegidos y seis vehículos protegidos. No incorpora todos los triggers productivos ni demuestra concurrencia entre dos conexiones.

- Regresión del helper: RED observado con el error RLS antes del cambio; **4/4 aprobadas** después.
- Regresión de vehículo protegido: RED `Assigned or credit vehicle deleted` antes de las guardas; aprobada después.
- Prueba de mutación: al retirar las guardas financieras del SQL en memoria, el fixture detectó `Specialized financial flow bypassed`.
- `npm run type-check`: aprobado.
- `npm run build`: aprobado con variables CI ficticias. Advertencias existentes de clases Tailwind ambiguas.
- Suite completa: **369 aprobadas y 5 fallidas**, las mismas documentadas previamente: cuatro casos de `src/__tests__/lib/auth-persistence.test.ts` (persistencia localStorage/sessionStorage, cambio de preferencia y limpieza al salir), y `financial-metrics > filterRecordsByDateRange > incluye los límites del rango (inclusivo)` en `src/__tests__/lib/financial-metrics.test.ts`.

## Pendientes que no se cierran

C1 (atribución, entidades eliminadas, exports y conciliación histórica), C3 E2E del cliente nuevo y reversión de pagos, concurrencia de asignaciones, matriz completa de fechas, upload binario y segunda cuenta de empresa, enlaces compartidos de un uso/vencimiento, login nuevo/refresh/logout/reinicio, VIN/placa, atomicidad de administración de crédito y drift global C5. Las tres migraciones anteriores y la cuarta migración de C3 están registradas.
