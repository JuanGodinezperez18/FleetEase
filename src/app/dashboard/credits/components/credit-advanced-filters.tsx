

"use client";

import React from 'react';
import type { CreditSearchFilters } from '@/hooks/use-credits-search';
import type { Client, Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, Filter, X, DollarSign, BarChart, Activity, Percent, User } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CreditAdvancedFiltersProps {
  filters: CreditSearchFilters;
  onFilterChange: (key: keyof CreditSearchFilters, value: any) => void;
  onReset: () => void;
  onSearch: (query: string) => void;
  totalResults: number;
  clients: Client[];
  vehicles: Vehicle[];
  isLoading?: boolean;
}

const behaviorOptions = [
    { value: 'all', label: 'Todo Comportamiento' },
    { value: 'Puntual', label: 'Puntual' },
    { value: 'Ligero Retraso', label: 'Ligero Retraso' },
    { value: 'Retraso Severo', label: 'Retraso Severo' },
];

const statusOptions = [
    { value: 'all', label: 'Todos los Estados' },
    { value: 'active', label: 'Activo' },
    { value: 'completed', label: 'Completado' },
    { value: 'defaulted', label: 'Incumplido' },
    { value: 'inactive', label: 'Inactivo' },
];

export const CreditAdvancedFilters: React.FC<CreditAdvancedFiltersProps> = ({
  filters, onFilterChange, onReset, onSearch, totalResults, clients, vehicles, isLoading = false
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.paymentBehavior !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.clientId !== 'all') count++;
    if (filters.progressRange.min !== 0 || filters.progressRange.max !== 100) count++;
    if (filters.balanceRange.min !== 0 || filters.balanceRange.max !== 500000) count++;
    return count;
  }, [filters]);

  const handleProgressSliderChange = (values: number[]) => {
    onFilterChange('progressRange', { min: values[0], max: values[1] });
  };
  
  const handleBalanceSliderChange = (values: number[]) => {
    onFilterChange('balanceRange', { min: values[0], max: values[1] });
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Búsqueda y Filtros de Créditos</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount} activo{activeFiltersCount > 1 ? 's' : ''}</Badge>
            )}
          </div>
          <Badge variant="outline">{totalResults} resultado{totalResults !== 1 ? 's' : ''}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre de cliente, placa de vehículo..."
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10"
            defaultValue={filters.query}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
           <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
            <SelectTrigger><div className="flex items-center gap-1"><Activity className="h-4 w-4" /><SelectValue /></div></SelectTrigger>
            <SelectContent>
              {statusOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={filters.paymentBehavior} onValueChange={(value) => onFilterChange('paymentBehavior', value)}>
            <SelectTrigger><div className="flex items-center gap-1"><BarChart className="h-4 w-4" /><SelectValue /></div></SelectTrigger>
            <SelectContent>
              {behaviorOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>

           <Select onValueChange={(value) => onFilterChange('clientId', value)} value={filters.clientId || 'all'}>
                <SelectTrigger><div className="flex items-center gap-1"><User className="h-4 w-4" /><SelectValue placeholder="Todos los clientes" /></div></SelectTrigger>
                <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {clients
                    .filter(c => c.status === 'active' && !c.isDeleted)
                    .sort((a, b) => `${a.firstname} ${a.lastname}`.localeCompare(`${b.firstname} ${b.lastname}`))
                    .map(client => (
                    <SelectItem key={client.id} value={client.id}>
                        {client.firstname} {client.lastname}
                    </SelectItem>
                    ))
                }
                </SelectContent>
            </Select>

          <Button variant="outline" onClick={() => setIsExpanded(!isExpanded)} className="w-full">
            <Filter className="h-4 w-4 mr-2" />
            {isExpanded ? 'Ocultar Avanzados' : 'Más Filtros'}
          </Button>
        </div>

        {isExpanded && (
          <div className="border-t pt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="text-sm font-medium flex items-center mb-2"><Percent className="h-4 w-4 mr-2"/> Rango de Progreso</label>
                    <Slider
                        defaultValue={[filters.progressRange.min, filters.progressRange.max]}
                        max={100}
                        min={0}
                        step={5}
                        onValueCommit={handleProgressSliderChange}
                    />
                     <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{filters.progressRange.min}%</span>
                        <span>{filters.progressRange.max}%</span>
                    </div>
                </div>
                 <div>
                    <label className="text-sm font-medium flex items-center mb-2"><DollarSign className="h-4 w-4 mr-2"/> Rango de Saldo Pendiente</label>
                    <Slider
                        defaultValue={[filters.balanceRange.min, filters.balanceRange.max]}
                        max={500000}
                        min={0}
                        step={10000}
                        onValueCommit={handleBalanceSliderChange}
                    />
                     <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{formatCurrency(filters.balanceRange.min)}</span>
                        <span>{formatCurrency(filters.balanceRange.max)}</span>
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
