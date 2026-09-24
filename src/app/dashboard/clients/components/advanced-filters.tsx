

"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AdvancedSearchPanelProps {
  filters: any;
  updateFilter: (key: string, value: any) => void;
  resetFilters: () => void;
  activeFiltersCount: number;
}

export function AdvancedSearchPanel({ 
  filters, 
  updateFilter, 
  resetFilters, 
  activeFiltersCount 
}: AdvancedSearchPanelProps) {
  return (
    <Card className="fe-filter-surface rounded-t-none">
      <CardContent className="fe-filter-body space-y-4 pt-5">
        {/* Búsqueda general */}
        <div>
          <Label htmlFor="search">Búsqueda general</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              id="search"
              placeholder="Nombre, email, teléfono, RFC..."
              value={filters.searchTerm}
              onChange={(e) => updateFilter('searchTerm', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {/* Rango de deuda */}
          <div>
            <Label>Deuda (rango)</Label>
            <div className="flex min-w-0 gap-2">
              <Input
                type="number"
                placeholder="Mín"
                value={filters.debtRange?.min ?? ''}
                onChange={(e) => updateFilter('debtRange', {
                  ...filters.debtRange,
                  min: e.target.value ? Number(e.target.value) : 0
                })}
              />
              <Input
                type="number"
                placeholder="Máx"
                value={filters.debtRange?.max ?? ''}
                onChange={(e) => updateFilter('debtRange', {
                  min: filters.debtRange?.min ?? 0,
                  max: e.target.value ? Number(e.target.value) : 999999
                })}
              />
            </div>
          </div>

          {/* Comportamiento de pago */}
          <div>
            <Label>Comportamiento de pago</Label>
            <Select
              value={filters.paymentBehavior}
              onValueChange={(value) => updateFilter('paymentBehavior', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="excellent">Excelente</SelectItem>
                <SelectItem value="good">Bueno</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="bad">Malo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estado de licencia */}
          <div>
            <Label>Estado de licencia</Label>
            <Select
              value={filters.licenseStatus}
              onValueChange={(value) => updateFilter('licenseStatus', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="valid">Vigente</SelectItem>
                <SelectItem value="expiring_soon">Por vencer (30 días)</SelectItem>
                <SelectItem value="expired">Vencida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vehículo asignado */}
          <div>
            <Label>Vehículo asignado</Label>
            <Select
              value={filters.hasVehicle.toString()}
              onValueChange={(value) => updateFilter('hasVehicle', value === 'all' ? 'all' : value === 'true')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Con vehículo</SelectItem>
                <SelectItem value="false">Sin vehículo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Crédito activo */}
          <div>
            <Label>Crédito activo</Label>
            <Select
              value={filters.hasActiveCredit.toString()}
              onValueChange={(value) => updateFilter('hasActiveCredit', value === 'all' ? 'all' : value === 'true')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Con crédito</SelectItem>
                <SelectItem value="false">Sin crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {activeFiltersCount > 0 && (
          <div className="flex justify-start pt-2">
            <Button variant="ghost" size="sm" onClick={resetFilters} className="min-h-11">
                <X className="w-4 h-4 mr-2" />
                Limpiar {activeFiltersCount} filtro(s)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
