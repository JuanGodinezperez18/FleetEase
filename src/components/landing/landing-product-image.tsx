type ProductScreen = 'vehicles' | 'finance' | 'maintenance' | 'profitability';

interface LandingProductImageProps {
  screen: ProductScreen;
  alt: string;
  priority?: boolean;
  sizes: string;
  focused?: boolean;
}

/** Serve precompressed WebP variants while retaining sharp interface text. */
export function LandingProductImage({ screen, alt, priority = false, sizes, focused = false }: LandingProductImageProps) {
  const source = `/media/landing/product-${screen}`;

  return (
    <a
      href={`${source}.webp`}
      target="_blank"
      rel="noopener noreferrer"
      className="group block min-w-0 overflow-hidden rounded-xl border border-white/[0.14] bg-[var(--fe-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-lime)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--fe-ink)]"
      aria-label={`Ampliar captura: ${alt} (abre en una pestaña nueva)`}
    >
      <picture className={focused ? 'relative block aspect-[16/10] overflow-hidden' : undefined}>
        <source
          type="image/webp"
          srcSet={`${source}-640.webp 640w, ${source}-960.webp 960w, ${source}.webp 1440w`}
          sizes={sizes}
        />
        {/* Files are already compressed and have explicit responsive variants. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${source}.webp`}
          alt={alt}
          width={1440}
          height={900}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          className={focused ? 'absolute -left-[23%] -top-[7%] block h-auto w-[123%] max-w-none' : 'block h-auto w-full'}
        />
      </picture>
      <span className="flex min-h-11 items-center justify-between gap-3 border-t border-white/[0.08] px-3 py-2 text-xs text-white/65 transition-colors group-hover:text-white sm:px-4">
        <span>Datos de demostración</span>
        <span className="font-semibold text-[var(--fe-lime)]">Ampliar captura</span>
      </span>
    </a>
  );
}
