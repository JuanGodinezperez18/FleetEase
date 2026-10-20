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
 * se pierde en tema claro (sidebar claro / cream).
 */
export function FleetEaseLogo({
  className,
  withBackground = true,
}: FleetEaseLogoProps) {
  const image = (
    <Image
      src="/logo.png"
      alt="FleetEase"
      width={96}
      height={96}
      className="h-full w-full object-contain p-[12%]"
      priority
      sizes="40px"
    />
  );

  if (!withBackground) {
    return (
      <span className={cn("relative inline-flex shrink-0", className)}>
        <Image
          src="/logo.png"
          alt="FleetEase"
          width={96}
          height={96}
          className="h-full w-full object-contain"
          priority
          sizes="40px"
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl",
        className
      )}
      // Fondo de marca fijo (no depende de tokens del tema) para que el lima
      // siempre contraste, tanto en sidebar light como dark.
      style={{
        backgroundColor: "#080a0f",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.12)",
      }}
    >
      {image}
    </span>
  );
}
