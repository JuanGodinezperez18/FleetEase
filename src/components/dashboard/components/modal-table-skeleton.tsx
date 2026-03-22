
// components/dashboard/components/modal-table-skeleton.tsx
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface ModalTableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function ModalTableSkeleton({ rows = 5, columns = 3 }: ModalTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}