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
  Car,
  Tag,
  Receipt,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/lib/date-utils';
import type { ExpenseData } from '../columns';

interface ExpenseMobileCardProps {
  record: ExpenseData;
  onEdit: (r: ExpenseData) => void;
  onDelete: (r: ExpenseData) => void;
}

export function ExpenseMobileCard({
  record,
  onEdit,
  onDelete,
}: ExpenseMobileCardProps) {
  const amount = Number(record.amount) || 0;

  return (
    <article className="group relative overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_14px_40px_rgba(0,0,0,.2)]">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/[0.08] text-rose-300">
          <Receipt className="h-5 w-5" strokeWidth={1.75} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="line-clamp-2 font-heading text-sm font-semibold tracking-tight text-white">
                {record.description || 'Sin descripción'}
              </h3>
              <p className="mt-1 font-heading text-lg font-semibold tabular-nums tracking-tight text-rose-300">
                {formatCurrency(amount)}
              </p>
              {record.categoryName && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-white/55">
                  <Tag className="h-3 w-3" strokeWidth={1.75} />
                  {record.categoryName}
                </span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white"
                  aria-label="Acciones del gasto"
                >
                  <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                <DropdownMenuItem onSelect={() => onEdit(record)}>
                  <Edit className="mr-2 h-4 w-4" strokeWidth={1.75} /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onDelete(record)}
                >
                  <Trash2 className="mr-2 h-4 w-4" strokeWidth={1.75} /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/45">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-white/30" strokeWidth={1.75} />
              {formatDate(record.date)}
            </span>
            {record.vehicleName && record.vehicleName !== 'N/A' && (
              <span className="inline-flex items-center gap-1.5 truncate">
                <Car className="h-3.5 w-3.5 text-white/30" strokeWidth={1.75} />
                <span className="text-white/70">{record.vehicleName}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
