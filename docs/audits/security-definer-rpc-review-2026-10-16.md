# Revisión de funciones SECURITY DEFINER expuestas a authenticated

**Fecha:** 2026-10-16 UTC  
**Proyecto revisado:** Supabase `qettktslcbjjuyejcpqy`  
**Alcance:** solo lectura de catálogo PostgreSQL, definiciones de funciones y Security Advisor. No se modificaron funciones, privilegios, datos, tablas ni políticas.

## Resultado ejecutivo

Supabase Security Advisor detecta **15 funciones SECURITY DEFINER ejecutables por `authenticated`**. El aviso es válido como señal para revisar superficie de API, pero **no justifica revocar EXECUTE en bloque**: varias funciones son RPC transaccionales que implementan operaciones financieras y otras se usan como helpers de RLS. Revocar sin rastrear sus consumidores podría romper pagos, créditos, gastos, multas y políticas de acceso.

Todas las 15 funciones observadas fijan `search_path` explícitamente (en la mayoría de RPCs, vacío y referencias calificadas con `public.`). La inspección inicial encontró controles de identidad/empresa en la mayoría de las RPCs de escritura. Esto es una revisión estática preliminar, no una prueba de explotación ni una certificación completa de seguridad.

## Inventario del aviso y evaluación preliminar

| Función | Evaluación inicial | Próxima verificación |
|---|---|---|
| `auth_user_company_id()` | Helper de identidad de tenant; consulta la fila `users` cuyo id coincide con `auth.uid()`. Aparece referenciado por políticas RLS. | Mantener el acceso requerido por RLS; comprobar si debe seguir siendo invocable directamente vía PostgREST y documentar consumidores. |
| `auth_user_role()` | Helper que devuelve el rol de la sesión autenticada; aparece referenciado por políticas RLS. | Igual que el anterior; confirmar todas las políticas dependientes antes de cambiar grants. |
| `cancel_credit_atomic(...)` | Requiere usuario y empresa autenticados, compara la empresa solicitada con la del usuario y limita las filas por empresa; operación financiera sensible. | Revisar la ruta RPC y autorización de roles funcionales; probar cancelación sin pagos y con pagos en fixtures aislados. |
| `cancel_multa_atomic(...)` | Requiere sesión/empresa y compara `p_company_id` con la empresa de sesión; limita la multa y registro financiero por empresa. | Confirmar autorización de rol para cancelar multas y verificar que los parámetros de actor no permitan suplantación (la función obtiene el actor autenticado). |
| `create_credit_atomic(jsonb)` | Requiere usuario/empresa; valida cliente, vehículo y créditos activos dentro del tenant; rechaza un `companyId` distinto. | Probar payloads con IDs de otra empresa y revisar autorización por rol para crear créditos. |
| `create_expense_atomic(jsonb)` | Requiere sesión; valida empresa, cliente, socio y vehículo; incluye rama especial para `super_admin`. | Verificar explícitamente el flujo `super_admin`, que el rol venga únicamente del perfil confiable y que la selección de empresa esté autorizada. |
| `create_financial_record(jsonb)` | Requiere sesión; valida empresa y relaciones de cliente/vehículo/socio/crédito/categoría; incluye rama especial para `super_admin`. | Prioridad alta por impacto financiero: validar cada tipo de registro y autorización de rol; probar IDs cruzados entre empresas. |
| `create_multa_atomic(jsonb)` | Requiere sesión/empresa y valida empresa, cliente y vehículo asociados antes de insertar. | Confirmar reglas de rol y que todos los campos de la multa derivados del cliente se validen también en servidor. |
| `delete_financial_payment_atomic(uuid)` | Requiere sesión/empresa; limita la búsqueda del pago por empresa y tipo. | Verificar autorización por rol y pruebas de borrado lógico/reconciliación de saldos. |
| `get_user_company_id()` | Helper que resuelve empresa desde el perfil autenticado; usado por `offboard_client_with_writeoff`. | Rastrear consumidores y revisar si el duplicado de `auth_user_company_id()` es necesario. |
| `is_user_admin()` | Helper de rol administrativo derivado de `public.users`; usado por la baja de clientes. | Confirmar definición de administrador global vs. administrador de empresa y si exponerlo como RPC es necesario. |
| `offboard_client_with_writeoff(uuid,text)` | Autoriza si la empresa del cliente coincide con la del usuario o si `is_user_admin()` devuelve true. | **Hallazgo de prioridad alta confirmado por inspección estática:** `is_user_admin()` actualmente devuelve true para `admin` y `super_admin`, pero se usa como bypass de empresa en esta función y en políticas RLS. Como `admin` es un rol de personal con ámbito de empresa (el MCP aplica filtro `company_id`), esto puede permitir acceso/operaciones entre tenants. Se preparó la corrección en PR #60, aún sin aplicar a producción. Validar con dos empresas y pruebas RLS antes de aprobar. |
| `process_credit_payment_atomic(...)` | Requiere usuario/empresa; valida empresa, crédito, cliente asociado, importe y asignación a calendarios de pago. | **Prioridad alta:** pruebas transaccionales de sobrepago, IDs cruzados, pagos concurrentes y recálculo de saldo. |
| `update_financial_payment_atomic(...)` | Requiere usuario/empresa; limita pago y objetivos por empresa, valida importes y relaciones entre cliente, crédito, depósito y cuenta por pagar. | **Prioridad alta:** pruebas por cada tipo de pago y verificación de autorización por rol antes de editar o reasignar pagos. |
| `update_financial_record_metadata(uuid,jsonb)` | Requiere usuario/empresa; limita el registro al tenant y bloquea cambios a campos financieros sensibles. | Verificar lista de campos editables, autorización por rol y validación estricta de tipos/URLs de evidencia. |

