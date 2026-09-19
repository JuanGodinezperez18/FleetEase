'use client';

import type { Vehicle } from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Car,
  User,
  Banknote,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { VehicleWithMetrics } from '@/hooks/use-vehicle-search';
import {
  PerformanceBadge,
  VehicleStatusBadge,
} from '@/components/vehicles/vehicle-status-badges';

interface VehicleMobileCardProps {
  vehicle: VehicleWithMetrics;
  driverName?: string;
  onEdit: (v: Vehicle) => void;
  onDelete: (v: Vehicle) => void;
  onNavigate: (path: string) => void;
}

const menuContentClass =
  'min-w-[180px] rounded-xl border border-white/10 bg-[#0e1117] p-1 text-white shadow-[0_18px_50px_rgba(0,0,0,.45)]';
const menuItemClass =
  'cursor-pointer rounded-lg px-2.5 py-2 text-sm text-white/80 focus:bg-white/[0.06] focus:text-white';
const menuItemDangerClass =
  'cursor-pointer rounded-lg px-2.5 py-2 text-sm text-rose-400 focus:bg-rose-500/10 focus:text-rose-300';

export function VehicleMobileCard({
  vehicle,
  driverName,
  onEdit,
  onDelete,
  onNavigate,
}: VehicleMobileCardProps) {
  const title = `${vehicle.make || ''} ${vehicle.model || ''}`.trim();
  const profit = Number(vehicle.netProfit) || 0;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(`/dashboard/vehicles/${vehicle.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate(`/dashboard/vehicles/${vehicle.id}`);
        }
      }}
      className="group relative overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_14px_40px_rgba(0,0,0,.2)] transition-all active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        {vehicle.imageUrl && typeof vehicle.imageUrl === 'string' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vehicle.imageUrl}
            alt={vehicle.plate}
            className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
            <Car className="h-5 w-5" strokeWidth={1.75} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-heading text-base font-semibold tracking-tight text-white">
                {vehicle.plate}
              </h3>
              <p className="truncate text-xs text-white/45">
                {title}
                {vehicle.year ? ` · ${vehicle.year}` : ''}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <VehicleStatusBadge status={vehicle.status} />
                <PerformanceBadge level={vehicle.performanceRating} />
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Acciones del vehículo"
                >
                  <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={menuContentClass}>
                <DropdownMenuItem
                  className={menuItemClass}
                  onSelect={() => onNavigate(`/dashboard/vehicles/${vehicle.id}`)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Eye className="mr-2 h-4 w-4" strokeWidth={1.75} /> Detalles
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={menuItemClass}
                  onSelect={() => onEdit(vehicle)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Edit className="mr-2 h-4 w-4" strokeWidth={1.75} /> Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className={menuItemDangerClass}
                  onSelect={() => onDelete(vehicle)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.75} /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/45">
            <span className="inline-flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5 text-white/30" strokeWidth={1.75} />
              <span className={profit >= 0 ? 'font-semibold text-emerald-300' : 'font-semibold text-rose-300'}>
                {formatCurrency(profit)}
              </span>
            </span>
            {driverName && (
              <span className="inline-flex items-center gap-1.5 truncate">
                <User className="h-3.5 w-3.5 text-white/30" strokeWidth={1.75} />
                <span className="text-white/70">{driverName}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
