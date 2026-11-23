# Limitador distribuido — 22 de noviembre de 2026

## Fallos reproducidos y corrección

La respuesta REST de Redis se validaba sólo como un arreglo de dos elementos. Diez regresiones fallaron antes del cambio: valores como `[null, 60000]` y `["not-a-number", 60000]` permitían continuar; otros producían vencimientos o contadores inválidos. Ahora se exigen enteros seguros, contador positivo y TTL no negativo. La respuesta inválida sigue la ruta de indisponibilidad y rechaza la operación con 503, sin degradar a memoria en producción.

El Lua anterior sólo fijaba vencimiento cuando el contador era uno. Una clave existente sin TTL podía acumular bloqueos sin recuperarse. El script conserva el contador, establece una ventana de vencimiento si falta y permite la recuperación normal al expirar. Los intentos normales no renuevan la ventana.

Los 429 indican `Cache-Control: no-store` y un `Retry-After` mínimo de un segundo. No cambian los límites de login, perfil, salida ni otros endpoints. El temporizador de limpieza deja de mantener vivo por sí solo un proceso Node.

## Verificación aislada

- Local: 469 pruebas en 55 suites aprobadas. Las diez regresiones de valores inválidos se observaron fallando antes de la corrección. TypeScript aprobado.
- `scripts/test-rate-limit-redis.ts` usa el limitador de producción y el Lua real contra Redis 7.4 del job de CI, a través de un puente REST local sin credenciales reales.
- Dos instancias envían veinte solicitudes concurrentes contra una cuota de tres: sólo tres pueden pasar. Otro cliente conserva su cuota. La ventana expira y una nueva solicitud vuelve a pasar.
- Se prepara una clave sin TTL: mantiene el bloqueo y recupera un vencimiento. Después de expirar permite una nueva solicitud.
- `checkRateLimit` comprueba 429 sin caché, cuota por IP independiente del Authorization ficticio, recuperación, 503 ante respuesta inválida o servicio no disponible y recuperación posterior.
- La prueba sólo admite Redis en `127.0.0.1` con `REDIS_TEST_PORT` explícito. Retira exclusivamente sus claves con prefijo aleatorio. No usa Redis de producción, usuarios reales ni secretos de Vercel.

## Contrato de IP y alcance pendiente

La [documentación de Vercel](https://vercel.com/docs/headers/request-headers) indica que sobrescribe `x-forwarded-for` para impedir suplantación y que `x-real-ip` es idéntico. También distingue `x-vercel-forwarded-for` cuando existe un proxy externo. Eso describe el borde de Vercel; no demuestra qué dirección original llega a FleetEase a través de Cloudflare ni valida un despliegue fuera de esa infraestructura.

Se conserva la selección de IP existente. Falta comprobar el contrato extremo a extremo de Cloudflare/Vercel y medir saturación/recuperación de las rutas desplegadas de login, perfil y salida. El rechazo anterior de Cloudflare al cliente HTTP no se ha evadido. Las pruebas con Redis real aislado no cierran esas verificaciones de producción.

C5 permanece aplazado. No hay cambios de esquema ni datos de negocio.
