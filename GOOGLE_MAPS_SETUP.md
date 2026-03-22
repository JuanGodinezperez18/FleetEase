# Configuración de Google Maps API

Este documento explica cómo configurar la API de Google Maps para habilitar el autocompletado de direcciones en los formularios.

## 📋 Requisitos Previos

- Cuenta de Google Cloud Platform
- Proyecto de Firebase activo

## 🔑 Paso 1: Obtener la API Key de Google Maps

1. **Acceder a Google Cloud Console:**
   - Ir a [Google Cloud Console](https://console.cloud.google.com/)
   - Seleccionar el proyecto de Firebase (fleetease-manager)

2. **Habilitar las APIs necesarias:**
   - En el menú lateral, ir a **APIs y servicios** > **Biblioteca**
   - Buscar y habilitar las siguientes APIs:
     - **Places API** (obligatorio para autocompletado)
     - **Geocoding API** (recomendado)
     - **Maps JavaScript API** (recomendado)

3. **Crear una API Key:**
   - Ir a **APIs y servicios** > **Credenciales**
   - Clic en **+ CREAR CREDENCIALES** > **Clave de API**
   - Copiar la clave generada

4. **Configurar restricciones de seguridad (IMPORTANTE):**
   - Clic en la API Key creada para editarla
   - En **Restricciones de aplicación**:
     - Seleccionar "Referentes HTTP (sitios web)"
     - Agregar los dominios permitidos:
       ```
       localhost:*
       tu-dominio.com/*
       *.tu-dominio.com/*
       ```
   - En **Restricciones de API**:
     - Seleccionar "Restringir clave"
     - Elegir las APIs habilitadas anteriormente:
       - Places API
       - Geocoding API
       - Maps JavaScript API
   - Guardar cambios

## 🔧 Paso 2: Configurar la Variable de Entorno

1. **Editar el archivo `.env.local`:**
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=TU_API_KEY_AQUI
   ```

2. **Reemplazar el valor:**
   - Pegar la API Key obtenida en el paso anterior
   - Ejemplo:
     ```bash
     NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAbc123def456ghi789jkl012mno345pqr
     ```

3. **Reiniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

## ✅ Verificar que Funciona

Una vez configurada la API Key, los formularios de:
- **Clientes** (src/app/dashboard/clients/components/client-form.tsx)
- **Socios** (src/app/dashboard/partners/components/partner-form.tsx)
- **Empresas** (src/app/dashboard/companies/components/company-form.tsx)
- **Usuarios** (src/app/dashboard/users/components/user-form.tsx)

Deberían mostrar el autocompletado de Google Maps al escribir en el campo "Calle y Número".

## 🔍 Solución de Problemas

### El autocompletado no aparece

1. **Verificar que la API Key está correctamente configurada:**
   - Revisar que no hay espacios antes o después de la clave
   - Verificar que la variable comienza con `NEXT_PUBLIC_`

2. **Verificar que las APIs están habilitadas:**
   - Ir a Google Cloud Console > APIs y servicios > Panel
   - Confirmar que "Places API" está habilitada

3. **Verificar restricciones:**
   - Si las restricciones son muy estrictas, temporalmente quitar las restricciones para probar
   - Una vez funcionando, volver a aplicar restricciones de seguridad

4. **Revisar la consola del navegador:**
   - Abrir las herramientas de desarrollo (F12)
   - Verificar si hay errores relacionados con Google Maps
   - Errores comunes:
     - "This API project is not authorized to use this API" → Habilitar la API
     - "RefererNotAllowedMapError" → Ajustar restricciones de referentes

### Campos manuales como fallback

Si Google Maps no está disponible, el componente `AddressAutocomplete` automáticamente muestra campos de entrada manual para que los usuarios puedan ingresar direcciones sin el autocompletado.

## 💰 Costos

Google Maps ofrece $200 USD de crédito mensual gratis. El autocompletado de direcciones consume:
- **Autocomplete - Per Session**: $2.83 por 1000 solicitudes
- Con el crédito mensual gratuito, puedes realizar aproximadamente 70,000 autocompletados al mes sin costo

Para más información: [Google Maps Platform Pricing](https://developers.google.com/maps/billing-and-pricing/pricing)

## 🔐 Mejores Prácticas de Seguridad

1. **Nunca** subir la API Key a repositorios públicos
2. Siempre configurar restricciones de API y de aplicación
3. Monitorear el uso en Google Cloud Console
4. Configurar alertas de facturación
5. Rotar la API Key periódicamente

## 📚 Recursos Adicionales

- [Documentación oficial de Places API](https://developers.google.com/maps/documentation/places/web-service)
- [Guía de seguridad de API Keys](https://developers.google.com/maps/api-security-best-practices)
- [React Google Maps API Docs](https://react-google-maps-api-docs.netlify.app/)
