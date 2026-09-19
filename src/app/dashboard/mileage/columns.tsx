"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, History, Edit } from "lucide-react";
import { DataTableColumnHeader } from "@/components/common/data-table-column-header";
import { type VehicleMileageMetric } from "@/hooks/use-mileage-analytics";
import { type VehicleWithMileageAndMetrics } from "@/hooks/use-mileage-search";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { formatCurrency, formatNumber } from "@/lib/utils";

const EFFICIENCY_STYLES: Record<string, string> = {
  Eficiente: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  Promedio: "border-white/10 bg-white/[0.06] text-white/55",
  Costoso: "border-rose-400/20 bg-rose-400/10 text-rose-300",
};

const menuContentClass =
  'min-w-[200px] rounded-xl border border-white/10 bg-[#0e1117] p-1.5 text-white shadow-[0_18px_50px_rgba(0,0,0,.55)] z-[80]';
const menuItemClass =
  'cursor-pointer rounded-lg px-2.5 py-2.5 text-sm text-white/80 focus:bg-white/[0.08] focus:text-white data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white';

export const getMileageColumns = (
    handleOpenModal: (vehicleId: string) => void,
    handleOpenHistory: (vehicleId: string) => void,
    vehicleMetrics: VehicleMileageMetric[]
): ColumnDef<VehicleWithMileageAndMetrics>[] => {
    return [
        {
            accessorKey: "plate",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Vehículo" />,
            cell: ({ row }) => (
                <div>
                    <div className="font-medium text-white/90">{row.original.plate}</div>
                    <div className="text-xs text-white/40">{row.original.make} {row.original.model} ({row.original.year})</div>
                </div>
            )
        },
        {
            accessorKey: "currentMileage",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Kilometraje" />,
            cell: ({ row }) => (
              <span className="tabular-nums text-white/80">{(row.original.currentMileage || 0).toLocaleString()} km</span>
            ),
        },
        {
            accessorKey: 'maintenanceScore',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Score Mtto." />,
            cell: ({ row }) => {
                const score = row.original.maintenanceScore || 0;
                const scoreColor = score < 40 ? 'text-rose-300' : score < 70 ? 'text-amber-300' : 'text-emerald-300';
                return (
                <div className="flex items-center gap-2">
                    <Progress value={score} className="h-1.5 w-16 bg-white/[0.08]" />
                    <span className={`text-sm font-medium tabular-nums ${scoreColor}`}>
                    {score.toFixed(0)}
                    </span>
                </div>
                );
            }
        },
        {
            accessorKey: 'estimatedMaintenanceDate',
            header: ({ column }) => <DataTableColumnHeader column={column} title="Próximo Mtto." />,
            cell: ({ row }) => {
                const date = row.original.estimatedMaintenanceDate;
                if (!date) return <span className="text-white/35">N/A</span>;
                
                const isUrgent = (row.original.kmToNextMaintenance ?? Infinity) <= 0;
                
                return (
                <div className={`text-sm font-medium ${isUrgent ? 'text-rose-300' : 'text-white/70'}`}>
                    {format(date, 'dd/MM/yyyy')}
                    {isUrgent && (
                      <span className="ml-1.5 rounded-full border border-rose-400/20 bg-rose-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                        Vencido
                      </span>
                    )}
                </div>
                );
            }
        },
        {
            accessorKey: "kmToNextMaintenance",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Km para servicio" />,
            cell: ({ row }) => {
                const kmRemaining = row.original.kmToNextMaintenance;
                if (typeof kmRemaining !== 'number') return <span className="text-white/35">N/A</span>;
                
                const isOverdue = kmRemaining <= 0;
                return (
                    <span className={isOverdue ? 'font-semibold text-rose-300' : 'text-white/70'}>
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
                const style = EFFICIENCY_STYLES[efficiencyRating || ''] || "border-white/10 bg-white/[0.06] text-white/50";
                return (
                <div className="flex flex-col gap-1">
                    <span className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style}`}>
                      {efficiencyRating || 'N/A'}
                    </span>
                    <span className="text-xs text-white/40">
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
              className="h-8 w-8 p-0 text-white/50 hover:bg-white/[0.06] hover:text-white"
            >
              <History className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          ),
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 text-white/50 hover:bg-white/[0.06] hover:text-white">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className={menuContentClass} sideOffset={6}>
                        <DropdownMenuItem className={menuItemClass} onSelect={() => handleOpenModal(row.original.id)}>
                            <Edit className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
                            Registrar kilometraje
                        </DropdownMenuItem>
                        <DropdownMenuItem className={menuItemClass} onSelect={() => handleOpenHistory(row.original.id)}>
                            <History className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
                            Ver historial
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];
};
