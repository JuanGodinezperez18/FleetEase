/**
 * Configuración de GPS Multi-Proveedor
 * 
 * Wizard de 4 pasos:
 * 1. Seleccionar proveedor
 * 2. Configurar credenciales
 * 3. Mapear vehículos
 * 4. Confirmación
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import type { GPSProviderType, GPSProviderConfig } from '@/lib/gps/gps-types';
import {
  Wifi,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Key,
  Truck,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

// Proveedores disponibles con metadata
const GPS_PROVIDERS: Array<{
  id: GPSProviderType;
  name: string;
  description: string;
  logo?: string;
  features: string[];
  setupUrl?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}> = [
  {
    id: 'traxxis',
    name: 'Traxxis GPS',
    description: 'API REST completa con soporte técnico',
    features: ['Tiempo real', 'Historial', 'Comandos remotos', 'Alertas'],
    setupUrl: 'https://traxxisgps.com/api-docs',
    difficulty: 'easy',
  },
  {
    id: 'gpscontroller',
    name: 'GPS Controller',
    description: 'Múltiples dispositivos, white-label',
    features: ['Multi-dispositivo', 'API REST', 'Webhooks', 'Reportes'],
    setupUrl: 'https://gpscontroller.com',
    difficulty: 'easy',
  },
  {
    id: 'samsara',
    name: 'Samsara',
    description: 'Líder en gestión de flotas',
    features: ['API completa', 'Video', 'Sensores', 'Mantenimiento'],
    setupUrl: 'https://samsara.com/developers',
    difficulty: 'medium',
  },
  {
    id: 'verizon',
    name: 'Verizon Connect',
    description: 'Solución empresarial',
    features: ['GPS avanzado', 'Rutas', 'Combustible', 'ELD'],
    setupUrl: 'https://verizonconnect.com',
    difficulty: 'medium',
  },
  {
    id: 'generic',
    name: 'API Genérica',
    description: 'Cualquier proveedor con API REST',
    features: ['Flexible', 'Configurable', 'Universal'],
    difficulty: 'hard',
  },
];

interface GPSConfigWizardProps {
  onComplete?: (config: Partial<GPSProviderConfig>) => void;
  onCancel?: () => void;
}

export function GPSConfigWizard({ onComplete, onCancel }: GPSConfigWizardProps) {
  const [step, setStep] = useState(1);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [config, setConfig] = useState<Partial<GPSProviderConfig>>({
    provider: undefined,
    name: '',
    config: {
      apiUrl: '',
      apiKey: '',
      apiSecret: '',
      timeout: 30000,
    },
    vehicleMapping: [],
    updateInterval: 30,
    enableHistory: true,
    enableAlerts: true,
  });

  // Paso 1: Seleccionar proveedor
  const handleProviderSelect = (providerId: GPSProviderType) => {
    const provider = GPS_PROVIDERS.find(p => p.id === providerId);
    setConfig(prev => ({
      ...prev,
      provider: providerId,
      name: provider?.name || providerId,
    }));
  };

  // Paso 2: Testear conexión
  const testConnection = async () => {
    if (!config.config?.apiUrl || !config.config?.apiKey) {
      toast.error('Completa la URL de API y API Key');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Simular test (se implementará real)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // TODO: Implementar test real
      const success = true;
      const message = 'Conexión exitosa. 15 vehículos encontrados.';
      
      setTestResult({ success, message });
      
      if (success) {
        toast.success(message);
      } else {
        toast.error(message);
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
      toast.error(error.message);
    } finally {
      setIsTesting(false);
    }
  };

  // Paso 3: Mapear vehículos
  const handleVehicleMapping = (vehicleId: string, gpsDeviceId: string) => {
    setConfig(prev => ({
      ...prev,
      vehicleMapping: prev.vehicleMapping?.map(m =>
        m.vehicleId === vehicleId ? { ...m, gpsDeviceId, active: true } : m
      ) || [],
    }));
  };

  // Completar configuración
  const handleComplete = () => {
    onComplete?.(config as GPSProviderConfig);
    toast.success('GPS configurado exitosamente');
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Configurar GPS</h2>
        <p className="text-muted-foreground">
          Conecta tu proveedor de GPS existente para ver la ubicación de tus vehículos en tiempo real
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">Paso {step} de 4</span>
          <span className="text-sm text-muted-foreground">
            {step === 1 && 'Proveedor'}
            {step === 2 && 'Credenciales'}
            {step === 3 && 'Vehículos'}
            {step === 4 && 'Confirmación'}
          </span>
        </div>
        <Progress value={(step / 4) * 100} className="h-2" />
      </div>

      {/* Steps */}
      {step === 1 && (
        <Step1Provider
          providers={GPS_PROVIDERS}
          selectedProvider={config.provider}
          onSelect={handleProviderSelect}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <Step2Credentials
          config={config.config!}
          provider={config.provider!}
          onChange={(newConfig) => setConfig(prev => ({ ...prev, config: newConfig }))}
          onTest={testConnection}
          isTesting={isTesting}
          testResult={testResult}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <Step3VehicleMapping
          vehicleMapping={config.vehicleMapping || []}
          onMapping={handleVehicleMapping}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <Step4Confirmation
          config={config}
          onConfirm={handleComplete}
          onBack={() => setStep(3)}
          onCancel={onCancel ?? (() => {})}
        />
      )}
    </div>
  );
}

