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
      <div className="min-h-screen overflow-x-hidden bg-[#080a0f] text-white selection:bg-[#d7ff3f] selection:text-[#080a0f]">
        <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />
        <div className="pointer-events-none absolute left-1/2 top-[-260px] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-[#d7ff3f]/[0.08] blur-[130px]" />

        <LandingHeader />
        <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#080a0f] focus:shadow-lg">
          Saltar al contenido principal
        </a>

        <main id="contenido" className="relative z-10 pt-[64px] sm:pt-[72px]">
          {/* HERO — fully server-rendered for SEO */}
          <section className="mx-auto grid min-h-[560px] max-w-[1240px] items-center gap-10 px-5 py-12 sm:min-h-[640px] sm:gap-12 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-8 lg:py-20">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" /> Gestión de flotillas sin ruido
              </div>
              <h1 className="max-w-[680px] text-[40px] sm:text-[64px] font-semibold leading-[0.98] tracking-[-0.055em] lg:text-[78px]">
                Tu flotilla.
                <br />
                <span className="text-[#d7ff3f]">Tus números.</span>
                <br />
                Bajo control.
              </h1>
              <p className="mt-5 max-w-[570px] text-[16px] leading-7 sm:mt-6 sm:text-[19px] sm:leading-8 text-white/60 sm:text-[19px]">
                FleetEase es el software de gestión de flotillas y renta de vehículos que convierte la operación diaria en una vista clara de rentabilidad, mantenimiento y desempeño.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
                <Link
                  href="/registro"
                  className="group flex items-center justify-center gap-3 rounded-full bg-[#d7ff3f] px-7 py-4 text-[14px] font-bold text-[#080a0f] transition hover:bg-white"
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
                  <Check className="h-3.5 w-3.5 text-[#d7ff3f]" /> 14 días gratis
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#d7ff3f]" /> Sin tarjeta
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#d7ff3f]" /> Hasta 2 vehículos
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-10 rounded-[40px] bg-[#d7ff3f]/[0.07] blur-3xl" />
              <div className="relative overflow-hidden rounded-[22px] sm:rounded-[26px] border border-white/[0.12] bg-[#0e1117]/90 shadow-[0_40px_100px_rgba(0,0,0,.55)] backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg bg-[#d7ff3f] p-1.5">
                      <Gauge className="h-full w-full text-[#080a0f]" />
                    </div>
                    <span className="text-xs font-semibold">Resumen de flotilla</span>
                  </div>
                  <span className="rounded-full bg-[#d7ff3f]/10 px-2.5 py-1 text-[10px] font-semibold text-[#d7ff3f]">
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#d7ff3f]" />
                    EN VIVO
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
                      <div className={`text-xl font-semibold tracking-tight tabular-nums ${i === 3 ? "text-[#d7ff3f]" : "text-white"}`}>
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
                          className={`flex-1 rounded-t-md ${i === 11 ? "bg-[#d7ff3f]" : "bg-white/[0.10]"}`}
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
                        <Activity className="h-4 w-4 text-[#d7ff3f]" />
                      </div>
                      <div className="mb-3 text-3xl font-semibold tabular-nums">
                        22<span className="text-sm text-white/40"> / 24 activas</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-[92%] rounded-full bg-[#d7ff3f]" />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#d7ff3f]/20 bg-[#d7ff3f]/[0.055] p-5">
                      <div className="flex items-start gap-3">
                        <Wrench className="mt-0.5 h-4 w-4 text-[#d7ff3f]" />
                        <div>
                          <div className="text-xs font-semibold">3 mantenimientos</div>
                          <div className="mt-1 text-[10px] leading-4 text-white/45">requieren atención esta semana</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-4 hidden rounded-2xl border border-white/10 bg-[#12161d]/95 px-4 py-3 shadow-2xl backdrop-blur sm:block">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-[#d7ff3f]" />
                  <div>
                    <div className="text-[10px] font-semibold">Operación centralizada</div>
                    <div className="mt-0.5 text-[9px] text-white/40">Una sola fuente de información</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Trust strip */}
          <section className="border-y border-white/[0.07] bg-white/[0.018]">
            <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-4 px-5 py-6 text-center sm:flex-row sm:justify-between sm:text-left lg:px-8">
              <p className="text-[12px] font-medium text-white/45">
                Hecho para operadores de renta en México · Datos en la nube · Sin instalar servidores
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-white/40">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#d7ff3f]" /> Prueba 14 días
                </span>
                <span className="flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-[#d7ff3f]" /> Flotillas pequeñas y en crecimiento
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#d7ff3f]" /> Sin tarjeta al empezar
                </span>
              </div>
            </div>
          </section>

          <section className="border-b border-white/[0.07]">
            <div className="mx-auto grid max-w-[1240px] grid-cols-2 divide-x divide-white/[0.07] px-5 sm:grid-cols-4 lg:px-8">
              {[
                ["01", "Operación", "Todo conectado"],
                ["02", "Rentabilidad", "Por vehículo"],
                ["03", "Mantenimiento", "Antes del paro"],
                ["04", "Información", "En un solo lugar"],
              ].map(([n, t, d]) => (
                <div key={n} className="px-4 py-6 first:pl-0 last:pr-0 sm:px-7 sm:py-7">
                  <div className="text-[10px] font-mono text-[#d7ff3f]/70">{n}</div>
                  <div className="mt-2 text-sm font-semibold">{t}</div>
                  <div className="mt-1 text-[10px] text-white/40">{d}</div>
                </div>
              ))}
            </div>
          </section>

          <LandingSocialProof />

          {/* PRODUCTO */}
          <section id="producto" className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d7ff3f]">
                  El sistema operativo de tu flotilla
                </div>
                <h2 className="max-w-xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                  Menos hojas de cálculo.
                  <br />
                  <span className="text-white/50">Más control.</span>
                </h2>
                <p className="mt-5 max-w-md text-[16px] leading-7 text-white/55">
                  FleetEase reúne la información que normalmente está repartida entre hojas, mensajes, notas y sistemas diferentes. Software de control de flotillas pensado para operadores de renta de vehículos.
                </p>
                <div className="mt-5 flex flex-wrap gap-4 text-sm">
                  <Link href="/software-para-flotillas" className="text-[#d7ff3f] transition hover:text-white">
                    Software para flotillas
                  </Link>
                  <Link href="/software-para-renta-de-vehiculos" className="text-[#d7ff3f] transition hover:text-white">
                    Renta de vehículos
                  </Link>
                  <Link href="/control-de-mantenimiento-de-flotillas" className="text-[#d7ff3f] transition hover:text-white">
                    Control de mantenimiento
                  </Link>
                </div>
                <Link
                  href="/registro"
                  className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#d7ff3f] transition hover:text-white"
                >
                  Conocer FleetEase <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {features.map((feature, i) => (
                  <article
                    key={feature.number}
                    className={`group min-h-[240px] rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm transition hover:border-[#d7ff3f]/30 hover:bg-white/[0.05] hover:shadow-[0_20px_50px_rgba(0,0,0,.25)] sm:min-h-[260px] ${i === 0 ? "sm:col-span-2" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-white/30">{feature.number}</span>
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-white/50 transition group-hover:border-[#d7ff3f]/35 group-hover:bg-[#d7ff3f]/[0.08] group-hover:text-[#d7ff3f]">
                        <feature.icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                    </div>
                    <h3 className="mt-10 max-w-sm text-xl font-semibold tracking-[-0.035em] sm:text-2xl">{feature.title}</h3>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-white/50">{feature.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* CÓMO FUNCIONA */}
          <section id="como-funciona" className="border-y border-white/[0.07] bg-[#0c0f14]">
            <div className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8 lg:py-24">
              <div className="max-w-2xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d7ff3f]">Cómo funciona</div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                  De la operación diaria
                  <br />a una decisión clara.
                </h2>
              </div>
              <div className="mt-12 grid gap-0 border-l border-white/[0.1] md:grid-cols-3 md:border-l-0">
                {[
                  ["01", "Conecta", "Registra tus vehículos, clientes, asignaciones y movimientos."],
                  ["02", "Controla", "Da seguimiento a ingresos, costos, kilometraje y mantenimiento."],
                  ["03", "Decide", "Identifica qué unidades producen y dónde necesitas actuar."],
                ].map(([n, t, d]) => (
                  <div
                    key={n}
                    className="relative border-b border-white/[0.08] py-7 pl-7 md:border-b-0 md:border-l md:px-8 md:first:pl-0"
                  >
                    <span className="absolute -left-[5px] top-9 h-2.5 w-2.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f] md:left-[-5px]" />
                    <div className="font-mono text-[10px] text-[#d7ff3f]">{n}</div>
                    <h3 className="mt-4 text-xl font-semibold">{t}</h3>
                    <p className="mt-3 max-w-xs text-sm leading-6 text-white/50">{d}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* PRICING */}
          <section id="pricing" className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8 lg:py-24">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d7ff3f]">Precios</div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                  Empieza gratis. Escala cuando lo necesites.
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-6 text-white/50">
                Prueba FleetEase durante 14 días sin tarjeta. Después, elige la capacidad que necesita tu operación.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(Object.values(plans) as Array<(typeof plans)[keyof typeof plans]>).map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-[22px] border p-6 transition ${
                    plan.id === "free"
                      ? "border-[#d7ff3f]/60 bg-[#d7ff3f]/[0.065] shadow-[0_20px_70px_rgba(215,255,63,.08)]"
                      : plan.popular
                        ? "border-[#d7ff3f]/50 bg-[#d7ff3f]/[0.055]"
                        : "border-white/[0.08] bg-white/[0.025] hover:border-white/15"
                  }`}
                >
                  {plan.id === "free" && (
                    <div className="absolute right-3 top-3 max-w-[calc(100%-1.5rem)] rounded-full bg-[#d7ff3f] px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-[#080a0f] sm:right-4 sm:top-4 sm:px-2.5 sm:text-[9px]">
                      14 días gratis
                    </div>
                  )}
                  {plan.popular && (
                    <div className="absolute right-4 top-4 rounded-full bg-[#d7ff3f] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#080a0f]">
                      Recomendado
                    </div>
                  )}
                  <div className="text-sm font-semibold text-white/80">{plan.name}</div>
                  <div className="mt-5 flex min-w-0 items-end gap-1 pr-1 sm:mt-6">
                    <span className="text-3xl font-semibold tracking-[-0.04em] tabular-nums sm:text-4xl">
                      {plan.price === 0 ? "Gratis" : `$${plan.price}`}
                    </span>
                    {plan.price === 0 ? (
                      <span className="pb-1 text-xs text-white/40">por 14 días</span>
                    ) : (
                      <span className="pb-1 text-xs text-white/40">MXN / {plan.period}</span>
                    )}
                  </div>
                  <p className="mt-3 min-h-10 text-xs leading-5 text-white/50">{plan.description}</p>
                  <div className="my-5 h-px bg-white/[0.08] sm:my-6" />
                  <ul className="flex-1 space-y-3">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex gap-2.5 text-xs text-white/60">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#d7ff3f]" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/registro"
                    className={`mt-7 flex items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-bold transition ${
                      plan.id === "free" || plan.popular
                        ? "bg-[#d7ff3f] text-[#080a0f] hover:bg-white"
                        : "border border-white/10 bg-white/[0.04] text-white hover:border-white/25"
                    }`}
                  >
                    {plan.id === "free" ? "Comenzar prueba gratis" : "Elegir plan"}{" "}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ — client island (answers still in HTML via sr-only) */}
          <LandingFaq />

          {/* Final CTA */}
          <section className="mx-auto max-w-[1240px] px-5 py-10 sm:py-14 lg:px-8 lg:py-20">
            <div className="relative overflow-hidden rounded-[24px] border border-[#d7ff3f]/20 bg-[#d7ff3f] px-5 py-9 text-[#080a0f] sm:rounded-[28px] sm:px-14 sm:py-12 lg:py-16">
              <div className="absolute -right-20 -top-40 h-96 w-96 rounded-full bg-white/30 blur-3xl" />
              <div className="relative max-w-3xl">
                <Sparkles className="mb-6 h-7 w-7" />
                <h2 className="text-3xl font-semibold leading-[1] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                  Deja de perseguir la información.
                  <br />
                  Empieza a dirigir tu flotilla.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[#080a0f]/65 sm:mt-5 sm:text-base sm:leading-7">
                  Prueba FleetEase durante 14 días sin tarjeta y conoce el sistema con tu propia operación.
                </p>
                <Link
                  href="/registro"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#080a0f] px-6 py-4 text-sm font-bold text-white transition hover:bg-white hover:text-[#080a0f] sm:mt-8 sm:w-auto sm:px-7"
                >
                  Comenzar prueba gratis <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
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
                <Link href="/software-para-flotillas" className="hover:text-white">
                  Software para flotillas
                </Link>
                <Link href="/software-para-renta-de-vehiculos" className="hover:text-white">
                  Renta de vehículos
                </Link>
                <Link href="/control-de-mantenimiento-de-flotillas" className="hover:text-white">
                  Control de mantenimiento
                </Link>
                <Link href="/soluciones" className="hover:text-white">
                  Soluciones
                </Link>
                <Link href="/funciones" className="hover:text-white">
                  Funciones
                </Link>
                <Link href="/privacidad" className="hover:text-white">
                  Privacidad
                </Link>
                <Link href="/cookies" className="hover:text-white">
                  Cookies
                </Link>
                <Link href="/terminos" className="hover:text-white">
                  Términos
                </Link>
                <Link href="/cancelaciones" className="hover:text-white">
                  Cancelaciones
                </Link>
              </nav>
            </div>
            <div className="flex flex-col gap-2 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
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
