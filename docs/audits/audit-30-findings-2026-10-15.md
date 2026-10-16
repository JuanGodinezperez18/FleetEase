# Auditoría de verificación de los 30 hallazgos — FleetEase Manager

- **Fecha de revisión:** 2026-10-15
- **Repositorio:** https://github.com/JuanGodinezperez18/FleetEase
- **Rama base:** `master`
- **Commit base revisado:** `01d8a9d9006b43555e87e6b135355a321cba6ccf`
- **Alcance:** contraste estático de los 30 hallazgos aportados contra los archivos actuales accesibles en GitHub.
- **Límite:** esta revisión de código no demuestra configuración de Supabase/Vercel, resultados actuales de producción, datos de telemetría ni ejecución local de tests/build. Los hallazgos que requieren esos accesos se marcan como pendientes de comprobación, no como vulnerabilidades confirmadas.

## Resumen ejecutivo

La auditoría de origen contiene hallazgos válidos, pero también afirmaciones obsoletas o incorrectas. Dos errores concretos de la auditoría original son que **sí existe un middleware en la raíz del repositorio** (`middleware.ts`) y que **sí existe un manifest PWA estático** (`public/manifest.json`). La aplicación no necesita crear `src/middleware.ts` ni `src/app/manifest.ts` para satisfacer esas funciones.

El riesgo más claro que requiere atención inmediata es la autenticación/autorización real de rutas y la diferencia entre las expectativas de `src/__tests__/middleware.test.ts` y el comportamiento del middleware actual. También deben verificarse el estado de la protección de contraseñas filtradas en Supabase, el modo efectivo del rate limiter en producción, las vulnerabilidades de dependencias y la idempotencia de cron jobs.

No se deben borrar índices, cifrar PII sin un diseño de claves/migración, cambiar la arquitectura de tipos ni aplicar una política nueva de contraseñas en el mismo cambio sin pruebas y compatibilidad.

## Matriz de verificación

Estados:
- **Confirmado en código:** evidencia directa en los archivos revisados.
- **Parcial / requiere comprobación:** el riesgo existe, pero falta verificar cobertura, configuración o ejecución.
- **Incorrecto / desactualizado:** la afirmación original contradice el repositorio actual.
- **No verificable desde el repositorio:** requiere dashboard, telemetría, base de datos o ejecución de CI.

