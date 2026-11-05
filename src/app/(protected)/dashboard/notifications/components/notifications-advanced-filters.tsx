

"use client";

import React from 'react';
import type { NotificationSearchFilters } from '@/hooks/use-notifications-search';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Search, Filter, X, CalendarIcon, AlertTriangle, Shield, Wrench, DollarSign } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationsAdvancedFiltersProps {
  filters: NotificationSearchFilters;
  onFilterChange: (key: keyof NotificationSearchFilters, value: any) => void;
  onReset: () => void;
  onSearch: (query: string) => void;
  totalResults: number;
  isLoading?: boolean;
}

const priorityOptions = ['all', 'Crítica', 'Alta', 'Media', 'Baja'];
const categoryOptions = ['all', 'Mantenimiento', 'Financiera', 'Legal', 'Operacional'];
const statusOptions = ['all', 'read', 'unread'];
const entityTypeOptions = ['all', 'Vehículo', 'Cliente', 'Socio', 'Sistema'];

export const NotificationsAdvancedFilters: React.FC<NotificationsAdvancedFiltersProps> = ({
  filters, onFilterChange, onReset, onSearch, totalResults, isLoading = false
}) => {
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.priority !== 'all') count++;
    if (filters.category !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.entityType !== 'all') count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    return count;
  }, [filters]);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    onFilterChange('dateRange', { from: range?.from || null, to: range?.to || null });
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Búsqueda de Notificaciones</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">
                {activeFiltersCount} activo{activeFiltersCount > 1 ? 's' : ''}
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
            placeholder="Buscar en mensajes..."
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10"
            defaultValue={filters.query}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
           <Select value={filters.priority} onValueChange={(value) => onFilterChange('priority', value)}>
            <SelectTrigger><div className="flex items-center gap-1"><AlertTriangle className="h-4 w-4" /><SelectValue /></div></SelectTrigger>
            <SelectContent>
              {priorityOptions.map(opt => <SelectItem key={opt} value={opt}>{opt === 'all' ? 'Toda Prioridad' : opt}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.category} onValueChange={(value) => onFilterChange('category', value)}>
            <SelectTrigger><div className="flex items-center gap-1"><Wrench className="h-4 w-4" /><SelectValue /></div></SelectTrigger>
            <SelectContent>
              {categoryOptions.map(opt => <SelectItem key={opt} value={opt}>{opt === 'all' ? 'Toda Categoría' : opt}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
            <SelectTrigger><div className="flex items-center gap-1"><Shield className="h-4 w-4" /><SelectValue /></div></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todo Estado</SelectItem>
                <SelectItem value="read">Leídas</SelectItem>
                <SelectItem value="unread">No Leídas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.entityType} onValueChange={(value) => onFilterChange('entityType', value)}>
            <SelectTrigger><div className="flex items-center gap-1"><DollarSign className="h-4 w-4" /><SelectValue /></div></SelectTrigger>
            <SelectContent>
                {entityTypeOptions.map(opt => <SelectItem key={opt} value={opt}>{opt === 'all' ? 'Toda Entidad' : opt}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="border-t pt-4">
            <label className="text-sm font-medium flex items-center mb-2"><CalendarIcon className="h-4 w-4 mr-2"/> Rango de Fechas</label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {filters.dateRange.from ? format(filters.dateRange.from, 'dd LLL, y', {locale: es}) : <span>Desde</span>} - {filters.dateRange.to ? format(filters.dateRange.to, 'dd LLL, y', {locale: es}) : <span>Hasta</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="range" selected={filters.dateRange as DateRange} onSelect={handleDateRangeChange} numberOfMonths={2}/>
                </PopoverContent>
            </Popover>
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
