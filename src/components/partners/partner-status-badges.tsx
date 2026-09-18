// Shared dark-theme badges for partner performance.

'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const base =
  'border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]';

export type PartnerPerformanceLevel =
  | 'Excelente'
  | 'Bueno'
  | 'Regular'
  | 'Bajo'
  | undefined;

export function PartnerPerformanceBadge({
  level,
  className,
}: {
  level: PartnerPerformanceLevel;
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
    Bajo: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
  };

  return (
    <Badge variant="outline" className={cn(base, styles[level] || 'border-white/10 text-white/50', className)}>
      {level}
    </Badge>
  );
}
