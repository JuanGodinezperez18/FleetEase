/**
 * Módulo de GPS Multi-Proveedor para FleetEase Manager
 * 
 * Permite a los clientes conectar SU PROPIO servicio de GPS
 * mediante API Key, sin que FleetEase sea proveedor de GPS
 */

// ============================================
// TIPOS Y CONFIGURACIÓN
// ============================================

/**
 * Proveedores de GPS soportados
 */
export type GPSProviderType = 
  | 'traxxis'           // Traxxis GPS
  | 'gpscontroller'     // GPS Controller
  | 'closeguard'        // Close-Guard Technology
  | 'wlus'              // WLIUS
  | 'rutefy'            // Rutefy
  | 'gpsinsight'        // GPS Insight
  | 'verizon'           // Verizon Connect
  | 'samsara'           // Samsara
  | 'generic'           // API REST genérica
  | 'custom';           // Implementación custom

/**
 * Estado de conexión del proveedor
 */
export type ConnectionStatus = 
  | 'connected'         // Conectado exitosamente
  | 'disconnected'      // Desconectado
  | 'error'             // Error de autenticación
  | 'testing'           // Probando conexión
  | 'rate-limited';     // Límite de peticiones

/**
 * Configuración de GPS por compañía
 */
export interface GPSProviderConfig {
  id: string;
  companyId: string;
  provider: GPSProviderType;
  name: string;                // Nombre amigable (ej: "Mi Flota GPS")
  status: ConnectionStatus;
  
  // Credenciales (encriptadas en Firestore)
  config: {
    apiUrl: string;            // https://api.provider.com/v1
    apiKey: string;            // API Key
    apiSecret?: string;        // API Secret (opcional)
    webhookUrl?: string;       // Para recibir alertas
    timeout?: number;          // Timeout en ms (default: 30000)
  };
  
  // Mapeo de vehículos: FleetEase ID → GPS Provider ID
  vehicleMapping: VehicleGPSMapping[];
  
  // Configuración de actualización
  updateInterval: number;      // Segundos (default: 30)
  enableHistory: boolean;      // Guardar histórico (default: true)
  enableAlerts: boolean;       // Recibir alertas (default: true)
  
