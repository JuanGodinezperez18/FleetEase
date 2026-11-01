'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, Plus, Inbox } from 'lucide-react';
import Link from 'next/link';
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

export interface EmptyStateProps {
  icon?: LucideIcon;
  illustration?: IllustrationType;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
  children?: React.ReactNode;
  /** Dense layout for chart cards and tight panels */
  compact?: boolean;
}

const illustrations = {
  data: NoDataIllustration,
  clients: NoClientsIllustration,
  vehicles: NoVehiclesIllustration,
  transactions: NoTransactionsIllustration,
  search: SearchIllustration,
};

/**
 * Canonical empty state (Phase 2).
 * Supports illustrations (list modals) and compact icon mode (chart cards),
 * both on FleetEase design tokens.
 */
export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
  children,
  compact = false,
}: EmptyStateProps) {
  const IllustrationComponent = illustration ? illustrations[illustration] : null;
  const ResolvedIcon = Icon ?? (IllustrationComponent ? undefined : Inbox);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact
          ? 'gap-3 px-4 py-8'
          : 'min-h-[280px] gap-4 rounded-[14px] border border-dashed border-[var(--fe-border)] bg-[var(--fe-surface)] p-6 sm:min-h-[320px] sm:p-8',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {IllustrationComponent ? (
        <IllustrationComponent className={cn(compact ? 'mb-2 scale-90' : 'mb-4')} />
      ) : ResolvedIcon ? (
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl border border-[var(--fe-border)] bg-[var(--fe-hover)] text-[var(--fe-text-muted)]',
            compact ? 'h-12 w-12' : 'mb-1 h-14 w-14'
          )}
        >
          <ResolvedIcon className={cn(compact ? 'h-5 w-5' : 'h-6 w-6')} strokeWidth={1.6} />
        </div>
      ) : null}

      <div className={cn('max-w-md space-y-1.5', !compact && 'mb-1')}>
        <h3
          className={cn(
            'font-heading font-semibold tracking-tight text-[var(--fe-text)]',
            compact ? 'text-[15px]' : 'text-base sm:text-lg'
          )}
        >
          {title}
        </h3>
        {description && (
          <p className="text-xs leading-5 text-[var(--fe-text-muted)] sm:text-sm sm:leading-6">
            {description}
          </p>
        )}
      </div>

      {children}

      {actionLabel && (actionHref || onAction) && (
        actionHref ? (
          <Button asChild size={compact ? 'sm' : 'lg'} className="mt-1 min-h-11 rounded-full px-4 font-semibold">
            <Link href={actionHref}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              {actionLabel}
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            size={compact ? 'sm' : 'lg'}
            onClick={onAction}
            className="mt-1 min-h-11 rounded-full px-4 font-semibold"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            {actionLabel}
          </Button>
        )
      )}
    </motion.div>
  );
}
