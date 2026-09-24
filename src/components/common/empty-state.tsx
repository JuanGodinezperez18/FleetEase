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
        'flex min-h-[320px] flex-col items-center justify-center rounded-[14px] border border-dashed border-border/70 bg-card/50 p-6 text-center sm:min-h-[360px] sm:p-8',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]',
        'transition-colors',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {IllustrationComponent ? (
        <IllustrationComponent className="mb-6" />
      ) : Icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-muted/40">
          <Icon className="h-6 w-6 text-muted-foreground" strokeWidth={1.6} />
        </div>
      ) : null}

      <h3 className="mb-2 text-base font-semibold tracking-tight text-foreground sm:text-lg">
        {title}
      </h3>

      {description && (
        <p className="mb-6 max-w-md text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      )}

      {children}

      {actionLabel && onAction && (
        <Button onClick={onAction} size="lg" className="mt-2 min-h-11">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
