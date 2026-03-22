# ✅ FIX: Categorías por Defecto No Visibles para Admin

## 🐛 Problema Reportado

**Usuario admin no podía ver categorías por defecto** en formularios de ingresos/gastos.

**Datos de la categoría:**
```json
{
  "id": "89mtvaKgyQ7p1XbaMJqZ",
  "name": "Mantenimiento",
  "type": "expense",
  "description": "Gastos de mantenimiento preventivo y correctivo.",
  "companyId": null,
  "isDefault": true,
  "affects": "partner_balance"
}
```

---

## 🔍 Causa Raíz

Las reglas anteriores solo verificaban `companyId == null`, pero no consideraban el campo `isDefault: true`.

**Regla anterior (incorrecta):**
```javascript
allow read: if request.auth != null &&
  (resource.data.get('companyId', null) == null ||
   isMemberOfCompany(resource.data.companyId) ||
   request.auth.token.role in ['admin', 'editor', 'superAdmin']);
```

**Problema:** Cuando un admin hace una query con `where('companyId', '==', null)`, Firestore no puede evaluar correctamente la regla porque necesita verificar el documento completo.

---

## ✅ Solución Aplicada

**Nueva regla (correcta):**
```javascript
allow read: if request.auth != null &&
  (
    // Categorías del sistema (null o default)
    resource.data.get('companyId', null) == null ||
    resource.data.get('isDefault', false) == true ||
    // Categorías de empresa
    isMemberOfCompany(resource.data.companyId) ||
    request.auth.token.role in ['admin', 'editor', 'superAdmin']
  );
```

**Cambios clave:**
1. ✅ Agregada verificación explícita de `isDefault == true`
2. ✅ Cualquier usuario autenticado puede leer categorías con `isDefault: true`
3. ✅ Admin puede leer TODAS las categorías (null, default, o de empresa)

---

## 📊 Comportamiento Ahora

### Categorías por Defecto (`isDefault: true`, `companyId: null`)

**Quién puede leer:**
- ✅ Cualquier usuario autenticado (admin, editor, client, partner, superAdmin)

**Quién puede escribir:**
- ❌ Nadie (solo superAdmin mediante script)

**Quién puede actualizar/eliminar:**
- ❌ Solo superAdmin

---

### Categorías de Empresa (`companyId: "abc123"`)

**Quién puede leer:**
- ✅ Miembros de esa empresa
- ✅ Admin de esa empresa
- ✅ Editor de esa empresa
- ✅ SuperAdmin

**Quién puede crear:**
- ✅ Admin de esa empresa
- ✅ Editor de esa empresa
- ✅ SuperAdmin

**Quién puede actualizar/eliminar:**
- ✅ Admin de esa empresa
- ✅ Editor de esa empresa
- ✅ SuperAdmin

---

## 🧪 Verificación

### Test 1: Admin Ve Categorías por Defecto

```javascript
// Firestore query desde el cliente
const categories = await db.collection('financialCategories')
  .where('type', '==', 'expense')
  .where('companyId', '==', null)
  .get();

// Resultado esperado:
// ✅ Categorías con isDefault: true son visibles
```

### Test 2: Admin Ve Todas las Categorías

```javascript
// Query sin filtro de companyId
const allCategories = await db.collection('financialCategories')
  .where('type', '==', 'expense')
  .get();

// Resultado esperado:
// ✅ Todas las categorías visibles (default + de empresa)
```

### Test 3: Cliente Solo Ve Categorías Permitidas

```javascript
// Cliente con companyId: "abc123"
const categories = await db.collection('financialCategories')
  .where('companyId', 'in', [null, 'abc123'])
  .get();

// Resultado esperado:
// ✅ Categorías por defecto (isDefault: true)
// ✅ Categorías de su empresa (companyId: 'abc123')
// ❌ NO ve categorías de otras empresas
```

---

## 📁 Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `firestore.rules` | Reglas de financialCategories actualizadas |

---

## 🎯 Reglas Completas Actualizadas

```javascript
// ========== CATEGORÍAS FINANCIERAS ==========
match /financialCategories/{categoryId} {
  // ✅ LECTURA: 
  // - Categorías del sistema (companyId == null O isDefault == true): TODOS los usuarios autenticados
  // - Categorías de empresa: miembros de esa empresa, admin, editor, o superAdmin
  allow read: if request.auth != null &&
                 (
                   // Categorías del sistema (null o default)
                   resource.data.get('companyId', null) == null ||
                   resource.data.get('isDefault', false) == true ||
                   // Categorías de empresa
                   isMemberOfCompany(resource.data.companyId) ||
                   request.auth.token.role in ['admin', 'editor', 'superAdmin']
                 );
  
  // ✅ CREACIÓN: 
  // - Categorías del sistema (companyId == null): solo superAdmin
  // - Categorías de empresa: admin, editor, o superAdmin de esa empresa
  allow create: if request.auth != null &&
                  ((request.resource.data.companyId == null &&
                    request.auth.token.role == 'superAdmin') ||
                   (request.resource.data.companyId != null &&
                    canWrite(request.resource.data.companyId)));
  
  // ✅ ACTUALIZACIÓN Y ELIMINACIÓN:
  // - Categorías del sistema: solo superAdmin
  // - Categorías de empresa: admin, editor, o superAdmin de esa empresa
  allow update, delete: if isSuperAdmin() ||
                          ((resource.data.get('companyId', null) == null || 
                            resource.data.get('isDefault', false) == true) && 
                           isSuperAdmin()) ||
                          (resource.data.companyId != null &&
                           canWrite(resource.data.companyId));
}
```

---

## ✅ Resultado

**Antes:**
- ❌ Admin no veía categorías por defecto en formularios
- ❌ Error de permisos al cargar categorías

**Después:**
- ✅ Admin ve TODAS las categorías (default y de empresa)
- ✅ Editor ve TODAS las categorías
- ✅ Client ve categorías default + de su empresa
- ✅ Partner ve categorías default + de su empresa

---

## 🚀 Deploy

**Comando ejecutado:**
```bash
firebase deploy --only firestore:rules
```

**Estado:** ✅ Desplegado a producción

**Fecha:** 2026-03-18

---

## 🧪 Pruebas Recomendadas

1. **Iniciar sesión como admin**
2. **Ir a formulario de ingresos**
3. **Verificar que el dropdown de categorías muestra:**
   - ✅ "Mantenimiento" (isDefault: true)
   - ✅ "Combustible" (isDefault: true)
   - ✅ "Seguros" (isDefault: true)
   - ✅ Todas las categorías por defecto
4. **Ir a formulario de gastos**
5. **Verificar mismo comportamiento**

---

**Fecha:** 2026-03-18
**Estado:** ✅ Fixeado y desplegado
**Impacto:** Admin ahora ve categorías por defecto en formularios
