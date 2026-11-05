
"use client"

import type { FinancialRecord, Vehicle, Client } from "@/types";
import type { ColumnDef, Table } from "@tanstack/react-table";
import { MoreHorizontal, Filter, X } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/common/data-table-column-header";
import { format, parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { infallibleNormalizeDate, formatDate } from "@/lib/date-utils";
import React, { useState } from "react";

export type ExpenseData = FinancialRecord & {
  clientName: string;
  vehicleName: string;
  sortableDate: number; 
  categoryName: string;
};

const formatDateCell = (date: unknown) => {
    const normalizedDate = infallibleNormalizeDate(date);
    if (!normalizedDate) return 'N/A';
    try {
        return format(normalizedDate, 'dd/MM/yyyy', { locale: es });
    } catch {
        return 'Fecha inválida';
    }
};

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


export const getColumns = (
    onEdit: (record: ExpenseData) => void,
    onDelete: (record: ExpenseData) => void,
    data: ExpenseData[]
): ColumnDef<ExpenseData>[] => {
    
    const uniqueCategories = Array.from(new Set(data.map(item => item.categoryName).filter((c): c is string => !!c)));
    const uniqueClients = Array.from(new Set(data.map(item => item.clientName).filter(Boolean)));
    const uniqueVehicles = Array.from(new Set(data.map(item => item.vehicleName).filter(Boolean)));

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
            cell: ({ row }) => <div className="font-medium">{row.getValue("description")}</div>,
            enableColumnFilter: false,
        },
        {
            accessorKey: "amount",
            header: ({ column }) => (
                <DataTableColumnHeader column={column} title="Importe" className="text-right" />
            ),
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("amount"));
                const formatted = new Intl.NumberFormat("es-MX", {
                    style: "currency",
                    currency: "MXN",
                }).format(amount);
                return <div className="text-right font-mono text-destructive">{formatted}</div>;
            },
        },
        {
            accessorKey: "vehicleName",
            header: ({ column }) => (
                <div className="flex items-center space-x-1">
                    <DataTableColumnHeader column={column} title="Vehículo" />
                    <MultiSelectFilter column={column} title="Vehículo" options={uniqueVehicles} />
                </div>
            ),
             filterFn: (row, id, value) => {
               if (!value || value.length === 0) return true;
               return value.includes(row.getValue(id));
             },
        },
        {
            accessorKey: "categoryName",
            header: ({ column }) => (
                <div className="flex items-center space-x-1">
                    <DataTableColumnHeader column={column} title="Categoría" />
                    <MultiSelectFilter column={column} title="Categoría" options={uniqueCategories} />
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
                    <MultiSelectFilter column={column} title="Cliente" options={uniqueClients} />
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
                const expense = row.original;
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
                                <DropdownMenuItem onSelect={() => onEdit(expense)}>
                                    Editar Gasto
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => onDelete(expense)} className="text-destructive focus:text-destructive">
                                    Eliminar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];
}

    