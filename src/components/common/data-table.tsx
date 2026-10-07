
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
    RowSelectionState,
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
import { FileDown, SlidersHorizontal, Maximize2, Minimize2, Trash2, Copy, Archive, CheckCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface BulkAction<TData> {
  label: string;
  icon?: React.ElementType;
  onClick: (selectedRows: TData[]) => void;
  variant?: 'default' | 'destructive' | 'outline';
  requiresConfirmation?: boolean;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  searchPlaceholder?: string;
  noResultsText?: string;
  exportFileName?: string;
  rowSelection?: RowSelectionState;
  setRowSelection?: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  compactMode?: boolean;
  stickyHeader?: boolean;
  bulkActions?: BulkAction<TData>[];
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
          <Button variant="outline" size="sm" className="h-11 ml-auto hidden md:flex">
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filtros
          </Button>
        </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,20rem)]" align="end">
        <div className="space-y-4 p-4">
            <div className="font-medium text-sm">Filtros de Columna</div>
            {filterableColumns.map(header => {
              const column = header.column;
              const headerContext = header.getContext();
              const headerText = typeof header.column.columnDef.header === 'string' 
                ? header.column.columnDef.header 
                : header.id;
              
              return (
                <div key={column.id} className="grid grid-cols-4 items-center gap-2">
                  <Label htmlFor={`filter-${column.id}`} className="text-sm font-medium col-span-1">
                    {flexRender(header.column.columnDef.header, headerContext) || headerText}
                  </Label>
                  <Input
                    id={`filter-${column.id}`}
                    placeholder={`Filtrar...`}
                    value={(column.getFilterValue() as string) ?? ""}
                    onChange={(event) =>
                      column.setFilterValue(event.target.value)
                    }
                    className="h-11 col-span-3"
                  />
                </div>
              );
            })}
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
  rowSelection = {},
  setRowSelection = () => {},
  compactMode = false,
  stickyHeader = true,
  bulkActions = [],
}: DataTableProps<TData, TValue>) {
    const [isCompact, setIsCompact] = React.useState(compactMode);
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = React.useState('')
    const [searchInput, setSearchInput] = React.useState('')
    React.useEffect(() => { const timer = window.setTimeout(() => setGlobalFilter(searchInput), 300); return () => window.clearTimeout(timer); }, [searchInput])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  const tableColumns = React.useMemo(() => [
      {
          id: 'select',
          header: ({ table }: { table: TanStackTable<TData> }) => (
              <Checkbox
                  checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
                  onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                  aria-label="Seleccionar todo"
              />
          ),
          cell: ({ row }: { row: any }) => (
              <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(!!value)}
                  aria-label="Seleccionar fila"
              />
          ),
          enableSorting: false,
          enableHiding: false,
      },
      ...columns,
  ], [columns]);

  const table = useReactTable({
    data,
    columns: tableColumns,
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

  const selectedRows = React.useMemo(() => {
    return table.getFilteredSelectedRowModel().rows.map(row => row.original);
  }, [table, rowSelection]);

  const handleBulkAction = React.useCallback((action: BulkAction<TData>) => {
    if (action.requiresConfirmation) {
      if (confirm(`¿Estás seguro de que quieres ${action.label.toLowerCase()} ${selectedRows.length} elemento(s)?`)) {
        action.onClick(selectedRows);
        setRowSelection({});
      }
    } else {
      action.onClick(selectedRows);
      setRowSelection({});
    }
  }, [selectedRows, setRowSelection]);

  const handleExport = React.useCallback(async () => {
    const XLSX = await import('xlsx');
    const tableData = table.getFilteredRowModel().rows.map(row => {
      const rowData: Record<string, any> = {};
      row.getVisibleCells().forEach(cell => {
        const column = cell.column;
        const columnDef = column.columnDef;
        if (column.id !== 'actions' && column.id !== 'select') {
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
        {/* Bulk Actions Bar */}
        {selectedRows.length > 0 && bulkActions.length > 0 && (
          <div className="border-b border-border/60 bg-muted/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2">
            <span className="text-sm font-medium">
              {selectedRows.length} elemento(s) seleccionado(s)
            </span>
            <div className="flex items-center gap-2">
              {bulkActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={index}
                    variant={action.variant || 'outline'}
                    size="sm"
                    onClick={() => handleBulkAction(action)}
                    className="h-11"
                  >
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    {action.label}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRowSelection({})}
                className="h-11"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

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
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCompact(!isCompact)}
                    className="h-11 hidden md:flex"
                    title={isCompact ? "Vista normal" : "Vista compacta"}
                >
                    {isCompact ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                </Button>
                <DataTableFilterRow table={table} />
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    disabled={loading || data.length === 0}
                    className="h-11"
                >
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar
                </Button>
            </div>
      </div>
      
      {/* Mobile Card View */}
      <div className="grid gap-3 md:hidden">
        {loading ? (
            loadingRows.map(i => (
                <div key={`mobile-skeleton-${i}`} className="p-4 border border-border/70 rounded-[14px] bg-card/60 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            ))
        ) : table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <div key={row.id} className="p-4 border border-border/70 rounded-[14px] bg-card/60 space-y-2">
              {row.getVisibleCells().map((cell) => {
                const columnDef = cell.column.columnDef;
                const headerDef = cell.column.columnDef.header;
                
                // Excluir columna de acciones o con header vacío
                if (cell.column.id === 'actions' || cell.column.id === 'select' || !headerDef) return null;
                
                const headerContext = {
                    table: table,
                    header: table.getHeaderGroups()[0].headers.find(h => h.id === cell.column.id)!,
                    column: cell.column,
                };
                
                return (
                  <div key={cell.id} className="flex justify-between items-start text-sm">
                    <span className="font-semibold text-muted-foreground mr-2">
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
          <div className="text-center py-12 text-muted-foreground">{noResultsText}</div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className={`rounded-md border hidden md:block ${stickyHeader ? 'overflow-auto max-h-[600px]' : ''}`}>
        <ShadcnTable>
          <TableHeader className={stickyHeader ? 'sticky top-0 bg-background z-10 shadow-sm' : ''}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className={isCompact ? 'h-10' : ''}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className={isCompact ? 'py-2 text-xs' : ''}>
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
                        {tableColumns.map((column, index) => (
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
                  className={isCompact ? 'h-10' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={isCompact ? 'py-2 text-xs' : ''}>
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
                  colSpan={columns.length + 1}
                  className="h-24 text-center"
                >
                  {noResultsText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </ShadcnTable>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 py-4">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length > 0 ? (
            <>
              {table.getFilteredSelectedRowModel().rows.length} de{" "}
              {table.getFilteredRowModel().rows.length} fila(s) seleccionadas.
            </>
          ) : (
            <>
              Mostrando{" "}
              {table.getFilteredRowModel().rows.length === 0
                ? 0
                : table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
              –
              {Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}{" "}
              de {table.getFilteredRowModel().rows.length}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || loading}
          >
            Anterior
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
          </span>
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
    </div>
  )
}
