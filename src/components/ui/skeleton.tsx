import { cn } from "@/lib/utils"

/**
 * Skeleton de carga alineado al design system FleetEase.
 * Usa --fe-skeleton (dark/light) en lugar de bg-muted, que en :root
 * es casi blanco y provoca un flash blanco en transiciones dark.
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("fe-skeleton rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
