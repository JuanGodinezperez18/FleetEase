'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  NoDataIllustration,
  NoClientsIllustration,
  NoVehiclesIllustration,
  NoTransactionsIllustration,
  SearchIllustration,
} from '@/components/illustrations/empty-state-illustrations';

type IllustrationType = 'data' | 'clients' | 'vehicles' | 'transactions' | 'search';

interface EmptyStateProps {
  icon?: LucideIcon;
  illustration?: IllustrationType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

const illustrations = {
  data: NoDataIllustration,
  clients: NoClientsIllustration,
  vehicles: NoVehiclesIllustration,
  transactions: NoTransactionsIllustration,
  search: SearchIllustration,
};

export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  actionLabel,
  onAction,
  className,
  children,
}: EmptyStateProps) {
  const IllustrationComponent = illustration ? illustrations[illustration] : null;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] p-8 text-center',
        'border-2 border-dashed rounded-lg border-muted-foreground/25',
        'bg-gradient-to-br from-muted/30 to-muted/10',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {IllustrationComponent ? (
        <IllustrationComponent className="mb-6" />
      ) : Icon ? (
        <div className="mb-4 p-4 rounded-full bg-primary/10">
          <Icon className="w-12 h-12 text-primary" strokeWidth={1.5} />
        </div>
      ) : null}

      <h3 className="text-xl font-semibold mb-2 text-foreground">
        {title}
      </h3>

      {description && (
        <p className="text-muted-foreground mb-6 max-w-md">
          {description}
        </p>
      )}

      {children}

      {actionLabel && onAction && (
        <Button onClick={onAction} size="lg" className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
