# FleetEase — diseño de enlaces compartidos cortos

## Objetivo

Sustituir los enlaces largos de almacenamiento que hoy se copian al compartir documentos por enlaces cortos bajo el dominio propio `https://fleetease.com.mx/s/<token>`. El enlace debe explicar qué documento se comparte, funcionar desde móvil y poder expirar, usarse una sola vez o revocarse sin exponer el almacenamiento ni la base de datos.

Este documento define el diseño funcional y de seguridad. No modifica el esquema de base de datos ni la aplicación.

## Experiencia de usuario

### 1. Crear enlace desde un documento

En el control de compartir del documento, abrir un diálogo titulado **Compartir documento** con:

- **Documento:** nombre legible del documento (por ejemplo, “Tarjeta de circulación”).
- **Vehículo:** marca/modelo y placas enmascaradas según la política de privacidad (por ejemplo, “Nissan Versa · ***-123-A”); no incluir datos del cliente ni datos financieros.
- **Caducidad:** 1 hora, 24 horas, 7 días o fecha/hora personalizada.
- **Accesos:** “Se puede abrir varias veces” o “Un solo uso”.
- **Aviso visible:** cualquiera que tenga el enlace podrá acceder al documento hasta que venza o se revoque.
- Acción primaria **Crear enlace** y acción secundaria **Cancelar**.

Después de crearlo, mostrar el enlace corto, botón **Copiar enlace** y un resumen de la caducidad. No mostrar el URL interno de Supabase ni el path del archivo.

### 2. Pantalla pública de destino

La ruta `/s/[token]` muestra una página ligera, adaptable a móvil y con la identidad visual existente de FleetEase:

- Marca FleetEase.
- Título del documento y contexto mínimo del vehículo.
- Estado del enlace: disponible, vencido, revocado, ya utilizado o no disponible.
- Botón **Descargar documento** únicamente si el enlace es válido.
- No mostrar IDs internos, UUID del archivo, bucket, ruta de almacenamiento, empresa interna, información del propietario ni otros documentos.
- Mensajes de error neutrales para no revelar si un token o archivo existe.

La página no requiere iniciar sesión, pero solo puede mostrar los metadatos mínimos permitidos por el enlace.

### 3. Administración de enlaces

Agregar una pantalla autenticada en `/dashboard/shared-links`, visible para administradores autorizados de la empresa. Reutilizar los patrones visuales y el componente DataTable existente.

Encabezado: **Enlaces compartidos**, texto auxiliar “Controla quién puede acceder a los documentos que compartiste” y contador de enlaces activos.

Columnas:
- Documento
- Vehículo
- Creado por
- Fecha de creación
- Vencimiento
- Tipo de acceso (Reutilizable / Un solo uso)
- Usos (por ejemplo, 0/1 o número de descargas)
- Estado (Activo, Vencido, Utilizado, Revocado)
- Acciones

Filtros: estado, tipo de acceso, vehículo y rango de fechas. Búsqueda por nombre del documento, vehículo o creador. Acciones por fila: **Copiar**, **Ver detalles** y **Revocar**. Revocar debe pedir confirmación e invalidar el enlace inmediatamente. En móvil, cada registro debe presentarse como tarjeta o fila desplazable sin empalmar texto.

Los usuarios sin permiso de administración no deben ver la tabla global de la empresa; si se habilita creación para otros roles, solo deben administrar los enlaces que crearon, salvo permiso explícito superior.

## Arquitectura y seguridad

### Token y persistencia

- Generar un token aleatorio criptográficamente seguro, con al menos 256 bits de entropía; usar una codificación URL-safe.
- Guardar solo el hash del token en la base de datos. El token original solo se entrega al creador una vez para copiarlo.
- La tabla propuesta `shared_links` contiene únicamente metadatos necesarios: identificador, hash del token, `company_id`, referencia validada del objeto, nombre visible del documento, contexto mínimo del vehículo, creador, fechas de creación/vencimiento, política de uso, contador de usos, fecha del último uso y estado/revocación.
- No guardar ni devolver claves de servicio, tokens de sesión, credenciales de Supabase ni URL firmadas de larga duración.
- No almacenar contenido binario del archivo en la tabla.

### Descarga

El enlace corto no debe redirigir a una URL pública permanente ni entregar una URL firmada reutilizable. La descarga debe pasar por un endpoint de servidor que:

