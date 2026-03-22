/**
 * Módulo de GPS para FleetEase Manager
 * 
 * Proporciona integración flexible con múltiples proveedores de GPS
 * soportando APIs REST, TCP/IP y SMS Gateway
 */

// ============================================
// TIPOS Y INTERFACES
// ============================================

/**
 * Tipos de proveedores de GPS
 */
export type GPSProviderType = 'api' | 'tcp' | 'sms';

/**
 * Tipos de comandos remotos
 */
export type GPSCommandType =
  | 'REQUEST_LOCATION'       // Solicitar ubicación
  | 'CUT_ENGINE'             // Cortar motor (requiere relay)
  | 'RESUME_ENGINE'          // Restaurar motor
  | 'SET_REPORTING_INTERVAL' // Configurar frecuencia de reporte
  | 'SET_GEOFENCE'           // Configurar geofence
  | 'RESET_DEVICE'           // Reiniciar dispositivo
  | 'CONFIGURE_ALERTS'       // Configurar alertas
  | 'FUEL_CUTOFF'            // Corte de combustible
  | 'SOS_MODE'               // Modo emergencia
  | 'SLEEP_MODE'             // Modo reposo
  | 'WAKE_UP';               // Despertar dispositivo

/**
 * Tipos de alertas GPS
 */
export type GPSAlertType =
  | 'SPEEDING'            // Exceso de velocidad
  | 'GEOFENCE_ENTER'      // Entrada a zona
  | 'GEOFENCE_EXIT'       // Salida de zona
  | 'GEOFENCE_DWELL'      // Permanencia en zona
  | 'ENGINE_CUT'          // Motor cortado
  | 'SOS_TRIGGERED'       // Botón de pánico
  | 'LOW_FUEL'            // Combustible bajo
  | 'TAMPER_ALERT'        // Manipulación del dispositivo
  | 'NO_SIGNAL'           // Sin señal GPS
  | 'BATTERY_LOW'         // Batería baja
  | 'HARSH_BRAKING'       // Frenado brusco
  | 'HARSH_ACCELERATION'  // Aceleración brusca
  | 'HARSH_CORNERING'     // Curva brusca
  | 'IDLE_TOO_LONG';      // Ralentí prolongado

/**
 * Severidad de alertas
 */
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Estado del dispositivo
 */
export type DeviceStatus = 'active' | 'inactive' | 'offline';

/**
 * Ubicación de vehículo en tiempo real
 */
export interface VehicleLocation {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;           // km/h
  heading: number;         // grados (0-360)
  altitude: number;        // metros
  timestamp: Date;
  accuracy: number;        // metros
  ignition: boolean;       // encendido
  fuelLevel?: number;      // porcentaje (0-100)
  temperature?: number;    // celsius
  odometer?: number;       // km totales
  address?: string;        // dirección inversa (geocoding)
}

/**
 * Historial de ruta
 */
export interface RoutePlayback {
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  positions: VehicleLocation[];
  totalDistance: number;   // km
  totalDuration: number;   // segundos
  maxSpeed: number;        // km/h
  avgSpeed: number;        // km/h
  stops: Stop[];
}

/**
 * Parada en ruta
 */
export interface Stop {
  location: VehicleLocation;
  arrivalTime: Date;
  departureTime: Date;
  duration: number;        // segundos
  address?: string;
}

/**
 * Geofence (zona virtual)
 */
