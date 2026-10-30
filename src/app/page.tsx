import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  CircleDollarSign,
  MapPin,
  Wrench,
} from "lucide-react";
import { LandingAuthRedirect } from "@/components/landing/landing-auth-redirect";
import { LandingMotionBand } from "@/components/landing/landing-motion-band";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingStickyCta } from "@/components/landing/landing-sticky-cta";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingProductShowcase } from "@/components/landing/landing-product-showcase";
import { HeroDashboard } from "@/components/landing/hero-dashboard";
import { LandingJsonLd } from "@/components/landing/landing-json-ld";
import { WhatsAppWidget } from "@/components/landing/whatsapp-widget";
import { BrandLogo } from "@/components/brand/brand-logo";

const homeUrl = "https://www.fleetease.com.mx/";

export const metadata: Metadata = {
  title: {
    absolute: "FleetEase | Software de Gestión de Flotillas en México",
  },
  description:
    "Software de gestión de flotillas y renta de vehículos en México. Controla rentabilidad, mantenimiento y operación. Plan Free permanente sin tarjeta.",
  alternates: { canonical: homeUrl },
  openGraph: {
    title: "FleetEase | Software de Gestión de Flotillas en México",
    description:
      "Controla rentabilidad, mantenimiento y operación de tu flotilla. Plan Free permanente sin tarjeta.",
    url: homeUrl,
    siteName: "FleetEase",
    locale: "es_MX",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "FleetEase" }],
  },
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-lime)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fe-ink)]";

const features = [
  {
    number: "01",
    title: "Rentabilidad por vehículo",
    description:
      "Deja de administrar la flotilla a ciegas. Visualiza ingresos, costos y margen de cada unidad en un solo lugar.",
    icon: CircleDollarSign,
  },
  {
    number: "02",
    title: "Mantenimiento antes del problema",
    description:
      "Controla kilometraje, servicios y vencimientos para reducir paros inesperados y gastos que no estaban en el plan.",
    icon: Wrench,
  },
  {
    number: "03",
    title: "Operación bajo control",
    description:
      "Clientes, vehículos, asignaciones, créditos y movimientos conectados en una operación clara y trazable.",
    icon: Activity,
  },
  {
    number: "04",
    title: "Decisiones con datos",
    description:
      "Convierte la información operativa en indicadores que te dicen dónde estás ganando dinero y dónde lo estás perdiendo.",
    icon: BarChart3,
  },
];

