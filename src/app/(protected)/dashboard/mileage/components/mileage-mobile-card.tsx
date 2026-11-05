"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, History, Gauge } from "lucide-react";
import type { VehicleWithMileageAndMetrics } from "@/hooks/use-mileage-search";

interface MileageMobileCardProps {
  vehicle: VehicleWithMileageAndMetrics;
  onOpenModal: (id: string) => void;
  onOpenHistory: (id: string) => void;
}

const menuContentClass =
  'min-w-[200px] rounded-xl border border-white/10 bg-[#0e1117] p-1.5 text-white shadow-[0_18px_50px_rgba(0,0,0,.55)] z-[80]';
const menuItemClass =
  'cursor-pointer rounded-lg px-2.5 py-2.5 text-sm text-white/80 focus:bg-white/[0.08] focus:text-white data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white';

export const MileageMobileCard: React.FC<MileageMobileCardProps> = ({ vehicle, onOpenModal, onOpenHistory }) => {
  const kmRemaining = vehicle.kmToNextMaintenance;
  const isOverdue = typeof kmRemaining === "number" && kmRemaining <= 0;
  const isUpcoming = typeof kmRemaining === "number" && kmRemaining > 0 && kmRemaining <= 1500;

  const statusClass = isOverdue
    ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
    : isUpcoming
      ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
      : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";

  const statusLabel = isOverdue
    ? `Vencido ${Math.abs(kmRemaining!).toLocaleString()} km`
    : isUpcoming
      ? `En ${kmRemaining?.toLocaleString()} km`
      : `En ${kmRemaining?.toLocaleString() ?? "—"} km`;

  return (
    <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
            <Gauge className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-white/90">{vehicle.plate}</h3>
            <p className="truncate text-xs text-white/40">
              {vehicle.make} {vehicle.model}
            </p>
            <p className="mt-1.5 font-heading text-base font-semibold tabular-nums text-white">
              {(vehicle.currentMileage || 0).toLocaleString()} km
            </p>
            <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white"
            >
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={menuContentClass} sideOffset={6}>
            <DropdownMenuItem className={menuItemClass} onSelect={() => onOpenModal(vehicle.id)}>
              <Edit className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
              Registrar kilometraje
            </DropdownMenuItem>
            <DropdownMenuItem className={menuItemClass} onSelect={() => onOpenHistory(vehicle.id)}>
              <History className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
              Ver historial
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
