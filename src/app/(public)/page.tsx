import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingAuthRedirect } from '@/components/landing/landing-auth-redirect';
import { LandingHeader } from '@/components/landing/landing-header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingFaq } from '@/components/landing/landing-faq';
import { LandingPricing } from '@/components/landing/landing-pricing';
import { LandingStickyCta } from '@/components/landing/landing-sticky-cta';
import { LandingProductShowcase } from '@/components/landing/landing-product-showcase';
import { HeroDashboard } from '@/components/landing/hero-dashboard';
import { LandingJsonLd } from '@/components/landing/landing-json-ld';
import { WhatsAppWidget } from '@/components/landing/whatsapp-widget';

const homeUrl = 'https://www.fleetease.com.mx/';
export const metadata: Metadata = {
  title: { absolute: 'FleetEase | Software de Gestión de Flotillas en México' },
  description: 'Software de gestión de flotillas y renta de vehículos en México. Controla rentabilidad, mantenimiento y operación. Plan Free permanente sin tarjeta.',
  alternates: { canonical: homeUrl },
  openGraph: {
    title: 'FleetEase | Software de Gestión de Flotillas en México',
    description: 'Controla rentabilidad, mantenimiento y operación de tu flotilla. Plan Free permanente sin tarjeta.',
    url: homeUrl, siteName: 'FleetEase', locale: 'es_MX', type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'FleetEase' }],
  },
};

const primary = 'inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--fe-lime)] px-6 py-3 text-sm font-bold text-[var(--fe-ink)] transition-colors [transition-duration:var(--fe-motion-fast)] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--fe-lime)]';

export default function LandingPage() {
  return (
    <LandingAuthRedirect>
      <LandingJsonLd />
      <div className="fe-landing min-h-screen bg-[var(--fe-ink)] text-[var(--fe-text)] selection:bg-[var(--fe-lime)] selection:text-[var(--fe-ink)]">
        <LandingHeader />
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-[var(--fe-ink)] focus:p-3 focus:text-[var(--fe-lime)]">Saltar al contenido principal</a>
        <main id="contenido" className="pt-[var(--header-h)]">
          <section className="mx-auto grid max-w-[1240px] items-center gap-8 px-5 py-10 sm:py-12 lg:min-h-[600px] lg:grid-cols-[0.85fr_1.15fr] lg:gap-12 lg:px-8 lg:py-16">
            <div>
              <h1 className="max-w-xl text-[42px] font-semibold leading-[1.03] tracking-[-0.045em] sm:text-6xl lg:text-[68px]">Tu flotilla.<br /><span className="text-[var(--fe-lime)]">Bajo control.</span></h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-[var(--fe-text-secondary)] sm:text-lg">Controla rentas, gastos y mantenimiento. Conoce el resultado de cada vehículo desde un solo lugar.</p>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link href="/registro" className={primary}>Crear cuenta gratis</Link>
                <Link href="/contacto-ventas" className="fe-marketing-link text-sm">Hablar con ventas</Link>
              </div>
              <p className="mt-4 text-sm text-[var(--fe-text-secondary)]">Plan Free permanente · 1 vehículo · Sin tarjeta</p>
            </div>
            <HeroDashboard />
          </section>
          <LandingProductShowcase />
          <LandingPricing />
          <LandingFaq />
          <section id="administracion-monterrey" aria-labelledby="administracion-title" className="mx-auto max-w-[1240px] scroll-mt-[var(--header-h)] px-5 py-10 lg:px-8 lg:py-12">
            <div className="grid items-center gap-5 border-l-2 border-[var(--fe-lime)] pl-5 sm:grid-cols-[1fr_auto]">
              <div>
                <h2 id="administracion-title" className="text-2xl font-semibold tracking-tight">¿Prefieres que administremos tus vehículos?</h2>
                <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--fe-text-secondary)]">Servicio de administración de vehículos de renta, disponible exclusivamente en Monterrey, Nuevo León.</p>
              </div>
              <Link href="/administracion-de-vehiculos-monterrey" className="fe-marketing-link text-sm">Ver el servicio en Monterrey</Link>
            </div>
          </section>
          <section id="cta-final" className="mx-auto max-w-[1240px] scroll-mt-[var(--header-h)] px-5 pb-10 lg:px-8 lg:pb-12">
            <div className="flex flex-wrap items-center justify-between gap-6 rounded-[var(--fe-radius-lg)] bg-[var(--fe-surface)] p-6 sm:p-8">
              <div><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Empieza con tu primer vehículo.</h2><p className="mt-2 text-base text-[var(--fe-text-secondary)]">Crea tu cuenta Free y registra tu operación.</p></div>
              <Link href="/registro" className={primary}>Crear cuenta gratis</Link>
            </div>
          </section>
        </main>
        <LandingFooter />
        <div className="h-20 md:hidden" aria-hidden="true" />
        <LandingStickyCta />
        <WhatsAppWidget />
      </div>
    </LandingAuthRedirect>
  );
}