| # | Hallazgo original | Estado y evidencia actual | Prioridad recomendada |
|---|---|---|---|
| 1 | Falta `src/middleware.ts` y no hay protección central | **Incorrecto en ubicación / parcial en comportamiento.** Existe `middleware.ts` en la raíz y llama a `supabase.auth.getUser()` para rutas de página privadas. `src/__tests__/middleware.test.ts` está desalineado: simula `auth.getSession()`, espera redirección de `/login` a `/dashboard` y bloqueos por rol que no implementa el middleware actual. Antes de cambiar autorización, mapear controles reales en layouts/server components y APIs, y corregir/reescribir las pruebas para reflejar el contrato de seguridad esperado. | **P0 — seguridad** |
| 2 | Contraseña mínima de 6 caracteres | **Confirmado.** `src/lib/auth.ts` valida únicamente longitud >= 6. | P1 |
| 3 | Leaked password protection pendiente | **Confirmado en producción por Supabase Security Advisor el 15/16-oct-2026:** está deshabilitada. Activarla en Auth Dashboard y validar con una contraseña de prueba comprometida. No se cambió desde la auditoría. | **P0 — configuración de Auth** |
| 4 | Falta manifest PWA dinámico | **Incorrecto.** Existe `public/manifest.json` y `layout.tsx` referencia `/manifest.json`. Verificar iconos y respuesta HTTP en producción, no crear otro manifest duplicado. | P2 |
| 5 | Regex de email permisivo | **Confirmado parcialmente.** La regex de `validateEmail` es básica, aunque el proveedor también valida el email. No es por sí sola una vulnerabilidad crítica. | P2 |
| 6 | Timeout de perfil de 7 segundos | **Confirmado.** `fetchProfileFromApp` aborta a los 7 s. Medir latencia antes de cambiar el timeout; considerar reintento limitado y mensajes diferenciados. | P2 |
| 7 | Headers duplicados en Vercel y Next config | **Confirmado.** `vercel.json` y `next.config.mjs` declaran varios headers repetidos. El comportamiento efectivo debe comprobarse en respuestas HTTP; CSP se construye en `middleware.ts`. Centralizar con prueba de regresión. | P2 |
| 8 | `src/lib/supabase.ts` demasiado grande | **Confirmado como deuda de mantenimiento, no como fallo funcional.** Contiene tipos de esquema y cliente. No dividir tipos generados manualmente; planear generación desde Supabase CLI y compatibilidad de imports. | P2 |
| 9 | Alias `@/lib/supabase` ambiguo | **Confirmado.** `tsconfig.json` redirige ese alias a `supabase-browser`; existe también un módulo `supabase.ts`. El riesgo depende del contexto de importación. | P1 |
| 10 | Variables `NEXT_PUBLIC_*` exponen secretos | **Generalización incorrecta.** Supabase URL y publishable/anon key están destinadas al cliente; no son equivalentes a service-role. Auditar las variables reales y prohibir secretos privados con prefijo público. | P1 — revisar secretos |
| 11 | Falta rate limiting en middleware | **Parcial / desactualizado.** Existe `src/lib/rate-limit.ts` con limitadores para auth, registro, uploads, admin y billing, y soporte opcional de Upstash Redis; si faltan variables, usa memoria local. Falta verificar uso en todas las rutas sensibles y variables de producción. Middleware global no es necesariamente el lugar adecuado para todo rate limit. | P0/P1 |
| 12 | `npm audit` no bloquea CI | **Confirmado.** `.github/workflows/quality-gate.yml` usa `continue-on-error: true`. Antes de hacerlo bloqueante, obtener el inventario actual, fijar versiones y resolver/admitir advisories explícitamente. | P1 |
| 13 | `xlsx` desde CDN y SDK Anthropic | **Confirmado para XLSX; no probado para Anthropic.** `package.json` usa tarball de SheetJS por URL. `@anthropic-ai/sdk` está en `^0.39.0`; eso no prueba incompatibilidad. Verificar integridad, lockfile y advisories antes de cambiar. | P1 |
| 14 | Bundle sin optimización | **No demostrado.** El repo incluye dependencias pesadas y tiene script `analyze:bundle`; no se midió bundle actual. Ejecutar análisis antes de implementar imports dinámicos. | P2 |
| 15 | Cobertura de tests insuficiente y sin E2E | **Parcial.** `jest.config.js` existe y documenta baseline aproximado de 2% (agosto 2026); no se verificó ejecución/cobertura actual ni uso de E2E. El umbral configurado es 1%, lejos del 80% propuesto. | P1 |
| 16 | Script `test` usa watch | **Confirmado, impacto bajo.** `test` usa `jest --watch` y `test:ci` usa `jest --ci`. El workflow debe llamar explícitamente a los comandos no interactivos. | P2 |
| 17 | 85 errores TypeScript preexistentes | **No verificado en el commit actual.** El workflow ejecuta `npm run type-check`; se requiere resultado de CI sobre el SHA actual para confirmar el conteo. No aceptar 85 como cifra vigente sin reproducirla. | P1 |
| 18 | Migraciones fragmentadas y 70+ archivos | **Parcial.** Hay migraciones versionadas; el número, duplicados y consistencia de nombres no se midieron de forma exhaustiva. No consolidar migraciones ya aplicadas en producción; solo ordenar documentación y convenciones futuras. | P2 |
| 19 | 54 índices no utilizados | **No verificable con GitHub.** Requiere `pg_stat_user_indexes`, ventana representativa de uso y revisión de constraints/planes. No borrar índices por una captura aislada. | P2 |
| 20 | Queries N+1 en hooks analíticos | **Hipótesis sin prueba.** Nombres de hooks y queries separadas no demuestran N+1. Medir con logs/EXPLAIN y optimizar consultas concretas manteniendo los cálculos financieros. | P2 |
| 21 | Problemas de tema claro/oscuro | **No verificado de forma global.** Hay lógica de tema en `layout.tsx` y una referencia a una corrección de login, pero se requiere auditoría visual de pantallas. | P2 |
| 22 | Accesibilidad básica | **No verificado.** La presencia o ausencia de una carpeta no demuestra cumplimiento. Ejecutar axe/Lighthouse y revisar teclado, etiquetas y contraste. | P2 |
| 23 | Manejo de errores y falta de Sentry | **Parcial.** Existe `GlobalErrorBoundary`; no se verificó cobertura por módulo ni destino de logging. No añadir un proveedor externo sin decisión y configuración de privacidad. | P2 |
| 24 | Limpieza residual de Service Worker | **Confirmado como código existente, impacto incierto.** `layout.tsx` ejecuta limpieza de registros y caches legacy. Validar que no borre caches ajenos a FleetEase ni interfiera con instalaciones; retirar solo con plan de migración. | P2 |
| 25 | Install prompt básico | **Parcial.** `beforeinstallprompt` se captura en `layout.tsx`; el timing por visitas y tracking no están demostrados. Es mejora de producto, no bloqueo de seguridad. | P3 |
| 26 | Cron jobs sin monitoreo | **Parcial.** Los cuatro crons están declarados en `vercel.json` y existen sus route handlers. La monitorización y alertas requieren revisar Vercel y el código completo de cada handler. | P1 |
| 27 | Cron jobs sin idempotencia | **No demostrado para todos.** `subscription-expiry-check` ya declara una tabla de recordatorios con clave por compañía/tipo/periodo en su código. Revisar constraints y deduplicación de los cuatro handlers antes de añadir locks. | P1 |
| 28 | Placeholders en CI | **Confirmado, riesgo matizado.** El workflow usa valores ficticios y también define `SUPABASE_SERVICE_ROLE_KEY` placeholder para build. Es válido para compilación sin conexiones reales solo si el código no acepta esa configuración como válida en producción. Mantener tests/build aislados de datos reales. | P1 |
| 29 | Webpack forzado | **Confirmado.** El script build ejecuta `next build --webpack`; `next.config.mjs` tiene configuración Turbopack. No cambiar hasta comparar build, compatibilidad y resultados de CI. | P3 |
| 30 | Documentación fragmentada | **Parcial.** Existen `docs/` y análisis de seguridad, pero no se verificó toda la documentación ni la ausencia de índice/API docs. Crear índice y mantener ADRs si el inventario lo confirma. | P2 |

