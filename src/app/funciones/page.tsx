import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Funciones de FleetEase | Gestión de flotillas',
  description: 'Descubre las funciones de FleetEase para vehículos, clientes, créditos, mantenimiento, multas, kilometraje, finanzas y reportes.',
  alternates: { canonical: 'https://fleetease.com.mx/funciones' },
  openGraph: { title: 'Funciones de FleetEase', description: 'Herramientas para controlar y hacer crecer una flotilla de vehículos.', url: 'https://fleetease.com.mx/funciones', type: 'website' },
}

const features = ['Dashboard con KPIs', 'Control de vehículos', 'Gestión de clientes', 'Créditos y pagos', 'Alertas de mantenimiento', 'Control de kilometraje', 'Multas y pendientes', 'Finanzas y gastos', 'Reportes y exportación', 'Notificaciones operativas']

export default function FeaturesPage() {
  return <main className="min-h-screen bg-background text-foreground"><section className="mx-auto max-w-6xl px-6 py-20 md:py-28"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Funciones</p><h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">Una sola plataforma para controlar toda tu operación.</h1><p className="mt-6 max-w-3xl text-lg text-muted-foreground">FleetEase reúne las tareas que normalmente están dispersas entre hojas de cálculo, mensajes y diferentes sistemas.</p><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(feature => <div key={feature} className="rounded-2xl border p-6"><h2 className="font-semibold">{feature}</h2><p className="mt-2 text-sm text-muted-foreground">Información centralizada, acciones rápidas y visibilidad de tu operación.</p></div>)}</div><div className="mt-14 rounded-3xl border bg-muted/30 p-8 md:p-12"><h2 className="text-3xl font-bold">¿Listo para tener el control?</h2><p className="mt-3 text-muted-foreground">Empieza a organizar tu flotilla con FleetEase.</p><Link href="/registro" className="mt-6 inline-flex rounded-xl bg-primary px-7 py-3 font-semibold text-primary-foreground">Crear cuenta</Link></div></section></main>
}
