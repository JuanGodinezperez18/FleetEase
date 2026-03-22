
"use client";

import type { FinancialRecord } from "@/types";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowDown, ArrowUp, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { DataTableColumnHeader } from "@/components/common/data-table-column-header";
import { format, parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { infallibleNormalizeDate, formatDate } from "@/lib/date-utils";
import React, { useState } from "react";
import { formatCurrency } from "@/lib/utils";

export type IncomeData = FinancialRecord & {
  clientName: string;
  vehicleName: string;
  categoryName: string;
  sortableDate: number;
  canDelete?: boolean; // Flag para indicar si se puede eliminar
};

// Componente de filtro avanzado para fechas
const DateRangeFilter = ({ 
  column, 
  title 
}: { 
  column: any; 
  title: string;
}) => {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const applyFilter = () => {
    const from = fromDate ? parse(fromDate, 'dd/MM/yyyy', new Date()) : null;
    const to = toDate ? parse(toDate, 'dd/MM/yyyy', new Date()) : null;
    
    column.setFilterValue((oldValue: any) => {
      return {
        ...oldValue,
        from: from && isValid(from) ? from.getTime() : null,
        to: to && isValid(to) ? to.getTime() : null,
      };
    });
  };
  
  const clearFilter = () => {
    setFromDate('');
    setToDate('');
    column.setFilterValue(undefined);
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={column.getFilterValue() ? "border-primary" : ""}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-medium">Filtrar por {title}</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-sm">Desde</Label>
              <Input
                placeholder="dd/mm/yyyy"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                maxLength={10}
              />
            </div>
            <div>
              <Label className="text-sm">Hasta</Label>
              <Input
                placeholder="dd/mm/yyyy"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                maxLength={10}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={applyFilter}>
              Aplicar
            </Button>
            <Button size="sm" variant="outline" onClick={clearFilter}>
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Componente de filtro de múltiples opciones
const MultiSelectFilter = ({ 
  column, 
  title, 
  options 
}: { 
  column: any; 
  title: string;
  options: string[];
}) => {
  const filterValue = column.getFilterValue() as string[] || [];
  
  const handleToggle = (option: string) => {
    const newValue = filterValue.includes(option)
      ? filterValue.filter(v => v !== option)
      : [...filterValue, option];
    
    column.setFilterValue(newValue.length > 0 ? newValue : undefined);
  };
  
  const clearFilter = () => {
    column.setFilterValue(undefined);
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={filterValue.length > 0 ? "border-primary" : ""}
        >
          <Filter className="h-4 w-4" />
          {filterValue.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
              {filterValue.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filtrar por {title}</h4>
            {filterValue.length > 0 && (
              <Button size="sm" variant="outline" onClick={clearFilter}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {options.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`filter-${option}`}
                  checked={filterValue.includes(option)}
                  onCheckedChange={() => handleToggle(option)}
                />
                <Label 
                  htmlFor={`filter-${option}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {option}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Componente de filtro numérico
const NumberRangeFilter = ({ 
  column, 
  title 
}: { 
  column: any; 
  title: string;
}) => {
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  
  const applyFilter = () => {
    const minValue = min ? parseFloat(min) : null;
    const maxValue = max ? parseFloat(max) : null;
    
    column.setFilterValue((oldValue: any) => ({
      ...oldValue,
      min: minValue,
      max: maxValue,
    }));
  };
  
  const clearFilter = () => {
    setMin('');
    setMax('');
    column.setFilterValue(undefined);
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={column.getFilterValue() ? "border-primary" : ""}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-4">
          <h4 className="font-medium">Filtrar por {title}</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-sm">Mínimo</Label>
              <Input
                type="number"
                placeholder="0"
                value={min}
                onChange={(e) => setMin(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm">Máximo</Label>
              <Input
                type="number"
                placeholder="999999"
                value={max}
                onChange={(e) => setMax(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={applyFilter}>
              Aplicar
            </Button>
            <Button size="sm" variant="outline" onClick={clearFilter}>
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const getColumns = (
  onEdit: (record: IncomeData) => void,
  onDelete: (record: IncomeData) => void,
  data: IncomeData[] // Para obtener las opciones únicas
): ColumnDef<IncomeData>[] => {
  
  // Obtener opciones únicas para los filtros
  const uniqueCategories = Array.from(new Set(data.map(item => item.categoryName).filter((c): c is string => !!c)));
  const uniqueClients = Array.from(new Set(data.map(item => item.clientName).filter(Boolean)));
  const uniqueTypes = ['Ingreso/Cargo', 'Pago/Abono'];

  return [
    {
      accessorKey: "date",
      header: ({ column }) => (
        <div className="flex items-center space-x-1">
          <DataTableColumnHeader column={column} title="Fecha" />
          <DateRangeFilter column={column} title="Fecha" />
        </div>
      ),
      cell: ({ row }) => formatDate(row.original.date),
      sortingFn: 'datetime',
      filterFn: (row, id, filterValue) => {
        if (!filterValue || (!filterValue.from && !filterValue.to)) return true;
        const rowValue = infallibleNormalizeDate(row.original.date)?.getTime();
        if (!rowValue) return false;
        const from = filterValue.from;
        const to = filterValue.to;
        
        if (from && to) return rowValue >= from && rowValue <= to;
        if (from) return rowValue >= from;
        if (to) return rowValue <= to;
        return true;
      },
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descripción" />
      ),
      cell: ({ row }) => <div className="font-medium">{row.original.description}</div>,
      enableColumnFilter: false, // Se maneja con la búsqueda global
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <div className="flex items-center justify-end space-x-1">
          <DataTableColumnHeader column={column} title="Importe" className="text-right" />
          <NumberRangeFilter column={column} title="Importe" />
        </div>
      ),
      cell: ({ row }) => {
        const amount = parseFloat(String(row.original.amount || 0));
        const formatted = formatCurrency(amount)
        const isPayment = row.original.type === 'payment';

        return <div className={`text-right font-mono ${isPayment ? 'text-green-600' : ''}`}>{formatted}</div>;
      },
      filterFn: (row, id, filterValue) => {
        if (!filterValue || (filterValue.min === null && filterValue.max === null)) return true;
        const rowValue = parseFloat(String(row.original.amount || 0));
        const { min, max } = filterValue;
        
        if (min !== null && max !== null) return rowValue >= min && rowValue <= max;
        if (min !== null) return rowValue >= min;
        if (max !== null) return rowValue <= max;
        return true;
      },
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <div className="flex items-center space-x-1">
          <span>Tipo</span>
          <MultiSelectFilter 
            column={column} 
            title="Tipo" 
            options={uniqueTypes}
          />
        </div>
      ),
      cell: ({ row }) => {
        const isPayment = row.original.type === 'payment';
        return (
          <Badge variant={isPayment ? "default" : "outline"} className={isPayment ? "bg-green-100 text-green-800" : ""}>
            {isPayment ? <ArrowDown className="mr-1 h-3 w-3" /> : <ArrowUp className="mr-1 h-3 w-3" />}
            {isPayment ? 'Pago/Abono' : 'Ingreso/Cargo'}
          </Badge>
        );
      },
      filterFn: (row, id, filterValue) => {
        if (!filterValue || filterValue.length === 0) return true;
        const isPayment = row.original.type === 'payment';
        const displayType = isPayment ? 'Pago/Abono' : 'Ingreso/Cargo';
        return filterValue.includes(displayType);
      },
    },
    {
      accessorKey: "categoryName",
      header: ({ column }) => (
        <div className="flex items-center space-x-1">
          <DataTableColumnHeader column={column} title="Categoría" />
          <MultiSelectFilter 
            column={column} 
            title="Categoría" 
            options={uniqueCategories}
          />
        </div>
      ),
      filterFn: (row, id, value) => {
        if (!value || value.length === 0) return true;
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "clientName",
      header: ({ column }) => (
        <div className="flex items-center space-x-1">
          <DataTableColumnHeader column={column} title="Cliente" />
          <MultiSelectFilter 
            column={column} 
            title="Cliente" 
            options={uniqueClients}
          />
        </div>
      ),
      filterFn: (row, id, value) => {
        if (!value || value.length === 0) return true;
        return value.includes(row.getValue(id));
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const income = row.original;
        const canDelete = income.canDelete !== false; // Por defecto true si no está definido
        const isCreditGranted = income.creditGranted === true;

        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menú</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => onEdit(income)}>
                  Editar Registro
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {canDelete && !isCreditGranted ? (
                  <DropdownMenuItem onSelect={() => onDelete(income)} className="text-destructive focus:text-destructive">
                    Eliminar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled className="text-muted-foreground cursor-not-allowed">
                    {isCreditGranted ? 'No eliminable (Crédito)' : 'No eliminable'}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
};

    