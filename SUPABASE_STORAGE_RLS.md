# Políticas RLS para Supabase Storage - FleetEase

## 📋 Resumen

Este documento contiene las políticas de seguridad (RLS) necesarias para Supabase Storage en FleetEase.

**¿Qué es RLS?**
Row Level Security permite controlar quién puede acceder a qué archivos basado en el usuario autenticado y sus atributos.

---

## 🗂️ Buckets Necesarios

### 1. documents
Documentos generales del sistema (contratos, recibos, etc.)

```sql
-- Crear bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Configurar bucket como privado
UPDATE storage.buckets
SET public = false
WHERE id = 'documents';
```

### 2. vehicle-images
Imágenes de vehículos

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-images', 'vehicle-images', false);
```

### 3. client-documents
Documentos de clientes (INE, licencia, etc.)

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false);
```

### 4. seguimientos
Fotos de seguimiento de vehículos

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('seguimientos', 'seguimientos', false);
```

### 5. inspection-images
Imágenes de inspecciones de vehículos

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-images', 'inspection-images', false);
```

---

## 🔐 Políticas RLS

### Bucket: documents

#### SELECT (Lectura)
Los usuarios solo pueden leer archivos de su propia compañía.

```sql
CREATE POLICY "Allow read own company documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- Extraer company_id del path (ej: companies/uuid/...)
    (storage.foldername(name))[1] = 'companies'
    AND (storage.foldername(name))[2]::uuid IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  )
);
```

#### INSERT (Subida)
Solo admins, editores y super_admins pueden subir documentos.

```sql
CREATE POLICY "Allow upload admin editor" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (
    -- Verificar rol del usuario
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'editor', 'super_admin')
    )
    AND
    -- Verificar que el archivo va a su compañía
    (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2]::uuid IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  )
);
```

#### DELETE (Eliminación)
Solo admins y super_admins pueden eliminar documentos de su compañía.

```sql
CREATE POLICY "Allow delete admin only" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
    AND (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2]::uuid IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  )
);
```

---

### Bucket: vehicle-images

#### SELECT (Lectura)
Cualquier usuario autenticado de la compañía puede ver imágenes de vehículos.

```sql
CREATE POLICY "Allow read company vehicle images" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'vehicle-images'
  AND (
    (storage.foldername(name))[1] = 'companies'
    AND (storage.foldername(name))[2]::uuid IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  )
);
```

#### INSERT (Subida)
Admins, editores y el sistema pueden subir imágenes.

```sql
CREATE POLICY "Allow upload vehicle images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'editor', 'super_admin')
    )
    AND (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2]::uuid IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  )
);
```

---

### Bucket: client-documents

#### SELECT (Lectura)

```sql
CREATE POLICY "Allow read own company client docs" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (
    (storage.foldername(name))[1] = 'companies'
    AND (storage.foldername(name))[2]::uuid IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  )
);
```

#### INSERT (Subida)

```sql
CREATE POLICY "Allow upload client documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-documents'
  AND (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'editor', 'super_admin')
    )
    AND (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2]::uuid IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  )
);
```

---

### Bucket: seguimientos

#### SELECT (Lectura)
Los clientes solo pueden ver sus propias fotos, los admins ven todas las de la compañía.

```sql
CREATE POLICY "Allow read own seguimientos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'seguimientos'
  AND (
    -- Admin/Editor ve todo de su compañía
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'editor', 'super_admin')
      )
      AND (
        (storage.foldername(name))[1]::uuid IN (
          SELECT company_id FROM public.users WHERE id = auth.uid()
        )
      )
    )
    OR
    -- Cliente solo ve sus propios archivos (path incluye client_id)
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'client'
      )
      AND (
        -- El path debe incluir el client_id del usuario
        (storage.foldername(name))[2]::uuid IN (
          SELECT id FROM public.clients WHERE user_id = auth.uid()
        )
      )
    )
  )
);
```

#### INSERT (Subida)
Solo clientes pueden subir fotos de seguimiento de sus propios vehículos.

```sql
CREATE POLICY "Allow upload own seguimientos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'seguimientos'
  AND (
    -- Verificar que es cliente
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'client'
    )
    -- Verificar que el path incluye su client_id
    AND (
      (storage.foldername(name))[2]::uuid IN (
        SELECT id FROM public.clients WHERE user_id = auth.uid()
      )
    )
  )
);
```

---

### Bucket: inspection-images

#### SELECT (Lectura)