export default function LandingPage() {
  return (
    <LandingAuthRedirect>
      <LandingJsonLd />
      <div className="fe-landing min-h-screen overflow-x-clip bg-[var(--fe-ink)] text-white selection:bg-[var(--fe-lime)] selection:text-[var(--fe-ink)]">

        <LandingHeader />
        <a
          href="#contenido"
          className={`sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--fe-ink)] focus:shadow-lg ${focusRing}`}
        >
          Saltar al contenido principal
        </a>

        <main
          id="contenido"
          className="relative z-10 pt-[var(--header-h)] pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0"
        >
          <section className="mx-auto grid min-h-[560px] max-w-[1240px] items-center gap-10 px-5 py-12 sm:min-h-[640px] sm:gap-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-8 lg:py-20">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--fe-lime)] shadow-[0_0_12px_var(--fe-lime)]" />{" "}
                Gestión de flotillas sin ruido
              </div>
              <h1 className="max-w-[680px] text-[40px] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-[64px] sm:tracking-[-0.055em] lg:text-[78px]">
                Tu flotilla.
                <br />
                <span className="text-[var(--fe-lime)]">Tus números.</span>
                <br />
                Bajo control.
              </h1>
              <p className="mt-5 max-w-[570px] text-[16px] leading-7 text-white/60 sm:mt-6 sm:text-[19px] sm:leading-8">
                FleetEase es el software de gestión de flotillas y renta de vehículos que convierte
                la operación diaria en una vista clara de rentabilidad, mantenimiento y desempeño.
              </p>

              <blockquote className="mt-6 max-w-[520px] rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5">
                <p className="text-[13px] leading-5 text-white/70">
                  Ejemplo de uso: centralizar costos y detectar gastos de mantenimiento y multas antes de que provoquen paros operativos.
                </p>
                <footer className="mt-2 text-[11px] text-white/50">
                  Ejemplo ilustrativo de una posible mejora operativa
                </footer>
              </blockquote>

              <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
                <Link
                  href="/registro"
                  className={`group flex items-center justify-center gap-3 rounded-full bg-[var(--fe-lime)] px-7 py-4 text-[14px] font-bold text-[var(--fe-ink)] transition hover:bg-white ${focusRing}`}
                >
                  Comenzar gratis{" "}
                  <ArrowRight className="h-4 w-4 transition motion-safe:group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/contacto-ventas"
                  className={`flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-7 py-4 text-[14px] font-semibold text-white/80 transition hover:border-white/25 hover:text-white ${focusRing}`}
                >
                  Hablar con ventas
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-white/55">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[var(--fe-lime)]" /> Gratis para siempre
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[var(--fe-lime)]" /> Sin tarjeta
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[var(--fe-lime)]" /> 1 vehículo
                </span>
              </div>
            </div>

            <HeroDashboard />
          </section>

          <LandingMotionBand />

          <LandingProductShowcase />

          <LandingHowItWorks />

          <section
            id="nuestra-vision"
            aria-labelledby="nuestra-vision-title"
            className="mx-auto max-w-[1240px] scroll-mt-[var(--header-h)] px-5 py-12 lg:px-8 lg:py-16"
          >
            <div className="grid gap-5 rounded-[28px] border border-white/[0.09] bg-white/[0.025] p-6 sm:p-9 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12 lg:p-12">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fe-lime)]">Por qué existe FleetEase</p>
                <h2 id="nuestra-vision-title" className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  La rentabilidad de una flotilla no debería ser una incógnita.
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                  La experiencia directa administrando vehículos de renta nos mostró un problema cotidiano: ingresos, gastos, mantenimiento y compromisos terminan repartidos entre hojas de cálculo, mensajes y recordatorios. Creamos FleetEase para reunir esa operación y ayudar a entender qué sucede con cada unidad.
                </p>
              </div>
              <article className="rounded-2xl border border-[var(--fe-lime)]/20 bg-[var(--fe-lime)]/[0.045] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--fe-lime)]">Nuestra visión</p>
                <p className="mt-3 text-lg font-semibold leading-7 text-white">
                  Que propietarios y empresas puedan crecer con control y tomar decisiones a partir de datos claros.
                </p>
                <p className="mt-3 text-sm leading-6 text-white/55">
                  Menos información dispersa; más claridad sobre rentabilidad, mantenimiento y prioridades operativas.
                </p>
              </article>
            </div>
          </section>

          <section
            id="administracion-monterrey"
            aria-labelledby="administracion-monterrey-title"
            className="mx-auto max-w-[1240px] scroll-mt-[var(--header-h)] px-5 py-16 lg:px-8 lg:py-24"
          >
            <div className="overflow-hidden rounded-[28px] border border-white/[0.1] bg-white/[0.035]">
              <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12 lg:p-12">
                <div>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--fe-lime)]/25 bg-[var(--fe-lime)]/[0.08] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--fe-lime)]">
                    <MapPin className="h-3.5 w-3.5" />
                    Servicio presencial en Monterrey
                  </div>
                  <h2
                    id="administracion-monterrey-title"
                    className="max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl"
                  >
                    ¿Tienes vehículos de renta, pero no tiempo para administrarlos?
                  </h2>
                  <p className="mt-5 max-w-2xl text-base leading-7 text-white/65">
                    En FleetEase contamos con más de 8 años de experiencia administrando vehículos de renta para conductores de plataformas digitales. Te ayudamos a dar seguimiento a la operación, las finanzas y el mantenimiento de tus unidades.
                  </p>
                  <p className="mt-4 text-sm font-semibold text-white/85">
                    Disponible exclusivamente en Monterrey, Nuevo León.
                  </p>
                  <Link
                    href="/contacto-ventas?tipo=administracion"
                    className={`mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--fe-lime)] px-6 py-4 text-sm font-bold text-[var(--fe-ink)] transition hover:bg-white ${focusRing}`}
                  >
                    Solicitar información sobre administración
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  <article className="rounded-2xl border border-white/[0.08] bg-black/20 p-5">
                    <Activity className="h-5 w-5 text-[var(--fe-lime)]" />
                    <h3 className="mt-4 text-base font-semibold">Seguimiento operativo</h3>
                    <p className="mt-2 text-sm leading-6 text-white/55">
                      Visibilidad sobre la operación de tus vehículos de renta.
                    </p>
                  </article>
                  <article className="rounded-2xl border border-white/[0.08] bg-black/20 p-5">
                    <CircleDollarSign className="h-5 w-5 text-[var(--fe-lime)]" />
                    <h3 className="mt-4 text-base font-semibold">Control financiero</h3>
                    <p className="mt-2 text-sm leading-6 text-white/55">
                      Seguimiento de ingresos, gastos y rentabilidad por unidad.
                    </p>
                  </article>
                  <article className="rounded-2xl border border-white/[0.08] bg-black/20 p-5">
                    <Wrench className="h-5 w-5 text-[var(--fe-lime)]" />
                    <h3 className="mt-4 text-base font-semibold">Mantenimiento</h3>
                    <p className="mt-2 text-sm leading-6 text-white/55">
                      Control de servicios y gastos de mantenimiento de la flotilla.
                    </p>
                  </article>
                </div>
              </div>
            </div>
          </section>

          <LandingPricing />

          <LandingFaq />

          <section
            id="cta-final"
            className="mx-auto max-w-[1240px] scroll-mt-[var(--header-h)] px-5 py-10 sm:py-14 lg:px-8 lg:py-20"
          >
            <div className="relative overflow-hidden rounded-[28px] border border-[var(--fe-lime)]/25 bg-[var(--fe-lime)] px-6 py-10 sm:px-10 sm:py-12">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--fe-ink)] sm:text-4xl">
                Empieza a controlar tu flotilla hoy.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--fe-ink)]/70">
                Plan Free permanente. Sin tarjeta. Configura tu operación en minutos.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/registro"
                  className={`inline-flex items-center justify-center gap-2 rounded-full bg-[var(--fe-ink)] px-6 py-4 text-sm font-bold text-white transition hover:bg-white hover:text-[var(--fe-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fe-lime)]`}
                >
                  Comenzar gratis <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contacto-ventas"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--fe-ink)]/20 bg-transparent px-6 py-4 text-sm font-semibold text-[var(--fe-ink)] transition hover:bg-[var(--fe-ink)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fe-lime)]"
                >
                  Hablar con ventas
                </Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/[0.07] px-5 py-10 lg:px-8">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <BrandLogo size={40} />
              <nav
                className="grid grid-cols-2 gap-x-10 gap-y-3 text-xs text-white/55 sm:grid-cols-3"
                aria-label="Enlaces del pie"
              >
                <Link href="/software-para-flotillas" className={`hover:text-white ${focusRing}`}>
                  Software para flotillas
                </Link>
                <Link
                  href="/software-para-renta-de-vehiculos"
                  className={`hover:text-white ${focusRing}`}
                >
                  Renta de vehículos
                </Link>
                <Link
                  href="/control-de-mantenimiento-de-flotillas"
                  className={`hover:text-white ${focusRing}`}
                >
                  Control de mantenimiento
                </Link>
                <Link href="/soluciones" className={`hover:text-white ${focusRing}`}>
                  Soluciones
                </Link>
                <Link href="/funciones" className={`hover:text-white ${focusRing}`}>
                  Funciones
                </Link>
                <Link href="/privacidad" className={`hover:text-white ${focusRing}`}>
                  Privacidad
                </Link>
                <Link href="/cookies" className={`hover:text-white ${focusRing}`}>
                  Cookies
                </Link>
                <Link href="/terminos" className={`hover:text-white ${focusRing}`}>
                  Términos
                </Link>
                <Link href="/cancelaciones" className={`hover:text-white ${focusRing}`}>
                  Cancelaciones
                </Link>
              </nav>
            </div>
            <div className="border-t border-white/[0.07] pt-6">
              <span className="text-xs text-white/70">
                © 2026 FleetEase · Software de gestión de flotillas
              </span>
            </div>
          </div>
        </footer>

        <LandingStickyCta />
        <WhatsAppWidget />
      </div>
    </LandingAuthRedirect>
  );
}