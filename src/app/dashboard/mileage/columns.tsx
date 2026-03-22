

"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { VehicleWithMileage } from "@/types";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, CheckCircle, History } from "lucide-react";
import { DataTableColumnHeader } from "@/components/common/data-table-column-header";
import { type VehicleMileageMetric } from "@/hooks/use-mileage-analytics";
import { type VehicleWithMileageAndMetrics } from "@/hooks/use-mileage-search";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { es } from 'date-fns/locale';
import { formatCurrency, formatNumber } from "@/lib/utils";

const getEfficiencyBadge = (level: VehicleMileageMetric['efficiencyRating'] | undefined) => {
    if (!level) return <Badge variant="outline">N/A</Badge>;
    switch (level) {
      case 'Eficiente': return <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Eficiente</Badge>;
      case 'Promedio': return <Badge variant="secondary">Promedio</Badge>;
      case 'Costoso': return <Badge variant="destructive">Costoso</Badge>;
      default: return <Badge variant="outline">{level}</Badge>;
    }
};

export const getMileageColumns = (
    handleOpenModal: (vehicleId: string) => void,
    handleOpenHistory: (vehicleId: string) => void,
    vehicleMetrics: VehicleMileageMetric[]
): ColumnDef<VehicleWithMileageAndMetrics>[] => {
    const metricsMap = new Map(vehicleMetrics.map(m => [m.vehicleId, m]));

    return [
        {
            accessorKey: "plate",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Vehículo" />,
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.plate}</div>
                    <div className="text-xs text-muted-foreground">{row.original.make} {row.original.model} ({row.original.year})</div>
                </div>
            )
        },
        {
            accessorKey: "currentMileage",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Kilometraje" />,
            cell: ({ row }) => `${(row.original.currentMileage || 0).toLocaleString()} km`,
        },
        {
            accessorKey: 'maintenanceScore',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Score Mtto." />,
            cell: ({ row }) => {
                const score = row.original.maintenanceScore || 0;
                const scoreColor = score < 40 ? 'text-red-600' : score < 70 ? 'text-amber-600' : 'text-emerald-600';
                return (
                <div className="flex items-center gap-2">
                    <Progress value={score} className="w-16 h-2" />
                    <span className={`text-sm font-medium ${scoreColor}`}>
                    {score.toFixed(0)}
                    </span>
                </div>
                );
            }
        },
        {
            accessorKey: 'estimatedMaintenanceDate',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Próximo Mtto. (Est.)" />,
            cell: ({ row }) => {
                const date = row.original.estimatedMaintenanceDate;
                if (!date) return 'N/A';
                
                const isUrgent = (row.original.kmToNextMaintenance ?? Infinity) <= 0;
                
                return (
                <div className={`text-sm font-medium ${isUrgent ? 'text-red-600' : ''}`}>
                    {format(date, 'dd/MM/yyyy')}
                    {isUrgent && <Badge variant="destructive" className="ml-2 text-xs">Vencido</Badge>}
                </div>
                );
            }
        },
        {
            accessorKey: "kmToNextMaintenance",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Km para Servicio" />,
            cell: ({ row }) => {
                const kmRemaining = row.original.kmToNextMaintenance;
                if (typeof kmRemaining !== 'number') return 'N/A';
                
                const isOverdue = kmRemaining <= 0;
                return (
                    <span className={isOverdue ? 'text-destructive font-semibold' : ''}>
                        {isOverdue ? `${formatNumber(Math.abs(kmRemaining))} km vencido` : `${formatNumber(kmRemaining)} km`}
                    </span>
                );
            }
        },
        {
            accessorKey: 'efficiencyRating',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Eficiencia" />,
            cell: ({ row }) => {
                const { efficiencyRating, costPerKm } = row.original;
                return (
                <div className="flex flex-col gap-1">
                    {getEfficiencyBadge(efficiencyRating)}
                    <span className="text-xs text-muted-foreground">
                    {formatCurrency(costPerKm || 0)}/km
                    </span>
                </div>
                );
            }
        },
        {
          id: "history",
          header: "Historial",
          cell: ({ row }) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenHistory(row.original.id)}
            >
              <History className="h-4 w-4" />
            </Button>
          ),
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenModal(row.original.id)}>
                            Registrar Kilometraje
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];
};
