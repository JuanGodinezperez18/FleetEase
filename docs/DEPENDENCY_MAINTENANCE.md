# Mantenimiento de dependencias

Política desde 2026-11-04: revisión trimestral del runtime y del tooling; revisión adicional ante advisories de severidad alta/crítica aplicables. No es una automatización ni un recordatorio configurado.

1. Crear una rama desde master y ejecutar `npm ci --legacy-peer-deps` con Node 22.
2. Obtener `npm audit --json` y `npm audit --omit=dev --json`. Registrar fecha, commit, cadena transitiva y exposición real; los conteos históricos no son vigentes.
3. Aplicar sólo actualizaciones compatibles, regenerando el lockfile con npm; nunca `npm audit fix --force` o downgrades mayores automáticos del framework/Jest para silenciar avisos.
4. Ejecutar regresiones, type-check, build y smoke. Actualizaciones mayores requieren revisión específica.
5. CI mantiene el gate de producción alto/crítico y publica el inventario completo como artefacto. Un reporte informativo no equivale a cero vulnerabilidades.
6. Si no hay parche compatible, registrar advisory, cadena, mitigación, motivo y condición de reevaluación en la auditoría. Las excepciones de tooling no autorizan excepciones de runtime.

La siguiente revisión trimestral corresponde a febrero de 2027. El responsable del repositorio asigna su ejecución; una excepción se reevalúa antes si upstream publica un parche.
