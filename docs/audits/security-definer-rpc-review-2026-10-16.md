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
| `offboard_client_with_writeoff(uuid,text)` | Autoriza si la empresa del cliente coincide con la del usuario o si `is_user_admin()` devuelve true. | **Prioridad alta:** confirmar semántica de admin global; comprobar que un rol de empresa no pueda dar de baja clientes de otro tenant y probar la contabilización de incobrables. |
| `process_credit_payment_atomic(...)` | Requiere usuario/empresa; valida empresa, crédito, cliente asociado, importe y asignación a calendarios de pago. | **Prioridad alta:** pruebas transaccionales de sobrepago, IDs cruzados, pagos concurrentes y recálculo de saldo. |
| `update_financial_payment_atomic(...)` | Requiere usuario/empresa; limita pago y objetivos por empresa, valida importes y relaciones entre cliente, crédito, depósito y cuenta por pagar. | **Prioridad alta:** pruebas por cada tipo de pago y verificación de autorización por rol antes de editar o reasignar pagos. |
| `update_financial_record_metadata(uuid,jsonb)` | Requiere usuario/empresa; limita el registro al tenant y bloquea cambios a campos financieros sensibles. | Verificar lista de campos editables, autorización por rol y validación estricta de tipos/URLs de evidencia. |

## Riesgos que permanecen abiertos

1. **Permiso EXECUTE no equivale por sí solo a una vulnerabilidad explotable.** El riesgo depende de si la función necesita ser RPC pública autenticada, de los checks internos y de sus consumidores.
2. **No se recomienda revocar EXECUTE masivamente.** Los dos helpers de identidad están referenciados por políticas RLS; las RPCs financieras son invocadas desde la aplicación y podrían dejar de funcionar si se revocan.
3. **Autorización por rol:** los controles de tenant están presentes en gran parte del código, pero no bastan para decidir si cualquier usuario autenticado de una empresa puede ejecutar operaciones financieras. Es necesario comparar cada RPC con las reglas de negocio de FleetEase.
4. **Superadministración:** las ramas especiales de `super_admin` y el permiso administrativo de `offboard_client_with_writeoff` requieren validar el modelo de roles esperado, especialmente el acceso entre empresas.
5. **Pruebas:** esta revisión no ejecutó escrituras de prueba en producción ni pruebas de explotación. Los casos de autorización deben validarse en entorno aislado antes de cualquier cambio de permisos.

## Plan seguro de remediación

1. Buscar en el repositorio todos los consumidores de las 15 RPCs y helpers; registrar rutas, módulos y roles que las invocan.
2. Añadir pruebas de autorización por tenant y rol para cada RPC, con casos negativos de IDs de otra empresa.
3. Separar helpers necesarios para RLS de RPCs de negocio. No cambiar permisos de los helpers hasta verificar todas las políticas dependientes.
4. Para funciones que no deban ser invocables directamente, preparar una migración versionada con grants mínimos y pruebas de regresión; revisar el diff antes de aplicarla.
5. Mantener intacta la producción hasta que la migración pase pruebas y sea aprobada explícitamente.

## Hallazgo adicional del Security Advisor

Sigue activo el aviso **Leaked Password Protection Disabled** en Supabase Auth. Esta opción no se ha cambiado desde la conexión disponible; requiere activación desde el panel de Supabase Auth. Referencia: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Estado

**Auditoría estática preliminar documentada; no se han cambiado privilegios ni datos de producción.** El siguiente paso es el rastreo de consumidores en el repositorio y las pruebas negativas de tenant/rol.