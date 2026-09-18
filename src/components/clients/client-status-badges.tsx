// Shared dark-theme badges for client risk, activity and license status.
// Keep in sync with Dashboard design system.

'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ClientMetric } from '@/hooks/use-client-analytics';

const base =
  'border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]';

export function PaymentRiskBadge({
  level,
  className,
}: {
  level: ClientMetric['paymentBehavior'] | undefined;
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
    Regular: 'border-white/10 bg-white/[0.06] text-white/60',
    Malo: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    Crítico: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
  };

  return (
    <Badge variant="outline" className={cn(base, styles[level] || 'border-white/10 text-white/50', className)}>
      {level}
    </Badge>
  );
}

export function ActivityLevelBadge({
  level,
  className,
}: {
  level: ClientMetric['activityLevel'] | undefined;
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
    Alto: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
    Medio: 'border-[#d7ff3f]/20 bg-[#d7ff3f]/10 text-[#d7ff3f]',
    Bajo: 'border-white/10 bg-white/[0.06] text-white/55',
    Inactivo: 'border-white/10 text-white/35',
  };

  return (
    <Badge variant="outline" className={cn(base, styles[level] || 'border-white/10 text-white/50', className)}>
      {level}
    </Badge>
  );
}

export function LicenseStatusBadge({
  status,
  className,
}: {
  status: ClientMetric['licenseStatus'] | 'active' | 'expired' | undefined;
  className?: string;
}) {
  if (!status) {
    return (
      <Badge variant="outline" className={cn(base, 'border-white/10 text-white/40', className)}>
        N/A
      </Badge>
    );
  }

  const map: Record<string, { label: string; cls: string }> = {
    Vigente: { label: 'Vigente', cls: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' },
    active: { label: 'Vigente', cls: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' },
    'Próxima a Vencer': { label: 'Por vencer', cls: 'border-amber-400/20 bg-amber-400/10 text-amber-300' },
    Vencida: { label: 'Vencida', cls: 'border-rose-400/25 bg-rose-400/10 text-rose-300' },
    expired: { label: 'Vencida', cls: 'border-rose-400/25 bg-rose-400/10 text-rose-300' },
    'N/A': { label: 'N/A', cls: 'border-white/10 text-white/40' },
  };

  const entry = map[status] || { label: String(status), cls: 'border-white/10 text-white/50' };

  return (
    <Badge variant="outline" className={cn(base, entry.cls, className)}>
      {entry.label}
    </Badge>
  );
}
