'use client';

import type { Partner } from '@/types';
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
  Banknote,
  Mail,
  Phone,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { PartnerWithMetrics } from '../page';
import { PartnerPerformanceBadge } from '@/components/partners/partner-status-badges';

interface PartnerMobileCardProps {
  partner: PartnerWithMetrics;
  onEdit: (p: Partner) => void;
  onDelete: (p: Partner) => void;
  onNavigate: (path: string) => void;
}

const menuContentClass =
  'min-w-[200px] rounded-xl border border-white/10 bg-[#0e1117] p-1.5 text-white shadow-[0_18px_50px_rgba(0,0,0,.55)] z-[80]';
const menuItemClass =
  'cursor-pointer rounded-lg px-2.5 py-2.5 text-sm text-white/80 focus:bg-white/[0.08] focus:text-white data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white';
const menuItemDangerClass =
  'cursor-pointer rounded-lg px-2.5 py-2.5 text-sm text-rose-400 focus:bg-rose-500/15 focus:text-rose-300 data-[highlighted]:bg-rose-500/15 data-[highlighted]:text-rose-300';

function initials(firstname?: string, lastname?: string) {
  const a = (firstname || '').trim().charAt(0);
  const b = (lastname || '').trim().charAt(0);
  return (a + b).toUpperCase() || '?';
}

export function PartnerMobileCard({
  partner,
  onEdit,
  onDelete,
  onNavigate,
}: PartnerMobileCardProps) {
  const name = `${partner.firstname || ''} ${partner.lastname || ''}`.trim();
  const profit = Number(partner.netProfit) || 0;
  const vehicles = partner.vehicleCount || 0;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(`/dashboard/partners/${partner.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate(`/dashboard/partners/${partner.id}`);
        }
      }}
      className="group relative overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_14px_40px_rgba(0,0,0,.2)] transition-all active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] font-heading text-sm font-semibold text-[#d7ff3f]">
          {initials(partner.firstname, partner.lastname)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-heading text-base font-semibold tracking-tight text-white">
                {name || 'Sin nombre'}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <PartnerPerformanceBadge level={partner.performanceLevel} />
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Acciones del socio"
                >
                  <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={menuContentClass} sideOffset={6}>
                <DropdownMenuItem
                  className={menuItemClass}
                  onSelect={() => onNavigate(`/dashboard/partners/${partner.id}`)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Eye className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} /> Ver dashboard
                </DropdownMenuItem>
                <DropdownMenuItem className={menuItemClass} onSelect={() => onEdit(partner)} onClick={(e) => e.stopPropagation()}>
                  <Edit className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} /> Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1.5 bg-white/10" />
                <DropdownMenuItem
                  className={menuItemDangerClass}
                  onSelect={() => onDelete(partner)}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="mr-2.5 h-4 w-4" strokeWidth={1.75} /> Eliminar
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
            <span className="inline-flex items-center gap-1.5">
              <Car className="h-3.5 w-3.5 text-white/30" strokeWidth={1.75} />
              <span className="text-white/70">{vehicles} vehículo{vehicles === 1 ? '' : 's'}</span>
            </span>
          </div>

          {(partner.email || partner.phone) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/35">
              {partner.email && (
                <span className="inline-flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3" strokeWidth={1.75} />
                  {partner.email}
                </span>
              )}
              {partner.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" strokeWidth={1.75} />
                  {partner.phone}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