## Priorización propuesta

### P0 — primero: seguridad de acceso y configuración de Auth
1. Comparar el middleware real con sus tests; añadir pruebas de acceso anónimo, usuario autenticado, roles y rutas sensibles. El middleware no debe ser la única autorización de APIs.
2. Confirmar en Supabase Dashboard que **Leaked password protection** esté habilitada.
3. Confirmar si Upstash está configurado en Vercel Production y comprobar que registro, login, billing, administración y uploads usen el limiter correcto.
4. Verificar con pruebas que no exista acceso cruzado entre empresas/roles. No tocar RLS ni la lógica financiera sin pruebas de regresión.

### P1 — siguiente: cadena de suministro y calidad
1. Obtener el resultado vigente de `npm audit`; resolver vulnerabilidades explotables de producción y revisar el origen/integridad del tarball `xlsx`.
2. Obtener type-check, tests y build del SHA actual. Identificar el estado real de los errores TypeScript, sin asumir el número histórico de 85.
3. Revisar variables de entorno en GitHub/Vercel; nunca publicar `SUPABASE_SERVICE_ROLE_KEY` ni otras credenciales privadas.
4. Auditar cobertura real del rate limiter y las rutas cron; añadir deduplicación donde falte, con pruebas.
5. Revisar alias Supabase para evitar usar el cliente browser en código server-side por error.

### P2 — estabilidad y rendimiento medidos
- Cobertura progresiva por flujo crítico: login/registro, aislamiento tenant, créditos/pagos, saldos de socios, gastos/mantenimiento y suscripciones.
- Verificar índices con estadísticas de producción y planes SQL antes de retirar alguno.
- Medir bundle y queries; evitar refactors especulativos.
- Auditar accesibilidad, tema, headers efectivos, logging y limpieza del Service Worker.