// ============================================
// PASO 1: Seleccionar Proveedor
// ============================================

function Step1Provider({
  providers,
  selectedProvider,
  onSelect,
  onNext,
}: {
  providers: typeof GPS_PROVIDERS;
  selectedProvider?: GPSProviderType;
  onSelect: (id: GPSProviderType) => void;
  onNext: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wifi className="h-5 w-5" />
          Selecciona tu Proveedor de GPS
        </CardTitle>
        <CardDescription>
          Elige el proveedor que ya tienes contratado para tus vehículos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {providers.map(provider => (
            <div
              key={provider.id}
              className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                selectedProvider === provider.id
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
              onClick={() => onSelect(provider.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{provider.name}</h3>
                    <DifficultyBadge difficulty={provider.difficulty} />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {provider.description}
                  </p>
                  
                  <div className="flex gap-2 mt-3">
                    {provider.features.map(feature => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  
                  {provider.setupUrl && (
                    <a
                      href={provider.setupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Cómo obtener tu API Key
                    </a>
                  )}
                </div>
                
                {selectedProvider === provider.id && (
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={onNext} disabled={!selectedProvider}>
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: 'easy' | 'medium' | 'hard' }) {
  const config = {
    easy: { label: 'Fácil', color: 'bg-green-100 text-green-800 dark:bg-green-900/30' },
    medium: { label: 'Medio', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30' },
    hard: { label: 'Avanzado', color: 'bg-red-100 text-red-800 dark:bg-red-900/30' },
  };

  return (
    <Badge className={config[difficulty].color}>
      {config[difficulty].label}
    </Badge>
  );
}

// ============================================
// PASO 2: Configurar Credenciales
// ============================================

function Step2Credentials({
  config,
  provider,
  onChange,
  onTest,
  isTesting,
  testResult,
  onNext,
  onBack,
}: {
  config: GPSProviderConfig['config'];
  provider: GPSProviderType;
  onChange: (config: GPSProviderConfig['config']) => void;
  onTest: () => void;
  isTesting: boolean;
  testResult: { success: boolean; message: string } | null;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Configurar Credenciales
        </CardTitle>
        <CardDescription>
          Ingresa las credenciales de tu cuenta de {provider}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apiUrl">URL de la API</Label>
          <Input
            id="apiUrl"
            placeholder="https://api.proveedor.com/v1"
            value={config.apiUrl}
            onChange={(e) => onChange({ ...config, apiUrl: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Ejemplo: https://api.traxxisgps.com/v1
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <Input
            id="apiKey"
            type="password"
            placeholder="tu-api-key"
            value={config.apiKey}
            onChange={(e) => onChange({ ...config, apiKey: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiSecret">API Secret (opcional)</Label>
          <Input
            id="apiSecret"
            type="password"
            placeholder="tu-api-secret"
            value={config.apiSecret || ''}
            onChange={(e) => onChange({ ...config, apiSecret: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeout">Timeout (ms)</Label>
          <Input
            id="timeout"
            type="number"
            value={config.timeout || 30000}
            onChange={(e) => onChange({ ...config, timeout: parseInt(e.target.value) })}
          />
        </div>

        {/* Test Connection */}
        <div className="pt-4">
          <Button
            onClick={onTest}
            disabled={isTesting || !config.apiUrl || !config.apiKey}
            variant="outline"
            className="w-full"
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Probando conexión...
              </>
            ) : (
              'Probar Conexión'
            )}
          </Button>

          {testResult && (
            <Alert
              className={`mt-3 ${
                testResult.success
                  ? 'bg-green-50 border-green-200 dark:bg-green-950/20'
                  : 'bg-red-50 border-red-200 dark:bg-red-950/20'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertTitle>{testResult.success ? '¡Conexión exitosa!' : 'Error de conexión'}</AlertTitle>
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-between pt-4">
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Atrás
          </Button>
          <Button
            onClick={onNext}
            disabled={!testResult?.success}
          >
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// PASO 3: Mapear Vehículos
// ============================================

function Step3VehicleMapping({
  vehicleMapping,
  onMapping,
  onNext,
  onBack,
}: {
  vehicleMapping: GPSProviderConfig['vehicleMapping'];
  onMapping: (vehicleId: string, gpsDeviceId: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  // Vehículos de ejemplo (se cargarían de Firestore)
  const fleetEaseVehicles = [
    { id: 'v1', name: 'Vehículo 1', plate: 'ABC-123' },
    { id: 'v2', name: 'Vehículo 2', plate: 'DEF-456' },
    { id: 'v3', name: 'Vehículo 3', plate: 'GHI-789' },
  ];

  // Dispositivos GPS encontrados (se cargarían de la API del proveedor)
  const gpsDevices = [
    { id: 'gps1', name: 'Device 001', imei: '123456789' },
    { id: 'gps2', name: 'Device 002', imei: '987654321' },
    { id: 'gps3', name: 'Device 003', imei: '456789123' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Mapear Vehículos
        </CardTitle>
        <CardDescription>
          Asocia cada vehículo de FleetEase con su dispositivo GPS
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Auto-mapeo disponible</AlertTitle>
          <AlertDescription>
            Si los IDs coinciden, puedes usar el auto-mapeo para ahorrar tiempo.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {fleetEaseVehicles.map(vehicle => {
            const mapping = vehicleMapping.find(m => m.vehicleId === vehicle.id);
            
            return (
              <div
                key={vehicle.id}
                className="flex items-center gap-4 p-3 rounded-lg border"
              >
                <div className="flex-1">
                  <p className="font-medium">{vehicle.name}</p>
                  <p className="text-sm text-muted-foreground">{vehicle.plate}</p>
                </div>
                
                <Select
                  value={mapping?.gpsDeviceId || ''}
                  onValueChange={(value) => onMapping(vehicle.id, value)}
                >
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Seleccionar GPS" />
                  </SelectTrigger>
                  <SelectContent>
                    {gpsDevices.map(device => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.name} ({device.imei})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {mapping && (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between pt-4">
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Atrás
          </Button>
          <Button onClick={onNext}>
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// PASO 4: Confirmación
// ============================================

function Step4Confirmation({
  config,
  onConfirm,
  onBack,
  onCancel,
}: {
  config: Partial<GPSProviderConfig>;
  onConfirm: () => void;
  onBack: () => void;
  onCancel: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Confirmar Configuración
        </CardTitle>
        <CardDescription>
          Revisa que todo esté correcto antes de guardar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resumen */}
        <div className="space-y-3 p-4 rounded-lg bg-muted/50">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Proveedor:</span>
            <span className="font-medium">{config.name}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vehículos mapeados:</span>
            <Badge>{config.vehicleMapping?.length || 0}</Badge>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Actualización:</span>
            <span className="font-medium">Cada {config.updateInterval || 30}s</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Historial:</span>
            <span className="font-medium">{config.enableHistory ? 'Activado' : 'Desactivado'}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-muted-foreground">Alertas:</span>
            <span className="font-medium">{config.enableAlerts ? 'Activadas' : 'Desactivadas'}</span>
          </div>
        </div>

        {/* Alerta de comandos remotos */}
        <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-900">Comandos Remotos</AlertTitle>
          <AlertDescription className="text-yellow-800">
            Los comandos como corte de motor requieren hardware adicional (relay) y deben usarse con precaución.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between pt-4">
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Atrás
          </Button>
          <div className="flex gap-3">
            <Button onClick={onCancel} variant="ghost">
              Cancelar
            </Button>
            <Button onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700">
              <CheckCircle className="mr-2 h-4 w-4" />
              Guardar Configuración
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
