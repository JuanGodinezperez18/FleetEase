"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleDollarSign,
  Gauge,
  Menu,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-provider";
import { GlobalLoader } from "@/components/common/GlobalLoader";
import { plans } from "@/config/plans";

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

const faqs = [
  [
    "¿Para quién es FleetEase?",
    "Para empresas y operadores que administran vehículos de renta, flotillas comerciales o unidades asignadas a conductores y necesitan controlar operación y rentabilidad. Ideal para software de gestión de flotillas y renta de vehículos en México.",
  ],
  [
    "¿Puedo probar FleetEase antes de pagar?",
    "Sí. El plan Free te permite usar FleetEase durante 14 días con 1 usuario y hasta 2 vehículos, sin ingresar tarjeta ni información de pago.",
  ],
  [
    "¿Los planes dependen del número de vehículos?",
    "Sí. Los planes están pensados para crecer contigo y aumentar la capacidad conforme crece tu flotilla.",
  ],
  [
    "¿FleetEase reemplaza mi GPS?",
    "No necesariamente. FleetEase está pensado como la capa de gestión de tu operación: centraliza información, costos, mantenimiento y rentabilidad.",
  ],
  [
    "¿FleetEase sirve para control de flotillas en México?",
    "Sí. FleetEase es un software de gestión de flotillas y renta de vehículos diseñado para operadores en México. Te permite controlar rentabilidad, mantenimiento y operación desde un solo lugar.",
  ],
  [
    "¿Qué incluye el control de mantenimiento de flotillas?",
    "Puedes registrar servicios, kilometraje, vencimientos de seguros y verificaciones, y recibir alertas antes de que un vehículo se detenga por falta de mantenimiento.",
  ],
];

