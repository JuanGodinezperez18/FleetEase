import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SalesContactForm } from "@/components/landing/sales-contact-form";

const url = "https://www.fleetease.com.mx/contacto-ventas";

export const metadata: Metadata = {
  title: "Contactar con Ventas",
  description:
    "Cuéntanos sobre tu flotilla y las necesidades de tu operación. El equipo de FleetEase te contactará para mostrarte cómo funciona, sin compromiso.",
  alternates: { canonical: url },
  openGraph: {
    title: "Contactar con Ventas | FleetEase",
    description:
      "Cuéntanos sobre tu flotilla y las necesidades de tu operación. El equipo de FleetEase te contactará sin compromiso.",
    url,
    siteName: "FleetEase",
    locale: "es_MX",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contactar con Ventas | FleetEase",
    description:
      "Cuéntanos sobre tu flotilla. El equipo de FleetEase te contactará sin compromiso.",
    images: ["/og-image.png"],
  },
};

export default async function ContactoVentasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestType =
    params.tipo === "administracion" ? "vehicle_management" : "sales";

  return (
    <main className="fe-landing min-h-screen bg-[var(--fe-ink)] px-5 py-8 text-white sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <BrandLogo size={44} />
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
        </div>
        <section className="mt-12 rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-6 sm:mt-16 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--fe-lime)]">
            Hablemos de tu operación
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Cuéntanos qué necesitas.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-white/60 sm:text-base">
            Si representas una empresa, revisaremos contigo el tamaño de tu
            flotilla, los procesos que quieres controlar y las funciones que
            necesitas antes de recomendarte una solución. También atendemos a
            conductores independientes.
          </p>
          <div className="mt-8">
            <SalesContactForm requestType={requestType} />
          </div>
        </section>
      </div>
    </main>
  );
}
