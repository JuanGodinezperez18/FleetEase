# Guía de pruebas de FleetEase

Actualizada: 2026-11-04. La configuración ejecutable es la fuente de verdad: `package.json`, `jest.config.js`, `jest.setup.js` y `.github/workflows/`.

## Preparación y comandos

Usar Node 22, como CI, y `npm ci --legacy-peer-deps`. Las dependencias de pruebas ya están declaradas; no instalarlas por separado.

| Comando | Alcance |
|---|---|
| `npm test` | Jest interactivo, modo watch |
| `npm run test:ci -- --runInBand` | Suite Jest completa, sin watch |
| `npm run test:ci -- --runInBand src/__tests__/middleware.test.ts` | Autenticación, roles, rutas públicas y CSP |
| `npm run test:coverage -- --runInBand` | Cobertura real del alcance definido en Jest |
| `npm run type-check` | TypeScript estricto |
| `npm run build` | Build de producción con Webpack |
| `npm audit --omit=dev --audit-level=high` | Gate de dependencias de runtime |
| `npm audit` | Inventario completo, incluido tooling |

`npm run lint` aún usa `next lint`, retirado en Next 16; no presentarlo como una validación exitosa. La migración a ESLint CLI se mantiene como tarea separada.

## Pruebas existentes y límites

- Jest 30 + React Testing Library: suites en `src/__tests__`, `src/lib` y handlers `src/app/api`. El `testMatch` real está en `jest.config.js`.
- Pruebas de handler: `src/app/api/notifications/tenant-isolation.test.ts` y `src/app/api/admin/users/email-delivery.test.ts`. Simulan Supabase/Resend; no prueban RLS ni entregan correo real.
- Lógica de dominio: pruebas de métricas financieras, créditos, asignaciones, validación, roles y referencias de archivos. La integración no sustituye una conciliación financiera con datos autorizados.
- Smoke de navegador: `scripts/e2e-smoke.mjs`, ejecutado por `.github/workflows/e2e-smoke.yml` con `playwright-core` y Chrome. No es una suite E2E completa del negocio ni utiliza `@playwright/test`.
- Lighthouse: `.github/workflows/lighthouse.yml`; distinguir resultados de las rutas medidas de una evaluación autenticada completa.

Los mocks heredados en `jest.setup.js` no acreditan un backend Firebase operativo. Las pruebas nuevas deben simular el cliente Supabase o sus límites HTTP, y comprobar persistencia, errores y aislamiento de empresa. Nunca utilizar credenciales, escrituras o mensajes de producción en pruebas.

## Cobertura

El umbral global configurado actualmente es **1%**, no 60%, 80% ni 83%. El comentario histórico de Jest cita un baseline cercano al 2% de agosto de 2026; no es una medición actual. Reportar porcentajes sólo junto con comando, fecha y commit. Los objetivos futuros deben etiquetarse como objetivos.

## Proceso de revisión

1. Reproducir el defecto y añadir una prueba de comportamiento cuando corresponda.
2. Ejecutar la suite afectada y los checks de CI requeridos por la rama.
3. Probar navegación directa y desde otro módulo, recarga, estados vacío/error y permisos si el cambio los afecta.
4. Registrar comando, resultado, commit y límites en el PR y en `docs/audits/PHASE2_SECURITY_FUNCTIONAL_AUDIT.md`.
5. Separar fallos preexistentes de regresiones, sin declarar aprobada una comprobación omitida.