### P3 — mejoras no bloqueantes
- UX del prompt PWA, migración evaluada de Webpack/Turbopack, y ampliación documental.

## Validaciones requeridas antes de implementar correcciones

- [ ] CI del commit base y de la rama: lint, type-check, tests y build.
- [ ] Dashboard Supabase: estado de leaked-password protection.
- [ ] Vercel Production: variables UPSTASH, cron deployments/logs y headers HTTP efectivos.
- [ ] Supabase: estadísticas de índices y planes SQL antes de eliminar índices.
- [ ] Tests de regresión para auth, roles, multi-tenant y módulos financieros.
- [ ] PR independiente; no fusionar ni desplegar automáticamente a producción desde esta auditoría.

## Fuentes de código revisadas

- `middleware.ts`
- `src/__tests__/middleware.test.ts`
- `src/lib/auth.ts`
- `src/lib/rate-limit.ts`
- `src/app/layout.tsx`
- `public/manifest.json`
- `src/lib/supabase.ts`, `src/lib/supabase-browser.ts`
- `tsconfig.json`, `package.json`, `jest.config.js`
- `.github/workflows/quality-gate.yml`
- `vercel.json`, `next.config.mjs`
- Los cuatro handlers cron bajo `src/app/api/cron/`
- `docs/bloque-b-security-audit-2026-10-03.md` y `FleetEase-seguridad-performance.md`

**Conclusión:** esta PR registra la verificación y la priorización, no declara los 30 hallazgos como bugs confirmados ni aplica cambios funcionales. La siguiente PR debe atender primero los hallazgos P0/P1 confirmados y pasar los checks de GitHub antes de considerar cualquier integración.


## Anexo de comprobaciones directas de producción — 15/16 de octubre de 2026

Estas comprobaciones se realizaron después de la revisión estática. Los resultados se usan para priorizar; no se ejecutaron cambios de configuración ni SQL DDL.

### Supabase Auth: hallazgo P0 confirmado
El asesor de seguridad de Supabase reporta **Leaked Password Protection Disabled** en el proyecto activo `qettktslcbjjuyejcpqy`. Esto confirma el hallazgo #3; no es solo un pendiente documental. Debe activarse desde la configuración de Auth del Dashboard y probarse con una contraseña comprometida de prueba. No se cambió el ajuste desde esta auditoría.

### Supabase Database: funciones SECURITY DEFINER
El asesor de seguridad devuelve 15 funciones SECURITY DEFINER con capacidad de ejecución para `authenticated`. La inspección de metadatos y definiciones confirma que esta alerta requiere análisis función por función, no una revocación masiva:
- Las funciones helper `auth_user_company_id()` y `auth_user_role()` exponen datos del propio usuario autenticado.
- `create_credit_atomic` valida el company_id derivado del usuario y la pertenencia del cliente/vehículo.
- `cancel_credit_atomic` comprueba que `p_company_id` corresponda a la empresa autenticada.
- `create_expense_atomic` comprueba rol, empresa y campos de la operación.
Estas comprobaciones parciales no equivalen a una revisión completa de las 15 funciones. Antes de cambiar grants, hay que revisar todas las funciones y sus llamadores; quitar EXECUTE sin ello podría romper créditos, pagos, gastos, multas u operaciones legítimas. Referencia del asesor: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

### Índices
El asesor de rendimiento de Supabase confirma **54 avisos de índices sin uso** en las estadísticas disponibles. La consulta de `pg_stat_user_indexes` también muestra varios índices con `idx_scan = 0`. Esto confirma el aviso, pero **no justifica borrarlos todavía**: falta establecer la ventana de estadísticas, revisar constraints/índices únicos, consultas de baja frecuencia y planes de ejecución. Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

