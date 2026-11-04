# FleetEase — Supabase Storage: inventario y RLS

Este documento refleja el inventario esperado por los endpoints de FleetEase. La definición ejecutable vive en `supabase/migrations/20261104190000_reconcile_storage_buckets_and_tenant_policies.sql`; los buckets no deben crearse desde una API route.

## Inventario canónico

| Bucket | Visibilidad | Uso | Acceso |
|---|---|---|---|
| `company-logos` | Público | Logotipos de empresas | Lectura pública; escritura autenticada dentro de la empresa |
| `vehicle-images` | Público | Fotografías no sensibles de vehículos | Lectura pública; escritura autenticada dentro de la empresa |
| `documents` | Privado | Documentación general | RLS por empresa |
| `vehicle-documents` | Privado | Tarjetas, pólizas y documentos vehiculares | RLS por empresa |
| `driver-documents` | Privado | Identificación y documentos de conductores | RLS por empresa |
| `financial-receipts` | Privado | Comprobantes financieros | RLS por empresa |
| `general-documents` | Privado | Archivos generales | RLS por empresa |
| `contract-templates` | Privado | Plantillas contractuales | RLS por empresa |
| `inspection-images` | Privado | Evidencia de inspecciones | RLS por empresa |
| `seguimientos` | Privado | Fotografías de seguimiento | RLS por empresa y reglas específicas existentes |
| `client-documents` | Privado | INE, licencias y documentos de clientes | RLS por empresa |
| `clients` | Privado | Referencias heredadas de archivos de clientes | RLS por empresa |

Sólo `company-logos` y `vehicle-images` son públicos por decisión de producto. No almacenar identificaciones, licencias, contratos, recibos ni documentos financieros en esos buckets.

## Reglas de seguridad

- Los objetos privados usan rutas con prefijo `companies/{companyId}/...`.
- La lectura autenticada se limita a la empresa del usuario; `super_admin` conserva el acceso administrativo.
- La escritura directa autenticada en los buckets privados nuevos se limita a `admin`, `editor` y `super_admin`.
- Las API routes que usan service role deben validar identidad, empresa, entidad y ruta antes de subir, firmar o borrar.
- El service role no sustituye las políticas RLS para operaciones directas del navegador.
- Los endpoints de subida devuelven referencias autenticadas estables (bucket + path) y nunca URLs públicas para buckets privados.
- El cliente resuelve esas referencias mediante `/api/storage/signed-url` al presentar el archivo; las URLs firmadas son temporales y no se guardan como referencia persistente.
- El resolver conserva compatibilidad con URLs históricas `/public/`, `/sign/` y `/authenticated/`.
- Ningún endpoint debe crear buckets automáticamente. La provisión y las políticas se versionan en migraciones.

## Estado de reconciliación

La auditoría en vivo detectó que la base consultada tenía seis buckets y políticas para cinco buckets, mientras que el código contemplaba doce. La migración indicada arriba provisiona el inventario canónico, conserva públicos únicamente los dos buckets de medios no sensibles y agrega políticas tenant-scoped a los siete buckets que no tenían políticas en la base consultada. También preserva las políticas especializadas ya existentes para `documents`, `vehicle-images`, `company-logos`, `inspection-images` y `seguimientos`.

**Estado de la migración en este PR: pendiente de aplicación controlada.** El cambio de código deja de crear buckets al vuelo; por tanto, aplicar la migración antes de desplegar los cambios de API en producción. No se ejecutó DDL ni se modificó Storage en producción durante esta rama.

## Verificación posterior a la migración

Ejecutar consultas de sólo lectura y comprobar:

1. Los doce buckets existen exactamente una vez.
2. `company-logos` y `vehicle-images` tienen `public = true`; los otros diez tienen `public = false`.
3. Los siete buckets nuevos tienen políticas SELECT, INSERT, UPDATE y DELETE en `storage.objects`.
4. Un usuario de una empresa no puede leer, reemplazar ni borrar objetos de otra empresa.
5. Una URL pública sólo resuelve para los dos buckets autorizados.
6. Una URL firmada privada expira y puede regenerarse mediante `/api/storage/signed-url`.
7. La carga falla de forma explícita si falta un bucket; ninguna API lo crea automáticamente.
