import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Control de mantenimiento de flotillas | FleetEase',
  description: 'Controla mantenimiento, kilometraje y servicios de tu flotilla con FleetEase. Anticipa vencimientos y reduce paros inesperados.',
  alternates: { canonical: 'https://fleetease.com.mx/control-de-mantenimiento-de-flotillas' },
  openGraph: { title: 'Control de mantenimiento de flotillas | FleetEase', description: 'Organiza servicios, kilometraje y alertas para mantener tus vehículos operando.', url: 'https://fleetease.com.mx/control-de-mantenimiento-de-flotillas', type: 'website' },
}

const points = ['Alertas de mantenimiento y kilometraje','Historial de servicios por vehículo','Seguimiento de costos de mantenimiento','Visibilidad del estado de cada unidad']

export default function Page() {
  return <main className="min-h-screen bg-[#080a0f] text-white">
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#080a0f]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-bold tracking-tight">FleetEase</Link>
        <Link href="/registro" className="rounded-full bg-[#d7ff3f] px-5 py-2.5 text-sm font-bold text-[#080a0f]">Probar gratis 14 días</Link>
      </div>
    </header>
    <section className="border-b border-white/[0.08]"><div className="mx-auto max-w-6xl px-6 py-24 md:py-32"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d7ff3f]">Mantenimiento de flotillas</p><h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-[-0.05em] md:text-7xl">Mantén tus vehículos trabajando, no detenidos.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-white/50">FleetEase concentra kilometraje, servicios, costos y alertas para que puedas actuar antes de que un mantenimiento se convierta en un problema operativo.</p><Link href="/registro" className="mt-9 inline-flex rounded-full bg-[#d7ff3f] px-7 py-3.5 font-bold text-[#080a0f]">Probar FleetEase 14 días</Link></div></section><section className="mx-auto max-w-6xl px-6 py-20 md:py-28"><div className="grid gap-4 md:grid-cols-2">{points.map((point,i)=><article key={point} className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d7ff3f]/10 text-sm font-bold text-[#d7ff3f]">{i+1}</span><h2 className="font-semibold">{point}</h2></article>)}</div></section><section className="mx-auto max-w-6xl px-6 pb-24"><div className="rounded-3xl border border-white/[0.08] p-8 md:p-14"><h2 className="text-3xl font-semibold">Menos sorpresas. Más disponibilidad.</h2><p className="mt-4 max-w-2xl text-white/45">Integra el mantenimiento a la misma operación donde controlas vehículos, clientes y finanzas.</p><Link href="/soluciones" className="mt-7 inline-flex rounded-full border border-white/15 px-7 py-3.5 font-semibold">Ver todas las soluciones</Link></div></section></main>
}
