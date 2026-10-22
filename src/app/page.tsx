import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  CircleDollarSign,
  Wrench,
} from "lucide-react";
import { LandingAuthRedirect } from "@/components/landing/landing-auth-redirect";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingStickyCta } from "@/components/landing/landing-sticky-cta";
import { LandingSocialProof } from "@/components/landing/landing-social-proof";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { HeroDashboard } from "@/components/landing/hero-dashboard";
import { LandingJsonLd } from "@/components/landing/landing-json-ld";
import { WhatsAppWidget } from "@/components/landing/whatsapp-widget";
import { BrandLogo } from "@/components/brand/brand-logo";

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

const WHATSAPP_NUMBER =
  typeof process.env.NEXT_PUBLIC_WHATSAPP_NUMBER === "string"
    ? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER.replace(/\D/g, "")
    : "";
const salesHref = WHATSAPP_NUMBER
  ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      "Hola, quiero hablar con ventas sobre FleetEase para mi flotilla."
    )}`
  : "#pricing";

export default function LandingPage() {
  return (
    <LandingAuthRedirect>
      <LandingJsonLd />
      <div className="fe-landing min-h-screen overflow-x-clip bg-[var(--fe-ink)] text-white selection:bg-[var(--fe-lime)] selection:text-[var(--fe-ink)]">
        <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />
        {/* Glow del hero: gradiente radial sin filtro blur (mejor LCP / paint en mobile) */}
        <div
          className="pointer-events-none absolute left-1/2 top-[-260px] h-[620px] w-[620px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(var(--fe-lime-rgb), 0.10), transparent 65%)",
          }}
        />

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

              {/* Prueba concreta cerca del CTA principal */}
              <blockquote className="mt-6 max-w-[520px] rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3.5">
                <p className="text-[13px] leading-5 text-white/70">
                  Ejemplo de uso: una flotilla de 20 unidades centralizó costos y detectó gastos
                  de mantenimiento y multas que no estaban en el presupuesto — antes de que
                  se convirtieran en paros.
                </p>
                <footer className="mt-2 text-[11px] text-white/50">
                  Caso de uso ilustrativo · Datos de ejemplo de la interfaz
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
                <a
                  href={salesHref}
                  target={WHATSAPP_NUMBER ? "_blank" : undefined}
                  rel={WHATSAPP_NUMBER ? "noopener noreferrer" : undefined}
                  className={`flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-7 py-4 text-[14px] font-semibold text-white/80 transition hover:border-white/25 hover:text-white ${focusRing}`}
                >
                  Hablar con ventas
                </a>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-white/55">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[var(--fe-lime)]" /> Gratis para siempre
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[var(--fe-lime)]" /> Sin tarjeta
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[var(--fe-lime)]" /> Hasta 3 vehículos
                </span>
              </div>
            </div>

            <HeroDashboard />
          </section>

          <LandingSocialProof />

          <section
            id="producto"
            aria-labelledby="producto-title"
            className="mx-auto max-w-[1240px] scroll-mt-[var(--header-h)] px-5 py-16 lg:px-8 lg:py-24"
          >
            <div className="max-w-xl">
              <h2
                id="producto-title"
                className="text-3xl font-semibold tracking-[-0.04em] sm:text-5xl"
              >
                Menos hojas de cálculo. Más control.
              </h2>
              <p className="mt-5 text-[16px] leading-7 text-white/55">
                FleetEase reúne la información operativa de tu flotilla en un solo sistema.
              </p>
              <Link
                href="/registro"
                className={`mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--fe-lime)] ${focusRing}`}
              >
                Conocer FleetEase <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {features.map((feature) => (
                <article
                  key={feature.number}
                  className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-6"
                >
                  <feature.icon className="h-5 w-5 text-white/55" />
                  <h3 className="mt-6 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/55">{feature.description}</p>
                </article>
              ))}
            </div>
          </section>

          <LandingHowItWorks />

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
                <a
                  href={salesHref}
                  target={WHATSAPP_NUMBER ? "_blank" : undefined}
                  rel={WHATSAPP_NUMBER ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--fe-ink)]/20 bg-transparent px-6 py-4 text-sm font-semibold text-[var(--fe-ink)] transition hover:bg-[var(--fe-ink)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--fe-ink)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fe-lime)]"
                >
                  Hablar con ventas
                </a>
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
              <span className="text-xs text-white/45">
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
