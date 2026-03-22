# 🛰️ Módulo de GPS Flexible para FleetEase Manager

## 📋 Resumen Ejecutivo

Este documento presenta la arquitectura para un **módulo de GPS flexible** que permite integrar dispositivos GPS con diferentes tecnologías (API, SMS, TCP/IP) y controlarlos directamente desde FleetEase Manager.

---

## 🎯 Objetivo

Permitir que los usuarios de FleetEase puedan:
1. **Monitorear vehículos en tiempo real** desde nuestro dashboard
2. **Enviar comandos remotos** (geofencing, corte de motor, configuración)
3. **Recibir alertas automáticas** (exceso de velocidad, salida de zona, etc.)
4. **Gestionar múltiples proveedores** de GPS desde una sola interfaz

---

## 🔧 Tecnologías de GPS Disponibles

### 1. **GPS con API REST/HTTP** ✅ (Recomendado)

#### Características:
- Comunicación vía HTTP/HTTPS
- Datos en tiempo real (JSON)
- Fácil integración
- Bajo costo de implementación

#### Proveedores con API:
| Proveedor | API | Costo | Notas |
|-----------|-----|-------|-------|
| **Traxxis GPS** | ✅ REST API | $$ | Documentación completa |
| **GPS Controller** | ✅ API + White-label | $$ | Soporta múltiples dispositivos |
| **Cartrack** | ✅ API Gratuita | $ | Limitado a Sudáfrica |
| **Close-Guard** | ✅ API | $$ | Enfocado en desarrolladores |
| **WLIUS** | ✅ API | $ | Dispositivos económicos |

#### Acciones Posibles con API:
```
✅ Ubicación en tiempo real
✅ Historial de rutas
✅ Geofencing (crear/editar zonas)
✅ Alertas de comportamiento
✅ Estado del motor (encendido/apagado)
✅ Nivel de combustible (si tiene sensor)
✅ Temperatura (si tiene sensor)
✅ Velocidad instantánea
✅ Alertas de mantenimiento
```

---

### 2. **GPS con GPRS/TCP/IP** ⚠️ (Intermedio)

#### Características:
- Protocolos estándar (JT808, JT/T 808)
- Requiere servidor TCP dedicado
- Más complejo de implementar
- Dispositivos económicos chinos

#### Protocolos Comunes:
| Protocolo | Origen | Uso |
|-----------|--------|-----|
| **JT/T 808** | China | Estándar gubernamental |
| **JT/T 809** | China | Distribución de datos |
| **JT/T 1078** | China | Video en tiempo real |
| **GB/T 32960** | China | Vehículos eléctricos |

#### Acciones Posibles con GPRS:
```
✅ Ubicación en tiempo real (continuamente)
✅ Comandos de configuración
✅ Geofencing básico
✅ Corte de combustible (con relay)
✅ Solicitar ubicación instantánea
⚠️ Requiere mantener conexión TCP abierta
```

---

### 3. **GPS con SMS** ❌ (No Recomendado - Legacy)

#### Características:
- Tecnología antigua (2G)
- Solo texto (160 caracteres)
- Costo por mensaje
- Sin tiempo real verdadero

#### Comandos SMS Típicos:
```
STOP123456      → Cortar motor
RESUME123456    → Restaurar motor
WHERE123456     → Solicitar ubicación
GEO123456...    → Configurar geofence
```

#### Limitaciones:
```
❌ No es tiempo real (on-demand)
❌ Costo acumulativo por SMS
❌ Sin confirmación de entrega
❌ Comandos limitados (160 chars)
❌ Requiere señal GSM (no GPRS)
❌ No escalable para flotas grandes
```

---

## 🏗️ Arquitectura Propuesta

### Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLEETEASE MANAGER                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              GPS MODULE (Nuevo)                         │   │
│  │                                                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │   │
│  │  │   API GPS    │  │  GPRS/TCP    │  │  SMS Gateway │ │   │
│  │  │   Adapter    │  │   Adapter    │  │   Adapter    │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │   │
│  │         ↓                ↓                ↓             │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │         GPS Provider Abstraction Layer           │  │   │
│  │  │         (Interfaz unificada de comandos)         │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↓                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              FleetEase Dashboard                        │   │
│  │  - Mapa en tiempo real                                  │   │
│  │  - Historial de rutas                                   │   │
│  │  - Geofencing                                           │   │
│  │  - Alertas                                              │   │
│  │  - Comandos remotos                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
           ↓
    ┌──────────────┐
    │  Proveedores │
    │  de GPS      │
    ├──────────────┤
    │ • Traxxis    │
    │ • GPS Ctrl   │
    │ • Genérico   │
    │ • SMS        │
    └──────────────┘
