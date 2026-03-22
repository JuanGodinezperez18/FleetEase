# 🛰️ Módulo de GPS - Guía de Implementación

## 📋 Índice

1. [Introducción](#introducción)
2. [Arquitectura](#arquitectura)
3. [Configuración Inicial](#configuración-inicial)
4. [Agregar un Proveedor](#agregar-un-proveedor)
5. [Ejemplos de Uso](#ejemplos-de-uso)
6. [API Reference](#api-reference)

---

## Introducción

El módulo de GPS de FleetEase permite integrar múltiples proveedores de dispositivos GPS 
desde una interfaz unificada, soportando:

- ✅ APIs REST (Traxxis, GPS Controller, etc.)
- ✅ Protocolos TCP/IP (JT808, genéricos)
- ✅ SMS Gateway (legacy)

---

## Arquitectura

### Adapter Pattern

```
┌─────────────────────────────────────────┐
│         FleetEase Manager               │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │    GPS Service (Fachada)          │ │
│  └───────────────────────────────────┘ │
│              ↓                          │
│  ┌───────────────────────────────────┐ │
│  │    GPS Provider Manager           │ │
│  │  - Carga adapters dinámicamente   │ │
│  │  - Maneja múltiples proveedores   │ │
│  └───────────────────────────────────┘ │
│              ↓                          │
│  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │ Traxxis  │  │ GPS Ctrl │  │ SMS   │ │
│  │ Adapter  │  │ Adapter  │  │Adapter│ │
│  └──────────┘  └──────────┘  └───────┘ │
└─────────────────────────────────────────┘
           ↓
    ┌──────────────┐
    │ Proveedores  │
    │ de GPS       │
    └──────────────┘
```

---

## Configuración Inicial

### 1. Agregar Variables de Entorno

```bash
# .env.local

# GPS - Traxxis (ejemplo)
NEXT_PUBLIC_GPS_TRAXXIS_API_URL=https://api.traxxisgps.com/v1
GPS_TRAXXIS_API_KEY=tu_api_key_aqui

# GPS - GPS Controller (ejemplo)
NEXT_PUBLIC_GPS_CONTROLLER_API_URL=https://api.gpscontroller.com
GPS_CONTROLLER_API_KEY=tu_api_key_aqui
```

### 2. Configurar en Firestore

Colección: `gps_providers`

```typescript
{
  id: "traxxis-001",
  companyId: "company-123",
  name: "Traxxis GPS",
  type: "api",
  config: {
    apiUrl: "https://api.traxxisgps.com/v1",
    apiKey: "***", // Encriptado
    webhookUrl: "https://tu-app.com/api/gps/webhook"
  },
  active: true,
  features: {
    realTimeLocation: true,
    historicalRoutes: true,
    geofencing: true,
    remoteCommands: true,
    alerts: true
  }
}
```

---

## Agregar un Proveedor

### Opción A: Usar Adapter Existente

```typescript
import { TraxxisGPSAdapter } from '@/lib/gps/adapters/rest-gps-adapter';

// Crear instancia
const adapter = new TraxxisGPSAdapter();

// Configurar
await adapter.configure({
  apiUrl: process.env.NEXT_PUBLIC_GPS_TRAXXIS_API_URL!,
  apiKey: process.env.GPS_TRAXXIS_API_KEY!,
  webhookUrl: 'https://tu-app.com/api/gps/webhook'
});

// Usar
const location = await adapter.getRealTimeLocation('vehicle-123');
console.log(location);
```

### Opción B: Crear Adapter Personalizado

```typescript
// src/lib/gps/adapters/my-gps-provider.ts

import { RestGPSProviderAdapter } from './rest-gps-adapter';
import type { RemoteCommand, CommandResult } from '@/types/gps';

export class MyGPSProviderAdapter extends RestGPSProviderAdapter {
  protected mapCommand(command: RemoteCommand): string {
    // Mapear comandos genéricos a tu proveedor
    const commandMap: Record<string, string> = {
      'REQUEST_LOCATION': 'loc_req',
      'CUT_ENGINE': 'engine_stop',
      // ... tus comandos
    };
    
    return commandMap[command.type] || command.type;
  }
  
  // Override si tu proveedor tiene endpoints especiales
  override async getRealTimeLocation(vehicleId: string) {
    // Implementación custom
  }
}
```

---

## Ejemplos de Uso

### 1. Obtener Ubicación en Tiempo Real

```typescript
import { GPSManager } from '@/lib/gps/gps-manager';

const gpsManager = new GPSManager();
await gpsManager.initialize();

// Obtener ubicación de un vehículo
const location = await gpsManager.getLocation('vehicle-123');

console.log(`
  Vehículo: ${location.vehicleId}
  Ubicación: ${location.latitude}, ${location.longitude}
  Velocidad: ${location.speed} km/h
  Dirección: ${location.heading}°
  Encendido: ${location.ignition ? 'Sí' : 'No'}
`);
```

### 2. Obtener Historial de Ruta

```typescript
const start = new Date('2026-03-19T08:00:00');
const end = new Date('2026-03-19T18:00:00');

const route = await gpsManager.getHistoricalRoute('vehicle-123', start, end);

console.log(`
  Distancia total: ${route.totalDistance.toFixed(2)} km
  Duración: ${formatDuration(route.totalDuration)}
  Velocidad máx: ${route.maxSpeed} km/h
  Paradas: ${route.stops.length}
`);

// Reproducir ruta
route.positions.forEach((pos, index) => {
  console.log(`[${index}] ${pos.timestamp.toISOString()}: ${pos.latitude}, ${pos.longitude}`);
});
```

### 3. Crear Geofence

```typescript
import type { Geofence } from '@/types/gps';

const geofence: Geofence = {
  id: 'geo-001',
  companyId: 'company-123',
  name: 'Oficina Central',
  type: 'circle',
  center: { latitude: 19.4326, longitude: -99.1332 },
  radius: 100, // metros
  coordinates: [], // Para círculos no es necesario
  vehicles: ['vehicle-123', 'vehicle-456'],
  alerts: {
    onEnter: false,
    onExit: true,
    onDwell: false,
  },
  active: true,
  color: '#3B82F6',
  createdAt: new Date(),
  updatedAt: new Date(),
};

await gpsManager.createGeofence(geofence);
```

### 4. Enviar Comando Remoto

```typescript
import type { RemoteCommand } from '@/types/gps';

// ⚠️ COMANDO CRÍTICO - Requiere doble confirmación
const command: RemoteCommand = {
  id: 'cmd-001',
  vehicleId: 'vehicle-123',
  deviceId: 'device-xyz',
  type: 'CUT_ENGINE',
  status: 'pending',
  requestedBy: 'user-abc',
  createdAt: new Date(),
  data: {
    reason: 'Reporte de robo',
    confirmed: true,
    confirmedAt: new Date().toISOString(),
  },
};

const result = await gpsManager.sendCommand(command);

if (result.success) {
  console.log('✅ Comando enviado exitosamente');
} else {
  console.error('❌ Error:', result.error);
}
```

### 5. Suscribirse a Alertas

```typescript
// Suscribirse a alertas en tiempo real
await gpsManager.subscribeToAlerts((alert) => {
  console.log(`🚨 Alerta: ${alert.type}`);
  console.log(`   Vehículo: ${alert.vehicleId}`);
  console.log(`   Severidad: ${alert.severity}`);
  console.log(`   Mensaje: ${alert.message}`);
  
  // Mostrar notificación
  toast.alert({
    title: alert.title,
    description: alert.message,
    variant: alert.severity === 'critical' ? 'destructive' : 'default',
  });
});
```

### 6. Obtener Múltiples Vehículos (Batch)

```typescript
const vehicleIds = ['vehicle-1', 'vehicle-2', 'vehicle-3'];
const locations = await gpsManager.getBatchLocations(vehicleIds);

// Mostrar en mapa
locations.forEach(loc => {
  addMarkerToMap({
    lat: loc.latitude,
    lng: loc.longitude,
    title: loc.vehicleId,
    icon: loc.ignition ? 'car-moving' : 'car-stopped',
  });
});
```

---

## API Reference

### GPSManager

#### `initialize()`
Inicializa el manager y carga los proveedores configurados.

```typescript
await gpsManager.initialize();
```

#### `getLocation(vehicleId: string)`
Obtiene ubicación en tiempo real de un vehículo.

```typescript
const location = await gpsManager.getLocation('vehicle-123');
```

#### `getHistoricalRoute(vehicleId: string, start: Date, end: Date)`
Obtiene historial de ruta de un vehículo.

```typescript
const route = await gpsManager.getHistoricalRoute(
  'vehicle-123',
  new Date('2026-03-19T08:00:00'),
  new Date('2026-03-19T18:00:00')
);
```

#### `getBatchLocations(vehicleIds: string[])`
Obtiene ubicaciones de múltiples vehículos.

```typescript
const locations = await gpsManager.getBatchLocations([
  'vehicle-1',
  'vehicle-2'
]);
```

#### `sendCommand(command: RemoteCommand)`
Envía comando remoto a un vehículo.

```typescript
const result = await gpsManager.sendCommand({
  id: 'cmd-001',
  vehicleId: 'vehicle-123',
  deviceId: 'device-xyz',
  type: 'REQUEST_LOCATION',
  status: 'pending',
  requestedBy: 'user-abc',
  createdAt: new Date(),
});
```

#### `createGeofence(geofence: Geofence)`
Crea una zona virtual (geofence).

```typescript
await gpsManager.createGeofence(geofence);
```

#### `subscribeToAlerts(callback: (alert: GPSAlert) => void)`
Suscribe a alertas en tiempo real.

```typescript
await gpsManager.subscribeToAlerts((alert) => {
  console.log(alert);
});
```

#### `testConnection(providerId: string)`
Prueba conexión con un proveedor.

```typescript
const result = await gpsManager.testConnection('traxxis-001');
console.log(result.success ? '✅ Conectado' : '❌ Error');
```

---

## Tipos de Comandos Disponibles

| Comando | Descripción | Requiere Hardware |
|---------|-------------|-------------------|
| `REQUEST_LOCATION` | Solicitar ubicación instantánea | Ninguno |
| `CUT_ENGINE` | Cortar motor | Relay instalado |
| `RESUME_ENGINE` | Restaurar motor | Relay instalado |
| `SET_REPORTING_INTERVAL` | Configurar frecuencia de reporte | Ninguno |
| `SET_GEOFENCE` | Configurar zona virtual | Ninguno |
| `RESET_DEVICE` | Reiniciar dispositivo | Ninguno |
| `CONFIGURE_ALERTS` | Configurar alertas | Ninguno |
| `FUEL_CUTOFF` | Corte de combustible | Relay + sensor |
| `SOS_MODE` | Activar modo emergencia | Botón SOS |
| `SLEEP_MODE` | Modo reposo | Ninguno |
| `WAKE_UP` | Despertar dispositivo | Ninguno |

---

## Tipos de Alertas

| Alerta | Descripción | Severidad |
|--------|-------------|-----------|
| `SPEEDING` | Exceso de velocidad | medium-high |
| `GEOFENCE_ENTER` | Entrada a zona | low-medium |
| `GEOFENCE_EXIT` | Salida de zona | medium |
| `GEOFENCE_DWELL` | Permanencia prolongada | low |
| `ENGINE_CUT` | Motor cortado | high |
| `SOS_TRIGGERED` | Botón de pánico | critical |
| `LOW_FUEL` | Combustible bajo | low |
| `TAMPER_ALERT` | Manipulación del dispositivo | high |
| `NO_SIGNAL` | Sin señal GPS | medium |
| `BATTERY_LOW` | Batería baja | low |
| `HARSH_BRAKING` | Frenado brusco | medium |
| `HARSH_ACCELERATION` | Aceleración brusca | medium |
| `HARSH_CORNERING` | Curva brusca | medium |
| `IDLE_TOO_LONG` | Ralentí prolongado | low |

---

## Consideraciones de Seguridad

### ✅ Comandos Críticos

Los comandos que afectan la operación del vehículo requieren:

1. **Doble confirmación** del usuario
2. **Rol de administrador** o fleet manager
3. **Registro en auditoría** obligatorio
4. **Justificación** del comando

```typescript
// Ejemplo: Corte de motor
if (command.type === 'CUT_ENGINE') {
  // Verificar rol
  if (!['admin', 'fleet_manager'].includes(user.role)) {
    throw new Error('No autorizado');
  }
  
  // Doble confirmación
  if (!command.data.confirmed) {
    throw new Error('Requiere confirmación');
  }
  
  // Registrar en auditoría
  await auditLog.create({
    action: 'GPS_ENGINE_CUT',
    userId: user.id,
    vehicleId: command.vehicleId,
    reason: command.data.reason,
    timestamp: new Date(),
  });
}
```

---

## Troubleshooting

### Error: "Provider not configured"

**Causa:** El proveedor no está configurado en Firestore o faltan variables de entorno.

**Solución:**
```bash
# Verificar variables de entorno
echo $GPS_TRAXXIS_API_KEY

# Verificar Firestore
firebase firestore:get gps_providers
```

### Error: "GPS_DEVICE_OFFLINE"

**Causa:** El dispositivo no tiene conexión celular o GPS.

**Solución:**
1. Verificar que el vehículo tenga señal
2. Revisar si la SIM tiene saldo
3. Esperar a que el vehículo recupere conexión

### Error: "GPS_COMMAND_FAILED"

**Causa:** El dispositivo no soporta el comando o está fuera de cobertura.

**Solución:**
1. Verificar capacidades del dispositivo
2. Reintentar más tarde
3. Contactar al proveedor de GPS

---

## Recursos Adicionales

- [Propuesta Completa](/GPS-MODULE-PROPOSAL.md)
- [Tipos TypeScript](/src/types/gps.ts)
- [Adapters](/src/lib/gps/adapters/)

---

**Última actualización:** Marzo 2026
**Versión:** 1.0.0
