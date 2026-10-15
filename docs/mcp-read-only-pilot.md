# FleetEase MCP — piloto de solo lectura

Estado: prototipo funcional en rama, pendiente de validación de CI y de completar OAuth para conexiones de clientes.

## Endpoint

`POST https://www.fleetease.com.mx/api/mcp`

El endpoint usa el transporte Streamable HTTP del SDK oficial `@modelcontextprotocol/server` y crea un servidor por solicitud. No hay endpoint de escritura.

## Herramientas disponibles

- `vehicles_list`, `vehicle_get`
- `clients_list`, `client_get`
- `expenses_list`, `income_list`
- `credits_list`
- `partners_list`
- `fines_list`

Las listas aceptan `limit` (1–50, predeterminado 20) y `offset` (0–10000). El modelo no puede especificar el `company_id). Los datos se filtran por empresa desde el contexto autenticado y se consultan con el JWT del usuario, no con la clave service-role, para mantener RLS como defensa en profundidad.

La respuesta omite documentos privados, URLs de evidencia, domicilios e identificaciones oficiales. Los campos de consulta financiera son de lectura.

## Autenticación implementada en esta fase

El endpoint valida un JWT de Supabase Auth en cada solicitud y vuelve a comprobar:
- usuario válido y sesión no expirada;
- perfil activo en `public.users`;
- empresa asociada no eliminada;
- rol permitido: `admin`, `editor` o `viewer`;
- límite de solicitudes por IP y usuario.

Los roles `partner`, `client` y `super_admin` quedan bloqueados hasta definir y probar su ámbito de acceso específico. Las cabeceras internas de identidad se eliminan de la solicitud entrante y se vuelven a establecer únicamente con valores verificados por el servidor.

## Limitaciones que impiden considerarlo listo para clientes

Esta fase **todavía no implementa el flujo OAuth 2.1 de autorización, consentimiento y emisión/revocación de tokens MCP**. Por tanto, el endpoint sirve para validación técnica con un JWT de Supabase obtenido de forma segura por un usuario autorizado, pero aún no está listo para el flujo de conexión normal de ChatGPT/otros clientes MCP. No copiar ni pegar tokens de larga duración en chats ni guardarlos en código.

El rate limiter actual puede usar Upstash si están configuradas `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`; sin ellas cae al almacenamiento en memoria de la aplicación, que no es un límite distribuido fiable en Vercel. Antes del lanzamiento público debe configurarse el backend distribuido.

## Seguridad y pruebas

- No se exponen escrituras ni SQL arbitrario.
- Cada consulta añade un filtro explícito por empresa y además utiliza RLS.
- No se aplica ninguna migración ni se modifica la base de datos.
- Las pruebas unitarias de política y registro de herramientas están añadidas. Faltan ejecución verificada de type-check, tests, build, pruebas de aislamiento con dos empresas y pruebas de protocolo desde clientes MCP reales.

## Reglas de publicación

No fusionar ni apuntar el dominio de producción a esta versión hasta:
1. tener OAuth 2.1 completo y consentimientos/revocación;
2. actualizar el lockfile y ejecutar CI completa;
3. comprobar aislamiento multiempresa en pruebas automatizadas;
4. verificar compatibilidad con ChatGPT y al menos un cliente MCP adicional;
5. configurar rate limiting distribuido y límites de respuesta.


## OAuth 2.1 discovery and consent

The branch also includes:
- `/oauth/consent`: consent UI using the Supabase Auth OAuth methods; it rejects users without an active company profile and allowed app role.
- `/.well-known/oauth-protected-resource/api/mcp`: protected-resource metadata for MCP clients.
- The MCP endpoint's `WWW-Authenticate` challenge points clients to the metadata endpoint.

The OAuth authorization server itself is Supabase Auth at `https://qettktslcbjjuyejcpqy.supabase.co/auth/v1`. The corresponding OAuth authorization-server discovery URL is `https://qettktslcbjjuyejcpqy.supabase.co/.well-known/oauth-authorization-server/auth/v1`.

**Required dashboard setup before the real connection test:**
1. In Supabase Dashboard → Authentication → OAuth Server, enable the OAuth 2.1 server.
2. Set the authorization path to `/oauth/consent` and verify the Auth Site URL points to `https://www.fleetease.com.mx`.
3. Enable dynamic client registration only if required by the chosen MCP clients; then monitor registrations and revocations.
4. Confirm the project's JWT signing configuration and the OAuth server's discovery document. Do not rotate signing keys as part of this PR without a separate impact review.
5. Test the full login → consent → callback → token refresh/revocation flow against a non-production client.

The connected Supabase project settings are not exposed by the available project-management connector, so these OAuth dashboard settings have **not** been confirmed or changed by this work. Until verified, end-to-end OAuth is not considered complete.