  // Metadata
  lastSync?: Date;
  lastError?: string;
  features: {
    realTimeLocation: boolean;
    historicalRoutes: boolean;
    geofencing: boolean;
    remoteCommands: boolean;
    alerts: boolean;
    fuelMonitoring: boolean;
    temperatureMonitoring: boolean;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mapeo de vehículo a GPS
 */
export interface VehicleGPSMapping {
  vehicleId: string;           // ID en FleetEase
  gpsDeviceId: string;         // ID en el proveedor de GPS
  imei?: string;               // IMEI del dispositivo
  phoneNumber?: string;        // Número SIM (para SMS)
  alias?: string;              // Alias del vehículo
  active: boolean;             // ¿Está activo?
  lastSync?: Date;
}

/**
 * Ubicación de vehículo (simplificada para UI)
 */
export interface VehicleLocation {
  vehicleId: string;
  gpsDeviceId: string;
  latitude: number;
  longitude: number;
  speed: number;               // km/h
  heading: number;             // 0-360 grados
  altitude?: number;           // metros
  timestamp: Date;
  accuracy?: number;           // metros
  ignition: boolean;           // Encendido
  fuelLevel?: number;          // 0-100%
  temperature?: number;        // Celsius
  odometer?: number;           // km totales
  address?: string;            // Dirección (geocoding)
  
  // Metadata para UI
  status: 'moving' | 'stopped' | 'idle' | 'offline';
  lastUpdate: Date;
}

/**
 * Historial de ruta (para playback)
 */
export interface RoutePlayback {
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  positions: VehicleLocation[];
  summary: {
    totalDistance: number;     // km
    totalDuration: number;     // horas
    maxSpeed: number;          // km/h
    avgSpeed: number;          // km/h
    stops: number;
    idleTime: number;          // horas
  };
}

/**
 * Comando remoto simple
 */
export type SimpleCommand = 
  | 'REQUEST_LOCATION'         // Solicitar ubicación
  | 'CUT_ENGINE'               // Cortar motor (⚠️ requiere relay)
  | 'RESUME_ENGINE'            // Restaurar motor
  | 'HONK_HORN'                // Tocar bocina (si soportado)
  | 'FLASH_LIGHTS'             // Encender luces (si soportado)
  | 'LOCK_DOORS'               // Bloquear puertas (si soportado)
  | 'UNLOCK_DOORS';            // Desbloquear puertas (si soportado)

/**
 * Resultado de comando
 */
export interface CommandResult {
  success: boolean;
  message: string;
  commandId?: string;
  estimatedTime?: number;      // Segundos para ejecutar
}

/**
 * Alerta simple de GPS
 */
export interface SimpleAlert {
  id: string;
  vehicleId: string;
  type: 'speeding' | 'geofence_exit' | 'geofence_enter' | 'sos' | 'low_battery' | 'offline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  location?: { lat: number; lng: number };
  timestamp: Date;
  acknowledged: boolean;
}

// ============================================
// INTERFAZ DE PROVEEDOR (Simplificada)
// ============================================

/**
 * Interfaz mínima que debe implementar cada proveedor
 */
export interface GPSProviderAdapter {
  /**
   * Testear conexión con credenciales
   */
  testConnection(config: GPSProviderConfig['config']): Promise<{
    success: boolean;
    message: string;
    vehicleCount?: number;
  }>;

  /**
   * Obtener ubicación de un vehículo
   */
  getLocation(
    config: GPSProviderConfig['config'],
    gpsDeviceId: string
  ): Promise<VehicleLocation>;

  /**
   * Obtener ubicaciones de múltiples vehículos
   */
  getBatchLocations(
    config: GPSProviderConfig['config'],
    gpsDeviceIds: string[]
  ): Promise<VehicleLocation[]>;

  /**
   * Obtener historial de ruta
   */
  getRoute(
    config: GPSProviderConfig['config'],
    gpsDeviceId: string,
    start: Date,
    end: Date
  ): Promise<RoutePlayback>;

  /**
   * Enviar comando remoto
   */
  sendCommand(
    config: GPSProviderConfig['config'],
    gpsDeviceId: string,
    command: SimpleCommand,
    params?: any
  ): Promise<CommandResult>;

  /**
   * Obtener lista de dispositivos disponibles
   */
  listDevices(
    config: GPSProviderConfig['config']
  ): Promise<Array<{
    deviceId: string;
    name: string;
    imei?: string;
    status: 'active' | 'inactive';
  }>>;
}

// ============================================
// GESTOR DE GPS (Fachada Principal)
// ============================================

/**
 * Gestor principal de GPS multi-proveedor
 * Uso: const gps = useGPS();
 */
export interface GPSManager {
  // Estado
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  provider: GPSProviderType | null;
  
  // Métodos de configuración
  configure(config: Partial<GPSProviderConfig>): Promise<void>;
  testConnection(): Promise<{ success: boolean; message: string }>;
  disconnect(): Promise<void>;
  
  // Métodos de ubicación
  getLocation(vehicleId: string): Promise<VehicleLocation | null>;
  getAllLocations(): Promise<VehicleLocation[]>;
  startPolling(interval?: number): void;
  stopPolling(): void;
  
  // Métodos de ruta
  getRouteHistory(
    vehicleId: string,
    start: Date,
    end: Date
  ): Promise<RoutePlayback | null>;
  
  // Métodos de comandos
  sendCommand(
    vehicleId: string,
    command: SimpleCommand,
    params?: any
  ): Promise<CommandResult>;
  
  // Utilidades
  getProviderInfo(): {
    name: string;
    type: GPSProviderType;
    status: ConnectionStatus;
    vehiclesConnected: number;
  } | null;
}

// ============================================
// UTILS PARA UI
// ============================================

/**
 * Obtener icono según estado del vehículo
 */
export function getVehicleStatusIcon(status: VehicleLocation['status']): string {
  const icons = {
    moving: '🚗',      // o icono de auto moviéndose
    stopped: '🅿️',     // auto estacionado
    idle: '⏸️',        // motor encendido pero detenido
    offline: '❓',     // sin señal
  };
  return icons[status];
}

/**
 * Obtener color según estado
 */
export function getVehicleStatusColor(status: VehicleLocation['status']): string {
  const colors = {
    moving: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    stopped: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    idle: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
    offline: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30',
  };
  return colors[status];
}

/**
 * Calcular distancia entre dos puntos (km)
 */
export function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Radio Tierra km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formatear velocidad
 */
export function formatSpeed(speed: number): string {
  return `${Math.round(speed)} km/h`;
}

/**
 * Formatear timestamp relativo
 */
export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Ahora mismo';
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} horas`;
  return `Hace ${Math.floor(seconds / 86400)} días`;
}

/**
 * Obtener dirección desde coordenadas (reverse geocoding)
 * Nota: Requiere API de Google Maps o similar
 */
export async function getAddressFromCoords(
  lat: number,
  lng: number,
  apiKey?: string
): Promise<string> {
  if (!apiKey) return 'Ubicación desconocida';
  
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    const data = await response.json();
    return data.results?.[0]?.formatted_address || 'Ubicación desconocida';
  } catch {
    return 'Ubicación desconocida';
  }
}

// ============================================
// ADAPTERS PARA PROVEEDORES COMUNES
// ============================================

/**
 * Adapter base para APIs REST
 */
export abstract class BaseGPSAdapter implements GPSProviderAdapter {
  protected async makeRequest<T>(
    url: string,
    apiKey: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('API Key inválida o expirada');
      }
      if (response.status === 429) {
        throw new Error('Límite de peticiones excedido');
      }
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  abstract testConnection(config: GPSProviderConfig['config']): Promise<{
    success: boolean;
    message: string;
    vehicleCount?: number;
  }>;

  abstract getLocation(
    config: GPSProviderConfig['config'],
    gpsDeviceId: string
  ): Promise<VehicleLocation>;

  abstract getBatchLocations(
    config: GPSProviderConfig['config'],
    gpsDeviceIds: string[]
  ): Promise<VehicleLocation[]>;

  abstract getRoute(
    config: GPSProviderConfig['config'],
    gpsDeviceId: string,
    start: Date,
    end: Date
  ): Promise<RoutePlayback>;

  abstract sendCommand(
    config: GPSProviderConfig['config'],
    gpsDeviceId: string,
    command: SimpleCommand,
    params?: any
  ): Promise<CommandResult>;

  abstract listDevices(
    config: GPSProviderConfig['config']
  ): Promise<Array<{
    deviceId: string;
    name: string;
    imei?: string;
    status: 'active' | 'inactive';
  }>>;
}

/**
 * Adapter genérico para cualquier API REST
 * El cliente puede configurar endpoints custom
 */
export class GenericRestAdapter extends BaseGPSAdapter {
  async testConnection(config: GPSProviderConfig['config']) {
    try {
      // Intentar obtener lista de dispositivos
      const url = `${config.apiUrl}/devices`;
      const devices = await this.makeRequest<any[]>(url, config.apiKey);
      
      return {
        success: true,
        message: `Conexión exitosa. ${devices.length} dispositivos encontrados.`,
        vehicleCount: devices.length,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Error de conexión',
      };
    }
  }

  async getLocation(config: GPSProviderConfig['config'], gpsDeviceId: string): Promise<VehicleLocation> {
    const url = `${config.apiUrl}/devices/${gpsDeviceId}/location`;
    const data = await this.makeRequest<any>(url, config.apiKey);

    return {
      vehicleId: gpsDeviceId,
      gpsDeviceId,
      latitude: data.latitude || data.lat,
      longitude: data.longitude || data.lng,
      speed: data.speed || 0,
      heading: data.heading || 0,
      altitude: data.altitude,
      timestamp: new Date(data.timestamp || data.updated_at),
      accuracy: data.accuracy,
      ignition: data.ignition || false,
      fuelLevel: data.fuel_level || data.fuelLevel,
      temperature: data.temperature,
      odometer: data.odometer,
      status: data.speed > 0 ? 'moving' : 'stopped' as const,
      lastUpdate: new Date(data.timestamp || data.updated_at),
    };
  }

  async getBatchLocations(
    config: GPSProviderConfig['config'],
    gpsDeviceIds: string[]
  ): Promise<VehicleLocation[]> {
    const url = `${config.apiUrl}/locations/batch`;
    const data = await this.makeRequest<any>(url, config.apiKey, {
      method: 'POST',
      body: JSON.stringify({ device_ids: gpsDeviceIds }),
    });

    return data.map((item: any): VehicleLocation => ({
      vehicleId: item.device_id,
      gpsDeviceId: item.device_id,
      latitude: item.latitude || item.lat,
      longitude: item.longitude || item.lng,
      speed: item.speed || 0,
      heading: item.heading || 0,
      altitude: item.altitude,
      timestamp: new Date(item.timestamp || item.updated_at),
      accuracy: item.accuracy,
      ignition: item.ignition || false,
      status: item.speed > 0 ? 'moving' : 'stopped' as const,
      lastUpdate: new Date(item.timestamp || item.updated_at),
    }));
  }

  async getRoute(
    config: GPSProviderConfig['config'],
    gpsDeviceId: string,
    start: Date,
    end: Date
  ): Promise<RoutePlayback> {
    const url = `${config.apiUrl}/devices/${gpsDeviceId}/route`;
    const data = await this.makeRequest<any>(url, config.apiKey, {
      method: 'POST',
      body: JSON.stringify({
        start: start.toISOString(),
        end: end.toISOString(),
      }),
    });

    return {
      vehicleId: gpsDeviceId,
      startDate: start,
      endDate: end,
      positions: data.positions.map((p: any): VehicleLocation => ({
        vehicleId: gpsDeviceId,
        gpsDeviceId,
        latitude: p.latitude || p.lat,
        longitude: p.longitude || p.lng,
        speed: p.speed || 0,
        heading: p.heading || 0,
        altitude: p.altitude,
        timestamp: new Date(p.timestamp),
        accuracy: p.accuracy,
        ignition: p.ignition || false,
        status: p.speed > 0 ? 'moving' : 'stopped' as const,
        lastUpdate: new Date(p.timestamp),
      })),
      summary: {
        totalDistance: data.total_distance || 0,
        totalDuration: data.total_duration || 0,
        maxSpeed: data.max_speed || 0,
        avgSpeed: data.avg_speed || 0,
        stops: data.stops || 0,
        idleTime: data.idle_time || 0,
      },
    };
  }

  async sendCommand(
    config: GPSProviderConfig['config'],
    gpsDeviceId: string,
    command: SimpleCommand,
    params?: any
  ): Promise<CommandResult> {
    try {
      const url = `${config.apiUrl}/devices/${gpsDeviceId}/command`;
      await this.makeRequest(url, config.apiKey, {
        method: 'POST',
        body: JSON.stringify({ command, params }),
      });

      return {
        success: true,
        message: 'Comando enviado exitosamente',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Error al enviar comando',
      };
    }
  }

  async listDevices(
    config: GPSProviderConfig['config']
  ): Promise<Array<{ deviceId: string; name: string; imei?: string; status: 'active' | 'inactive' }>> {
    const url = `${config.apiUrl}/devices`;
    const data = await this.makeRequest<any[]>(url, config.apiKey);

    return data.map((d: any) => ({
      deviceId: d.id || d.device_id,
      name: d.name || d.alias || d.device_id,
      imei: d.imei,
      status: d.status === 'active' ? 'active' : 'inactive' as const,
    }));
  }
}

/**
 * Registry de adapters
 */
export const GPS_ADAPTERS: Record<GPSProviderType, new () => GPSProviderAdapter> = {
  traxxis: GenericRestAdapter,      // Se puede crear adapter específico
  gpscontroller: GenericRestAdapter,
  closeguard: GenericRestAdapter,
  wlus: GenericRestAdapter,
  rutefy: GenericRestAdapter,
  gpsinsight: GenericRestAdapter,
  verizon: GenericRestAdapter,
  samsara: GenericRestAdapter,
  generic: GenericRestAdapter,
  custom: GenericRestAdapter,
};

/**
 * Factory para obtener adapter
 */
export function createGPSAdapter(provider: GPSProviderType): GPSProviderAdapter {
  const AdapterClass = GPS_ADAPTERS[provider] || GenericRestAdapter;
  return new AdapterClass();
}