```sql
CREATE POLICY "Allow read company inspection images" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'inspection-images'
  AND (
    (storage.foldername(name))[1] = 'companies'
    AND (storage.foldername(name))[2]::uuid IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
  )
);
```

#### INSERT (Subida)

```sql
CREATE POLICY "Allow upload inspection images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'inspection-images'
  AND (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'editor', 'super_admin', 'client')
    )
    AND (
      (storage.foldername(name))[1] = 'companies'
      AND (storage.foldername(name))[2]::uuid IN (
        SELECT company_id FROM public.users WHERE id = auth.uid()
      )
    )
  )
);
```

---

## 🔧 Funciones Auxiliares

### Función para extraer company_id del path

```sql
-- Crear función para extraer company_id de un path
CREATE OR REPLACE FUNCTION storage.get_company_id_from_path(path text)
RETURNS uuid AS $$
DECLARE
  parts text[];
BEGIN
  parts := string_to_array(path, '/');
  IF array_length(parts, 1) >= 2 AND parts[1] = 'companies' THEN
    RETURN parts[2]::uuid;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

## 📊 Estructura de Carpetas Recomendada

### documents/
```
documents/
├── companies/
│   ├── {company_id}/
│   │   ├── templates/
│   │   ├── receipts/
│   │   │   ├── 2024/
│   │   │   │   ├── 01/
│   │   │   │   ├── 02/
│   │   │   │   └── ...
│   │   └── general/
```

### vehicle-images/
```
vehicle-images/
├── companies/
│   ├── {company_id}/
│   │   ├── vehicles/
│   │   │   ├── {vehicle_id}/
│   │   │   │   ├── image1.jpg
│   │   │   │   └── image2.jpg
```

### client-documents/
```
client-documents/
├── companies/
│   ├── {company_id}/
│   │   ├── clients/
│   │   │   ├── {client_id}/
│   │   │   │   ├── ine.jpg
│   │   │   │   ├── license.jpg
│   │   │   │   └── contract.pdf
```

### seguimientos/
```
seguimientos/
├── {company_id}/
│   ├── {client_id}/
│   │   ├── {vehicle_id}/
│   │   │   ├── photo1.jpg
│   │   │   └── photo2.jpg
```

---

## ⚙️ Configuración en Supabase Dashboard

### Paso 1: Crear Buckets
1. Ve a **Supabase Dashboard > Storage**
2. Haz clic en **New Bucket**
3. Crea cada bucket con los nombres especificados arriba
4. **IMPORTANTE**: Desmarcar "Make bucket public" para buckets privados

### Paso 2: Habilitar RLS
1. Ve a **SQL Editor**
2. Ejecuta las políticas SQL de arriba

### Paso 3: Verificar Políticas
1. Ve a **Storage > Policies**
2. Deberías ver las políticas listadas por bucket

---

## 🧪 Testing de Políticas

### Test: Subir archivo
```typescript
const { data, error } = await supabase.storage
  .from('documents')
  .upload('companies/123/test.pdf', file);
```

### Test: Generar URL firmada
```typescript
const { data } = await supabase.storage
  .from('documents')
  .createSignedUrl('companies/123/test.pdf', 60);
```

### Test: Eliminar archivo
```typescript
const { error } = await supabase.storage
  .from('documents')
  .remove(['companies/123/test.pdf']);
```

---

## 🚨 Solución de Problemas

### Error: "new row violates row-level security policy"
- Verifica que el path tenga el formato correcto: `companies/{uuid}/...`
- Verifica que el usuario tenga el rol correcto
- Verifica que el company_id en el path coincida con el del usuario

### Error: "Bucket not found"
- El bucket no existe, créalo primero
- El nombre del bucket no coincide (case-sensitive)

### Error: "Resource not found"
- El archivo no existe en el path especificado
- El usuario no tiene permisos para ver ese archivo

---

## 📚 Recursos Adicionales

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Storage RLS Guide](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Policies Reference](https://supabase.com/docs/guides/auth/row-level-security)

---

## ✅ Checklist de Implementación

- [ ] Crear buckets en Supabase Dashboard
- [ ] Ejecutar políticas SQL en SQL Editor
- [ ] Probar upload desde el cliente
- [ ] Probar lectura con URL firmada
- [ ] Probar eliminación
- [ ] Verificar que otros usuarios no pueden acceder
- [ ] Documentar estructura de carpetas usada
- [ ] Configurar CORS si es necesario