## Riesgos que permanecen abiertos

1. **Permiso EXECUTE no equivale por sí solo a una vulnerabilidad explotable.** El riesgo depende de si la función necesita ser RPC pública autenticada, de los checks internos y de sus consumidores.
2. **No se recomienda revocar EXECUTE masivamente.** Los dos helpers de identidad están referenciados por políticas RLS; las RPCs financieras son invocadas desde la aplicación y podrían dejar de funcionar si se revocan.
3. **Autorización por rol:** los controles de tenant están presentes en gran parte del código, pero no bastan para decidir si cualquier usuario autenticado de una empresa puede ejecutar operaciones financieras. Es necesario comparar cada RPC con las reglas de negocio de FleetEase.
4. **Superadministración:** las ramas especiales de `super_admin` y el permiso administrativo de `offboard_client_with_writeoff` requieren validar el modelo de roles esperado, especialmente el acceso entre empresas.
5. **Pruebas:** esta revisión no ejecutó escrituras de prueba en producción ni pruebas de explotación. Los casos de autorización deben validarse en entorno aislado antes de cualquier cambio de permisos.

## Comprobación adicional del historial de migraciones

Se localizó `supabase/migrations/20260927140500_security_definer_execute_hardening.sql`. Esa migración ya documenta que las RPC financieras permanecen ejecutables por `authenticated` porque la aplicación las usa, y revoca ejecución a `anon` y `public`. También retira acceso autenticado a `get_superadmin_dashboard_summary()` y `link_financial_records(...)`. Esto confirma que parte del aviso actual corresponde a una decisión explícita de diseño: RPC de negocio autenticadas, no funciones anónimas.

También se encontró una migración específica de seguridad para multas que vuelve a conceder `EXECUTE` a `authenticated` para `create_multa_atomic` y `cancel_multa_atomic` después de revocar `public` y `anon`. Por tanto, no se debe interpretar el aviso del Advisor como evidencia de que esas concesiones fueron accidentales. La revisión pendiente es comprobar que los guards internos y la autorización por rol sean suficientes, además de verificar que el estado real de producción coincide con el historial de migraciones.

## Plan seguro de remediación

1. Buscar en el repositorio todos los consumidores de las 15 RPCs y helpers; registrar rutas, módulos y roles que las invocan.
2. Añadir pruebas de autorización por tenant y rol para cada RPC, con casos negativos de IDs de otra empresa.
3. Separar helpers necesarios para RLS de RPCs de negocio. No cambiar permisos de los helpers hasta verificar todas las políticas dependientes.
4. Validar la migración propuesta en [PR #60](https://github.com/JuanGodinezperez18/FleetEase/pull/60), que limita el bypass global de `is_user_admin()` a `super_admin`; ejecutar pruebas de regresión RLS en un entorno aislado antes de aprobarla.
5. Para funciones que no deban ser invocables directamente, preparar una migración versionada con grants mínimos y pruebas de regresión; revisar el diff antes de aplicarla.
6. Mantener intacta la producción hasta que la migración pase pruebas y sea aprobada explícitamente.

## Validación posterior a la fusión de PR #58

La PR #58 se fusionó el 2026-10-16. La versión de producción de Vercel está en estado `READY` y apunta al commit `76f7da44abf56992d64ac2590e262a83884ce1cc`, que corresponde a la fusión de esa PR. En GitHub Actions, el quality gate de `master` aprobó instalación reproducible, pruebas del middleware, type-check y build. Lighthouse sigue ejecutándose en la última consulta; el presupuesto de bundle ya aprobó.

### Hallazgos de dependencias de producción

El paso `npm audit --omit=dev --audit-level=high` sigue devolviendo **13 vulnerabilidades de runtime: 3 críticas, 7 altas y 3 moderadas**. El workflow está configurado con `continue-on-error: true`, así que el quality gate puede pasar mientras persistan estos hallazgos. Los paquetes destacados en el reporte son:

- `jspdf` hasta 4.2.0: avisos críticos; el fix sugerido por npm requiere una actualización que npm clasifica como breaking.
- `next` 16.0.0–16.3.7: avisos altos; npm sugiere Next 16.4.2 fuera del rango fijado actualmente.
- `sharp` hasta 0.35.5-rc.1: avisos altos en dependencias nativas; el fix sugerido puede cambiar comportamiento/compatibilidad.
- `seroval`: avisos críticos transitivos de `solid-js`; npm indica que hay una corrección no-forzada disponible.
- `uuid` menor que 11.1.1: aviso moderado; la corrección sugerida por `--force` subiría a la versión 14, un salto mayor.
- Dependencias transitivas asociadas a Tailwind 3, incluyendo `braces` y `postcss-selector-parser`, también aparecen en el reporte completo de auditoría.

No se ejecutó `npm audit fix --force`: npm propone cambios incompatibles de Tailwind, jsPDF, Sharp y UUID que requieren actualizar y probar el código consumidor. La remediación de dependencias debe ir en una PR separada con lockfile reproducible, build, pruebas y revisión de exportaciones PDF, imágenes y módulos de Tailwind.

## Hallazgo adicional del Security Advisor

Sigue activo el aviso **Leaked Password Protection Disabled** en Supabase Auth. Esta opción no se ha cambiado desde la conexión disponible; requiere activación desde el panel de Supabase Auth. Referencia: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Estado

**Auditoría estática preliminar documentada; no se han cambiado privilegios ni datos de producción.** El siguiente paso es el rastreo de consumidores en el repositorio y las pruebas negativas de tenant/rol.