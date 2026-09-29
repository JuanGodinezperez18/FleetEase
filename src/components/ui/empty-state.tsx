"use client";

import { motion } from "framer-motion";
import { LucideIcon, Plus, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
}

/**
 * Empty state reutilizable alineado al design system de FleetEase.
 * Usa el acento lime, glass y tipografía Manrope para headings.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
  compact = false,
}: EmptyStateProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4 gap-3" : "py-12 px-6 gap-4",
        className
      )}
    >
      <motion.div
        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--fe-border)] bg-[var(--fe-hover)] text-[var(--fe-text-muted)]"
        whileHover={{ scale: 1.05, borderColor: "rgba(215,255,63,0.25)" }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
      >
        <Icon className="h-6 w-6" strokeWidth={1.6} />
      </motion.div>

      <div className="max-w-sm space-y-1.5">
        <h3 className="font-heading text-[15px] font-semibold tracking-[-0.02em] text-[var(--fe-text)]">
          {title}
        </h3>
        {description && (
          <p className="text-xs leading-5 text-[var(--fe-text-muted)]">{description}</p>
        )}
      </div>

      {actionLabel && (actionHref || onAction) && (
        actionHref ? (
          <Button
            asChild
            size="sm"
            className="mt-1 rounded-full px-4 font-bold"
          >
            <Link href={actionHref}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              {actionLabel}
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={onAction}
            className="mt-1 rounded-full px-4 font-bold"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            {actionLabel}
          </Button>
        )
      )}
    </motion.div>
  );

  return content;
}
