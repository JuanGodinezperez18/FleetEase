'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  User,
  Tag,
  TrendingUp,
  CreditCard,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/lib/date-utils';
import type { IncomeData } from '../columns';

interface IncomeMobileCardProps {
  record: IncomeData;
  onEdit: (r: IncomeData) => void;
  onDelete: (r: IncomeData) => void;
}

export function IncomeMobileCard({
  record,
  onEdit,
  onDelete,
}: IncomeMobileCardProps) {
  const amount = Number(record.amount) || 0;
  const isCreditGranted = record.creditGranted === true;
  const canDelete = record.canDelete !== false && !isCreditGranted;

  return (
    <article className="group relative overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_14px_40px_rgba(0,0,0,.2)]">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300">
          <TrendingUp className="h-5 w-5" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="line-clamp-2 font-heading text-sm font-semibold tracking-tight text-white">
                {record.description || 'Sin descripción'}
              </h3>
              <p className="mt-1 font-heading text-lg font-semibold tabular-nums tracking-tight text-emerald-300">
                {formatCurrency(amount)}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {record.categoryName && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-white/55">
                    <Tag className="h-3 w-3" strokeWidth={1.75} />
                    {record.categoryName}
                  </span>
                )}
                {isCreditGranted && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-sky-300">
                    <CreditCard className="h-3 w-3" strokeWidth={1.75} />
                    Crédito
                  </span>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white"
                  aria-label="Acciones del ingreso"
                >
                  <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                <DropdownMenuItem onSelect={() => onEdit(record)}>
                  <Edit className="mr-2 h-4 w-4" strokeWidth={1.75} /> Editar
                </DropdownMenuItem>
                {canDelete ? (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => onDelete(record)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.75} /> Eliminar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled className="text-white/30">
                    <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.75} /> No eliminable
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/45">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-white/30" strokeWidth={1.75} />
              {formatDate(record.date)}
            </span>
            {record.clientName && record.clientName !== 'N/A' && (
              <span className="inline-flex items-center gap-1.5 truncate">
                <User className="h-3.5 w-3.5 text-white/30" strokeWidth={1.75} />
                <span className="text-white/70">{record.clientName}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