```

---

## 📦 Funcionalidades del Módulo

### 1. **Mapa en Tiempo Real**

```tsx
interface VehicleLocation {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  altitude: number;
  timestamp: Date;
  accuracy: number;
  ignition: boolean;
  fuelLevel?: number;
  temperature?: number;
}
```

**Features:**
- Actualización cada 5-30 segundos (configurable)
- Iconos por estado (moviéndose, detenido, sin señal)
- Click para ver detalles del vehículo
- Agrupación cuando están cerca

---

### 2. **Historial de Rutas**

```tsx
interface RoutePlayback {
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  positions: VehicleLocation[];
  totalDistance: number;
  totalDuration: number;
  stops: Stop[];
}
```

**Features:**
- Slider para reproducir ruta
- Velocidad variable (1x, 2x, 4x, 8x)
- Marcadores de paradas (tiempo, ubicación)
- Exportar a PDF/Excel

---

### 3. **Geofencing**

```tsx
interface Geofence {
  id: string;
  name: string;
  type: 'polygon' | 'circle' | 'rectangle';
  coordinates: Coordinate[];
  radius?: number; // Para círculos
  vehicles: string[];
  alerts: {
    onEnter: boolean;
    onExit: boolean;
    onDwell: boolean;
    dwellTime?: number; // minutos
  };
  active: boolean;
  schedule?: {
    days: number[]; // 0-6 (Domingo-Sábado)
    startTime: string; // HH:mm
    endTime: string; // HH:mm
  };
}
```

**Features:**
- Dibujar zonas en mapa
- Alertas push/email/SMS
- Reporte de entradas/salidas
- Zonas por cliente (talleres, oficinas)

---

### 4. **Comandos Remotos**

```tsx
interface RemoteCommand {
  id: string;
  vehicleId: string;
  type: CommandTypes;
  status: 'pending' | 'sent' | 'executed' | 'failed';
  createdAt: Date;
  executedAt?: Date;
  result?: any;
}

type CommandTypes =
  | 'REQUEST_LOCATION'      // Solicitar ubicación
  | 'CUT_ENGINE'            // Cortar motor (requiere relay)
  | 'RESUME_ENGINE'         // Restaurar motor
  | 'SET_REPORTING_INTERVAL' // Configurar frecuencia de reporte
  | 'SET_GEOFENCE'          // Configurar geofence
  | 'RESET_DEVICE'          // Reiniciar dispositivo
  | 'CONFIGURE_ALERTS'      // Configurar alertas
  | 'FUEL_CUTOFF'           // Corte de combustible
  | 'SOS_MODE'              // Modo emergencia
  | 'SLEEP_MODE'            // Modo reposo
  | 'WAKE_UP'               // Despertar dispositivo
  ;
```

**⚠️ Advertencias de Seguridad:**
```
⚠️ Corte de motor: Solo usar en emergencia (robo)
⚠️ Requiere relay instalado en el vehículo
⚠️ No usar en movimiento (riesgo de accidente)
⚠️ Registro de auditoría obligatorio
⚠️ Doble confirmación requerida
```

---

### 5. **Alertas Inteligentes**

```tsx
interface GPSAlert {
  id: string;
  type: AlertTypes;
  severity: 'low' | 'medium' | 'high' | 'critical';
  vehicleId: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  data: AlertData;
}

type AlertTypes =
  | 'SPEEDING'              // Exceso de velocidad
  | 'GEOFENCE_ENTER'        // Entrada a zona
  | 'GEOFENCE_EXIT'         // Salida de zona
  | 'GEOFENCE_DWELL'        // Permanencia en zona
  | 'ENGINE_CUT'            // Motor cortado
  | 'SOS_TRIGGERED'         // Botón de pánico
  | 'LOW_FUEL'              // Combustible bajo
  | 'TAMPER_ALERT'          // Manipulación del dispositivo
  | 'NO_SIGNAL'             // Sin señal GPS
  | 'BATTERY_LOW'           // Batería baja
  | 'HARSH_BRAKING'         // Frenado brusco
  | 'HARSH_ACCELERATION'    // Aceleración brusca
  | 'HARSH_CORNERING'       // Curva brusca
  | 'IDLE_TOO_LONG'         // Ralentí prolongado
  ;
```

---

## 🔌 Integración con Proveedores

### Adapter Pattern

```typescript
// Interfaz común para todos los proveedores
interface GPSProviderAdapter {
  // Configuración
  configure(config: ProviderConfig): Promise<void>;
  
