# Configuración de Google Maps API

Este documento explica cómo configurar la API de Google Maps para habilitar el autocompletado de direcciones en los formularios.

## 📋 Requisitos Previos

- Cuenta de Google Cloud Platform
- Proyecto de Google Cloud con facturación habilitada

## 🔑 Paso 1: Obtener la API Key de Google Maps

1. **Acceder a Google Cloud Console:**
   - Ir a [Google Cloud Console](https://console.cloud.google.com/)
   - Seleccionar el proyecto que contiene las APIs de FleetEase.

2. **Habilitar las APIs necesarias:**
   - En el menú lateral, ir a **APIs y servicios** > **Biblioteca**
   - Habilitar las APIs que realmente usa la integración:
     - **Places API** (para autocompletado)
     - **Geocoding API** (solo si la integración la usa)
     - **Maps JavaScript API** (solo si la integración la usa)

3. **Crear una API Key:**
   - Ir a **APIs y servicios** > **Credenciales**
   - Clic en **+ CREAR CREDENCIALES** > **Clave de API**
   - Copiar la clave generada.

4. **Configurar restricciones de seguridad (IMPORTANTE):**
   - En **Restricciones de aplicación**, elegir **Referentes HTTP (sitios web)** para una clave usada desde el navegador.
   - Agregar únicamente los orígenes de desarrollo y producción que necesite la aplicación, por ejemplo `http://localhost:3000/*`, `https://fleetease.com.mx/*`, `https://www.fleetease.com.mx/*` y los dominios de Preview aprobados.
   - En **Restricciones de API**, permitir solo las APIs que usa esta clave.
   - Guardar y comprobar el autocompletado sin retirar las restricciones como solución permanente.

## 🔧 Paso 2: Configurar la Variable de Entorno

1. **Editar el archivo `.env.local`:**
   ```bash
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=TU_API_KEY_AQUI
   ```

2. Reemplazar `TU_API_KEY_AQUI` por la clave nueva, restringida y generada en Google Cloud. No pegar claves reales en documentación, commits, issues ni mensajes.

3. Reiniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## ✅ Verificar que Funciona

Los formularios de clientes, socios, empresas y usuarios deberían mostrar el autocompletado de Google Maps al escribir en el campo de dirección. Si no hay clave configurada, `AddressAutocomplete` ofrece campos manuales como alternativa.

## 🔍 Solución de Problemas

1. Verificar que `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` está configurada en el entorno correcto.
2. Confirmar que las APIs requeridas están habilitadas.
3. Revisar la consola del navegador por errores de API o de referente.
4. No retirar las restricciones de una clave de producción para resolver un error; ajustar los orígenes y APIs permitidos.

## 💰 Costos

Consulta los precios vigentes en [Google Maps Platform Pricing](https://developers.google.com/maps/billing-and-pricing/pricing). Los créditos y precios pueden cambiar.

## 🔐 Mejores Prácticas de Seguridad

1. No subir API keys al repositorio público.
2. Restringir cada clave por aplicación y por API.
3. Monitorear el consumo y configurar alertas de facturación.
4. Rotar inmediatamente cualquier clave que haya aparecido en el historial Git público. Borrar una clave del último commit no la invalida.

## 📚 Recursos Adicionales

- [Documentación oficial de Places API](https://developers.google.com/maps/documentation/places/web-service)
- [Guía de seguridad de API Keys](https://developers.google.com/maps/api-security-best-practices)
- [React Google Maps API Docs](https://react-google-maps-api-docs.netlify.app/)
