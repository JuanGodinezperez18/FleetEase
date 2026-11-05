'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle2, XCircle, AlertTriangle, Clock, Server, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HealthCheck {
  name: string;
  status: 'ok' | 'degraded' | 'error';
  latency?: number;
  error?: string;
}

interface HealthData {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  checks: Record<string, HealthCheck>;
  uptime?: number;
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    // Auto-refresh cada 30 segundos
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'bg-green-500',
      unhealthy: 'bg-red-500',
      degraded: 'bg-yellow-500',
      ok: 'bg-green-500',
      error: 'bg-red-500',
    } as Record<string, string>;

    return (
      <Badge className={`${variants[status] || 'bg-gray-500'} text-white`}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const formatLatency = (ms?: number) => {
    if (ms === undefined) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Health Check</h1>
          <p className="text-muted-foreground">
            Estado de los servicios de FleetEase Manager
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={checkHealth}
            disabled={loading}
            variant="outline"
          >
            {loading ? 'Verificando...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {loading && !health ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Cargando...</p>
          </CardContent>
        </Card>
      ) : health ? (
        <>
          {/* Overall Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Estado General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg">Sistema</span>
                {getStatusBadge(health.status)}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Versión</p>
                  <p className="font-mono">{health.version}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Ambiente</p>
                  <p className="font-mono">{health.environment}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Uptime</p>
                  <p className="font-mono">{formatUptime(health.uptime)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Última verificación</p>
                  <p className="font-mono text-sm">
                    {lastChecked.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Checks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Servicios
              </CardTitle>
              <CardDescription>
                Estado individual de cada servicio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(health.checks).map(([key, check]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <div>
                        <p className="font-medium">{check.name}</p>
                        {check.error && (
                          <p className="text-sm text-red-500">{check.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatLatency(check.latency)}
                      </div>
                      <Badge variant={check.status === 'ok' ? 'default' : 'destructive'}>
                        {check.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Database Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Base de Datos
              </CardTitle>
              <CardDescription>
                Métricas de Firebase Firestore
              </CardDescription>
            </CardHeader>
            <CardContent>
              {health.checks.firestore?.latency !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Latencia</span>
                    <span className="font-mono">
                      {formatLatency(health.checks.firestore.latency)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        health.checks.firestore.latency < 500
                          ? 'bg-green-500'
                          : health.checks.firestore.latency < 1000
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          (health.checks.firestore.latency / 2000) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    Óptimo: &lt;500ms | Aceptable: &lt;1000ms | Lento: &gt;1000ms
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-500">
              Error al cargar el health check
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
