import Image from "next/image";
import { cn } from "@/lib/utils";

type FleetEaseLogoProps = {
  className?: string;
  /**
   * Fondo oscuro de marca detrás del icono (lima sobre transparente).
   * Necesario en tema claro; en oscuro también queda coherente.
   * Default true para el shell de la app (sidebar, headers).
   */
  withBackground?: boolean;
};

/**
 * Icono de FleetEase para el shell autenticado.
 * El asset es verde lima sobre fondo transparente: sin un fondo oscuro
 * se pierde en tema claro.
 */
export function FleetEaseLogo({
  className,
  withBackground = true,
}: FleetEaseLogoProps) {
  const image = (
    <Image
      src="/web-app-manifest-512x512.png"
      alt="FleetEase Logo"
      width={512}
      height={512}
      className={cn(
        "h-full w-full object-contain",
        !withBackground && className
      )}
      priority
    />
  );

  if (!withBackground) {
    return image;
  }

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl",
        "bg-[#080a0f] shadow-sm ring-1 ring-black/10 dark:ring-white/10",
        className
      )}
      aria-hidden={false}
    >
      {image}
    </span>
  );
}
