
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
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
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
    client: 'Cliente'
};
  
const getActivityBadge = (level: UserMetric['activityLevel'] | undefined) => {
    if (!level) return <Badge variant="outline">N/A</Badge>;
     switch (level) {
        case 'Alto': return <Badge variant="default" className="bg-sky-500 hover:bg-sky-600">Alto</Badge>;
        case 'Medio': return <Badge variant="default">Medio</Badge>;
        case 'Bajo': return <Badge variant="secondary">Bajo</Badge>;
        case 'Inactivo': return <Badge variant="outline">Inactivo</Badge>;
        default: return <Badge variant="outline">{level}</Badge>;
    }
};

type ActionsProps = {
  row: Row<UserWithMetrics>;
  onEdit: (user: UserProfile) => void;
  onDelete: (user: UserProfile) => void;
  onResendInvite: (user: UserProfile) => void;
  onResetPassword: (user: UserProfile) => void;
};

const UserActions: React.FC<ActionsProps> = ({ row, onEdit, onDelete, onResendInvite, onResetPassword }) => {
    const item = row.original;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => onEdit(item)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href={`/dashboard/users/${item.uid}`}><Eye className="mr-2 h-4 w-4" />Ver Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onResendInvite(item)}><Mail className="mr-2 h-4 w-4" />Reenviar Invitación</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onResetPassword(item)}><KeyRound className="mr-2 h-4 w-4" />Resetear Contraseña</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onDelete(item)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
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
            header: ({column}) => <DataTableColumnHeader column={column} title="Nombre" />,
            cell: ({ row }) => (
              <div className="font-medium">{row.original.name}</div>
            )
        },
        { accessorKey: 'email', header: 'Correo Electrónico' },
        { 
          accessorKey: 'role', 
          header: ({column}) => <DataTableColumnHeader column={column} title="Rol" />,
          cell: ({row}) => <Badge variant={row.original.role === 'admin' || row.original.role === 'superAdmin' ? 'default' : 'secondary'}>{roleTranslations[row.original.role] || row.original.role}</Badge>,
          filterFn: 'equals',
        },
        {
          accessorKey: 'activityLevel',
          header: ({ column }) => <DataTableColumnHeader column={column} title="Actividad" />,
          cell: ({ row }) => getActivityBadge(row.original.activityLevel)
        },
        { 
          accessorKey: 'isDeleted', 
          header: ({column}) => <DataTableColumnHeader column={column} title="Estado" />,
          cell: ({row}) => row.original.isDeleted ? <Badge variant="destructive">Eliminado</Badge> : <Badge variant="default" className="bg-green-500 hover:bg-green-500 text-white">Activo</Badge>,
          filterFn: (row, id, value) => {
              const rowValue = row.getValue(id) ? "deleted" : "active";
              return value === 'all' || value === rowValue;
          }
        },
        {
            id: 'actions',
            header: "Acciones",
            cell: (props) => (
                <UserActions
                    row={props.row}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onResendInvite={onResendInvite}
                    onResetPassword={onResetPassword}
                />
            ),
        }
    ];
};
