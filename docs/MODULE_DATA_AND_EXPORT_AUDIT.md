# FleetEase — Auditoría de módulos, datos, seguridad y exportaciones

Fecha: 2026-09-03

## Revisión paralela

Se revisaron por separado cuatro frentes:

1. **Diseño/UX:** ubicación de acciones primarias, consistencia de encabezados y exportaciones.
2. **Seguridad:** RLS, funciones `SECURITY DEFINER`, exposición de RPC y datos sensibles.
3. **Base de datos:** columnas reales de PostgreSQL contra tipos, formularios y payloads de la aplicación.
4. **Flujos:** creación → edición → eliminación lógica/cancelación → auditoría → exportación.

## Hallazgos críticos corregidos

### 1. Socios: `partners.name`
El formulario captura `firstname`/`lastname`, mientras `partners.name` es NOT NULL. El mapper ahora construye `name` cuando no viene explícitamente informado.

### 2. Asignaciones de vehículos: columnas ausentes en producción
El formulario y los tipos ya utilizaban:

- `odometer_reading`
- `fuel_level`
- `condition_notes`
- `photos`

pero la base de datos activa no tenía esas columnas. Se sincronizó `vehicle_assignment_logs` y se añadieron índices para vehículo/fecha y cliente.

### 3. RPC / funciones privilegiadas
Se retiró la ejecución pública/anon de funciones que son triggers internos:

- `auto_link_credit_payment_records`
- `auto_link_credit_payment_to_grant`
- `enforce_company_plan_limits`
- `handle_client_soft_delete`
- `handle_credit_soft_delete`

Las funciones de negocio que sí usa la aplicación autenticada conservan `authenticated` y se mantienen con sus comprobaciones de empresa/usuario.

## Hallazgos que permanecen para la siguiente pasada

### Contratos de tipos
`src/lib/supabase.ts` contiene una definición de `Database` más antigua que el esquema real en varios puntos. Debe dejar de mantenerse manualmente o regenerarse desde Supabase.

Diferencias detectadas en la revisión:

- `companies`: la BD tiene `trial_ends_at`; algunas definiciones locales usan `plan_expires_at` o no contienen el campo.
- `clients`: la BD tiene campos de baja/incobrable (`written_off_amount`, `write_off_reason`, `written_off_at`, `written_off_by`) que no aparecen en algunas definiciones antiguas.
- `credits`: la BD tiene `reference_code`; algunas definiciones antiguas no lo incluyen.
- `financial_records`: la BD contiene campos de relación/origen (`source_record_id`, `source_record_type`, `related_record_id`, `related_record_type`) que no aparecen en definiciones antiguas.
- `mileage_logs`: la BD contiene `created_by`; debe estar presente en el contrato usado por los servicios.
- `vehicle_assignment_logs`: ya sincronizado en la BD con los cuatro campos de entrega mencionados arriba.

No se deben añadir columnas solo para satisfacer un tipo. Primero debe decidirse si el campo forma parte del dominio real y después mantener una única fuente de verdad.

## Política de exportaciones

### Excel
**Sí:** datos tabulares del conjunto seleccionado, incluidos balances y vehículo asignado cuando el usuario los activa.

**No:** archivos privados como INE, licencia, fotografías o documentos almacenados; tampoco secretos de configuración GPS/API.

### PDF
**Sí:** reporte formal generado desde datos, con título, fecha, tabla, paginación y pie de página.

**No:** captura de pantalla del dashboard, documentos privados ni claves/API.

### Imagen PNG
**Sí:** composición visual diseñada desde los datos (título, fecha, tabla y pie), útil para compartir un resumen.

**No:** captura de pantalla de la interfaz, documentos privados ni el conjunto ilimitado de registros. Para grandes volúmenes se debe usar Excel/PDF.

### CSV
**Sí:** datos tabulares simples.

**No:** formato adecuado para diseño visual, documentos o información binaria.

## Flujo completo que debe validarse por módulo

Para Clientes, Socios, Vehículos, Empresas, Créditos y Usuarios:

1. Abrir módulo.
2. Verificar permisos del usuario.
3. Crear registro con todos los campos obligatorios.
4. Validar payload contra la tabla real.
5. Confirmar persistencia.
6. Recargar y confirmar que los valores vuelven correctamente.
7. Editar cada campo editable.
8. Verificar auditoría/historial cuando aplique.
9. Probar baja lógica/cancelación sin borrar historial cuando corresponda.
10. Verificar aislamiento por `company_id`.
11. Exportar solo los campos permitidos.
12. Repetir en móvil/responsive.

## Próximo bloque recomendado

- Regenerar y centralizar los tipos de Supabase.
- Añadir pruebas de contrato de payload para los formularios CRUD.
- Auditar todas las políticas RLS por tabla y por operación (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
- Habilitar protección contra contraseñas filtradas en Supabase Auth.
- Revisar y optimizar los avisos de índices/RLS del Database Advisor sin eliminar índices basándose únicamente en su falta de uso inicial.
- Estandarizar el selector de exportación (Excel/PDF/PNG) en los módulos que actualmente solo ofrecen Excel/CSV o exportación propia.
