import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/brand/brand-logo";

const url = "https://www.fleetease.com.mx/funciones";

export const metadata: Metadata = {
  // absolute evita el template "%s | FleetEase" (el title ya incluye la marca)
  title: {
    absolute: "Funciones de FleetEase | Rentabilidad y Mantenimiento",
  },
  description:
    "Rentabilidad por vehículo, control de mantenimiento, cobranza, clientes y reportes PDF/Excel. Descubre todo lo que FleetEase hace por tu flotilla.",
  alternates: { canonical: url },
  openGraph: {
    title: "Funciones de FleetEase | Rentabilidad y Mantenimiento",
    description:
      "Rentabilidad por vehículo, control de mantenimiento, cobranza, clientes y reportes PDF/Excel.",
    url,
    siteName: "FleetEase",
    locale: "es_MX",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Funciones de FleetEase | Rentabilidad y Mantenimiento",
    description:
      "Rentabilidad por vehículo, control de mantenimiento, cobranza, clientes y reportes PDF/Excel.",
    images: ["/og-image.png"],
  },
};

export default function FuncionesPage() {
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
      <main className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Funciones pensadas para operar y decidir con números
        </h1>
        <p className="mt-4 max-w-2xl text-white/55">
          Controla vehículos, clientes, finanzas, mantenimiento y rentabilidad
          desde un solo sistema.
        </p>
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            "Gestión de vehículos y asignaciones",
            "Clientes, socios y expedientes",
            "Ingresos, gastos, créditos y cobranza",
            "Mantenimiento e inspecciones",
            "Rentabilidad por unidad y reportes",
            "Plan Free permanente con funciones Pro",
          ].map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/80"
            >
              {item}
            </li>
          ))}
        </ul>
        <Link
          href="/registro"
          className="mt-10 inline-flex rounded-full bg-[#d7ff3f] px-6 py-3 text-sm font-bold text-[#080a0f]"
        >
          Crear cuenta gratis
        </Link>
      </main>
    </div>
  );
}