export interface Geofence {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  type: 'polygon' | 'circle' | 'rectangle';
  coordinates: Coordinate[];
  center?: Coordinate;     // Para círculos
  radius?: number;         // metros (para círculos)
  vehicles: string[];      // IDs de vehículos asignados
  alerts: {
    onEnter: boolean;
    onExit: boolean;
    onDwell: boolean;
    dwellTime?: number;    // minutos
  };
  active: boolean;
  schedule?: {
    days: number[];        // 0-6 (Domingo-Sábado)
    startTime: string;     // HH:mm
    endTime: string;       // HH:mm
  };
  color?: string;          // color en mapa
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Coordenada geográfica
 */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Comando remoto
 */
export interface RemoteCommand {
  id: string;
  vehicleId: string;
  deviceId: string;
  type: GPSCommandType;
  data?: any;
  status: 'pending' | 'sent' | 'executed' | 'failed' | 'cancelled';
  errorMessage?: string;
  createdAt: Date;
  sentAt?: Date;
  executedAt?: Date;
  result?: any;
  requestedBy: string;     // UID del usuario
}

/**
 * Alerta GPS
 */
export interface GPSAlert {
  id: string;
  companyId: string;
  vehicleId: string;
  deviceId: string;
  type: GPSAlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  data: any;
  location?: Coordinate;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  notes?: string;
}

/**
 * Dispositivo GPS
 */
export interface GPSDevice {
  id: string;
  companyId: string;
  vehicleId: string;
  providerId: string;
  deviceId: string;        // ID en el proveedor
  imei: string;            // IMEI del dispositivo
  phoneNumber?: string;    // Número SIM (para SMS)
  status: DeviceStatus;
  lastSeen: Date;
  config: {
    reportingInterval: number;  // segundos
    powerSaveMode: boolean;
    alertsEnabled: boolean;
    speedingThreshold?: number; // km/h
  };
  capabilities: {
    fuelSensor: boolean;
    temperatureSensor: boolean;
    camera: boolean;
    relay: boolean;
    sosButton: boolean;
    accelerometer: boolean;
  };
  metadata?: {
    brand: string;
    model: string;
    firmwareVersion: string;
    installationDate: Date;
    notes: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Proveedor de GPS
 */
export interface GPSProvider {
  id: string;
  companyId: string;
  name: string;
  type: GPSProviderType;
  description?: string;
  config: {
    apiUrl?: string;
    apiKey?: string;
    apiSecret?: string;
    tcpPort?: number;
    protocol?: string;       // JT808, etc.
    smsGateway?: string;
    webhookUrl?: string;
  };
  active: boolean;
  vehicles: string[];        // IDs de vehículos
  features: {
    realTimeLocation: boolean;
    historicalRoutes: boolean;
    geofencing: boolean;
    remoteCommands: boolean;
    alerts: boolean;
    fuelMonitoring: boolean;
    temperatureMonitoring: boolean;
    videoStreaming: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Configuración de proveedor
 */
export interface ProviderConfig {
  apiUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  tcpPort?: number;
  protocol?: string;
  smsGateway?: string;
  webhookUrl?: string;
  [key: string]: any;
}

/**
 * Resultado de comando
 */
export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Filtros para consultas GPS
 */
export interface GPSFilters {
  vehicleIds?: string[];
  providerId?: string;
  status?: DeviceStatus;
  dateFrom?: Date;
  dateTo?: Date;
  alertTypes?: GPSAlertType[];
  severity?: AlertSeverity[];
  acknowledged?: boolean;
}

// ============================================
// INTERFAZ DE PROVEEDOR (ADAPTER PATTERN)
// ============================================

/**
 * Interfaz común para todos los proveedores de GPS
 * Cada proveedor (Traxxis, GPS Controller, genérico TCP, SMS) 
 * debe implementar esta interfaz
 */
export interface GPSProviderAdapter {
  /**
   * Configurar el proveedor con credenciales y settings
   */
  configure(config: ProviderConfig): Promise<void>;

  /**
   * Obtener ubicación en tiempo real de un vehículo
   */
  getRealTimeLocation(vehicleId: string): Promise<VehicleLocation>;

  /**
   * Obtener ubicaciones históricas de un vehículo
   */
  getHistoricalLocations(
    vehicleId: string,
    start: Date,
    end: Date
  ): Promise<VehicleLocation[]>;

  /**
   * Obtener múltiples ubicaciones en tiempo real
   */
  getBatchLocations(vehicleIds: string[]): Promise<VehicleLocation[]>;

  /**
   * Enviar comando remoto al dispositivo
   */
  sendCommand(
    vehicleId: string,
    command: RemoteCommand
  ): Promise<CommandResult>;

  /**
   * Crear geofence en el dispositivo/proveedor
   */
  createGeofence(geofence: Geofence): Promise<void>;

  /**
   * Actualizar geofence existente
   */
  updateGeofence(geofence: Geofence): Promise<void>;

  /**
   * Eliminar geofence
   */
  deleteGeofence(id: string): Promise<void>;

  /**
   * Suscribirse a alertas del proveedor
   */
  subscribeToAlerts(
    callback: (alert: GPSAlert) => void
  ): Promise<void>;

  /**
   * Cancelar suscripción a alertas
   */
  unsubscribeFromAlerts(): Promise<void>;

  /**
   * Verificar si está conectado al proveedor
   */
  isConnected(): boolean;

  /**
   * Obtener estado del dispositivo
   */
  getDeviceStatus(vehicleId: string): Promise<{
    online: boolean;
    signalStrength?: number;
    batteryLevel?: number;
    lastCommunication: Date;
  }>;

  /**
   * Testear conexión con el proveedor
   */
  testConnection(): Promise<{
    success: boolean;
    message: string;
    latency?: number;
  }>;
}

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Errores específicos del módulo GPS
 */
export class GPSException extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'GPSException';
  }
}

export class GPSProviderNotConfiguredError extends GPSException {
  constructor(providerId: string) {
    super(
      `El proveedor de GPS "${providerId}" no está configurado`,
      'GPS_PROVIDER_NOT_CONFIGURED'
    );
    this.name = 'GPSProviderNotConfiguredError';
  }
}

export class GPSDeviceOfflineError extends GPSException {
  constructor(vehicleId: string) {
    super(
      `El dispositivo GPS del vehículo "${vehicleId}" está offline`,
      'GPS_DEVICE_OFFLINE'
    );
    this.name = 'GPSDeviceOfflineError';
  }
}

export class GPSCommandFailedError extends GPSException {
  constructor(
    commandType: GPSCommandType,
    reason: string
  ) {
    super(
      `El comando "${commandType}" falló: ${reason}`,
      'GPS_COMMAND_FAILED',
      { commandType, reason }
    );
    this.name = 'GPSCommandFailedError';
  }
}

export class GPSUnauthorizedError extends GPSException {
  constructor(providerId: string) {
    super(
      `No autorizado para el proveedor de GPS "${providerId}". Verifica las credenciales.`,
      'GPS_UNAUTHORIZED'
    );
    this.name = 'GPSUnauthorizedError';
  }
}

export class GPSRateLimitError extends GPSException {
  constructor(
    providerId: string,
    public retryAfter?: number
  ) {
    super(
      `Límite de peticiones excedido para el proveedor "${providerId}"`,
      'GPS_RATE_LIMIT_EXCEEDED'
    );
    this.name = 'GPSRateLimitError';
  }
}

// ============================================
// UTILS
// ============================================

/**
 * Calcular distancia entre dos coordenadas (Haversine formula)
 */
export function calculateDistance(
  coord1: Coordinate,
  coord2: Coordinate
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.latitude)) *
    Math.cos(toRad(coord2.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calcular velocidad promedio
 */
export function calculateAverageSpeed(
  positions: VehicleLocation[]
): number {
  if (positions.length === 0) return 0;
  
  const totalSpeed = positions.reduce((sum, pos) => sum + pos.speed, 0);
  return totalSpeed / positions.length;
}

/**
 * Determinar si un punto está dentro de un polígono
 */
export function isPointInPolygon(
  point: Coordinate,
  polygon: Coordinate[]
): boolean {
  const x = point.latitude;
  const y = point.longitude;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].latitude;
    const yi = polygon[i].longitude;
    const xj = polygon[j].latitude;
    const yj = polygon[j].longitude;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Formatear duración en segundos a string legible
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Formatear distancia en metros a string legible
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  } else {
    return `${Math.round(meters)} m`;
  }
}