  // Ubicación
  getRealTimeLocation(vehicleId: string): Promise<VehicleLocation>;
  getHistoricalLocations(
    vehicleId: string, 
    start: Date, 
    end: Date
  ): Promise<VehicleLocation[]>;
  
  // Comandos
  sendCommand(vehicleId: string, command: RemoteCommand): Promise<void>;
  
  // Geofencing
  createGeofence(geofence: Geofence): Promise<void>;
  updateGeofence(geofence: Geofence): Promise<void>;
  deleteGeofence(id: string): Promise<void>;
  
  // Alertas
  subscribeToAlerts(callback: (alert: GPSAlert) => void): void;
  unsubscribeFromAlerts(): void;
  
  // Health check
  isConnected(): boolean;
  getDeviceStatus(vehicleId: string): Promise<DeviceStatus>;
}
```

### Ejemplo: Adapter para Traxxis GPS

```typescript
class TraxxisGPSAdapter implements GPSProviderAdapter {
  private apiKey: string;
  private baseUrl: string;
  
  async getRealTimeLocation(vehicleId: string): Promise<VehicleLocation> {
    const response = await fetch(`${this.baseUrl}/vehicles/${vehicleId}/location`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    return {
      vehicleId,
      latitude: data.lat,
      longitude: data.lng,
      speed: data.speed,
      heading: data.heading,
      altitude: data.altitude,
      timestamp: new Date(data.timestamp),
      accuracy: data.accuracy,
      ignition: data.ignition,
      fuelLevel: data.fuelLevel,
      temperature: data.temperature
    };
  }
  
  async sendCommand(vehicleId: string, command: RemoteCommand): Promise<void> {
    // Mapear comandos genéricos a API de Traxxis
    const commandMap = {
      'REQUEST_LOCATION': 'get_location',
      'CUT_ENGINE': 'engine_cut',
      'RESUME_ENGINE': 'engine_resume',
      // ... más comandos
    };
    
    await fetch(`${this.baseUrl}/vehicles/${vehicleId}/command`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        command: commandMap[command.type],
        params: command.data
      })
    });
  }
  
  // ... implementar resto de métodos
}
```

### Ejemplo: Adapter Genérico (TCP/IP)

```typescript
class GenericTCPAdapter implements GPSProviderAdapter {
  private server: net.Server;
  private connections: Map<string, net.Socket> = new Map();
  
  async getRealTimeLocation(vehicleId: string): Promise<VehicleLocation> {
    // Obtener última posición del buffer
    return this.locationBuffer.get(vehicleId);
  }
  
  async sendCommand(vehicleId: string, command: RemoteCommand): Promise<void> {
    const socket = this.connections.get(vehicleId);
    if (!socket) {
      throw new Error('Dispositivo no conectado');
    }
    
    // Construir paquete según protocolo
    const packet = this.buildCommandPacket(command);
    socket.write(packet);
  }
  
