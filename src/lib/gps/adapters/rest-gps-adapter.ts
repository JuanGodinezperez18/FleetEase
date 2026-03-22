/**
 * Adapter genérico para proveedores de GPS con API REST
 * 
 * Este adapter puede ser extendido para proveedores específicos como:
 * - Traxxis GPS
 * - GPS Controller
 * - Close-Guard
 * - etc.
 */

import type {
  GPSProviderAdapter,
  ProviderConfig,
  VehicleLocation,
  RemoteCommand,
  CommandResult,
  Geofence,
  GPSAlert,
} from '@/types/gps';
import {
  GPSException,
  GPSUnauthorizedError,
  GPSRateLimitError,
  GPSProviderNotConfiguredError,
} from '@/types/gps';

/**
 * Configuración extendida para API REST
 */
interface RestAPIConfig extends ProviderConfig {
  apiUrl: string;
  apiKey: string;
  apiSecret?: string;
  timeout?: number;        // ms, default 30000
  retryAttempts?: number;  // default 3
  rateLimit?: number;      // requests por minuto
}

/**
 * Adapter base para APIs REST de GPS
 */
export abstract class RestGPSProviderAdapter implements GPSProviderAdapter {
  protected config: RestAPIConfig | null = null;
  protected alertCallback?: (alert: GPSAlert) => void;
  private requestCount = 0;
  private lastResetTime = Date.now();

  /**
   * Configurar el proveedor
   */
  async configure(config: ProviderConfig): Promise<void> {
    if (!config.apiUrl || !config.apiKey) {
      throw new GPSProviderNotConfiguredError('API URL y API Key son requeridos');
    }

    this.config = {
      apiUrl: config.apiUrl.replace(/\/$/, ''), // Remover slash final
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      rateLimit: config.rateLimit || 100,
    };
  }

  /**
   * Obtener ubicación en tiempo real
   */
  async getRealTimeLocation(vehicleId: string): Promise<VehicleLocation> {
    await this.checkRateLimit();

    const response = await this.makeRequest<{
      lat: number;
      lng: number;
      speed: number;
      heading: number;
      altitude: number;
      timestamp: string;
      accuracy: number;
      ignition: boolean;
      fuelLevel?: number;
      temperature?: number;
      odometer?: number;
    }>('GET', `/vehicles/${vehicleId}/location`);

    return {
      vehicleId,
      latitude: response.lat,
      longitude: response.lng,
      speed: response.speed,
      heading: response.heading,
      altitude: response.altitude,
      timestamp: new Date(response.timestamp),
      accuracy: response.accuracy,
      ignition: response.ignition,
      fuelLevel: response.fuelLevel,
      temperature: response.temperature,
      odometer: response.odometer,
    };
  }

  /**
   * Obtener ubicaciones históricas
   */
  async getHistoricalLocations(
    vehicleId: string,
    start: Date,
    end: Date
  ): Promise<VehicleLocation[]> {
    await this.checkRateLimit();

    const response = await this.makeRequest<Array<{
      lat: number;
      lng: number;
      speed: number;
      heading: number;
      altitude: number;
      timestamp: string;
      accuracy: number;
      ignition: boolean;
    }>>('GET', `/vehicles/${vehicleId}/history`, {
      start: start.toISOString(),
      end: end.toISOString(),
    });

    return response.map(pos => ({
      vehicleId,
      latitude: pos.lat,
      longitude: pos.lng,
      speed: pos.speed,
      heading: pos.heading,
      altitude: pos.altitude,
      timestamp: new Date(pos.timestamp),
      accuracy: pos.accuracy,
      ignition: pos.ignition,
    }));
  }

  /**
   * Obtener múltiples ubicaciones en batch
   */
  async getBatchLocations(vehicleIds: string[]): Promise<VehicleLocation[]> {
    await this.checkRateLimit();

    const response = await this.makeRequest<Array<{
      vehicleId: string;
      lat: number;
      lng: number;
      speed: number;
      heading: number;
      timestamp: string;
    }>>('POST', '/vehicles/locations/batch', {
      vehicleIds,
    });

    return response.map(pos => ({
      vehicleId: pos.vehicleId,
      latitude: pos.lat,
      longitude: pos.lng,
      speed: pos.speed,
      heading: pos.heading,
      altitude: 0,
      timestamp: new Date(pos.timestamp),
      accuracy: 0,
      ignition: false,
    }));
  }

