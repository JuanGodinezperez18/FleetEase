
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/common/data-table";
import type { ColumnDef } from '@tanstack/react-table';

export interface EntityListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  columns: ColumnDef<any>[];
  searchPlaceholder?: string;
}

export function EntityListModal({
  isOpen,
  onClose,
  title,
  data,
  columns,
  searchPlaceholder = "Buscar...",
}: EntityListModalProps) {

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Mostrando {data.length} resultado(s).
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0">
            <DataTable
                data={data}
                columns={columns}
                searchPlaceholder={searchPlaceholder}
                noResultsText="No se encontraron registros."
            />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
