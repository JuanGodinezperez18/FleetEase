# Modo de Desarrollo - Bypass de Session Cookie

## ⚠️ IMPORTANTE
Este modo es **SOLO PARA DESARROLLO** y debe estar **DESACTIVADO EN PRODUCCIÓN**.

## ¿Por qué existe este modo?

El preview de Firebase en VS Code no admite APIs de terceros como Firebase Admin, lo que causa problemas con:
- La creación de session cookies durante el login
- La verificación de tokens en las APIs protegidas
- La carga de imágenes en formularios de inspección de vehículos

## ¿Cómo activar el modo de desarrollo?

### Opción 1: Modificar `.env.local` (Recomendado)
1. Abre el archivo `.env.local` en la raíz del proyecto
2. Busca la línea:
   ```
   NEXT_PUBLIC_BYPASS_SESSION_COOKIE=true
   ```
3. Si no existe, agrégala al final del archivo
4. Guarda el archivo
5. Reinicia el servidor de desarrollo

### Opción 2: Línea de comando
```bash
# Windows
set NEXT_PUBLIC_BYPASS_SESSION_COOKIE=true && npm run dev

# Linux/Mac
NEXT_PUBLIC_BYPASS_SESSION_COOKIE=true npm run dev
```

## ¿Qué hace el modo de desarrollo?

Cuando está activado:

1. **Login**:
   - Omite la creación de session cookie en el servidor
   - El login funciona solo con Firebase Auth del cliente
   - Verás este mensaje en la consola: `⚠️ [Auth] MODO DESARROLLO: Bypass de session cookie activado`

2. **APIs protegidas** (como `upload-inspection`):
   - Omite la verificación del token JWT
   - Otorga permisos de `superAdmin` automáticamente
   - Verás este mensaje en la consola: `⚠️ [API Upload] MODO DESARROLLO: Bypass de autenticación activado`

## Seguridad

### ⚠️ NUNCA actives este modo en producción

Este modo:
- Permite acceso sin validación adecuada
- Otorga permisos elevados sin verificación
- Es una vulnerabilidad de seguridad si se usa en producción

### Verificación de seguridad

Antes de hacer deploy a producción:
```bash
# Buscar la variable en archivos
grep -r "NEXT_PUBLIC_BYPASS_SESSION_COOKIE" .env*

# Si encuentra alguna con valor 'true', cámbiala a 'false' o elimínala
```

## Desactivar el modo de desarrollo

### Método 1: Editar `.env.local`
```env
# Cambiar a false
NEXT_PUBLIC_BYPASS_SESSION_COOKIE=false

# O comentar la línea
# NEXT_PUBLIC_BYPASS_SESSION_COOKIE=true

# O eliminar la línea completamente
```

### Método 2: No definir la variable
Si eliminas la línea del archivo `.env.local`, el modo de bypass estará desactivado automáticamente.

## Uso con Firebase Preview

1. Activa el modo de desarrollo como se describe arriba
2. Inicia el servidor de desarrollo: `npm run dev`
3. Abre el preview de Firebase en VS Code
4. Inicia sesión normalmente con tus credenciales
5. El login funcionará sin necesidad de la session cookie
6. Podrás cargar imágenes en el formulario de seguimiento de vehículos
7. Usa las DevTools de Chrome para depurar errores

## Depuración de problemas de carga de imágenes

Con el modo de desarrollo activado, puedes:

1. Abrir las DevTools (F12 o Ctrl+Shift+I)
2. Ve a la pestaña "Network"
3. Intenta cargar una imagen en el formulario
4. Busca la petición a `/api/upload-inspection`
5. Revisa los errores en la respuesta
6. Verifica la pestaña "Console" para mensajes de error

## Archivos modificados

Los siguientes archivos tienen el código de bypass:

1. `src/middleware.ts` - **CRÍTICO** - Bypass del middleware de autenticación
2. `src/contexts/auth-provider.tsx` - Función `createServerSession`
3. `src/app/api/upload-inspection/route.ts` - Verificación de token
4. `src/contexts/data-provider.tsx` - Protección de nombres de socios undefined

Busca los comentarios `🚧 MODO DESARROLLO` en estos archivos para ver el código.

## Troubleshooting

### El modo no se activa
- Verifica que la variable esté escrita correctamente
- Asegúrate de reiniciar el servidor después de cambiar `.env.local`
- Verifica que el valor sea exactamente `'true'` (string, no booleano)

### Errores al cargar imágenes
- Verifica que Firebase Storage esté configurado correctamente
- Revisa los permisos de Firebase Storage en la consola de Firebase
- Asegúrate de que el bucket existe y es accesible

### No puedo iniciar sesión
- Verifica que Firebase Auth esté configurado correctamente
- Asegúrate de que las credenciales en `.env.local` sean correctas
- Revisa la consola del navegador para errores de Firebase Auth

## Preguntas frecuentes

### ¿Afecta esto al rendimiento?
No, la verificación del modo de desarrollo es instantánea.

### ¿Puedo usar esto en staging?
No se recomienda. Usa este modo solo en desarrollo local.

### ¿Qué pasa si lo dejo activado por accidente?
Si haces deploy con el modo activado, tu aplicación tendrá vulnerabilidades de seguridad graves. Siempre verifica antes de hacer deploy.

---

**Última actualización**: 2025-11-25
