import Link from "next/link";
import Image from "next/image";

type BrandLogoProps = {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  priority?: boolean;
  href?: string;
};

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
          alt=""
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
          <span className="fe-brand-fleet" style={{ color: "#ffffff" }}>
            Fleet
          </span>
          <span className="fe-brand-ease" style={{ color: "#d7ff3f" }}>
            Ease
          </span>
        </span>
      ) : null}
    </Link>
  );
}
