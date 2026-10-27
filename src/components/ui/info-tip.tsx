"use client";

import * as React from "react";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface InfoTipProps {
  /** Optional bold heading inside the popover */
  title?: string;
  /** Body copy shown only when the user opens the tip */
  children: React.ReactNode;
  /** Accessible label for the trigger button */
  label?: string;
  className?: string;
  contentClassName?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** Visual size of the icon button */
  size?: "sm" | "md";
}

/**
 * Compact info control: keeps explanatory copy off the page until the user
 * taps the icon. Use for helper paragraphs, feature blurbs, and form notes.
 */
export function InfoTip({
  title,
  children,
  label = "Más información",
  className,
  contentClassName,
  side = "bottom",
  align = "end",
  size = "sm",
}: InfoTipProps) {
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            dim,
            "inline-flex shrink-0 items-center justify-center rounded-full",
            "border border-[var(--fe-border)] bg-[var(--fe-control-bg)]",
            "text-[var(--fe-text-muted)] shadow-[var(--fe-control-shadow)]",
            "transition-colors hover:border-[var(--fe-border-strong)]",
            "hover:bg-[var(--fe-hover-strong)] hover:text-[var(--fe-text)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-focus-ring)]",
            className
          )}
        >
          <Info className={icon} strokeWidth={2} aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className={cn(
          "w-[min(92vw,20rem)] space-y-2 p-3.5 text-sm leading-relaxed",
          contentClassName
        )}
      >
        {title ? (
          <p className="font-heading text-sm font-semibold text-[var(--fe-text)]">
            {title}
          </p>
        ) : null}
        <div className="text-[var(--fe-text-muted)]">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
