"use client";

import type { UserProfile, UserRole } from '@/types';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Mail, KeyRound, Eye } from 'lucide-react';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import React from 'react';
import type { UserMetric } from '@/hooks/use-user-analytics';
import type { UserWithMetrics } from './page';
import Link from 'next/link';

const roleTranslations: Record<UserRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador (Socio)',
  superAdmin: 'Super Admin',
  partner: 'Socio',
  client: 'Cliente',
};

const ROLE_STYLES: Record<string, string> = {
  superAdmin: 'border-[#d7ff3f]/25 bg-[#d7ff3f]/10 text-[#d7ff3f]',
  admin: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  editor: 'border-white/10 bg-white/[0.06] text-white/70',
  viewer: 'border-white/10 bg-white/[0.06] text-white/55',
  partner: 'border-violet-400/20 bg-violet-400/10 text-violet-300',
  client: 'border-white/10 bg-white/[0.06] text-white/50',
};

const ACTIVITY_STYLES: Record<string, string> = {
  Alto: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  Medio: 'border-white/10 bg-white/[0.06] text-white/70',
  Bajo: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  Inactivo: 'border-white/10 bg-white/[0.06] text-white/40',
};

const getActivityBadge = (level: UserMetric['activityLevel'] | undefined) => {
  if (!level) {
    return (
      <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/40">
        N/A
      </span>
    );
  }
  const style = ACTIVITY_STYLES[level] || ACTIVITY_STYLES.Inactivo;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style}`}>
      {level}
    </span>
  );
};

type ActionsProps = {
  row: Row<UserWithMetrics>;
  onEdit: (user: UserProfile) => void;
  onDelete: (user: UserProfile) => void;
  onResendInvite: (user: UserProfile) => void;
  onResetPassword: (user: UserProfile) => void;
};

const UserActions: React.FC<ActionsProps> = ({
  row,
  onEdit,
  onDelete,
  onResendInvite,
  onResetPassword,
}) => {
  const item = row.original;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 w-8 p-0 text-white/50 hover:bg-white/[0.06] hover:text-white"
        >
          <span className="sr-only">Abrir menú</span>
          <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6}>
        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => onEdit(item)}>
          <Edit className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/users/${item.uid}`}>
            <Eye className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
            Ver perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onResendInvite(item)}>
          <Mail className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
          Reenviar invitación
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onResetPassword(item)}>
          <KeyRound className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
          Resetear contraseña
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => onDelete(item)}
          className="text-rose-400 focus:bg-rose-500/15 focus:text-rose-300 data-[highlighted]:bg-rose-500/15 data-[highlighted]:text-rose-300"
        >
          <Trash2 className="mr-2.5 h-4 w-4" strokeWidth={1.75} />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const getColumns = (
  onEdit: (user: UserProfile) => void,
  onDelete: (user: UserProfile) => void,
  onResendInvite: (user: UserProfile) => void,
  onResetPassword: (user: UserProfile) => void
): ColumnDef<UserWithMetrics>[] => {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => (
        <div className="font-medium text-white/90">{row.original.name}</div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Correo',
      cell: ({ row }) => <span className="text-white/70">{row.original.email}</span>,
    },
    {
      accessorKey: 'role',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Rol" />,
      cell: ({ row }) => {
        const role = row.original.role;
        const style = ROLE_STYLES[role] || ROLE_STYLES.viewer;
        return (
          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style}`}>
            {roleTranslations[role] || role}
          </span>
        );
      },
      filterFn: 'equals',
    },
    {
      accessorKey: 'activityLevel',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Actividad" />,
      cell: ({ row }) => getActivityBadge(row.original.activityLevel),
    },
    {
      accessorKey: 'isDeleted',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) =>
        row.original.isDeleted ? (
          <span className="inline-flex rounded-full border border-rose-400/20 bg-rose-400/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
            Eliminado
          </span>
        ) : (
          <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
            Activo
          </span>
        ),
      filterFn: (row, id, value) => {
        const rowValue = row.getValue(id) ? 'deleted' : 'active';
        return value === 'all' || value === rowValue;
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: (props) => (
        <UserActions
          row={props.row}
          onEdit={onEdit}
          onDelete={onDelete}
          onResendInvite={onResendInvite}
          onResetPassword={onResetPassword}
        />
      ),
    },
  ];
};
