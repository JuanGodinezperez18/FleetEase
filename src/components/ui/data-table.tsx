
"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type { 
    ColumnDef, 
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    Table as TanStackTable,
} from "@tanstack/react-table"

import {
  Table as ShadcnTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { GooeyInput } from "@/components/ui/gooey-input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { FileDown, SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  searchPlaceholder?: string;
  noResultsText?: string;
  exportFileName?: string;
}

interface DataTableFilterRowProps<TData> {
  table: TanStackTable<TData>;
}

function DataTableFilterRow<TData>({ table }: DataTableFilterRowProps<TData>) {
  const filterableColumns = React.useMemo(() => {
    return table.getHeaderGroups()
      .flatMap(headerGroup => headerGroup.headers)
      .filter(header => header.column.getCanFilter());
  }, [table]);

  if (filterableColumns.length === 0) return null;

  return (
    <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 ml-auto hidden md:flex">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filtros de Columna
          </Button>
        </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4 p-4">
            <div className="font-medium text-sm">Filtros de Columna</div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
            {filterableColumns.map(header => {
              const column = header.column;
              
              if(column.columnDef.header && typeof column.columnDef.header === 'function'){
                 // Si el header es una función (como DataTableColumnHeader), no renderizar el filtro de input
                 return null;
              }

              return (
                <div key={column.id} className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor={`filter-${column.id}`} className="text-sm font-medium col-span-1">
                    {flexRender(column.columnDef.header, header.getContext())}
                  </Label>
                  <Input
                    id={`filter-${column.id}`}
                    placeholder={`Filtrar...`}
                    value={(column.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                      column.setFilterValue(event.target.value)
                    }
                    className="h-8 col-span-3"
                  />
                </div>
              );
            })}
            </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Función auxiliar para extraer texto de elementos React de forma recursiva
function extractTextFromReactNode(node: React.ReactNode): string {
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }
    if (Array.isArray(node)) {
        return node.map(extractTextFromReactNode).join('');
    }
    if (React.isValidElement(node)) {
      const props = node.props as { children?: React.ReactNode };
      if (props.children) {
        return extractTextFromReactNode(props.children);
      }
    }
    return '';
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Buscar en toda la tabla...",
  noResultsText= "No se encontraron resultados.",
  loading = false,
  exportFileName = "data",
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = React.useState('')
    const [searchInput, setSearchInput] = React.useState('')
    React.useEffect(() => { const timer = window.setTimeout(() => setGlobalFilter(searchInput), 300); return () => window.clearTimeout(timer); }, [searchInput])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: 'auto',
    initialState: {
      pagination: { pageSize: 15 },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  })
  
  const loadingRows = React.useMemo(() => Array.from({ length: 10 }, (_, i) => i), []);
  
  const handleExport = React.useCallback(async () => {
    const XLSX = await import('xlsx');
    const tableData = table.getFilteredRowModel().rows.map(row => {
      const rowData: Record<string, any> = {};
      row.getVisibleCells().forEach(cell => {
        const column = cell.column;
        const columnDef = column.columnDef;
        if (column.id !== 'actions') {
           const header = typeof column.columnDef.header === 'string'
             ? column.columnDef.header
             : (column.columnDef.header as any)?.props?.title || column.id;
           let value = cell.getValue();
           if (value instanceof Date) {
             value = formatDate(value);
           } else if (typeof value === 'number' && (header.toLowerCase().includes('monto') || header.toLowerCase().includes('costo') || header.toLowerCase().includes('saldo'))) {
             value = formatCurrency(value);
           }
           if (typeof columnDef.cell === 'function') {
                const renderedValue = flexRender(columnDef.cell, cell.getContext());
                if (typeof renderedValue === 'string' || typeof renderedValue === 'number' || typeof renderedValue === 'boolean') {
                    value = renderedValue;
                } else {
                    value = extractTextFromReactNode(renderedValue);
                }
           }
           rowData[header] = value;
        }
      });
      return rowData;
    });
    const worksheet = XLSX.utils.json_to_sheet(tableData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
    XLSX.writeFile(workbook, `${exportFileName}_${new Date().toLocaleDateString()}.xlsx`);
  }, [table, exportFileName]);

  return (
    <div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-4">
            <GooeyInput
              placeholder={searchPlaceholder}
              value={searchInput}
              onValueChange={setSearchInput}
              collapsedWidth={140}
              expandedWidth={280}
              expandedOffset={44}
              className="w-auto"
            />
            <div className="flex items-center gap-2">
                <DataTableFilterRow table={table} />
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={loading || data.length === 0}
                    className="h-9"
                >
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar
                </Button>
            </div>
      </div>
      
      {/* Mobile Card View */}
      <div className="grid gap-4 md:hidden">
        {loading ? (
            loadingRows.map(i => (
                <div key={`mobile-skeleton-${i}`} className="p-4 border rounded-lg space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            ))
        ) : table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <div key={row.id} className="p-4 border rounded-lg space-y-2">
              {row.getVisibleCells().map((cell) => {
                const columnDef = cell.column.columnDef;
                const headerDef = cell.column.columnDef.header;
                
                // Excluir columna de acciones o con header vacío
                if (cell.column.id === 'actions' || !headerDef) return null;
                
                const headerContext = {
                    table: table,
                    header: table.getHeaderGroups()[0].headers.find(h => h.id === cell.column.id)!,
                    column: cell.column,
                };
                
                return (
                  <div key={cell.id} className="flex justify-between items-start text-sm">
                    <span className="font-semibold text-[var(--fe-text-muted)] mr-2">
                       {typeof headerDef === 'function' ? flexRender(headerDef, headerContext) : String(headerDef)}
                    </span>
                    <div className="text-right truncate">
                        {flexRender(columnDef.cell, cell.getContext())}
                    </div>
                  </div>
                );
              })}
              {/* Render actions column at the bottom */}
              {row.getVisibleCells().find(cell => cell.column.id === 'actions') && (
                <div className="flex justify-end pt-2 border-t mt-2">
                    {flexRender(row.getVisibleCells().find(cell => cell.column.id === 'actions')!.column.columnDef.cell, row.getVisibleCells().find(cell => cell.column.id === 'actions')!.getContext())}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-[var(--fe-text-muted)]">{noResultsText}</div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="rounded-md border hidden md:block">
        <ShadcnTable>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
                loadingRows.map(i => (
                    <TableRow key={`skeleton-${i}`}>
                        {columns.map((column, index) => (
                            <TableCell key={(column as { id?: string }).id || `skeleton-cell-${i}-${index}`}>
                                <Skeleton className="h-4 w-full" />
                            </TableCell>
                        ))}
                    </TableRow>
                ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {noResultsText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ShadcnTable>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage() || loading}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage() || loading}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
