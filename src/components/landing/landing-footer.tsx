import Link from 'next/link';
import { BrandLogo } from '@/components/brand/brand-logo';

const links = [
  ['Funciones', '/funciones'], ['Soluciones', '/soluciones'],
  ['Administración en Monterrey', '/administracion-de-vehiculos-monterrey'],
  ['Software para flotillas', '/software-para-flotillas'],
  ['Renta de vehículos', '/software-para-renta-de-vehiculos'],
  ['Control de mantenimiento', '/control-de-mantenimiento-de-flotillas'],
  ['Contacto', '/contacto-ventas'], ['Privacidad', '/privacidad'],
  ['Cookies', '/cookies'], ['Términos', '/terminos'], ['Cancelaciones', '/cancelaciones'],
] as const;

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--fe-border)] px-5 py-8 lg:px-8">
      <div className="mx-auto max-w-[1240px]">
        <div className="grid gap-6 md:grid-cols-[0.8fr_1.2fr] md:gap-12">
          <div id="nuestra-vision" className="scroll-mt-[var(--header-h)]">
            <BrandLogo size={40} />
            <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--fe-text-secondary)]">Nacimos de la experiencia administrando vehículos de renta. Reunimos la operación para que puedas entender el resultado de cada unidad.</p>
            <nav aria-label="Redes sociales de FleetEase" className="mt-3 flex gap-6 text-sm">
              <a href="https://www.facebook.com/share/1PwgGWzKRU/" target="_blank" rel="noopener noreferrer" className="fe-marketing-link" aria-label="FleetEase en Facebook (abre en una pestaña nueva)">Facebook</a>
              <a href="https://www.instagram.com/fleeteasemx/" target="_blank" rel="noopener noreferrer" className="fe-marketing-link" aria-label="FleetEase en Instagram (abre en una pestaña nueva)">Instagram</a>
            </nav>
          </div>
          <nav aria-label="Enlaces del pie" className="grid grid-cols-2 content-start gap-x-6 text-sm sm:grid-cols-3">
            {links.map(([label,href]) => <Link key={href} href={href} className="flex min-h-11 items-center rounded-sm py-1 text-[var(--fe-text-secondary)] hover:text-[var(--fe-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fe-lime)]">{label}</Link>)}
          </nav>
        </div>
        <p className="mt-6 text-xs text-[var(--fe-text-secondary)]">© 2026 FleetEase · Software de gestión de flotillas</p>
      </div>
    </footer>
  );
}
