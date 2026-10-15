# FleetEase MCP — auditoría de seguridad, arquitectura y costes

Fecha de inicio: 2026-10-15  
Rama de trabajo: `audit/mcp-multitenant-security-costs`  
Issue de seguimiento: https://github.com/JuanGodinezperez18/FleetEase/issues/53

## Estado

Auditoría inicial en curso. Esta rama documenta hallazgos y criterios; todavía no incorpora un endpoint MCP ni modifica lógica de negocio, base de datos o producción.

## Hallazgos iniciales verificados

### 1. Dependencia MCP
- El `package.json` de `master` no incluye `@modelcontextprotocol/sdk`.
- Antes de añadir dependencias, confirmar versión estable compatible con Next.js 16, transporte Streamable HTTP y despliegue en Vercel.

### 2. Autenticación del endpoint
- `middleware.ts` declara `matcher: ['/((?!api).*)']`, por lo que las rutas `/api` no pasan por su comprobación de sesión.
- El endpoint MCP deberá validar cada solicitud de forma independiente: identidad, emisor/audiencia, expiración, permisos, revocación y empresa activa. No se debe confiar en un `company_id` enviado por el modelo.

### 3. Servicios de datos
- `src/lib/supabase-services.ts` incluye operaciones CRUD genéricas que consultan por ID o tabla sin añadir explícitamente un filtro `company_id` en cada método.
- Esto no prueba por sí solo una vulnerabilidad explotable: la cobertura de RLS y el cliente Supabase usado deben verificarse. Sin embargo, estos métodos no se deben exponer directamente a herramientas MCP.
- Diseñar una capa de dominio MCP que derive el contexto empresarial desde la sesión/membresía autorizada y aplique controles de permisos por operación.

### 4. Funciones SQL privilegiadas y operaciones financieras
- La migración `supabase/migrations/20260929130000_atomic_expense_creation.sql` define `public.create_expense_atomic(jsonb)` como `SECURITY DEFINER`, establece `search_path = ''`, revoca ejecución a `anon, public` y la concede a `authenticated`.
- La función comprueba identidad, empresa, importe y relación con categoría/cliente/vehículo/socio; falta revisar sus supuestos y el resto de funciones privilegiadas antes de decidir si alguna es apta para el canal MCP.
- No conceder al agente SQL arbitrario ni acceso general a funciones privilegiadas.

### 5. Estado de migraciones
- La lista conectada de migraciones incluye endurecimiento de RLS, permisos de funciones, operaciones financieras atómicas, multas, pagos y proveedores hasta octubre de 2026.
- La presencia de migraciones de seguridad no sustituye pruebas de aislamiento reales. Se debe contrastar el esquema desplegado, políticas activas, privilegios y rutas de llamada.

### 6. Dependencias y pruebas
- `package.json` incluye scripts `type-check`, `test:ci` y `build`.
- Antes de cambios funcionales, registrar el estado real de estos checks y localizar pruebas existentes de autorización, aislamiento por empresa y consistencia financiera. No asumir que la ausencia de resultados de una búsqueda de nombres implica que no existen pruebas.

## Plan de auditoría

1. **Inventario de autorización:** roles/membresías, selección de empresa, scopes y revocación de acceso.
2. **RLS y funciones SQL:** políticas por tabla, privilegios `EXECUTE`, `SECURITY DEFINER`, `search_path`, validaciones de tenant y rutas que pueden alterar datos.
3. **Servicios de dominio:** identificar las operaciones existentes correctas para vehículos, clientes, gastos, ingresos, créditos, pagos, socios, multas y reportes.
4. **Amenazas MCP/OAuth:** tokens inválidos, vencidos o revocados; confusión de audiencia; repetición de solicitudes; abuso de herramientas; filtración de datos en errores y logs.
5. **Pruebas de aislamiento:** usuarios de al menos dos empresas y varios roles; probar lecturas, escrituras y referencias cruzadas entre tenants.
6. **Compatibilidad y rendimiento:** cliente MCP de lectura, límites, paginación, timeout, observabilidad y coste por llamada.
7. **Modelo de coste:** separar inversión inicial, coste fijo de hosting, consumo incremental de base de datos, logs, mantenimiento y uso de modelos. Medir con datos reales cuando el piloto esté autorizado.

## Controles obligatorios para el diseño

- No usar `service_role` en el cliente ni entregar secretos al agente.
- No confiar en identificadores de empresa proporcionados por el modelo.
- No exponer herramientas genéricas como `execute_sql`, `update_any_table` o `delete_record`.
- Aplicar mínimo privilegio por herramienta, usuario, empresa y plan.
- Para operaciones financieras o destructivas: vista previa, autorización explícita, idempotencia, registro de auditoría y validación de saldos.
- No duplicar reglas de negocio ni sustituir los flujos financieros atómicos existentes sin pruebas.
- Mantener la conexión incluida en los planes como objetivo comercial; controlar abuso con límites técnicos razonables y medir el coste marginal.
- No integrar a `master` ni desplegar escrituras en producción hasta completar pruebas y revisión.

