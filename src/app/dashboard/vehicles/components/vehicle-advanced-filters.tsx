
"use client";

import React from 'react';
import type { VehicleSearchFilters } from '@/hooks/use-vehicle-search';
import type { Company, Partner, Client } from '@/types';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, X, DollarSign, Gauge, BarChart, Briefcase, User } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface VehicleAdvancedFiltersProps {
  filters: VehicleSearchFilters;
  onFilterChange: (key: keyof VehicleSearchFilters, value: any) => void;
  onReset: () => void;
  onSearch: (query: string) => void;
  totalResults: number;
  partners: Partner[];
  clients: Client[];
  isLoading?: boolean;
}

export const VehicleAdvancedFilters: React.FC<VehicleAdvancedFiltersProps> = ({
  filters, onFilterChange, onReset, onSearch, totalResults, partners, clients, isLoading = false
}) => {
  const { currentUser } = useAuth();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.status !== 'all') count++;
    if (filters.performance !== 'all') count++;
    if (filters.partnerId !== 'all') count++;
    if (filters.clientId !== 'all') count++;
    if (filters.profitRange.min !== -20000 || filters.profitRange.max !== 100000) count++;
    if (filters.mileageRange.min !== 0 || filters.mileageRange.max !== 500000) count++;
    return count;
  }, [filters]);

  const handleProfitSliderChange = (values: number[]) => {
    onFilterChange('profitRange', { min: values[0], max: values[1] });
  };

  const handleMileageSliderChange = (values: number[]) => {
    onFilterChange('mileageRange', { min: values[0], max: values[1] });
  };
  
  const statusOptions = [
    { value: 'all', label: 'Todos los Estados' },
    { value: 'active', label: 'Activo' },
    { value: 'rented', label: 'Rentado' },
    { value: 'maintenance', label: 'Mantenimiento' },
    { value: 'inactive', label: 'Inactivo' },
    { value: 'sold', label: 'Vendido' },
  ];

  const performanceOptions = [
    { value: 'all', label: 'Todo Rendimiento' },
    { value: 'Excelente', label: 'Excelente' },
    { value: 'Bueno', label: 'Bueno' },
    { value: 'Promedio', label: 'Promedio' },
    { value: 'Pobre', label: 'Pobre' },
    { value: 'Crítico', label: 'Crítico' },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Filtros de Flota</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount} activo{activeFiltersCount > 1 ? 's' : ''}</Badge>
            )}
          </div>
          <Badge variant="outline">{totalResults} vehículo{totalResults !== 1 ? 's' : ''}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por marca, modelo, año, placa..."
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10"
            defaultValue={filters.query}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
           <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
            <SelectTrigger><div className="flex items-center gap-1"><Gauge className="h-4 w-4" /><SelectValue /></div></SelectTrigger>
            <SelectContent>
              {statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={filters.partnerId} onValueChange={(value) => onFilterChange('partnerId', value)}>
            <SelectTrigger><div className="flex items-center gap-1"><Briefcase className="h-4 w-4" /><SelectValue /></div></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Socios</SelectItem>
              <SelectItem value="none">Sin Socio (Interno)</SelectItem>
              {partners.map(p => <SelectItem key={p.id} value={p.id}>{`${p.firstname} ${p.lastname}`}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.clientId} onValueChange={(value) => onFilterChange('clientId', value)}>
            <SelectTrigger><div className="flex items-center gap-1"><User className="h-4 w-4" /><SelectValue /></div></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Clientes</SelectItem>
              <SelectItem value="none">Sin Asignar</SelectItem>
              {clients.map(c => <SelectItem key={c.id} value={c.id}>{`${c.firstname} ${c.lastname}`}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => setIsExpanded(!isExpanded)} className="w-full">
            <Filter className="h-4 w-4 mr-2" />
            {isExpanded ? 'Ocultar Avanzados' : 'Más Filtros'}
          </Button>
        </div>

        {isExpanded && (
          <div className="border-t pt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium flex items-center mb-2"><BarChart className="h-4 w-4 mr-2"/> Rendimiento</label>
                   <Select value={filters.performance} onValueChange={(value) => onFilterChange('performance', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {performanceOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center mb-2"><DollarSign className="h-4 w-4 mr-2"/> Rango de Rentabilidad</label>
                  <Slider
                    defaultValue={[filters.profitRange.min, filters.profitRange.max]}
                    max={100000}
                    min={-20000}
                    step={1000}
                    onValueCommit={handleProfitSliderChange}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatCurrency(filters.profitRange.min)}</span>
                    <span>{formatCurrency(filters.profitRange.max)}</span>
                  </div>
                </div>
                 <div>
                    <label className="text-sm font-medium flex items-center mb-2"><Gauge className="h-4 w-4 mr-2"/> Rango de Kilometraje</label>
                    <Slider
                        defaultValue={[filters.mileageRange.min, filters.mileageRange.max]}
                        max={500000}
                        min={0}
                        step={10000}
                        onValueCommit={handleMileageSliderChange}
                    />
                     <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{filters.mileageRange.min.toLocaleString()} km</span>
                        <span>{filters.mileageRange.max.toLocaleString()} km</span>
                    </div>
                </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-3 pb-3">
        <Button variant="ghost" onClick={onReset} disabled={activeFiltersCount === 0}>
          <X className="h-4 w-4 mr-2" /> Limpiar Filtros
        </Button>
      </CardFooter>
    </Card>
  );
};
