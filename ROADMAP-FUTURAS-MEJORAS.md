# Hoja de ruta de FleetEase

Revisión de evidencia: 2026-11-04. Este documento describe capacidades y propuestas; no acredita que estén desplegadas. El estado de auditoría operativo está en `docs/audits/PHASE2_SECURITY_FUNCTIONAL_AUDIT.md`.

## Capacidades con código y alcance comprobable

| Área | Estado y evidencia |
|---|---|
| Pruebas unitarias/handlers | Jest y React Testing Library; ver `TESTING_GUIDE.md`. Cobertura vigente: pendiente de medir; umbral configurado 1%. |
| Smoke de navegador | `playwright-core`, `scripts/e2e-smoke.mjs`, `.github/workflows/e2e-smoke.yml`. No equivale a E2E de todos los módulos. |
| PWA | Manifest, `public/sw.js`, registro y controles de instalación. No garantiza CRUD financiero offline ni sincronización de conflictos. |
| Imágenes | Uso de `next/image` y Sharp. No se afirma migración de todas las imágenes. |
| Métricas | Vercel Analytics/Speed Insights y `src/lib/performance-monitor.ts`; no existe `/api/performance`. |
| Dashboard configurable | Componentes y persistencia de configuración del dashboard; comprobar permisos y guardado en cada cambio. |
| Exportaciones | PDF/Excel; la conciliación operativa C1 sigue los criterios de la auditoría vigente. |
| Integraciones | Supabase (Auth/BD/Storage), Stripe y Resend presentes. Estado de proveedores y entregas exige validación externa. |
| Tema | `next-themes` integrado. No se afirma cobertura visual completa de todas las pantallas. |

## Propuestas pendientes y criterios de aceptación

| Propuesta | Estado | Evidencia necesaria para declararla completada |
|---|---|---|
| Virtualización de tablas | Pendiente; `@tanstack/react-virtual` no está instalado | Medir tablas grandes y demostrar mejora sin romper selección, teclado ni filtros |
| E2E autenticado de negocio | Parcial: sólo smoke público/anónimo | Flujos de prueba aislados y repetibles para créditos, pagos, borrado lógico y dos tenants |
| i18n es/en/pt | Pendiente | Catálogos, enrutamiento, selector y pruebas de traducción; no hay integración i18n actual |
| Tiempo real general por WebSockets | Pendiente | Suscripciones autenticadas, limpieza y aislamiento por empresa; no se declara Socket.IO integrado |
| Offline con IndexedDB | Pendiente | Política de conflictos, permisos, reconciliación y pruebas de sincronización |
| Mensajería interna y push | Pendiente; opción simulada retirada en B-2 | Destinatarios reales, persistencia autorizada, acuses y fallos verificables. No se reporta push sin proveedor efectivo |
| Historial persistente de reportes | Pendiente; enlace fantasma retirado en B-1 | Persistencia, consulta tenant-scoped y pantalla existente antes de enlazarla |
| Reportes programados | Pendiente | Programación, permisos, entrega e idempotencia verificadas |
| Voz, mantenimiento predictivo, combustible | Propuestas | Especificación y datos verificables antes de implementar |
| CFDI, conciliación bancaria, presupuestos | Propuestas | Alcance de negocio aprobado, proveedor y regresiones financieras |
| Otras pasarelas, SMS, CRM, contabilidad | Propuestas | Integración concreta, credenciales de prueba y criterios de aceptación |
| GPS/geofencing | Código y documentación parcial; operación integral no acreditada | Prueba con dispositivo/proveedor, permisos y almacenamiento de ubicación |

## Base de datos y rendimiento

La base activa es PostgreSQL/Supabase. Versionar cambios en `supabase/migrations/`; no utilizar instrucciones de índices de Firestore. Evaluar índices con EXPLAIN y estadísticas representativas antes de modificarlos. TanStack Query está integrado, pero cualquier ajuste de caché requiere probar permisos y frescura de datos.

No se conservan cifras sin evidencia de Lighthouse, bundle, cobertura, usuarios o NPS como si fueran mediciones actuales. Medir antes de fijar un objetivo y publicar comando, fecha, commit y entorno con el resultado.

## Mantenimiento y definición de terminado

Revisar dependencias trimestralmente y antes si aparece un advisory relevante: `docs/DEPENDENCY_MAINTENANCE.md`. Todo PR que cambie una capacidad debe actualizar esta tabla y enlazar código, prueba y resultado. Un merge no acredita despliegue ni validación de producción; consultar las puertas de salida de la auditoría vigente.
