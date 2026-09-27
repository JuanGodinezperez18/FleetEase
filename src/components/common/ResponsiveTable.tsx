
"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/common/data-table';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ColumnDef, RowSelectionState } from '@tanstack/react-table';
import { Search } from '@/components/ui/search';

interface ResponsiveTableProps<TData, TValue> {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  mobileCardRenderer: (item: TData) => React.ReactNode;
  title?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  loading?: boolean;
  rowSelection?: RowSelectionState;
  setRowSelection?: React.Dispatch<React.SetStateAction<RowSelectionState>>;
}

function TableSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i} className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2 mb-1"></div>
            <div className="h-3 bg-muted rounded w-1/3"></div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ResponsiveTable<TData, TValue>({
  data,
  columns,
  mobileCardRenderer,
  title,
  searchPlaceholder,
  noResultsText,
  loading = false,
  rowSelection,
  setRowSelection
}: ResponsiveTableProps<TData, TValue>) {
  const isMobile = useIsMobile();
  const [globalFilter, setGlobalFilter] = React.useState('');

  const filteredData = React.useMemo(() => {
    if (!globalFilter) return data;
    const searchTerm = globalFilter.toLowerCase();
    
    return data.filter(item => 
        Object.values(item as any).some(value => 
            String(value).toLowerCase().includes(searchTerm)
        )
    );
  }, [data, globalFilter]);

  if (loading) {
    return <TableSkeleton />;
  }

  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          <Search
            placeholder={searchPlaceholder || "Buscar..."}
            value={globalFilter}
            onValueChange={setGlobalFilter}
            width={280}
          />
          <span className="text-sm text-muted-foreground self-end sm:self-center">
            {filteredData.length} resultados
          </span>
        </div>
        
        <div className="space-y-3">
          {filteredData.map((item: any, index: number) => (
            <div key={item.id || index}>
              {mobileCardRenderer(item)}
            </div>
          ))}
        </div>
        
        {filteredData.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {noResultsText || "No se encontraron resultados"}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <DataTable 
      columns={columns} 
      data={data}
      searchPlaceholder={searchPlaceholder}
      noResultsText={noResultsText}
      loading={loading}
      rowSelection={rowSelection}
      setRowSelection={setRowSelection}
    />
  );
}