1. Valide formato y hash del token.
2. Rechace tokens vencidos, revocados o ya consumidos.
3. Verifique que el registro tiene una referencia de objeto permitida y que pertenece a la empresa asociada.
4. Obtenga el archivo desde Supabase Storage con credenciales solo del servidor.
5. Devuelva el archivo como descarga, con nombre seguro y encabezados `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff` y política de caché privada/no-store.
6. Para enlaces de un solo uso, reserve/consuma el uso de forma atómica para evitar descargas simultáneas duplicadas. Un intento fallido de descarga no debe consumir el enlace si el archivo no se entregó correctamente.

No se debe confiar en un `fileUrl`, bucket, path o `company_id` enviado por el navegador. El endpoint debe resolver esos datos exclusivamente desde el registro del token y validar el path con las utilidades de seguridad existentes.

### Aislamiento de empresa y permisos

- Crear enlace: usuario autenticado; verificar rol/permisos y comprobar en servidor que el documento pertenece a la empresa activa y que el usuario puede verlo.
- Administrar/revocar: autorización en cada petición del servidor, no solo ocultar botones. Restringir por `company_id`; superadmin se rige por los permisos ya existentes.
- Acceso público: el token autoriza exclusivamente un documento específico, nunca una sesión de Supabase, una consulta SQL ni acceso a tablas.
- No exponer credenciales ni usar `SUPABASE_SERVICE_ROLE_KEY` en cliente.
- No devolver listas de enlaces, IDs internos ni otros documentos desde el endpoint público.
- Limitar tasa de consultas/descargas y registrar eventos mínimos de auditoría sin guardar tokens en logs.
- Usar respuestas neutrales para tokens inválidos y no revelar información de existencia.

### Caducidad y revocación

- Valores predeterminados sugeridos: 24 horas y acceso reutilizable; quien crea el enlace puede elegir 1 hora, 24 horas, 7 días, fecha personalizada o un solo uso.
- La expiración se verifica en servidor en cada acceso, no mediante una tarea de limpieza.
- Revocar cambia el estado del enlace y bloquea nuevas descargas inmediatamente.
- Eliminar metadatos antiguos puede hacerse posteriormente con una tarea de limpieza; no es requisito para que expire un enlace.

## Estados y reglas

| Estado | Regla |
| --- | --- |
| Activo | No vencido, no revocado y, si es de un solo uso, aún no consumido |
| Vencido | La hora actual supera `expires_at` |
| Utilizado | Enlace de un solo uso consumido exitosamente |
| Revocado | Un administrador o creador autorizado lo invalidó |
| No disponible | Token inválido, registro inexistente o archivo no accesible; mensaje público neutral |

La precedencia visual de estado debe ser: Revocado → Vencido → Utilizado → Activo.

## Criterios de aceptación

1. Los enlaces compartidos usan el dominio corto propio y no muestran URL de Supabase.
2. El enlace abre solo el documento indicado, no permite navegar por el bucket ni consultar la base de datos.
3. Un usuario de otra empresa no puede crear, listar, leer ni revocar enlaces ajenos.
4. Un enlace vencido o revocado deja de permitir nuevas descargas.
5. Un enlace de un solo uso no puede descargarse dos veces, incluso con solicitudes concurrentes.
6. Una vista previa automática de WhatsApp/Messenger no debe consumir el enlace; el consumo ocurre al solicitar la descarga de forma explícita.
7. El contenido privado no se almacena en cachés públicas y los tokens no aparecen en logs.
8. Los errores de red o de almacenamiento no se presentan como éxito ni consumen un enlace de un solo uso.
9. La tabla funciona en móvil y permite buscar, filtrar, copiar y revocar.
10. La solución no cambia la lógica de subida de documentos ya existente.

## Implementación propuesta por etapas

1. Revisar las relaciones reales entre documentos, vehículos, empresas y permisos para definir la referencia de objeto sin asumir nombres de tablas.
2. Implementar migración SQL versionada para `shared_links`, restricciones e índices; no aplicar cambios directamente a la base de datos desde esta etapa de diseño.
3. Implementar endpoints autenticados de creación/listado/revocación y endpoint público de metadatos/descarga.
4. Implementar diálogo de creación y tabla administrativa.
5. Añadir pruebas unitarias y de integración de autorización multiempresa, expiración, revocación, token inválido, consumo único concurrente y fallos de Storage.
6. Validar en preview antes de cualquier merge o despliegue a producción.

## Fuera de alcance por ahora

- Analítica avanzada de clics, ubicación o seguimiento de destinatarios.
- Enlaces con contraseña o códigos OTP.
- Acortador de URL genérico para destinos arbitrarios.
- Cambios al flujo de carga desde Google Drive o proveedores externos.
