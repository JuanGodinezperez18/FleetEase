
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, X, DollarSign, BarChart, Car, Building, Shield } from 'lucide-react';
import type { Company } from '@/types';
import { useAuth } from '@/contexts/auth-provider';
import type { PartnerSearchFilters } from '@/hooks/use-partner-search';


interface PartnerAdvancedFiltersProps {
  filters: PartnerSearchFilters;
  onFilterChange: (key: keyof PartnerSearchFilters, value: any) => void;
  onReset: () => void;
  onSearch: (query: string) => void;
  totalResults: number;
  companies: Company[];
  isLoading?: boolean;
}

export const PartnerAdvancedFilters: React.FC<PartnerAdvancedFiltersProps> = ({
  filters, onFilterChange, onReset, onSearch, totalResults, companies, isLoading = false
}) => {
  const { currentUser } = useAuth();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.status !== 'active') count++;
    if (filters.performanceLevel !== 'all') count++;
    if (filters.companyId !== 'all') count++;
    if (filters.profitRange.min !== -10000 || filters.profitRange.max !== 500000) count++;
    if (filters.vehicleCountRange.min !== 0 || filters.vehicleCountRange.max !== 50) count++;
    return count;
  }, [filters]);
  
  const handleProfitSliderChange = (values: number[]) => {
    onFilterChange('profitRange', { min: values[0], max: values[1] });
  };

  const handleVehicleCountSliderChange = (values: number[]) => {
    onFilterChange('vehicleCountRange', { min: values[0], max: values[1] });
  };
  
  const statusOptions = [
    { value: 'active', label: 'Activos' },
    { value: 'deleted', label: 'Eliminados' },
    { value: 'all', label: 'Todos' },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Búsqueda y Filtros de Socios</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">
                {activeFiltersCount} activo{activeFiltersCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <Badge variant="outline">{totalResults} resultado{totalResults !== 1 ? 's' : ''}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, correo o teléfono..."
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10"
            defaultValue={filters.query}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
           <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
            <SelectTrigger><div className="flex items-center gap-1"><Shield className="h-4 w-4" /><SelectValue /></div></SelectTrigger>
            <SelectContent>
                {statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.performanceLevel} onValueChange={(value) => onFilterChange('performanceLevel', value)}>
            <SelectTrigger><div className="flex items-center gap-1"><BarChart className="h-4 w-4" /><SelectValue /></div></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo Rendimiento</SelectItem>
              <SelectItem value="Excelente">Excelente</SelectItem>
              <SelectItem value="Bueno">Bueno</SelectItem>
              <SelectItem value="Regular">Regular</SelectItem>
              <SelectItem value="Bajo">Bajo</SelectItem>
            </SelectContent>
          </Select>

          {currentUser?.role === 'superAdmin' && (
            <Select value={filters.companyId} onValueChange={(value) => onFilterChange('companyId', value)}>
              <SelectTrigger><div className="flex items-center gap-1"><Building className="h-4 w-4" /><SelectValue /></div></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las Empresas</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <Button variant="outline" onClick={() => setIsExpanded(!isExpanded)} className="w-full">
            <Filter className="h-4 w-4 mr-2" />
            {isExpanded ? 'Ocultar Avanzados' : 'Filtros Avanzados'}
          </Button>
        </div>

        {isExpanded && (
          <div className="border-t pt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-sm font-medium flex items-center mb-2"><DollarSign className="h-4 w-4 mr-2"/> Rango de Rentabilidad Neta</label>
                    <Slider
                        defaultValue={[filters.profitRange.min, filters.profitRange.max]}
                        max={500000}
                        min={-10000}
                        step={500}
                        onValueCommit={handleProfitSliderChange}
                    />
                     <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>${filters.profitRange.min.toLocaleString()}</span>
                        <span>${filters.profitRange.max.toLocaleString()}</span>
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium flex items-center mb-2"><Car className="h-4 w-4 mr-2"/> Número de Vehículos</label>
                    <Slider
                        defaultValue={[filters.vehicleCountRange.min, filters.vehicleCountRange.max]}
                        max={50}
                        min={0}
                        step={1}
                        onValueCommit={handleVehicleCountSliderChange}
                    />
                     <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{filters.vehicleCountRange.min}</span>
                        <span>{filters.vehicleCountRange.max}</span>
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
