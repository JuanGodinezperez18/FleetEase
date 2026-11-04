"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Vehicle, Client, Partner } from "@/types";
import { MoreHorizontal, Eye, FileText, DollarSign, Users, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTableColumnHeader } from "@/components/common/data-table-column-header";
import React from 'react';
import { type VehicleWithMetrics } from "@/hooks/use-vehicle-search";
import { formatCurrency } from "@/lib/utils";
import { infallibleNormalizeDate } from "@/lib/date-utils";
import {
  PerformanceBadge,
  VehicleStatusBadge,
  DocumentsBadge,
} from '@/components/vehicles/vehicle-status-badges';

type GetVehicleColumnsProps = {
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
  onNavigate: (path: string) => void;
  clients: Client[];
  partners: Partner[];
};

// Token-based menu styles — works in both dark and light (Phase 0 WCAG)
const menuContentClass =
  'min-w-[200px] rounded-xl border border-[var(--fe-border)] bg-[var(--fe-menu-bg)] p-1.5 text-[var(--fe-menu-text)] shadow-[var(--fe-shadow-menu)] z-[80]';
const menuItemClass =
  'cursor-pointer rounded-lg px-2.5 py-2.5 text-sm text-[var(--fe-text-secondary)] focus:bg-[var(--fe-hover)] focus:text-[var(--fe-text)] data-[highlighted]:bg-[var(--fe-hover)] data-[highlighted]:text-[var(--fe-text)]';
const menuItemDangerClass =
  'cursor-pointer rounded-lg px-2.5 py-2.5 text-sm text-[var(--fe-danger)] focus:bg-rose-500/15 focus:text-rose-300 data-[highlighted]:bg-rose-500/15 data-[highlighted]:text-rose-300';

export const getVehicleColumns = ({ onEdit, onDelete, onNavigate, clients, partners }: GetVehicleColumnsProps): ColumnDef<VehicleWithMetrics>[] => {
  const clientMap = new Map(clients.map(c => [c.id, `${c.firstname} ${c.lastname}`]));
  const partnerMap = new Map(partners.map(p => [p.id, `${p.firstname} ${p.lastname}`]));
  
  return [
    {
      accessorKey: "plate",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Placa / Marca" />,
      cell: ({ row }) => (
        <div>
            <div className="font-medium text-[var(--fe-text)]">{row.original.plate}</div>
            <div className="text-xs text-[var(--fe-text-muted)]">{row.original.make} {row.original.model} ({row.original.year})</div>
        </div>
      ),
      enableColumnFilter: true,
    },
    {
      accessorKey: "performanceRating",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Rendimiento" />,
      cell: ({ row }) => {
        const { performanceRating, netProfit } = row.original;
        return (
          <div className="flex flex-col gap-1">
            <PerformanceBadge level={performanceRating} />
            <span className="text-xs font-mono text-[var(--fe-text-muted)]">
              {formatCurrency(netProfit || 0)}
            </span>
          </div>
        );
      }
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.getValue("status") as Vehicle['status'];
        return <VehicleStatusBadge status={status} />;
      },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
     {
      id: 'documents',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Documentos" />,
      cell: ({ row }) => {
        const vehicle = row.original;
        const missingDocs: string[] = [];
        
        if (!vehicle.circulationCardUrl) missingDocs.push('Tarjeta Circulación');
        if (!vehicle.insurancePolicyDocumentUrl) missingDocs.push('Póliza Seguro');
        if (!vehicle.insurancePolicyNumber) missingDocs.push('No. Póliza');
        
        const expiryDate = infallibleNormalizeDate(vehicle.insuranceExpiryDate);
        const isExpiringSoon = expiryDate ? new Date(expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : false;
        
        return (
          <DocumentsBadge
            complete={missingDocs.length === 0}
            missingCount={missingDocs.length}
            expiringSoon={isExpiringSoon}
          />
        );
      },
    },
    {
      accessorKey: "clientId",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Conductor" />,
      cell: ({ row }) => clientMap.get(row.getValue("clientId")) || <span className="text-[var(--fe-text-faint)]">No asignado</span>,
      enableColumnFilter: true,
    },
    {
      accessorKey: "partnerId",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Socio" />,
      cell: ({ row }) => partnerMap.get(row.getValue("partnerId")) || <span className="text-[var(--fe-text-faint)]">Interno</span>,
      enableColumnFilter: true,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const vehicle = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-11 w-11 rounded-xl p-0 text-[var(--fe-text-muted)] hover:bg-[var(--fe-hover)] hover:text-[var(--fe-text)]">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={menuContentClass} sideOffset={6}>
              <DropdownMenuLabel className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--fe-text-faint)]">
                Acciones
              </DropdownMenuLabel>
              <DropdownMenuItem className={menuItemClass} onSelect={() => onNavigate(`/dashboard/vehicles/${vehicle.id}`)}>
                <Eye className="mr-2.5 h-4 w-4 text-[var(--fe-text-muted)]" strokeWidth={1.75} />
                Ver detalles
              </DropdownMenuItem>
              <DropdownMenuItem className={menuItemClass} onSelect={() => onNavigate(`/dashboard/vehicles/${vehicle.id}/documents`)}>
                <FileText className="mr-2.5 h-4 w-4 text-[var(--fe-text-muted)]" strokeWidth={1.75} />
                Documentos
              </DropdownMenuItem>
              <DropdownMenuItem className={menuItemClass} onSelect={() => onNavigate(`/dashboard/vehicles/${vehicle.id}/transactions`)}>
                <DollarSign className="mr-2.5 h-4 w-4 text-[var(--fe-text-muted)]" strokeWidth={1.75} />
                Transacciones
              </DropdownMenuItem>
              <DropdownMenuItem className={menuItemClass} onSelect={() => onNavigate(`/dashboard/vehicles/assignments?vehicleId=${vehicle.id}`)}>
                <Users className="mr-2.5 h-4 w-4 text-[var(--fe-text-muted)]" strokeWidth={1.75} />
                Asignaciones
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1.5 bg-[var(--fe-border)]" />
              <DropdownMenuItem className={menuItemClass} onSelect={() => onEdit(vehicle)}>
                <Edit className="mr-2.5 h-4 w-4 text-[var(--fe-text-muted)]" strokeWidth={1.75} />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem className={menuItemDangerClass} onSelect={() => onDelete(vehicle.id)}>
                <Trash2 className="mr-2.5 h-4 w-4" strokeWidth={1.75} />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};
