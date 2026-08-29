
"use client";

import { ColumnDef } from "@tanstack/react-table";
import type { Vehicle, Client, Partner } from "@/types";
import { MoreHorizontal, Eye, FileText, DollarSign, CheckCircle, AlertTriangle, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/common/data-table-column-header";
import React from 'react';
import { type VehicleWithMetrics } from "@/hooks/use-vehicle-search";
import { getStatusVariant, formatCurrency } from "@/lib/utils";
import { infallibleNormalizeDate } from "@/lib/date-utils";

type GetVehicleColumnsProps = {
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (id: string) => void;
  onNavigate: (path: string) => void;
  clients: Client[];
  partners: Partner[];
};

const getPerformanceBadge = (level: VehicleWithMetrics['performanceRating']) => {
    if (!level) return <Badge variant="outline">N/A</Badge>;
    switch (level) {
      case 'Excelente': return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Excelente</Badge>;
      case 'Bueno': return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Bueno</Badge>;
      case 'Promedio': return <Badge variant="secondary">Promedio</Badge>;
      case 'Pobre': return <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600">Pobre</Badge>;
      case 'Crítico': return <Badge variant="destructive">Crítico</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
};

const statusTranslations: Record<Vehicle['status'], string> = {
  active: 'Activo',
  rented: 'Rentado',
  inactive: 'Inactivo',
  maintenance: 'Mantenimiento',
  sold: 'Vendido',
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
            <div className="font-medium">{row.original.plate}</div>
            <div className="text-xs text-muted-foreground">{row.original.make} {row.original.model} ({row.original.year})</div>
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
            {getPerformanceBadge(performanceRating)}
            <span className="text-xs font-mono">
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
        return <Badge variant={getStatusVariant(status)}>{statusTranslations[status] || status}</Badge>;
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
        
        if (missingDocs.length === 0 && !isExpiringSoon) {
          return (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completo
            </Badge>
          );
        }
        
        return (
          <div className="flex flex-col gap-1">
            {missingDocs.length > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Falta {missingDocs.length}
              </Badge>
            )}
            {isExpiringSoon && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                <Clock className="h-3 w-3 mr-1" />
                Seguro vence pronto
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "clientId",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Conductor" />,
      cell: ({ row }) => clientMap.get(row.getValue("clientId")) || <span className="text-muted-foreground">No asignado</span>,
      enableColumnFilter: true,
    },
    {
      accessorKey: "partnerId",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Socio" />,
      cell: ({ row }) => partnerMap.get(row.getValue("partnerId")) || <span className="text-muted-foreground">Interno</span>,
      enableColumnFilter: true,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const vehicle = row.original;

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
              <DropdownMenuItem onSelect={() => onNavigate(`/dashboard/vehicles/${vehicle.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Detalles
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onNavigate(`/dashboard/vehicles/${vehicle.id}/documents`)}>
                <FileText className="mr-2 h-4 w-4" />
                Documentos
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onNavigate(`/dashboard/vehicles/${vehicle.id}/transactions`)}>
                <DollarSign className="mr-2 h-4 w-4" />
                Transacciones
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onNavigate(`/dashboard/vehicles/assignments?vehicleId=${vehicle.id}`)}>
                <Users className="mr-2 h-4 w-4" />
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
