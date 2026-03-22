
"use client";

import React, { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface FleetUtilizationCardProps {
  activeVehiclesCount: number;
  totalVehicles: number;
}

const FleetUtilizationCardComponent: React.FC<FleetUtilizationCardProps> = ({
  activeVehiclesCount,
  totalVehicles
}) => {
  const router = useRouter();

  // React 19: No useMemo needed for simple calculations
  const percentage = totalVehicles > 0 ? (activeVehiclesCount / totalVehicles) * 100 : 0;
  const available = Math.max(0, totalVehicles - activeVehiclesCount);

  const chartData = [
    { name: 'En Uso', value: activeVehiclesCount },
    { name: 'Disponibles', value: available },
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted))'];

  // React 19: No useCallback needed - compiler handles it
  const handleCardClick = () => {
    router.push('/dashboard/vehicles');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick();
    }
  };
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow focus:ring-2 focus:ring-primary"
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Utilización de flota: ${activeVehiclesCount} de ${totalVehicles} vehículos en uso`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Utilización de Flota</CardTitle>
        <Car className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="h-[150px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                }}
              />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-3xl font-bold">{percentage.toFixed(0)}%</div>
            <div className="text-sm text-muted-foreground mt-1">
              {activeVehiclesCount} en uso
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// React 19: No memo() needed - compiler handles optimization
export const FleetUtilizationCard = FleetUtilizationCardComponent;