### Vercel Production
Se identificó el proyecto Vercel `fleetease` y sus variables por nombre/entorno, sin descifrar ni imprimir valores secretos:
- `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` están configuradas para Production y Preview. Por tanto, no hay evidencia para afirmar que Production carezca de Upstash; queda comprobar el uso real del limitador y el comportamiento de error.
- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET` y otras variables sensibles están marcadas como secretas/encriptadas en Vercel.
- Las variables públicas de Supabase/Stripe tienen prefijo público o se almacenan como variables de cliente cuando corresponde. El prefijo por sí solo no prueba exposición de un secreto.
- La última deployment Production consultada está en estado READY, rama `master`, SHA `01d8a9d9006b43555e87e6b135355a321cba6ccf`. Esta consulta no prueba por sí sola la salud funcional de todas las rutas.

### Rate limiting
La búsqueda de código confirma uso de `checkRateLimit` en registro, checkout/portal de Stripe, uploads, descargas/borrado de archivos, notificaciones, health y helpers de admin. El limitador de autenticación `authLimiter` aparece definido, pero no se localizó un uso directo en los resultados revisados; hay que verificar si el login es manejado únicamente por Supabase Auth desde el cliente y qué protecciones de intentos fallidos tiene activadas el proveedor. No se debe añadir un segundo limitador sin confirmar el flujo actual.

### Decisión de remediación
1. **Acción operativa inmediata:** activar Leaked Password Protection en Supabase Dashboard (fuera de la PR).
2. **PR técnica prioritaria:** revisar las 15 funciones SECURITY DEFINER con sus permisos y pruebas multi-tenant; no cambiar grants en bloque.
3. **Siguiente:** probar el rate limiter en Production y definir comportamiento seguro si Redis falla.
4. **Después:** evaluar índices con planes de consultas y ventana de actividad suficiente.
5. **CI:** obtener resultados de los checks de la PR y resolver vulnerabilidades concretas antes de volver `npm audit` bloqueante.

No se ejecutaron escrituras en tablas de negocio, migraciones, cambios de grants ni ajustes de producción.

## Anexo final: comprobación de pruebas y comportamiento del rate limiter

### Desalineación concreta de pruebas de middleware
La lectura directa de `middleware.ts` y `src/__tests__/middleware.test.ts` confirma una desalineación más específica que una mera diferencia de cobertura:
- La implementación llama a `supabase.auth.getUser()`; el mock del test expone `auth.getSession()`.
- El middleware actual deja `/login` como ruta pública y no redirige al dashboard solo por existir sesión; una prueba espera ese comportamiento.
- Los tests esperan bloqueos por rol para `/partner` y `/client`, pero esa comprobación no aparece en el middleware leído.
- El matcher del middleware excluye las rutas `/api`; por tanto, la autorización de cada API debe comprobarse en sus propios handlers, no inferirse del middleware.
Esto no prueba por sí solo que haya una ruta vulnerable, porque puede haber controles adicionales en layouts, componentes servidor, handlers y RLS. Sí prueba que el test actual no es una fuente fiable para demostrar esos controles. La remediación correcta es inventariar autorización real y después añadir pruebas negativas/positivas por rol y tenant.

### Rate limiter: riesgo de disponibilidad cuando falla Redis
`src/lib/rate-limit.ts` usa Upstash cuando encuentra las variables y lanza un error si falta una de las dos, la petición HTTP falla, vence el timeout o la respuesta de Redis no es válida. `checkRateLimit` no captura esa excepción. Esto evita permitir silenciosamente la operación cuando Redis falla, pero puede convertir una incidencia temporal de Redis en errores 500 en rutas protegidas por el limiter. Antes de cambiarlo, decidir explícitamente política fail-closed/fail-open por clase de endpoint: para autenticación, pagos, administración y cargas sensibles debe priorizarse la seguridad; cualquier fallback debe estar acotado, observado y probado. En Vercel existen las dos variables Upstash en Production y Preview, por lo que el modo de fallo es una cuestión de comportamiento, no de ausencia confirmada de configuración.

### Alcance final de verificación
Los 30 puntos quedaron clasificados y priorizados con evidencia del repositorio; los puntos que dependen de ejecución local/CI, tráfico real o revisión visual están identificados como pendientes, no declarados como aprobados. La PR es un artefacto de auditoría/documentación: no sustituye una suite de pruebas ni corrige por sí sola los hallazgos. Las correcciones de código y de configuración deben ir en PR/cambios operativos separados, con validación de regresión para autenticación, aislamiento multi-tenant y flujos financieros.
