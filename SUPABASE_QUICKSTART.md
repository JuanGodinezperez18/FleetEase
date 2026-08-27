# 🚀 Inicio Rápido - Migración a Supabase

## Resumen

Este proyecto está siendo migrado de **Firebase/Firestore** a **Supabase/PostgreSQL**.

---

## ✅ Lo que ya está listo

### 1. Configuración Base
- ✅ SDK de Supabase instalado (`@supabase/supabase-js`)
- ✅ Archivo de configuración creado (`src/lib/supabase.ts`)
- ✅ Tipos TypeScript generados (`src/types/supabase.ts`)
- ✅ Servicios de datos creados (`src/lib/supabase-services.ts`)
- ✅ Sistema de autenticación implementado (`src/lib/auth.ts`)

### 2. Base de Datos
- ✅ Script SQL completo creado (`supabase-schema.sql`)
- ✅ 22 tablas definidas con sus relaciones
- ✅ Índices de rendimiento configurados
- ✅ Triggers para timestamps automáticos
- ✅ Políticas de seguridad RLS implementadas
- ✅ Datos iniciales (seed data) incluidos

### 3. Herramientas de Migración
- ✅ Script de migración automático (`scripts/migrate-to-supabase.ts`)
- ✅ Scripts npm configurados en `package.json`
- ✅ Guía completa de migración (`SUPABASE_MIGRATION_GUIDE.md`)

---

## 🎯 Primeros Pasos

### Paso 1: Crear Proyecto en Supabase

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Inicia sesión o crea una cuenta
3. Haz clic en **"New Project"**
4. Completa:
   - **Name**: `fleetease-manager`
   - **Database Password**: (guárdala en un gestor de contraseñas)
   - **Region**: Elige la más cercana a tus usuarios

### Paso 2: Ejecutar Script SQL

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Haz clic en **"New Query"**
3. Copia y pega el contenido de `supabase-schema.sql`
4. Haz clic en **"Run"**

### Paso 3: Configurar Variables de Entorno

Crea o edita `.env.local`:

```env
# ======================
# SUPABASE
# ======================
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-here
```

Para obtener estas credenciales:
- En Supabase: **Settings** > **API**
- Copia **Project URL** y **anon/public key**

### Paso 4: Probar Conexión

```bash
npm run test:supabase-connection
```

Deberías ver:
```
✅ Firebase connection: OK
✅ Supabase connection: OK
```

### Paso 5: Migrar Datos (Opcional)

Si tienes datos en Firebase que quieres migrar:

```bash
# 1. Exportar backup (opcional pero recomendado)
npm run migrate:supabase:export

# 2. Migrar todos los datos
npm run migrate:supabase

# 3. O migrar colecciones específicas
npx tsx scripts/migrate-to-supabase.ts migrate clients,vehicles,companies
```

---

## 📁 Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `src/lib/supabase.ts` | Configuración del cliente Supabase |
| `src/lib/supabase-services.ts` | Servicios de datos (reemplaza `firestore-services.ts`) |
| `src/lib/auth.ts` | Autenticación con Supabase Auth |
| `src/types/supabase.ts` | Tipos TypeScript para la BD |
| `supabase-schema.sql` | Script SQL para crear tablas |
| `scripts/migrate-to-supabase.ts` | Herramienta de migración automática |
| `SUPABASE_MIGRATION_GUIDE.md` | Guía completa de migración |

---

## 🔄 Migración Gradual

Puedes mantener Firebase y Supabase funcionando simultáneamente durante la migración:

### Fase 1: Configuración (Actual)
- [x] Configurar Supabase
- [x] Crear esquema de BD
- [x] Crear servicios básicos

### Fase 2: Migración de Datos
- [ ] Ejecutar script de migración
- [ ] Verificar datos migrados
- [ ] Ajustar transformaciones si es necesario

### Fase 3: Migración de Código
- [ ] Actualizar hooks para usar Supabase
- [ ] Actualizar componentes de autenticación
- [ ] Actualizar servicios de datos
- [ ] Actualizar consultas personalizadas

### Fase 4: Testing
- [ ] Tests de autenticación
- [ ] Tests de servicios
- [ ] Tests de componentes
- [ ] Tests E2E

### Fase 5: Producción
- [ ] Deploy a producción
- [ ] Monitorear errores
- [ ] Eliminar código de Firebase

---

## 🛠️ Comandos Útiles

```bash
# Probar conexión
npm run test:supabase-connection

# Migrar datos
npm run migrate:supabase

# Exportar backup
npm run migrate:supabase:export

# Migrar colecciones específicas
npx tsx scripts/migrate-to-supabase.ts migrate clients,vehicles

# Ver ayuda del script de migración
npx tsx scripts/migrate-to-supabase.ts help
```

---

## 📊 Estado de la Migración

| Módulo | Estado | Notas |
|--------|--------|-------|
| Configuración | ✅ Completado | SDK y configuración listos |
| Esquema BD | ✅ Completado | 22 tablas creadas |
| Servicios | ✅ Completado | Servicios genéricos y específicos |
| Autenticación | ✅ Completado | Login, logout, registro |
| Migración Datos | ⏸️ Pendiente | Requiere credentials de Firebase |
| Hooks | ⏸️ Pendiente | Actualizar hooks existentes |
| Componentes | ⏸️ Pendiente | Actualizar componentes UI |
| Testing | ⏸️ Pendiente | Tests de integración |

---

## 🐛 Problemas Comunes

### Error: "Invalid API key"
**Solución**: Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén correctas en `.env.local`

### Error: "relation does not exist"
**Solución**: Ejecuta el script SQL en Supabase SQL Editor

### Error: "permission denied for table"
**Solución**: Verifica que las políticas RLS estén configuradas correctamente

---

## 📚 Recursos

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Migración](./SUPABASE_MIGRATION_GUIDE.md)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

## 🤝 Soporte

¿Problemas o preguntas?

1. Revisa la [Guía Completa de Migración](./SUPABASE_MIGRATION_GUIDE.md)
2. Consulta la documentación oficial de Supabase
3. Únete a la comunidad de Supabase en Discord

---

**Última actualización**: Marzo 2026
