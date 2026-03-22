

"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, History } from 'lucide-react';
import type { VehicleWithMileageAndMetrics } from '@/hooks/use-mileage-search';

interface MileageMobileCardProps {
    vehicle: VehicleWithMileageAndMetrics;
    onOpenModal: (id: string) => void;
    onOpenHistory: (id: string) => void;
}

export const MileageMobileCard: React.FC<MileageMobileCardProps> = ({ vehicle, onOpenModal, onOpenHistory }) => {
    const kmRemaining = vehicle.kmToNextMaintenance;
    const isOverdue = typeof kmRemaining === 'number' && kmRemaining <= 0;
    
    return (
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className="font-semibold">{vehicle.plate} - {vehicle.make} {vehicle.model}</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Kilometraje:</strong> {(vehicle.currentMileage || 0).toLocaleString()} km</p>
              <p><strong>Próximo Servicio:</strong> 
                <span className={isOverdue ? 'text-destructive font-semibold' : ''}>
                  {isOverdue ? ` Vencido por ${Math.abs(kmRemaining!).toLocaleString()} km` : ` en ${kmRemaining?.toLocaleString()} km`}
                </span>
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onOpenModal(vehicle.id)}><Edit className="mr-2 h-4 w-4"/>Registrar Kilometraje</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onOpenHistory(vehicle.id)}><History className="mr-2 h-4 w-4"/>Ver Historial</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    );
};
