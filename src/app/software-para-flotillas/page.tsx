import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Software para flotillas en México | FleetEase',
  description: 'Software para administrar flotillas de vehículos en México. Controla clientes, vehículos, mantenimiento, créditos, gastos y rentabilidad con FleetEase.',
  alternates: { canonical: 'https://fleetease.com.mx/software-para-flotillas' },
  openGraph: { title: 'Software para flotillas en México | FleetEase', description: 'Controla vehículos, clientes, mantenimiento, finanzas y rentabilidad desde una sola plataforma.', url: 'https://fleetease.com.mx/software-para-flotillas', type: 'website' },
}

const benefits = [
  ['Control de vehículos', 'Consulta disponibilidad, asignaciones, kilometraje, documentos y estado de cada unidad.'],
  ['Rentabilidad', 'Relaciona ingresos y costos para entender qué vehículos generan valor y cuáles necesitan atención.'],
  ['Mantenimiento', 'Organiza servicios y alertas de kilometraje para prevenir paros y gastos inesperados.'],
  ['Clientes y cobranza', 'Mantén expedientes, adeudos, créditos y vehículos asignados en un solo lugar.'],
]

export default function Page() {
  return <main className="min-h-screen bg-[#080a0f] text-white">
    <section className="relative overflow-hidden border-b border-white/[0.08]">
      <div className="absolute left-1/2 top-[-220px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#d7ff3f]/[0.09] blur-[120px]" />
      <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d7ff3f]">Software de gestión de flotillas</p>
        <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-[-0.05em] md:text-7xl">Administra tu flotilla con datos, no con hojas de cálculo.</h1>
        <p className="mt-7 max-w-2xl text-lg leading-8 text-white/50">FleetEase centraliza la operación de tu flotilla para que puedas controlar vehículos, clientes, mantenimiento, créditos, gastos y rentabilidad.</p>
        <div className="mt-9 flex flex-wrap gap-3"><Link href="/registro" className="rounded-full bg-[#d7ff3f] px-7 py-3.5 font-bold text-[#080a0f]">Probar gratis 14 días</Link><Link href="/precios" className="rounded-full border border-white/15 px-7 py-3.5 font-semibold text-white/80">Ver precios</Link></div>
      </div>
    </section>
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28"><div className="grid gap-5 md:grid-cols-2">{benefits.map(([title,text]) => <article key={title} className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-7"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-3 leading-7 text-white/45">{text}</p></article>)}</div></section>
    <section className="mx-auto max-w-6xl px-6 pb-24"><div className="rounded-3xl border border-[#d7ff3f]/20 bg-[#d7ff3f]/[0.05] p-8 md:p-14"><h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Una sola vista para tomar mejores decisiones.</h2><p className="mt-4 max-w-2xl text-white/45">Empieza con hasta 2 vehículos durante 14 días sin tarjeta y escala conforme crece tu operación.</p><Link href="/registro" className="mt-7 inline-flex rounded-full bg-[#d7ff3f] px-7 py-3.5 font-bold text-[#080a0f]">Comenzar ahora</Link></div></section>
  </main>
}
