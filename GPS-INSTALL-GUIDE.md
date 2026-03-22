# 📦 Instalación de Dependencias para Módulo GPS

## Dependencias Requeridas

Para usar el módulo de GPS con mapa profesional, necesitas instalar:

```bash
npm install react-leaflet leaflet
npm install -D @types/leaflet
```

## Errores Comunes

### Error: "Cannot find module 'react-leaflet'"

**Solución:**
```bash
npm install react-leaflet leaflet
```

### Error: "L is not defined"

**Solución:**
Importar Leaflet correctamente en el componente:

```typescript
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
```

### Error: Types de Leaflet

**Solución:**
```bash
npm install -D @types/leaflet
```

## Alternativa Sin Dependencias

Si no quieres instalar react-leaflet, puedes usar:

1. **Google Maps** (requiere API Key)
2. **Mapbox** (requiere API Key)
3. **OpenStreetMap con iframe** (limitado)

## Configuración Mínima

```bash
# Paquetes necesarios
npm install react-leaflet leaflet @types/leaflet

# Verificar instalación
npm list react-leaflet leaflet
```

## Notas

- react-leaflet v4+ requiere React 18+
- Leaflet es gratuito para uso comercial
- OpenStreetMap es gratuito pero tiene límites de uso