export default function LandingPage() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    if (!loading && currentUser) router.replace("/dashboard");
  }, [currentUser, loading, router]);

  useEffect(() => {
    const onScroll = () => setShowStickyCta(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loading) return <GlobalLoader />;

  const nav = [
    ["Producto", "#producto"],
    ["Cómo funciona", "#como-funciona"],
    ["Precios", "#pricing"],
    ["FAQ", "#faq"],
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080a0f] text-white selection:bg-[#d7ff3f] selection:text-[#080a0f]">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="pointer-events-none absolute left-1/2 top-[-260px] h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-[#d7ff3f]/[0.08] blur-[130px]" />

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.07] bg-[#080a0f]/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="FleetEase inicio">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[10px] bg-white">
              <Image
                src="/logo.png"
                alt="FleetEase - Software de gestión de flotillas"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
            </div>
            <span className="text-[19px] font-semibold tracking-[-0.03em]">FleetEase</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {nav.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="text-[13px] font-medium text-white/60 transition hover:text-white"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-5 md:flex">
            <Link href="/login" className="text-[13px] font-medium text-white/60 transition hover:text-white">
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="group flex items-center gap-2 rounded-full bg-[#d7ff3f] px-5 py-2.5 text-[13px] font-bold text-[#080a0f] transition hover:bg-white"
            >
              Empezar ahora{" "}
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
          <button className="rounded-lg p-2 text-white/80 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/[0.07] bg-[#080a0f] md:hidden"
            >
              <div className="flex flex-col gap-5 px-5 py-6">
                {nav.map(([label, href]) => (
                  <Link key={label} href={href} onClick={() => setMenuOpen(false)} className="text-base text-white/70">
                    {label}
                  </Link>
                ))}
                <Link href="/login" onClick={() => setMenuOpen(false)} className="text-base text-white/70">
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl bg-[#d7ff3f] px-5 py-3 text-center font-bold text-[#080a0f]"
                >
                  Empezar ahora
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="relative z-10 pt-[72px]">
        {/* HERO */}
        <section className="mx-auto grid min-h-[640px] max-w-[1240px] items-center gap-12 px-5 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:px-8 lg:py-20">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" /> Gestión de flotillas sin ruido
            </div>
            <h1 className="max-w-[680px] text-[44px] font-semibold leading-[0.98] tracking-[-0.055em] sm:text-[64px] lg:text-[78px]">
              Tu flotilla.
              <br />
              <span className="text-[#d7ff3f]">Tus números.</span>
              <br />
              Bajo control.
            </h1>
            <p className="mt-6 max-w-[570px] text-[17px] leading-8 text-white/60 sm:text-[19px]">
              FleetEase es el software de gestión de flotillas y renta de vehículos que convierte la operación diaria en una vista clara de rentabilidad, mantenimiento y desempeño.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative"
          >
            <div className="absolute -inset-10 rounded-[40px] bg-[#d7ff3f]/[0.07] blur-3xl" />
            <div className="relative overflow-hidden rounded-[26px] border border-white/[0.12] bg-[#0e1117]/90 shadow-[0_40px_100px_rgba(0,0,0,.55)] backdrop-blur-xl">
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
              <div className="grid gap-3 px-4 pb-4 lg:grid-cols-[1.25fr_.75fr]">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold">Rentabilidad mensual</div>
                      <div className="mt-1 text-[10px] text-white/40">Ingresos vs. costos</div>
                    </div>
                    <BarChart3 className="h-4 w-4 text-white/30" />
                  </div>
                  <div className="flex h-36 items-end gap-2">
                    {[38, 48, 43, 62, 57, 75, 68, 88, 79, 94, 83, 100].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 0.4 + i * 0.035, duration: 0.55 }}
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
          </motion.div>
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
                <motion.article
                  key={feature.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.07 }}
                  whileHover={{ y: -3 }}
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
                </motion.article>
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
              ].map(([n, t, d], i) => (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative border-b border-white/[0.08] py-7 pl-7 md:border-b-0 md:border-l md:px-8 md:first:pl-0"
                >
                  <span className="absolute -left-[5px] top-9 h-2.5 w-2.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f] md:left-[-5px]" />
                  <div className="font-mono text-[10px] text-[#d7ff3f]">{n}</div>
                  <h3 className="mt-4 text-xl font-semibold">{t}</h3>
                  <p className="mt-3 max-w-xs text-sm leading-6 text-white/50">{d}</p>
                </motion.div>
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
            {(Object.values(plans) as any[]).map((plan: any, i: number) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className={`relative flex flex-col rounded-[22px] border p-6 transition ${
                  plan.id === "free"
                    ? "border-[#d7ff3f]/60 bg-[#d7ff3f]/[0.065] shadow-[0_20px_70px_rgba(215,255,63,.08)]"
                    : plan.popular
                      ? "border-[#d7ff3f]/50 bg-[#d7ff3f]/[0.055]"
                      : "border-white/[0.08] bg-white/[0.025] hover:border-white/15"
                }`}
              >
                {plan.id === "free" && (
                  <div className="absolute right-4 top-4 rounded-full bg-[#d7ff3f] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#080a0f]">
                    14 días gratis
                  </div>
                )}
                {plan.popular && (
                  <div className="absolute right-4 top-4 rounded-full bg-[#d7ff3f] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#080a0f]">
                    Recomendado
                  </div>
                )}
                <div className="text-sm font-semibold text-white/80">{plan.name}</div>
                <div className="mt-6 flex items-end gap-1">
                  <span className="text-4xl font-semibold tracking-[-0.04em] tabular-nums">
                    {plan.price === 0 ? "Gratis" : `$${plan.price}`}
                  </span>
                  {plan.price === 0 ? (
                    <span className="pb-1 text-xs text-white/40">por 14 días</span>
                  ) : (
                    <span className="pb-1 text-xs text-white/40">MXN / {plan.period}</span>
                  )}
                </div>
                <p className="mt-3 min-h-10 text-xs leading-5 text-white/50">{plan.description}</p>
                <div className="my-6 h-px bg-white/[0.08]" />
                <ul className="flex-1 space-y-3">
                  {plan.features.map((f: string, j: number) => (
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
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-white/[0.07] bg-white/[0.018]">
          <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 lg:grid-cols-[.65fr_1.35fr] lg:gap-14 lg:px-8 lg:py-24">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d7ff3f]">FAQ</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Lo esencial,
                <br />
                sin vueltas.
              </h2>
            </div>
            <div>
              {faqs.map(([q, a], i) => (
                <div key={q} className="border-b border-white/[0.08] first:border-t">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex w-full items-center justify-between py-5 text-left text-sm font-semibold text-white/90"
                  >
                    <span>{q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-white/40 transition ${openFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="pb-5 pr-8 text-sm leading-6 text-white/55">{a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-[1240px] px-5 py-14 lg:px-8 lg:py-20">
          <div className="relative overflow-hidden rounded-[28px] border border-[#d7ff3f]/20 bg-[#d7ff3f] px-7 py-12 text-[#080a0f] sm:px-14 lg:py-16">
            <div className="absolute -right-20 -top-40 h-96 w-96 rounded-full bg-white/30 blur-3xl" />
            <div className="relative max-w-3xl">
              <Sparkles className="mb-6 h-7 w-7" />
              <h2 className="text-3xl font-semibold leading-[1] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                Deja de perseguir la información.
                <br />
                Empieza a dirigir tu flotilla.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-[#080a0f]/65">
                Prueba FleetEase durante 14 días sin tarjeta y conoce el sistema con tu propia operación.
              </p>
              <Link
                href="/registro"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#080a0f] px-7 py-4 text-sm font-bold text-white transition hover:bg-white hover:text-[#080a0f]"
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
            <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-xs text-white/45 sm:grid-cols-3">
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
              <Link href="/terminos" className="hover:text-white">
                Términos
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-white/30">© 2026 FleetEase · Software de gestión de flotillas</span>
          </div>
        </div>
      </footer>

      {/* Sticky mobile CTA */}
      <AnimatePresence>
        {showStickyCta && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-[#080a0f]/92 p-3 backdrop-blur-xl md:hidden"
          >
            <Link
              href="/registro"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#d7ff3f] py-3.5 text-sm font-bold text-[#080a0f]"
            >
              Comenzar gratis <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
