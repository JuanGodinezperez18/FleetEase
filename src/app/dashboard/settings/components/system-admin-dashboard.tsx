
"use client";

import React from 'react';
import type { SystemHealthMetric } from '@/hooks/use-system-settings-analytics';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useConfigManager } from '@/hooks/use-config-manager';
import {
  ShieldCheck,
  Wrench,
  Settings2,
  AlertTriangle,
  Lightbulb,
  Download,
  Upload,
  RotateCcw
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface SystemAdminDashboardProps {
  systemHealthMetrics: SystemHealthMetric;
}

const HealthScoreGauge = ({ score, title }: { score: number, title: string }) => {
  const scoreColor =
    score >= 90 ? 'text-emerald-500' : score >= 70 ? 'text-green-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';
  
  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score },
  ];
  const COLORS = [
    score >= 90 ? '#10b981' : score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444',
    '#e5e7eb'
  ];

  return (
    <Card className="flex flex-col items-center justify-center text-center">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="relative h-40 w-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              startAngle={180}
              endAngle={0}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 text-4xl font-bold ${scoreColor}`}>
          {score}
        </div>
      </CardContent>
    </Card>
  );
};


export const SystemAdminDashboard: React.FC<SystemAdminDashboardProps> = ({ systemHealthMetrics }) => {
  const { 
      overallHealthScore,
      securityScore,
      maintenanceScore,
      configurationScore,
      alerts,
      recommendations
  } = systemHealthMetrics;

  const { exportConfiguration, importConfiguration, resetToDefaults, isProcessing } = useConfigManager();
  const importInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
      importInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          importConfiguration(file);
      }
      // Reset input value to allow re-uploading the same file
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
  };

  return (
    <div className="space-y-6">
      <Card className="col-span-1 lg:col-span-3">
        <CardHeader>
            <CardTitle>Panel de Control del Sistema</CardTitle>
            <CardDescription>Métricas clave sobre la salud, configuración y seguridad de la aplicación.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <HealthScoreGauge score={overallHealthScore} title="Salud General del Sistema" />

          <Card className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 p-6">
              <div className="flex flex-col items-center justify-center text-center">
                  <ShieldCheck className="h-8 w-8 text-blue-500 mb-2" />
                  <p className="text-sm text-muted-foreground">Seguridad</p>
                  <p className="text-3xl font-bold">{securityScore}/100</p>
              </div>
              <div className="flex flex-col items-center justify-center text-center">
                  <Wrench className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">Mantenimiento</p>
                  <p className="text-3xl font-bold">{maintenanceScore}/100</p>
              </div>
              <div className="flex flex-col items-center justify-center text-center">
                  <Settings2 className="h-8 w-8 text-blue-500 mb-2" />
                  <p className="text-sm text-muted-foreground">Configuración</p>
                  <p className="text-3xl font-bold">{configurationScore}/100</p>
              </div>
          </Card>
      </div>
      
      {(alerts.length > 0 || recommendations.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {alerts.length > 0 && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Alertas Críticas del Sistema</AlertTitle>
                    <AlertDescription>
                        <ul className="mt-2 list-disc list-inside space-y-1">
                            {alerts.map((alert, index) => <li key={`alert-${index}`}>{alert}</li>)}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}
            {recommendations.length > 0 && (
                 <Alert className="border-sky-500/50 text-sky-900 dark:border-sky-500/60 dark:text-sky-200">
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle className="font-semibold">Recomendaciones</AlertTitle>
                    <AlertDescription>
                        <ul className="mt-2 list-disc list-inside space-y-1">
                            {recommendations.map((rec, index) => <li key={`rec-${index}`}>{rec}</li>)}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}
        </div>
      )}

      <Card>
        <CardHeader>
            <CardTitle>Gestión de Configuración</CardTitle>
            <CardDescription>Exporta, importa o restaura la configuración del sistema. Útil para respaldos y migraciones.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
            <Button onClick={exportConfiguration} disabled={isProcessing}>
                <Download className="mr-2 h-4 w-4" />
                Exportar Configuración
            </Button>
            <Button variant="outline" onClick={handleImportClick} disabled={isProcessing}>
                <Upload className="mr-2 h-4 w-4" />
                Importar Configuración
            </Button>
            <input
                type="file"
                ref={importInputRef}
                className="hidden"
                accept=".json"
                onChange={handleFileChange}
            />
            <Button variant="destructive" onClick={resetToDefaults} disabled={isProcessing}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restaurar Defaults
            </Button>
        </CardContent>
      </Card>
    </div>
  );
};
