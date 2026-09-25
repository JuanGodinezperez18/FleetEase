"use client";

import React from 'react';
import type { SystemHealthMetric } from '@/hooks/use-system-settings-analytics';
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
  RotateCcw,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface SystemAdminDashboardProps {
  systemHealthMetrics: SystemHealthMetric;
}

const HealthScoreGauge = ({ score, title }: { score: number; title: string }) => {
  const scoreColor =
    score >= 90
      ? 'text-emerald-300'
      : score >= 70
        ? 'text-[#d7ff3f]'
        : score >= 50
          ? 'text-amber-300'
          : 'text-rose-300';

  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score },
  ];
  const COLORS = [
    score >= 90 ? '#34d399' : score >= 70 ? '#d7ff3f' : score >= 50 ? '#fbbf24' : '#fb7185',
    'rgba(255,255,255,0.08)',
  ];

  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-5 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">{title}</p>
      <div className="relative mt-2 h-36 w-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={66}
              startAngle={180}
              endAngle={0}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/3 font-heading text-4xl font-semibold tabular-nums ${scoreColor}`}
        >
          {score}
        </div>
      </div>
    </div>
  );
};

export const SystemAdminDashboard: React.FC<SystemAdminDashboardProps> = ({
  systemHealthMetrics,
}) => {
  const {
    overallHealthScore,
    securityScore,
    maintenanceScore,
    configurationScore,
    alerts,
    recommendations,
  } = systemHealthMetrics;

  const { exportConfiguration, importConfiguration, resetToDefaults, isProcessing } =
    useConfigManager();
  const importInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) importConfiguration(file);
    if (importInputRef.current) importInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#d7ff3f]/80">
          Sistema
        </p>
        <h2 className="text-base font-semibold text-white">Salud y configuración</h2>
        <p className="mt-1 text-xs text-white/40">
          Métricas de seguridad, mantenimiento y respaldos
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <HealthScoreGauge score={overallHealthScore} title="Salud general" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-2">
          <div className="rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-4 text-center">
            <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-sky-300" strokeWidth={1.75} />
            <p className="text-[11px] uppercase tracking-wide text-white/40">Seguridad</p>
            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-white">
              {securityScore}
              <span className="text-sm text-white/35">/100</span>
            </p>
          </div>
          <div className="rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-4 text-center">
            <Wrench className="mx-auto mb-2 h-6 w-6 text-emerald-300" strokeWidth={1.75} />
            <p className="text-[11px] uppercase tracking-wide text-white/40">Mantenimiento</p>
            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-white">
              {maintenanceScore}
              <span className="text-sm text-white/35">/100</span>
            </p>
          </div>
          <div className="rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-4 text-center">
            <Settings2 className="mx-auto mb-2 h-6 w-6 text-[#d7ff3f]" strokeWidth={1.75} />
            <p className="text-[11px] uppercase tracking-wide text-white/40">Configuración</p>
            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-white">
              {configurationScore}
              <span className="text-sm text-white/35">/100</span>
            </p>
          </div>
        </div>
      </div>

      {(alerts.length > 0 || recommendations.length > 0) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {alerts.length > 0 && (
            <div className="rounded-[14px] border border-rose-400/20 bg-rose-400/[0.06] p-4">
              <div className="mb-2 flex items-center gap-2 text-rose-300">
                <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
                <p className="text-sm font-semibold">Alertas críticas</p>
              </div>
              <ul className="space-y-1 text-sm text-white/70">
                {alerts.map((alert, index) => (
                  <li key={`alert-${index}`}>{alert}</li>
                ))}
              </ul>
            </div>
          )}
          {recommendations.length > 0 && (
            <div className="rounded-[14px] border border-sky-400/20 bg-sky-400/[0.06] p-4">
              <div className="mb-2 flex items-center gap-2 text-sky-300">
                <Lightbulb className="h-4 w-4" strokeWidth={1.75} />
                <p className="text-sm font-semibold">Recomendaciones</p>
              </div>
              <ul className="space-y-1 text-sm text-white/70">
                {recommendations.map((rec, index) => (
                  <li key={`rec-${index}`}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-4 sm:p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/40">
          Respaldo
        </p>
        <h3 className="mt-0.5 text-base font-semibold text-white">Gestión de configuración</h3>
        <p className="mb-4 text-xs text-white/40">Exporta, importa o restaura defaults del sistema</p>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={exportConfiguration}
            disabled={isProcessing}
            className="h-11 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
          >
            <Download className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            Exportar
          </Button>
          <Button
            variant="outline"
            onClick={handleImportClick}
            disabled={isProcessing}
            className="h-11 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            <Upload className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            Importar
          </Button>
          <input
            type="file"
            ref={importInputRef}
            className="hidden"
            accept=".json"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            onClick={resetToDefaults}
            disabled={isProcessing}
            className="h-11 rounded-xl border-rose-400/20 bg-rose-400/10 text-xs text-rose-300 hover:bg-rose-400/15"
          >
            <RotateCcw className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            Restaurar defaults
          </Button>
        </div>
      </div>
    </div>
  );
};
