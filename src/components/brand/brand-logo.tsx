import Link from "next/link";
import Image from "next/image";

type BrandLogoProps = {
  /** Tamaño del icono en px (default 40) */
  size?: number;
  /** Mostrar wordmark FleetEase */
  showWordmark?: boolean;
  /** Clases extra del contenedor del link */
  className?: string;
  /** Prioridad de carga (header principal) */
  priority?: boolean;
  href?: string;
};

/**
 * Logo unificado para header, footer y páginas públicas.
 * object-contain + fondo transparente para que no se recorte en dark/light.
 */
export function BrandLogo({
  size = 40,
  showWordmark = true,
  className = "",
  priority = false,
  href = "/",
}: BrandLogoProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 ${className}`}
      aria-label="FleetEase inicio"
    >
      <span
        className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl"
        style={{ width: size, height: size }}
      >
        <Image
          src="/logo.png"
          alt="FleetEase"
          width={size}
          height={size}
          className="h-full w-full object-contain"
          priority={priority}
          sizes={`${size}px`}
        />
      </span>
      {showWordmark ? (
        <span
          className="font-semibold tracking-[-0.03em] leading-none"
          style={{ fontSize: Math.max(15, Math.round(size * 0.42)) }}
        >
          <span className="text-white">Fleet</span>
          <span className="text-[var(--fe-lime,#d7ff3f)]">Ease</span>
        </span>
      ) : null}
    </Link>
  );
}
