/**
 * Hook para gestión de GPS multi-proveedor
 * 
 * Uso:
 * const gps = useGPS();
 * await gps.configure({ provider: 'traxxis', apiKey: '...' });
 * const locations = await gps.getAllLocations();
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  GPSProviderConfig,
  GPSProviderType,
  VehicleLocation,
  RoutePlayback,
  SimpleCommand,
  CommandResult,
  GPSManager,
  ConnectionStatus,
} from './gps-types';
import { createGPSAdapter } from './gps-types';
import { useData } from '@/hooks/use-data';

interface UseGPSOptions {
  autoConnect?: boolean;       // Conectar automáticamente al montar
  pollingInterval?: number;    // Intervalo de polling en ms (default: 30000)
}

export function useGPS(options: UseGPSOptions = {}): GPSManager {
  const { autoConnect = true, pollingInterval = 30000 } = options;
  
  const { selectedCompanyId } = useData();
  
  // Estado
  const [config, setConfig] = useState<GPSProviderConfig | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Polling
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const locationsRef = useRef<Map<string, VehicleLocation>>(new Map());
  
  // Cargar configuración al iniciar
  useEffect(() => {
    if (autoConnect && selectedCompanyId) {
      loadConfig();
    }
  }, [autoConnect, selectedCompanyId]);
  
  // Cargar configuración desde Firestore
  const loadConfig = async () => {
    if (!selectedCompanyId) return;
    
    try {
      setIsLoading(true);
      
      // Buscar configuración en Firestore
      // Nota: Esto se implementará en el provider
      const configs = await loadGPSConfigs(selectedCompanyId);
      
      if (configs && configs.length > 0) {
        const activeConfig = configs.find(c => c.status === 'connected');
        if (activeConfig) {
          setConfig(activeConfig);
          setIsConnected(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error cargando configuración');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Configurar GPS
  const configure = useCallback(async (newConfig: Partial<GPSProviderConfig>) => {
    if (!selectedCompanyId) {
      throw new Error('No hay compañía seleccionada');
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const adapter = createGPSAdapter(newConfig.provider!);
      
      // Testear conexión
      const testResult = await adapter.testConnection(newConfig.config!);
      
      if (!testResult.success) {
        throw new Error(testResult.message);
      }
      
      // Guardar configuración
      const fullConfig: GPSProviderConfig = {
        id: config?.id || crypto.randomUUID(),
        companyId: selectedCompanyId,
        provider: newConfig.provider!,
        name: newConfig.name || 'Mi GPS',
        status: 'connected',
        config: newConfig.config!,
        vehicleMapping: newConfig.vehicleMapping || [],
        updateInterval: newConfig.updateInterval || 30,
        enableHistory: newConfig.enableHistory ?? true,
        enableAlerts: newConfig.enableAlerts ?? true,
        features: newConfig.features || {
          realTimeLocation: true,
          historicalRoutes: true,
          geofencing: false,
          remoteCommands: false,
          alerts: true,
          fuelMonitoring: false,
          temperatureMonitoring: false,
        },
        createdAt: config?.createdAt || new Date(),
        updatedAt: new Date(),
      };
      
      await saveGPSConfig(fullConfig);
      setConfig(fullConfig);
      setIsConnected(true);
      
      // Iniciar polling
      startPolling(pollingInterval);
      
    } catch (err: any) {
      setError(err.message || 'Error configurando GPS');
      setIsConnected(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId, config, pollingInterval]);
  
  // Testear conexión
  const testConnection = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    if (!config) {
      return { success: false, message: 'No hay configuración' };
    }
    
    try {
      const adapter = createGPSAdapter(config.provider);
      const result = await adapter.testConnection(config.config);
      return result;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [config]);
  
  // Desconectar
  const disconnect = useCallback(async () => {
    if (!config) return;
    
    try {
      stopPolling();
      
      // Actualizar estado en Firestore
      await updateGPSConfigStatus(config.id, 'disconnected');
      
      setConfig(prev => prev ? { ...prev, status: 'disconnected' } : null);
      setIsConnected(false);
      locationsRef.current.clear();
    } catch (err: any) {
      setError(err.message);
    }
  }, [config]);
  
  // Obtener ubicación de un vehículo
  const getLocation = useCallback(async (vehicleId: string): Promise<VehicleLocation | null> => {
    if (!config || !isConnected) return null;
    
    try {
      const mapping = config.vehicleMapping.find(m => m.vehicleId === vehicleId);
      if (!mapping || !mapping.active) return null;
      
      const adapter = createGPSAdapter(config.provider);
      const location = await adapter.getLocation(config.config, mapping.gpsDeviceId);
      
      locationsRef.current.set(vehicleId, location);
      return location;
    } catch (err: any) {
      console.error('Error getting location:', err);
      return null;
    }
  }, [config, isConnected]);
  
  // Obtener todas las ubicaciones
  const getAllLocations = useCallback(async (): Promise<VehicleLocation[]> => {
    if (!config || !isConnected) return [];
    
    try {
      const activeMappings = config.vehicleMapping
        .filter(m => m.active)
        .map(m => m.gpsDeviceId);
      
      if (activeMappings.length === 0) return [];
      
      const adapter = createGPSAdapter(config.provider);
      const locations = await adapter.getBatchLocations(config.config, activeMappings);
      
      // Actualizar ref
      locations.forEach(loc => {
        locationsRef.current.set(loc.vehicleId, loc);
      });
      
      return locations;
    } catch (err: any) {
      console.error('Error getting all locations:', err);
      return [];
    }
  }, [config, isConnected]);
  
  // Iniciar polling
  const startPolling = useCallback((interval?: number) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    const ms = interval || pollingInterval;
    
    // Polling inmediato
    getAllLocations();
    
    // Polling periódico
    pollingRef.current = setInterval(() => {
      getAllLocations();
    }, ms);
  }, [getAllLocations, pollingInterval]);
  
  // Detener polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);
  
  // Obtener historial de ruta
  const getRouteHistory = useCallback(async (
    vehicleId: string,
    start: Date,
    end: Date
  ): Promise<RoutePlayback | null> => {
    if (!config || !isConnected) return null;
    
    try {
      const mapping = config.vehicleMapping.find(m => m.vehicleId === vehicleId);
      if (!mapping || !mapping.active) return null;
      
      const adapter = createGPSAdapter(config.provider);
      const route = await adapter.getRoute(config.config, mapping.gpsDeviceId, start, end);
      
      return route;
    } catch (err: any) {
      console.error('Error getting route history:', err);
      return null;
    }
  }, [config, isConnected]);
  
  // Enviar comando
  const sendCommand = useCallback(async (
    vehicleId: string,
    command: SimpleCommand,
    params?: any
  ): Promise<CommandResult> => {
    if (!config || !isConnected) {
      return { success: false, message: 'GPS no conectado' };
    }
    
    try {
      const mapping = config.vehicleMapping.find(m => m.vehicleId === vehicleId);
      if (!mapping || !mapping.active) {
        return { success: false, message: 'Vehículo no mapeado' };
      }
      
      const adapter = createGPSAdapter(config.provider);
      const result = await adapter.sendCommand(config.config, mapping.gpsDeviceId, command, params);
      
      return result;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [config, isConnected]);
  
  // Obtener información del proveedor
  const getProviderInfo = useCallback(() => {
    if (!config) return null;
    
    return {
      name: config.name,
      type: config.provider,
      status: config.status,
      vehiclesConnected: config.vehicleMapping.filter(m => m.active).length,
    };
  }, [config]);
  
  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);
  
  return {
    isConnected,
    isLoading,
    error,
    provider: config?.provider || null,
    configure,
    testConnection,
    disconnect,
    getLocation,
    getAllLocations,
    startPolling,
    stopPolling,
    getRouteHistory,
    sendCommand,
    getProviderInfo,
  };
}

// ============================================
// FUNCIONES DE FIRESTORE (Se implementarán)
// ============================================

async function loadGPSConfigs(companyId: string): Promise<GPSProviderConfig[]> {
  // TODO: Implementar carga desde Firestore
  // const snapshot = await firestore()
  //   .collection('gps_configs')
  //   .where('companyId', '==', companyId)
  //   .get();
  // return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return [];
}

async function saveGPSConfig(config: GPSProviderConfig): Promise<void> {
  // TODO: Implementar guardado en Firestore
  console.log('Guardando config GPS:', config);
}

async function updateGPSConfigStatus(id: string, status: ConnectionStatus): Promise<void> {
  // TODO: Implementar actualización de estado
  console.log('Actualizando estado:', id, status);
}
