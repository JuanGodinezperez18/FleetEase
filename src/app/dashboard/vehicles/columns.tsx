
"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Vehicle, Client, Partner } from "@/types";
import { MoreHorizontal, Eye, FileText, DollarSign, Users } from "lucide-react";
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

export const getVehicleColumns = ({ onEdit, onDelete, onNavigate, clients, partners }: GetVehicleColumnsProps): ColumnDef<VehicleWithMetrics>[] => {
  const clientMap = new Map(clients.map(c => [c.id, `${c.firstname} ${c.lastname}`]));
  const partnerMap = new Map(partners.map(p => [p.id, `${p.firstname} ${p.lastname}`]));
  
  return [
    {
      accessorKey: "plate",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Placa / Marca" />,
      cell: ({ row }) => (
        <div>
            <div className="font-medium text-white/90">{row.original.plate}</div>
            <div className="text-xs text-white/40">{row.original.make} {row.original.model} ({row.original.year})</div>
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
            <span className="text-xs font-mono text-white/50">
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
      cell: ({ row }) => clientMap.get(row.getValue("clientId")) || <span className="text-white/35">No asignado</span>,
      enableColumnFilter: true,
    },
    {
      accessorKey: "partnerId",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Socio" />,
      cell: ({ row }) => partnerMap.get(row.getValue("partnerId")) || <span className="text-white/35">Interno</span>,
      enableColumnFilter: true,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const vehicle = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 text-white/50 hover:bg-white/[0.06] hover:text-white">
                <span className="sr-only">Abrir menú</span>
                <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => onNavigate(`/dashboard/vehicles/${vehicle.id}`)}>
                <Eye className="mr-2 h-4 w-4" strokeWidth={1.75} />
                Detalles
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onNavigate(`/dashboard/vehicles/${vehicle.id}/documents`)}>
                <FileText className="mr-2 h-4 w-4" strokeWidth={1.75} />
                Documentos
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onNavigate(`/dashboard/vehicles/${vehicle.id}/transactions`)}>
                <DollarSign className="mr-2 h-4 w-4" strokeWidth={1.75} />
                Transacciones
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onNavigate(`/dashboard/vehicles/assignments?vehicleId=${vehicle.id}`)}>
                <Users className="mr-2 h-4 w-4" strokeWidth={1.75} />
                Historial de Asignaciones
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onEdit(vehicle)}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDelete(vehicle.id)} className="text-destructive focus:text-destructive">
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
};
