

"use client";

import React from 'react';
import type { MileageSearchFilters } from '@/hooks/use-mileage-search';
import type { Company } from '@/types';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, X, Wrench, Building, Gauge } from 'lucide-react';

interface MileageAdvancedFiltersProps {
  filters: MileageSearchFilters;
  onFilterChange: (key: keyof MileageSearchFilters, value: any) => void;
  onReset: () => void;
  onSearch: (query: string) => void;
  totalResults: number;
  companies: Company[];
  isLoading?: boolean;
}

const statusOptions = [
    { value: 'all', label: 'Todos los Estados' },
    { value: 'urgent', label: 'Urgente' },
    { value: 'upcoming', label: 'Próximo' },
    { value: 'good', label: 'Bueno' },
];

export const MileageAdvancedFilters: React.FC<MileageAdvancedFiltersProps> = ({
  filters, onFilterChange, onReset, onSearch, totalResults, companies, isLoading = false
}) => {
  const { currentUser } = useAuth();

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.maintenanceStatus !== 'all') count++;
    if (currentUser?.role === 'superAdmin' && filters.companyId !== 'all') count++;
    if (filters.mileageRange.min !== 0 || filters.mileageRange.max !== 500000) count++;
    return count;
  }, [filters, currentUser]);

  const handleMileageSliderChange = (values: number[]) => {
    onFilterChange('mileageRange', { min: values[0], max: values[1] });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Filtros de Mantenimiento</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount} activo{activeFiltersCount > 1 ? 's' : ''}</Badge>
            )}
          </div>
          <Badge variant="outline">{totalResults} vehículo{totalResults !== 1 ? 's' : ''}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por marca, modelo, año, placa..."
              onChange={(e) => onSearch(e.target.value)}
              className="pl-10"
              defaultValue={filters.query}
            />
          </div>
          
          <Select value={filters.maintenanceStatus} onValueChange={(value) => onFilterChange('maintenanceStatus', value)}>
            <SelectTrigger><div className="flex items-center gap-1"><Wrench className="h-4 w-4" /><SelectValue /></div></SelectTrigger>
            <SelectContent>
              {statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        
        <div className="border-t pt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                {currentUser?.role === 'superAdmin' && (
                  <div>
                    <label className="text-sm font-medium flex items-center mb-2"><Building className="h-4 w-4 mr-2"/> Empresa</label>
                    <Select value={filters.companyId} onValueChange={(value) => onFilterChange('companyId', value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las Empresas</SelectItem>
                        {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
            </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-3 pb-3">
        <Button variant="ghost" onClick={onReset} disabled={activeFiltersCount === 0}>
          <X className="h-4 w-4 mr-2" /> Limpiar Filtros
        </Button>
      </CardFooter>
    </Card>
  );
};
