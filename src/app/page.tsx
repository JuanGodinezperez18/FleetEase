import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  CircleDollarSign,
  Gauge,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
} from "lucide-react";
import { plans } from "@/config/plans";
import { LandingAuthRedirect } from "@/components/landing/landing-auth-redirect";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingStickyCta } from "@/components/landing/landing-sticky-cta";
import { LandingSocialProof } from "@/components/landing/landing-social-proof";
import { WhatsAppWidget } from "@/components/landing/whatsapp-widget";
import { LandingScrollEffects } from "@/components/landing/landing-scroll-effects";
import { Reveal } from "@/components/landing/landing-reveal";

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
      <div className="min-h-screen overflow-x-hidden text-white selection:bg-[var(--fe-lime)] selection:text-[var(--fe-ink)]">
        <LandingScrollEffects />
        <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="pointer-events-none absolute left-1/2 top-[-260px] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-[var(--fe-lime)]/[0.08] blur-[130px]" />

        <LandingHeader />
        <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--fe-ink)] focus:shadow-lg">
          Saltar al contenido principal
        </a>

        <main id="contenido" className="relative z-10 pt-[64px] sm:pt-[72px]">
          <section data-scroll-scene="hero" className="mx-auto grid min-h-[560px] max-w-[1240px] items-center gap-10 px-5 py-12 sm:min-h-[640px] sm:gap-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-8 lg:py-20">
            <Reveal className="relative z-10">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--fe-lime)] shadow-[0_0_12px_var(--fe-lime)]" /> Gestión de flotillas sin ruido
              </div>
              <h1 className="max-w-[680px] text-[40px] sm:text-[64px] font-semibold leading-[0.98] tracking-[-0.055em] lg:text-[78px]">
                Tu flotilla.
                <br />
                <span className="text-[var(--fe-lime)]">Tus números.</span>
                <br />
                Bajo control.
              </h1>
              <p className="mt-5 max-w-[570px] text-[16px] leading-7 sm:mt-6 sm:text-[19px] sm:leading-8 text-white/60">
                FleetEase es el software de gestión de flotillas y renta de vehículos que convierte la operación diaria en una vista clara de rentabilidad, mantenimiento y desempeño.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
                <Link
                  href="/registro"
                  className="group flex items-center justify-center gap-3 rounded-full bg-[var(--fe-lime)] px-7 py-4 text-[14px] font-bold text-[var(--fe-ink)] transition hover:bg-white"
                >
                  Comenzar gratis <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
                <Link
                  href="#producto"
                  className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-7 py-4 text-[14px] font-semibold text-white/80 transition hover:border-white/25 hover:text-white"
                >
                  Ver cómo funciona
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[12px] text-white/50">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[var(--fe-lime)]" /> 14 días gratis
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[var(--fe-lime)]" /> Sin tarjeta
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[var(--fe-lime)]" /> Hasta 2 vehículos
                </span>
              </div>
            </div>
            </Reveal>

            <Reveal className="relative" delay={0.12}>
            <div className="relative">
              <div className="absolute -inset-10 rounded-[40px] bg-[var(--fe-lime)]/[0.07] blur-3xl" />
              <div className="relative overflow-hidden rounded-[22px] sm:rounded-[26px] border border-white/[0.12] bg-[var(--fe-dark-surface)]/90 shadow-[0_40px_100px_rgba(0,0,0,.55)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-[var(--fe-lime)] p-1.5">
                      <Gauge className="h-full w-full text-[var(--fe-ink)]" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold">Resumen de flotilla</span>
                      <span className="mt-0.5 block text-[9px] text-white/35">Datos ilustrativos de la interfaz</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-white/55">
                    VISTA DE EJEMPLO
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                  {[
                    ["24", "Vehículos"],
                    ["$96.4K", "Ingresos"],
                    ["$31.8K", "Costos"],
                    ["67%", "Margen"],
                  ].map(([value, label], i) => (
                    <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
                      <div className="mb-2 text-[10px] text-white/45">{label}</div>
                      <div className={`text-xl font-semibold tracking-tight tabular-nums ${i === 3 ? "text-[var(--fe-lime)]" : "text-white"}`}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 px-3 pb-3 sm:px-4 sm:pb-4 lg:grid-cols-[1.25fr_.75fr]">
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold">Rentabilidad mensual</div>
                        <div className="mt-1 text-[10px] text-white/40">Ingresos vs. costos</div>
                      </div>
                      <BarChart3 className="h-4 w-4 text-white/30" />
                    </div>
                    <div className="flex h-36 items-end gap-2">
                      {[38, 48, 43, 62, 57, 75, 68, 88, 79, 94, 83, 100].map((h, i) => (
                        <div
                          key={i}
                          style={{ height: `${h}%` }}
                          className={`flex-1 rounded-t-md ${i === 11 ? "bg-[var(--fe-lime)]" : "bg-white/[0.10]"}`}
                        />
                      ))}
                    </div>
                    <div className="mt-3 flex justify-between text-[9px] text-white/35">
                      <span>ENE</span>
                      <span>MAR</span>
                      <span>JUN</span>
                      <span>AGO</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs font-semibold">Estado de flota</span>
                        <Activity className="h-4 w-4 text-[var(--fe-lime)]" />
                      </div>
                      <div className="mb-3 text-3xl font-semibold tabular-nums">
                        22<span className="text-sm text-white/40"> / 24 activas</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-[92%] rounded-full bg-[var(--fe-lime)]" />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--fe-lime)]/20 bg-[var(--fe-lime)]/[0.055] p-5">
                      <div className="flex items-start gap-3">
                        <Wrench className="mt-0.5 h-4 w-4 text-[var(--fe-lime)]" />
                        <div>
                          <div className="text-xs font-semibold">3 mantenimientos</div>
                          <div className="mt-1 text-[10px] leading-4 text-white/45">requieren atención esta semana</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </Reveal>
          </section>

          <LandingSocialProof />

          <section data-scroll-scene="product" id="producto" aria-labelledby="producto-title" className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8 lg:py-24">
            <Reveal className="max-w-xl">
              <h2 id="producto-title" className="text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Menos hojas de cálculo. Más control.
              </h2>
              <p className="mt-5 text-[16px] leading-7 text-white/55">
                FleetEase reúne la información operativa de tu flotilla en un solo sistema.
              </p>
              <Link href="/registro" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[var(--fe-lime)]">
                Conocer FleetEase <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {features.map((feature, index) => (
                <Reveal key={feature.number} delay={index * 0.08} className="h-full">
                <article className="h-full rounded-[22px] border border-white/[0.08] bg-white/[0.045] p-6 backdrop-blur-sm">
                  <feature.icon className="h-5 w-5 text-white/50" />
                  <h3 className="mt-6 text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/50">{feature.description}</p>
                </article>
                </Reveal>
              ))}
            </div>
          </section>

          <LandingFaq />

          <section data-scroll-scene="closing" className="mx-auto max-w-[1240px] px-5 py-10 sm:py-14 lg:px-8 lg:py-20">
            <div className="relative overflow-hidden rounded-[28px] border border-[var(--fe-lime)]/25 bg-[var(--fe-lime)] px-6 py-10 sm:px-10 sm:py-12">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--fe-ink)] sm:text-4xl">
                Empieza a controlar tu flotilla hoy.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--fe-ink)]/70">
                14 días de prueba gratis. Sin tarjeta. Configura tu operación en minutos.
              </p>
              <Link
                href="/registro"
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[var(--fe-ink)] px-6 py-4 text-sm font-bold text-white transition hover:bg-white hover:text-[var(--fe-ink)]"
              >
                Comenzar prueba gratis <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/[0.07] px-5 py-10 lg:px-8">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white">
                  <Image src="/logo.png" alt="FleetEase" width={24} height={24} className="h-6 w-6 object-contain" />
                </div>
                <span className="text-sm font-semibold">FleetEase</span>
              </Link>
              <nav className="grid grid-cols-2 gap-x-10 gap-y-3 text-xs text-white/45 sm:grid-cols-3" aria-label="Enlaces del pie">
                <Link href="/software-para-flotillas" className="hover:text-white">Software para flotillas</Link>
                <Link href="/software-para-renta-de-vehiculos" className="hover:text-white">Renta de vehículos</Link>
                <Link href="/control-de-mantenimiento-de-flotillas" className="hover:text-white">Control de mantenimiento</Link>
                <Link href="/soluciones" className="hover:text-white">Soluciones</Link>
                <Link href="/funciones" className="hover:text-white">Funciones</Link>
                <Link href="/privacidad" className="hover:text-white">Privacidad</Link>
                <Link href="/cookies" className="hover:text-white">Cookies</Link>
                <Link href="/terminos" className="hover:text-white">Términos</Link>
                <Link href="/cancelaciones" className="hover:text-white">Cancelaciones</Link>
              </nav>
            </div>
            <div className="border-t border-white/[0.07] pt-6">
              <span className="text-xs text-white/30">© 2026 FleetEase · Software de gestión de flotillas</span>
            </div>
          </div>
        </footer>

        <LandingStickyCta />
        <WhatsAppWidget />
      </div>
    </LandingAuthRedirect>
  );
}
