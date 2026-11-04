
"use client";

import React from 'react';
import type { UserSearchFilters } from '@/hooks/use-user-search';
import type { Company } from '@/types';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, X, Building, Activity, Shield } from 'lucide-react';

interface UserAdvancedFiltersProps {
  filters: UserSearchFilters;
  onFilterChange: (key: keyof UserSearchFilters, value: any) => void;
  onReset: () => void;
  onSearch: (query: string) => void;
  totalResults: number;
  companies: Company[];
  isLoading?: boolean;
}

const statusOptions = [
    { value: 'all', label: 'Todos los Estados' },
    { value: 'active', label: 'Activo' },
    { value: 'deleted', label: 'Eliminado' },
];

const roleOptions = [
    { value: 'all', label: 'Todos los Roles' },
    { value: 'superAdmin', label: 'Super Admin' },
    { value: 'admin', label: 'Administrador' },
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Visualizador (Socio)' },
];

const activityOptions = [
    { value: 'all', label: 'Toda Actividad' },
    { value: 'Alto', label: 'Alta' },
    { value: 'Medio', label: 'Media' },
    { value: 'Bajo', label: 'Baja' },
    { value: 'Inactivo', label: 'Inactivo' },
];

export const UserAdvancedFilters: React.FC<UserAdvancedFiltersProps> = ({
  filters, onFilterChange, onReset, onSearch, totalResults, companies, isLoading = false
}) => {
  const { currentUser } = useAuth();

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.status !== 'all') count++;
    if (filters.role !== 'all') count++;
    if (filters.activityLevel !== 'all') count++;
    if (currentUser?.role === 'superAdmin' && filters.companyId !== 'all') count++;
    return count;
  }, [filters, currentUser]);
  
  const canShowRoleFilter = (roleValue: string) => {
    if (currentUser?.role === 'superAdmin') return true;
    return roleValue !== 'superAdmin';
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">Búsqueda y Filtros de Usuarios</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount} activo{activeFiltersCount > 1 ? 's' : ''}</Badge>
            )}
          </div>
          <Badge variant="outline">{totalResults} usuario{totalResults !== 1 ? 's' : ''}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, correo..."
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
          
          <Select value={filters.role} onValueChange={(value) => onFilterChange('role', value)}>
            <SelectTrigger><div className="flex items-center gap-1"><Building className="h-4 w-4" /><SelectValue /></div></SelectTrigger>
            <SelectContent>
              {roleOptions.filter(opt => canShowRoleFilter(opt.value)).map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.activityLevel} onValueChange={(value) => onFilterChange('activityLevel', value)}>
            <SelectTrigger><div className="flex items-center gap-1"><Activity className="h-4 w-4" /><SelectValue /></div></SelectTrigger>
            <SelectContent>
              {activityOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
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