  /**
   * Enviar comando remoto
   */
  async sendCommand(
    vehicleId: string,
    command: RemoteCommand
  ): Promise<CommandResult> {
    await this.checkRateLimit();

    try {
      // Mapear comando genérico a comando específico del proveedor
      const providerCommand = this.mapCommand(command);

      const response = await this.makeRequest<{
        commandId: string;
        status: string;
      }>('POST', `/vehicles/${vehicleId}/commands`, {
        command: providerCommand,
        data: command.data,
      });

      return {
        success: true,
        message: 'Comando enviado exitosamente',
        data: response,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Error al enviar comando',
        error: error.message,
      };
    }
  }

  /**
   * Crear geofence
   */
  async createGeofence(geofence: Geofence): Promise<void> {
    await this.checkRateLimit();

    await this.makeRequest('POST', '/geofences', {
      name: geofence.name,
      type: geofence.type,
      coordinates: geofence.coordinates,
      center: geofence.center,
      radius: geofence.radius,
      alerts: geofence.alerts,
      active: geofence.active,
    });
  }

  /**
   * Actualizar geofence
   */
  async updateGeofence(geofence: Geofence): Promise<void> {
    await this.checkRateLimit();

    await this.makeRequest('PUT', `/geofences/${geofence.id}`, {
      name: geofence.name,
      coordinates: geofence.coordinates,
      radius: geofence.radius,
      alerts: geofence.alerts,
      active: geofence.active,
    });
  }

  /**
   * Eliminar geofence
   */
  async deleteGeofence(id: string): Promise<void> {
    await this.checkRateLimit();

    await this.makeRequest('DELETE', `/geofences/${id}`);
  }

  /**
   * Suscribirse a alertas
   */
  async subscribeToAlerts(callback: (alert: GPSAlert) => void): Promise<void> {
    this.alertCallback = callback;
    
    // Configurar webhook en el proveedor si es soportado
    if (this.config?.webhookUrl) {
      await this.makeRequest('POST', '/webhooks', {
        url: this.config.webhookUrl,
        events: ['alert', 'location_update', 'device_offline'],
      });
    }
  }

  /**
   * Cancelar suscripción a alertas
   */
  async unsubscribeFromAlerts(): Promise<void> {
    this.alertCallback = undefined;

    // Eliminar webhook en el proveedor
    if (this.config?.webhookUrl) {
      await this.makeRequest('DELETE', '/webhooks');
    }
  }

  /**
   * Verificar si está conectado
   */
  isConnected(): boolean {
    return this.config !== null;
  }

  /**
   * Obtener estado del dispositivo
   */
  async getDeviceStatus(vehicleId: string): Promise<{
    online: boolean;
    signalStrength?: number;
    batteryLevel?: number;
    lastCommunication: Date;
  }> {
    await this.checkRateLimit();

    const response = await this.makeRequest<{
      online: boolean;
      signalStrength?: number;
      batteryLevel?: number;
      lastCommunication: string;
    }>('GET', `/vehicles/${vehicleId}/status`);

    return {
      online: response.online,
      signalStrength: response.signalStrength,
      batteryLevel: response.batteryLevel,
      lastCommunication: new Date(response.lastCommunication),
    };
  }

  /**
   * Testear conexión
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    latency?: number;
  }> {
    try {
      const startTime = Date.now();
      await this.makeRequest('GET', '/health');
      const latency = Date.now() - startTime;

      return {
        success: true,
        message: 'Conexión exitosa',
        latency,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Error de conexión',
      };
    }
  }

  // ============================================
  // MÉTODOS PROTEGIDOS PARA HIJOS
  // ============================================

  /**
   * Mapear comando genérico a comando específico del proveedor
   * Debe ser implementado por cada proveedor
   */
  protected abstract mapCommand(command: RemoteCommand): string;

  /**
   * Manejar alerta entrante del webhook
   */
  protected handleIncomingAlert(alert: GPSAlert): void {
    if (this.alertCallback) {
      this.alertCallback(alert);
    }
  }

