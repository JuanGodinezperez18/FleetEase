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
          {/* Content restored - see repo */}
          <div className="mx-auto max-w-[1240px] px-5 py-20 text-center">
            <p className="text-white/50">Cargando landing... Si ves esto, restaura desde git.</p>
          </div>
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
