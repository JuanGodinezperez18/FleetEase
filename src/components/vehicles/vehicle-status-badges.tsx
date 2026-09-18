// Shared dark-theme badges for vehicle performance, status and documents.

'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import type { Vehicle } from '@/types';

const base =
  'border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]';

export type PerformanceLevel =
  | 'Excelente'
  | 'Bueno'
  | 'Promedio'
  | 'Pobre'
  | 'Crítico'
  | undefined;

export function PerformanceBadge({
  level,
  className,
}: {
  level: PerformanceLevel;
  className?: string;
}) {
  if (!level) {
    return (
      <Badge variant="outline" className={cn(base, 'border-white/10 text-white/40', className)}>
        N/A
      </Badge>
    );
  }

  const styles: Record<string, string> = {
    Excelente: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    Bueno: 'border-green-400/20 bg-green-400/10 text-green-300',
    Promedio: 'border-white/10 bg-white/[0.06] text-white/60',
    Pobre: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    Crítico: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
  };

  return (
    <Badge variant="outline" className={cn(base, styles[level] || 'border-white/10 text-white/50', className)}>
      {level}
    </Badge>
  );
}

const statusLabels: Record<Vehicle['status'], string> = {
  active: 'Activo',
  rented: 'Rentado',
  inactive: 'Inactivo',
  maintenance: 'Mantenimiento',
  sold: 'Vendido',
};

export function VehicleStatusBadge({
  status,
  className,
}: {
  status: Vehicle['status'] | undefined;
  className?: string;
}) {
  if (!status) {
    return (
      <Badge variant="outline" className={cn(base, 'border-white/10 text-white/40', className)}>
        N/A
      </Badge>
    );
  }

  const styles: Record<string, string> = {
    active: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    rented: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
    inactive: 'border-white/10 bg-white/[0.06] text-white/50',
    maintenance: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    sold: 'border-white/10 text-white/35',
  };

  return (
    <Badge variant="outline" className={cn(base, styles[status] || 'border-white/10 text-white/50', className)}>
      {statusLabels[status] || status}
    </Badge>
  );
}

export function DocumentsBadge({
  complete,
  missingCount,
  expiringSoon,
  className,
}: {
  complete: boolean;
  missingCount?: number;
  expiringSoon?: boolean;
  className?: string;
}) {
  if (complete && !expiringSoon) {
    return (
      <Badge
        variant="outline"
        className={cn(base, 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300', className)}
      >
        <CheckCircle className="mr-1 h-3 w-3" strokeWidth={1.75} />
        Completo
      </Badge>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {missingCount && missingCount > 0 ? (
        <Badge variant="outline" className={cn(base, 'border-rose-400/25 bg-rose-400/10 text-rose-300')}>
          <AlertTriangle className="mr-1 h-3 w-3" strokeWidth={1.75} />
          Falta {missingCount}
        </Badge>
      ) : null}
      {expiringSoon ? (
        <Badge variant="outline" className={cn(base, 'border-amber-400/20 bg-amber-400/10 text-amber-300')}>
          <Clock className="mr-1 h-3 w-3" strokeWidth={1.75} />
          Seguro vence
        </Badge>
      ) : null}
    </div>
  );
}
