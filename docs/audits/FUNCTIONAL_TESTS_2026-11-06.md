# Pruebas funcionales de reauditoría — 6 de noviembre de 2026

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
