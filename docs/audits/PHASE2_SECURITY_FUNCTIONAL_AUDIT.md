# Auditoría Fase 2 — seguimiento de hallazgos

## Objetivo
Concentrar los hallazgos reproducibles y las correcciones de seguridad/funcionalidad en una rama y PR independientes. Cada cambio debe validarse antes de fusionarse a `master` y desplegarse a producción.

## Reglas de trabajo
- No modificar producción directamente.
- No alterar ni limpiar la base de datos de pruebas durante la auditoría.
- Corregir por bloques pequeños; documentar el hallazgo, la causa, la prueba y el resultado.
- No ejecutar actualizaciones masivas de dependencias ni `npm audit fix --force`.
- No marcar una verificación como aprobada si el workflow fue omitido o no se ejecutó.
- Fusionar cada conjunto validado para evitar volver a investigar correcciones que ya estén resueltas.

## Alcance inicial

- [ ] Revisar los hallazgos reales de `npm audit` (45 reportados anteriormente: 23 moderados, 19 altos y 3 críticos); identificar paquetes, rutas de dependencia, versiones corregidas e impacto. No actualizar paquetes sin evaluar compatibilidad.
- [ ] Ampliar pruebas de acceso a rutas protegidas: sin sesión, sesión válida, roles/permisos y acceso a datos de otra empresa (aislamiento multi-tenant), según los patrones reales de la aplicación.
- [ ] Revisar los controles de autenticación/autorización en proxy y en los endpoints/API; no depender únicamente de ocultar la interfaz.
- [ ] Revisar los hallazgos y controles de Aikido; distinguir resultados ejecutados de verificaciones omitidas.
- [ ] Añadir pruebas de regresión para cada defecto confirmado antes de corregirlo.

## Registro de hallazgos

| ID | Hallazgo y evidencia | Severidad | Corrección | Prueba | Estado |
|---|---|---|---|---|---|
| AUD2-001 | Revisar salida completa de `npm audit`; los conteos anteriores no confirman por sí solos explotabilidad ni versiones afectadas. | Pendiente de triage | Por determinar | Ejecutar y revisar el reporte | Pendiente |
| AUD2-002 | Ampliar cobertura de autenticación y autorización más allá del smoke test anónimo de vehículos. | Pendiente de triage | Por determinar | Casos positivos y negativos | Pendiente |
| AUD2-003 | Verificar ejecución efectiva de controles de seguridad externos; Aikido figuró omitido en la validación previa. | Pendiente de triage | Por determinar | Confirmar estado/logs | Pendiente |

## Criterio de salida
No fusionar hasta que cada cambio incluido tenga evidencia de prueba, los workflows requeridos estén en verde y no queden bloqueos de seguridad sin documentar. Los hallazgos que requieran cambios de infraestructura, plan de Supabase o decisiones de producto se registrarán aparte sin aplicar cambios no autorizados.
