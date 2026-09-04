import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Software para administrar flotillas | FleetEase',
  description: 'Administra vehículos, clientes, créditos, mantenimiento y rentabilidad de tu flotilla desde FleetEase.',
  alternates: { canonical: 'https://fleetease.com.mx/soluciones' },
  openGraph: { title: 'Soluciones para flotillas | FleetEase', description: 'Control total de tu operación de renta y administración de vehículos.', url: 'https://fleetease.com.mx/soluciones', type: 'website' },
}

const solutions = [
  ['Gestión de vehículos', 'Controla disponibilidad, asignaciones, kilometraje, mantenimiento y documentación.'],
  ['Clientes y conductores', 'Centraliza expedientes, adeudos, vehículos asignados y seguimiento de cada cliente.'],
  ['Créditos y cobranza', 'Consulta saldos, pagos, vencimientos y cartera para tomar decisiones a tiempo.'],
  ['Mantenimiento', 'Recibe alertas y organiza servicios para reducir paros y costos inesperados.'],
  ['Finanzas', 'Visualiza ingresos, gastos y resultados de tu operación desde un solo lugar.'],
  ['Reportes y analítica', 'Convierte los datos de tu flotilla en información útil para mejorar la rentabilidad.'],
]

export default function SolutionsPage() {
  return <main className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="font-bold tracking-tight">FleetEase</Link>
        <Link href="/registro" className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Probar gratis 14 días</Link>
      </div>
    </header>
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="max-w-3xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-primary">FleetEase</p>
        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">Todo lo que necesitas para administrar una flotilla rentable.</h1>
        <p className="mt-6 text-lg text-muted-foreground md:text-xl">Una plataforma diseñada para operadores de renta de vehículos que necesitan control, visibilidad y menos trabajo manual.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/registro" className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground">Probar FleetEase</Link><Link href="/" className="rounded-xl border px-6 py-3 font-semibold">Conocer FleetEase</Link></div>
      </div>
    </section>
    <section className="border-y bg-muted/30"><div className="mx-auto grid max-w-6xl gap-5 px-6 py-16 md:grid-cols-2 lg:grid-cols-3">{solutions.map(([title, text]) => <article key={title} className="rounded-2xl border bg-background p-6 shadow-sm"><h2 className="text-xl font-semibold">{title}</h2><p className="mt-3 text-muted-foreground">{text}</p></article>)}</div></section>
    <section className="mx-auto max-w-6xl px-6 py-20"><div className="rounded-3xl border p-8 text-center md:p-14"><h2 className="text-3xl font-bold">Deja de administrar tu flotilla a ciegas.</h2><p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Centraliza la operación y conoce qué está pasando con tus vehículos, clientes y dinero.</p><Link href="/registro" className="mt-7 inline-flex rounded-xl bg-primary px-7 py-3 font-semibold text-primary-foreground">Comenzar ahora</Link></div></section>
  </main>
}