## Criterios de salida de auditoría

- Matriz documentada de roles × herramientas × permisos.
- Hallazgos priorizados por severidad con evidencia reproducible.
- Pruebas automatizadas de aislamiento entre empresas.
- Lista aprobada de herramientas iniciales de solo lectura.
- Modelo de costes con supuestos explícitos y alertas de consumo.
- Plan de implementación en PR separado y comprobaciones de CI aprobadas.

## Estimación preliminar — no es cotización

La estimación anterior de 100–176 horas (aprox. $50,000–$176,000 MXN usando una referencia de $500–$1,000 MXN/h) es solo una hipótesis de planificación. Se actualizará después de revisar autorización, RLS, funciones financieras y cobertura de pruebas. No se dispone todavía de un desglose verificable de facturación real de Vercel ni del plan contratado de Supabase, por lo que los costes recurrentes deben confirmarse con los paneles de facturación.


## Evidencia adicional revisada en el repositorio

Se encontró un informe previo del 2026-10-03, `docs/bloque-b-security-audit-2026-10-03.md`, que declara RLS en 37/37 tablas públicas, aislamiento `company_id`, `search_path` fijo en funciones `SECURITY DEFINER`, revocaciones a `anon` y controles de Storage. También documenta que la protección de contraseñas filtradas en Supabase Auth quedó como paso manual pendiente. Este informe es evidencia de trabajo previo, no una verificación independiente del estado actual; se debe contrastar con las políticas y privilegios activos.

La migración `supabase/migrations/20260927140500_security_definer_execute_hardening.sql` muestra revocaciones explícitas de `anon, public` para funciones RPC de negocio y revoca `authenticated` de dos funciones administrativas. Por tanto, no se debe concluir que todas las funciones privilegiadas están expuestas: hay que revisar función por función, quién la ejecuta y qué validación interna realiza.

### Riesgo de diseño específico para MCP

El SDK/servidor MCP no debe reutilizar el cliente Supabase singleton de uso general ni los métodos CRUD genéricos como frontera de autorización. Cada llamada deberá recibir un contexto autenticado y crear una ruta de ejecución acotada, con herramientas explícitas y validación de permisos/tenant en el servidor. La cobertura RLS existente debe mantenerse como segunda barrera.

### Pendientes antes de programar el endpoint

- Verificar en el proyecto Supabase activo la protección de contraseñas filtradas y registrar el resultado.
- Obtener inventario de políticas activas por tabla y grants efectivos de las funciones RPC relevantes.
- Confirmar cómo se resuelven membresías y roles para usuarios con acceso a varias empresas.
- Identificar pruebas actuales y crear casos cruzados entre tenants antes de añadir herramientas.
- Confirmar el plan de Supabase y los cargos reales de Vercel; los datos de facturación consultados previamente no dieron un total verificable.


## Revisión de advisors del proyecto Supabase activo (2026-10-15)

Proyecto consultado: `FleetEase` (`qettktslcbjjuyejcpqy`), estado `ACTIVE_HEALTHY`, PostgreSQL 17.6, región `ca-central-1`.

- **Security Advisor:** 15 avisos `authenticated_security_definer_function_executable`. Incluye helpers de identidad/rol y RPCs de negocio (créditos, gastos, multas, pagos y offboarding). Es un aviso de exposición por `authenticated`, no una prueba de vulnerabilidad por sí mismo. Antes de usar una RPC desde MCP hay que comprobar que el cuerpo valida el usuario/empresa, que no acepta una empresa ajena y que las operaciones sensibles exigen el permiso apropiado. No revocar en bloque: podría romper flujos existentes.
- **Performance Advisor:** 54 índices marcados como no utilizados. No se eliminarán en lote; un índice puede ser necesario para consultas poco frecuentes, integridad o cargas no capturadas por el periodo del advisor.
- **Limitación de verificación:** estos advisors no sustituyen la prueba de acceso cruzado entre empresas, ni confirman por sí solos el estado de la configuración de protección contra contraseñas filtradas.

### Decisión técnica derivada

El primer piloto MCP debe ser estrictamente de solo lectura, con herramientas explícitas y filtros de empresa derivados de la identidad validada. Las escrituras financieras quedan fuera del piloto hasta revisar RPC por RPC y disponer de pruebas automatizadas de permisos e idempotencia.