  private buildCommandPacket(command: RemoteCommand): Buffer {
    // Implementar según protocolo (JT808, etc.)
    // ...
  }
}
```

---

## 🗄️ Modelo de Datos

### Tablas en Firestore

```typescript
// Colección: gps_devices
interface GPSDevice {
  id: string;
  vehicleId: string;           // Referencia a vehículo
  providerId: string;          // Proveedor del GPS
  deviceId: string;            // ID en el proveedor
  imei: string;                // IMEI del dispositivo
  phoneNumber?: string;        // Número SIM (para SMS)
  status: 'active' | 'inactive' | 'offline';
  lastSeen: Date;
  config: {
    reportingInterval: number; // Segundos
    powerSaveMode: boolean;
    alertsEnabled: boolean;
  };
  capabilities: {
    fuelSensor: boolean;
    temperatureSensor: boolean;
    camera: boolean;
    relay: boolean;
    sosButton: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Colección: gps_providers
interface GPSProvider {
  id: string;
  name: string;
  type: 'api' | 'tcp' | 'sms';
  config: {
    apiUrl?: string;
    apiKey?: string;
    tcpPort?: number;
    protocol?: string;
    smsGateway?: string;
  };
  active: boolean;
  vehicles: string[];          // IDs de vehículos
  webhookUrl?: string;         // Para recibir alertas
  createdAt: Date;
}

// Colección: gps_alerts
interface GPSAlert {
  id: string;
  companyId: string;
  vehicleId: string;
  deviceId: string;
  type: AlertTypes;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data: any;
  location?: {
    lat: number;
    lng: number;
  };
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

// Colección: gps_routes (opcional, para histórico)
interface GPSRoute {
  id: string;
  vehicleId: string;
  deviceId: string;
  date: string;                // YYYY-MM-DD
  positions: {
    lat: number;
    lng: number;
    speed: number;
    heading: number;
    timestamp: Date;
  }[];
  summary: {
    totalDistance: number;
    totalDuration: number;
    maxSpeed: number;
    avgSpeed: number;
    stops: number;
  };
}
```

---

## 🎨 Componentes de UI

### 1. Página Principal de GPS

```
/dashboard/gps
├── Mapa en tiempo real
├── Lista de vehículos (filtro por estado)
├── Panel de detalles del vehículo
└── Barra de herramientas:
    - Buscar vehículo
    - Filtrar por estado
    - Ver capas (geofences, rutas, calor)
    - Configurar alertas
```

### 2. Historial de Rutas

```
/dashboard/gps/history
├── Selector de vehículo
├── Selector de fecha/rango
├── Slider de reproducción
├── Estadísticas del viaje
└── Exportar reporte
```

### 3. Gestión de Geofences

```
/dashboard/gps/geofences
├── Lista de zonas
├── Mapa para dibujar/editar
├── Configuración de alertas
├── Asignación de vehículos
└── Reporte de entradas/salidas
```

### 4. Comandos Remotos

```
/dashboard/gps/commands
├── Selector de vehículo
├── Lista de comandos disponibles
├── Confirmación de seguridad
├── Estado del comando
└── Historial de comandos
```

---

## ⚠️ Alcance y Limitaciones

### ✅ Lo que SÍ podemos hacer

| Funcionalidad | API | TCP/IP | SMS |
|--------------|-----|--------|-----|
| Ubicación en tiempo real | ✅ | ✅ | ⚠️ (on-demand) |
| Historial de rutas | ✅ | ✅ | ❌ |
| Geofencing | ✅ | ✅ | ⚠️ (básico) |
| Alertas automáticas | ✅ | ✅ | ⚠️ (limitado) |
| Corte de motor | ✅ (con relay) | ✅ (con relay) | ✅ (con relay) |
| Nivel de combustible | ✅ (con sensor) | ✅ (con sensor) | ❌ |
| Temperatura | ✅ (con sensor) | ✅ (con sensor) | ❌ |
| Configuración remota | ✅ | ✅ | ⚠️ (limitado) |
| Video en tiempo real | ⚠️ (según dispositivo) | ✅ (JT1078) | ❌ |

### ❌ Lo que NO podemos hacer

1. **Dispositivos sin conectividad:**
   - GPS solo con almacenamiento interno (sin SIM)
   - Dispositivos que requieren descarga física de datos

2. **Funciones no soportadas por hardware:**
   - Corte de motor sin relay instalado
   - Nivel de combustible sin sensor
   - Temperatura sin sensor

3. **Limitaciones de red:**
   - Sin señal celular = sin datos
   - Túneles/estacionamientos = pérdida de GPS

4. **Limitaciones legales:**
   - No podemos espiar vehículos de terceros sin consentimiento
   - Regulaciones de privacidad por país

---

## 🔒 Consideraciones de Seguridad

### Autenticación y Autorización

```typescript
// Middleware para comandos críticos
async function authorizeCommand(
  userId: string, 
  command: RemoteCommand,
  companyId: string
): Promise<boolean> {
  // Verificar rol del usuario
  const user = await getUser(userId);
  if (!['admin', 'fleet_manager'].includes(user.role)) {
    return false;
  }
  
  // Verificar que el vehículo pertenece a la compañía
  const vehicle = await getVehicle(command.vehicleId);
  if (vehicle.companyId !== companyId) {
    return false;
  }
  
  // Doble confirmación para comandos críticos
  if (['CUT_ENGINE', 'FUEL_CUTOFF'].includes(command.type)) {
    await requireTwoFactorAuth(userId);
  }
  
  // Registrar en auditoría
  await logCommandAttempt(userId, command);
  
  return true;
}
```

### Auditoría Obligatoria

```typescript
interface CommandAuditLog {
  id: string;
  userId: string;
  userName: string;
  commandType: string;
  vehicleId: string;
  status: 'success' | 'failed' | 'cancelled';
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  reason: string; // Justificación del comando
  twoFactorVerified: boolean;
}
```

---

## 📊 Costos Estimados

### Opción 1: API de Terceros (Recomendado)

| Concepto | Costo Mensual |
|----------|--------------|
| Traxxis GPS (50 vehículos) | $250-500 USD |
| GPS Controller (50 vehículos) | $200-400 USD |
| Desarrollo de integración | $2000-5000 USD (one-time) |
| Mantenimiento | $200-500 USD/mes |

**Ventajas:**
- ✅ Rápida implementación (2-4 semanas)
- ✅ Soporte técnico incluido
- ✅ Documentación completa
- ✅ SLA de uptime

---

### Opción 2: Servidor TCP Propio

| Concepto | Costo Mensual |
|----------|--------------|
| Servidor VPS | $50-100 USD |
| Dispositivos genéricos | $30-50 USD/unidad (one-time) |
| SIM cards (datos) | $5-10 USD/mes por vehículo |
| Desarrollo | $5000-10000 USD (one-time) |
| Mantenimiento | $500-1000 USD/mes |

**Ventajas:**
- ✅ Costo por vehículo más bajo
- ✅ Control total del sistema
- ✅ Sin dependencia de proveedores

**Desventajas:**
- ❌ Mayor complejidad técnica
- ❌ Requiere mantenimiento 24/7
- ❌ Soporte técnico interno

---

### Opción 3: SMS Gateway (No Recomendado)

| Concepto | Costo Mensual |
|----------|--------------|
| SMS Gateway | $100-200 USD |
| Dispositivos SMS | $20-40 USD/unidad |
| SIM cards (SMS) | $0.10-0.50 USD por SMS |
| Desarrollo | $1000-3000 USD (one-time) |

**Desventajas:**
- ❌ Costo acumulativo por SMS
- ❌ No escalable
- ❌ Tecnología obsoleta

---

## 🚀 Roadmap de Implementación

### Fase 1: MVP (4-6 semanas)

```
Semana 1-2:
├── Investigar y seleccionar proveedor de API
├── Configurar cuentas de prueba
└── Diseñar modelo de datos

Semana 3-4:
├── Implementar adapter pattern
├── Crear componente de mapa
└── Integrar ubicación en tiempo real

Semana 5-6:
├── Implementar historial de rutas
├── Crear dashboard básico
└── Testing con vehículos reales
```

### Fase 2: Features Avanzadas (4-6 semanas)

```
Semana 7-8:
├── Implementar geofencing
├── Sistema de alertas
└── Notificaciones push/email

Semana 9-10:
├── Comandos remotos
├── Reportes y exportación
└── Integración con módulos existentes

Semana 11-12:
├── Testing exhaustivo
├── Documentación
└── Lanzamiento beta
```

### Fase 3: Escalamiento (4 semanas)

```
Semana 13-14:
├── Soporte para múltiples proveedores
├── Optimización de performance
└── Analytics y métricas

Semana 15-16:
├── Features adicionales (video, sensores)
├── Mobile app (opcional)
└── Lanzamiento oficial
```

---

## 📝 Recomendaciones

### Para Empezar (Recomendado)

1. **Proveedor:** Traxxis GPS o GPS Controller
   - API bien documentada
   - Soporte técnico
   - Múltiples dispositivos compatibles

2. **Dispositivos:**
   - Inicia con 5-10 vehículos de prueba
   - Verifica que tengan relay para corte de motor
   - Considera sensores de combustible si es relevante

3. **Desarrollo:**
   - Comienza con adapter pattern
   - Implementa solo features esenciales (ubicación, historial)
   - Agrega geofencing y comandos en Fase 2

4. **Costo Inicial Estimado:**
   - Desarrollo: $3000-5000 USD
   - Hardware (10 vehículos): $300-500 USD
   - Servicio mensual (10 vehículos): $50-100 USD

---

## 🎯 Conclusión

### ✅ Sí es viable integrar GPS en FleetEase

**Alcance Realista:**
- ✅ Ubicación en tiempo real desde nuestro dashboard
- ✅ Historial de rutas con reproducción
- ✅ Geofencing básico
- ✅ Alertas de exceso de velocidad, entrada/salida de zonas
- ✅ Comandos remotos (si el hardware lo soporta)

**Limitaciones:**
- ⚠️ Depende de que los vehículos tengan GPS con API
- ⚠️ No todos los dispositivos soportan todas las funciones
- ⚠️ Requiere inversión en hardware y servicio mensual
- ⚠️ SMS es tecnología obsoleta (no推荐)

**Recomendación Final:**
Comenzar con un **proveedor con API** (Traxxis, GPS Controller) para validar el feature con mínima complejidad técnica. Una vez validado, considerar implementar servidor TCP propio para reducir costos a escala.

---

**Próximos Pasos:**
1. Contactar proveedores de GPS para demo/cuentas de prueba
2. Obtener 1-2 dispositivos de prueba
3. Comenzar desarrollo del adapter pattern
4. Integrar con módulo de vehículos existente

---

*Documento creado: Marzo 2026*
*Para revisión técnica y aprobación de presupuesto*
