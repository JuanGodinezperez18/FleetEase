import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";

const url = "https://www.fleetease.com.mx/software-para-renta-de-vehiculos";

export const metadata: Metadata = {
  title: "Software para Renta de Vehículos",
  description:
    "Gestiona la renta de vehículos: contratos, clientes, cobranza, mantenimiento y rentabilidad por unidad. Empieza gratis, sin tarjeta de crédito.",
  alternates: { canonical: url },
  openGraph: {
    title: "Software para Renta de Vehículos | FleetEase",
    description:
      "Gestiona la renta de vehículos: contratos, clientes, cobranza, mantenimiento y rentabilidad por unidad.",
    url,
    siteName: "FleetEase",
    locale: "es_MX",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Software para Renta de Vehículos | FleetEase",
    description:
      "Gestiona la renta de vehículos: contratos, clientes, cobranza, mantenimiento y rentabilidad por unidad.",
    images: ["/og-image.png"],
  },
};

const steps = [
  [
    "01",
    "Registra tu flotilla",
    "Agrega vehículos, clientes y la información operativa de cada unidad.",
  ],
  [
    "02",
    "Controla la operación",
    "Administra asignaciones, créditos, pagos, kilometraje y mantenimiento.",
  ],
  [
    "03",
    "Mide el resultado",
    "Consulta ingresos, costos y rentabilidad para decidir dónde enfocar tu operación.",
  ],
];

export default function Page() {
  return (
    <main className="min-h-screen bg-[#080a0f] text-white">
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#080a0f]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <BrandLogo size={36} />
          <Link
            href="/registro"
            className="rounded-full bg-[#d7ff3f] px-5 py-2.5 text-sm font-bold text-[#080a0f]"
          >
            Empezar gratis
          </Link>
        </div>
      </header>

      <section className="border-b border-white/[0.08]">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d7ff3f]">
            Para negocios de renta de vehículos
          </p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-[-0.05em] md:text-7xl">
            Software para renta de vehículos: tu operación bajo control
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/50">
            FleetEase te ayuda a administrar vehículos, clientes, asignaciones,
            créditos, mantenimiento y finanzas sin depender de múltiples
            archivos y mensajes.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/registro"
              className="rounded-full bg-[#d7ff3f] px-7 py-3.5 font-bold text-[#080a0f]"
            >
              Empezar gratis
            </Link>
            <Link
              href="/soluciones"
              className="rounded-full border border-white/15 px-7 py-3.5 font-semibold text-white/80"
            >
              Ver soluciones
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <h2 className="text-3xl font-semibold md:text-4xl">
          De la operación diaria a la rentabilidad.
        </h2>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {steps.map(([n, t, d]) => (
            <article
              key={n}
              className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-7"
            >
              <span className="text-xs font-mono text-[#d7ff3f]/70">{n}</span>
              <h3 className="mt-5 text-xl font-semibold">{t}</h3>
              <p className="mt-3 leading-7 text-white/45">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-3xl border border-[#d7ff3f]/20 bg-[#d7ff3f]/[0.05] p-8 text-center md:p-14">
          <h2 className="text-3xl font-semibold">Empieza sin tarjeta.</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/45">
            Plan Free permanente con 1 vehículo y 1 usuario. Todas las funciones
            Pro, con anuncios.
          </p>
          <Link
            href="/registro"
            className="mt-7 inline-flex rounded-full bg-[#d7ff3f] px-7 py-3.5 font-bold text-[#080a0f]"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </section>
    </main>
  );
}