  // ============================================
  // MÉTODOS PRIVADOS DE UTILIDAD
  // ============================================

  /**
   * Hacer petición HTTP con reintentos
   */
  private async makeRequest<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    if (!this.config) {
      throw new GPSProviderNotConfiguredError('Provider not configured');
    }

    const url = `${this.config.apiUrl}${path}`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts!; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout!);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            ...(this.config.apiSecret && {
              'X-API-Secret': this.config.apiSecret,
            }),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            throw new GPSUnauthorizedError(this.config.apiUrl);
          } else if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            throw new GPSRateLimitError(
              this.config.apiUrl,
              retryAfter ? parseInt(retryAfter) : undefined
            );
          } else {
            const errorData = await response.json().catch(() => ({}));
            throw new GPSException(
              errorData.message || `HTTP ${response.status}`,
              `HTTP_${response.status}`
            );
          }
        }

        return await response.json();
      } catch (error: any) {
        lastError = error;

        // No reintentar si es error de autenticación
        if (error instanceof GPSUnauthorizedError) {
          throw error;
        }

        // Esperar antes de reintentar (exponential backoff)
        if (attempt < this.config.retryAttempts!) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new GPSException('Unknown error', 'UNKNOWN');
  }

  /**
   * Verificar límite de peticiones
   */
  private async checkRateLimit(): Promise<void> {
    if (!this.config?.rateLimit) return;

    const now = Date.now();
    const oneMinute = 60000;

    // Resetear contador si pasó un minuto
    if (now - this.lastResetTime > oneMinute) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    // Esperar si excedió el límite
    if (this.requestCount >= this.config.rateLimit) {
      const waitTime = oneMinute - (now - this.lastResetTime);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.lastResetTime = Date.now();
    }

    this.requestCount++;
  }
}

// ============================================
// EJEMPLO: IMPLEMENTACIÓN PARA TRAXXIS GPS
// ============================================

/**
 * Implementación específica para Traxxis GPS
 * (Ejemplo de cómo extender el adapter base)
 */
export class TraxxisGPSAdapter extends RestGPSProviderAdapter {
  protected mapCommand(command: RemoteCommand): string {
    // Mapear comandos genéricos a comandos de Traxxis
    const commandMap: Record<string, string> = {
      'REQUEST_LOCATION': 'get_location',
      'CUT_ENGINE': 'engine_cut_off',
      'RESUME_ENGINE': 'engine_restore',
      'SET_REPORTING_INTERVAL': 'set_upload_interval',
      'SET_GEOFENCE': 'set_area',
      'RESET_DEVICE': 'device_reset',
      'CONFIGURE_ALERTS': 'set_alarm_config',
      'FUEL_CUTOFF': 'fuel_circuit_cut',
      'SOS_MODE': 'enable_sos',
      'SLEEP_MODE': 'enter_sleep',
      'WAKE_UP': 'wake_up',
    };

    return commandMap[command.type] || command.type;
  }

  // Override si Traxxis tiene endpoints específicos
  override async getRealTimeLocation(vehicleId: string): Promise<VehicleLocation> {
    // Traxxis usa un endpoint ligeramente diferente
    return super.getRealTimeLocation(vehicleId);
  }
}

/**
 * Implementación específica para GPS Controller
 */
export class GPSControllerAdapter extends RestGPSProviderAdapter {
  protected mapCommand(command: RemoteCommand): string {
    const commandMap: Record<string, string> = {
      'REQUEST_LOCATION': 'location_now',
      'CUT_ENGINE': 'relay_off',
      'RESUME_ENGINE': 'relay_on',
      'SET_REPORTING_INTERVAL': 'acc_upload_interval',
      'SET_GEOFENCE': 'area_config',
      'RESET_DEVICE': 'reboot_device',
      'CONFIGURE_ALERTS': 'alarm_setup',
      'FUEL_CUTOFF': 'fuel_stop',
      'SOS_MODE': 'sos_enable',
      'SLEEP_MODE': 'power_save',
      'WAKE_UP': 'power_on',
    };

    return commandMap[command.type] || command.type;
  }
}
