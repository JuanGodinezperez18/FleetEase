import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/brand/brand-logo";

const url = "https://www.fleetease.com.mx/software-para-flotillas";

export const metadata: Metadata = {
  title: "Software para Flotillas en México",
  description:
    "Administra tu flotilla en un solo sistema: rentabilidad por vehículo, mantenimiento, cobranza y reportes. Plan Free permanente para empezar sin tarjeta.",
  alternates: { canonical: url },
  openGraph: {
    title: "Software para Flotillas en México | FleetEase",
    description:
      "Administra tu flotilla en un solo sistema: rentabilidad por vehículo, mantenimiento, cobranza y reportes.",
    url,
    siteName: "FleetEase",
    locale: "es_MX",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Software para Flotillas en México | FleetEase",
    description:
      "Administra tu flotilla en un solo sistema: rentabilidad por vehículo, mantenimiento, cobranza y reportes.",
    images: ["/og-image.png"],
  },
};

export default function SoftwareParaFlotillasPage() {
  return (
    <div className="min-h-screen bg-[#080a0f] text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandLogo size={36} />
        <Link
          href="/registro"
          className="rounded-full bg-[#d7ff3f] px-5 py-2.5 text-sm font-bold text-[#080a0f]"
        >
          Empezar gratis
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d7ff3f]/80">
          Software para flotillas
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
          Software para flotillas: controla tu operación y tu rentabilidad
        </h1>
        <p className="mt-5 max-w-2xl text-white/55">
          FleetEase centraliza vehículos, clientes, finanzas y alertas en un
          solo sistema pensado para operadores en México.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/registro"
            className="rounded-full bg-[#d7ff3f] px-7 py-3.5 font-bold text-[#080a0f]"
          >
            Empezar gratis
          </Link>
          <Link
            href="/#pricing"
            className="rounded-full border border-white/15 px-7 py-3.5 font-semibold text-white/80"
          >
            Ver precios
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-3xl border border-[#d7ff3f]/20 bg-[#d7ff3f]/[0.05] p-8 md:p-14">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Una sola vista para tomar mejores decisiones.
          </h2>
          <p className="mt-4 max-w-2xl text-white/45">
            Empieza gratis con 1 vehículo y 1 usuario. Escala a un plan
            de pago cuando necesites más capacidad y sin anuncios.
          </p>
          <Link
            href="/registro"
            className="mt-7 inline-flex rounded-full bg-[#d7ff3f] px-7 py-3.5 font-bold text-[#080a0f]"
          >
            Comenzar ahora
          </Link>
        </div>
      </section>
    </div>
  );
}
