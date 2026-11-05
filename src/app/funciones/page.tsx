import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicMarketingLayout } from '@/components/landing/public-marketing-layout';
import { LandingProductImage } from '@/components/landing/landing-product-image';
import { productViews } from '@/components/landing/product-views';

const url = 'https://www.fleetease.com.mx/funciones';
export const metadata: Metadata = {
  title: { absolute: 'Funciones de FleetEase | Rentabilidad y Mantenimiento' },
  description: 'Rentabilidad por vehículo, control de mantenimiento, cobranza, clientes y reportes PDF/Excel. Descubre todo lo que FleetEase hace por tu flotilla.',
  alternates: { canonical: url },
  openGraph: { title: 'Funciones de FleetEase | Rentabilidad y Mantenimiento', description: 'Control de vehículos, finanzas y mantenimiento con vistas reales del producto.', url, siteName: 'FleetEase', locale: 'es_MX', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: 'Funciones de FleetEase | Rentabilidad y Mantenimiento', description: 'Rentabilidad, mantenimiento y operación de tu flotilla.', images: ['/og-image.png'] },
};

export default function FuncionesPage() {
  return (
    <PublicMarketingLayout>
      <div className="mx-auto max-w-[1240px] px-5 py-12 lg:px-8 lg:py-16">
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Cada unidad, con su operación y sus números.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--fe-text-secondary)]">Consulta las funciones que conectan vehículos, clientes, finanzas y mantenimiento. Estas vistas muestran la aplicación con datos de demostración.</p>
        <nav aria-label="Módulos del producto" className="mt-5 flex flex-wrap gap-x-6">
          {productViews.map(view => <a key={view.screen} href={`#${view.screen}`} className="fe-marketing-link">{view.label}</a>)}
          <a href="#rentabilidad" className="fe-marketing-link">Rentabilidad</a>
        </nav>
        {productViews.map((view,index) => (
          <section key={view.screen} id={view.screen} aria-labelledby={`${view.screen}-title`} className="grid min-w-0 scroll-mt-[var(--header-h)] gap-6 border-t border-[var(--fe-border)] py-10 lg:grid-cols-[0.65fr_1.35fr] lg:items-center lg:gap-10 lg:py-14">
            <div>
              <h2 id={`${view.screen}-title`} className="text-2xl font-semibold tracking-tight sm:text-3xl">{view.title}</h2>
              <p className="mt-4 text-base leading-7 text-[var(--fe-text-secondary)]">{view.description}</p>
              <ul className="mt-5 list-inside list-disc space-y-2 text-sm text-[var(--fe-text-secondary)]">{view.details.map(detail => <li key={detail}>{detail}</li>)}</ul>
              {view.screen === 'vehicles' && <p className="mt-4 text-sm leading-6 text-[var(--fe-text-secondary)]">Conserva expedientes de clientes y socios y el historial de asignación de cada vehículo.</p>}
            </div>
            <LandingProductImage screen={view.screen} alt={view.alt} priority={index === 0} sizes="(min-width: 1280px) 780px, (min-width: 1024px) 65vw, calc(100vw - 40px)" />
          </section>
        ))}
        <section id="rentabilidad" aria-labelledby="rentabilidad-title" className="grid scroll-mt-[var(--header-h)] gap-6 border-t border-[var(--fe-border)] py-10 lg:grid-cols-[0.65fr_1.35fr] lg:items-center lg:gap-10">
          <div><h2 id="rentabilidad-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">El resultado por vehículo.</h2><p className="mt-4 text-base leading-7 text-[var(--fe-text-secondary)]">Compara ingresos, gastos, utilidad y margen por unidad. Consulta reportes y exporta la información para revisar tu operación.</p></div>
          <LandingProductImage screen="profitability" alt="Rentabilidad por vehículo con ingresos, gastos y margen de unidades QA." sizes="(min-width: 1280px) 780px, (min-width: 1024px) 65vw, calc(100vw - 40px)" />
        </section>
        <div className="mt-5 flex flex-wrap gap-x-8"><Link href="/#pricing" className="fe-marketing-link">Comparar planes</Link><Link href="/registro" className="fe-marketing-link">Crear cuenta gratis</Link></div>
      </div>
    </PublicMarketingLayout>
  );
}
