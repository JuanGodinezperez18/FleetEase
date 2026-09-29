import * as React from "react";
import { cn } from "@/lib/utils";

const List = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("space-y-4", className)}
    {...props}
  />
));
List.displayName = "List";

const ListItem = React.forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={cn(
      "p-4 rounded-[var(--fe-radius-md)] border border-[var(--fe-border)] bg-[var(--fe-surface)] text-[var(--fe-text)] transition-shadow hover:shadow-[var(--fe-shadow-sm)]",
      className
    )}
    {...props}
  />
));
ListItem.displayName = "ListItem";

export { List, ListItem };
