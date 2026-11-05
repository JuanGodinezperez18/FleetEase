import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicMarketingLayout } from '@/components/landing/public-marketing-layout';

const url = 'https://www.fleetease.com.mx/administracion-de-vehiculos-monterrey';
export const metadata: Metadata = {
  title: 'Administración de Vehículos de Renta en Monterrey',
  description: 'Servicio de administración de vehículos de renta en Monterrey, Nuevo León. Seguimiento operativo, financiero y de mantenimiento con FleetEase.',
  alternates: { canonical: url },
  openGraph: { title: 'Administración de Vehículos de Renta en Monterrey | FleetEase', description: 'Seguimiento de operación, finanzas y mantenimiento de tus unidades de renta en Monterrey.', url, siteName: 'FleetEase', locale: 'es_MX', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
};

export default function AdministrationPage() {
  return (
    <PublicMarketingLayout>
      <div className="mx-auto max-w-[1240px] px-5 py-12 lg:px-8 lg:py-16">
        <p className="text-base font-semibold text-[var(--fe-lime)]">Monterrey, Nuevo León</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Tus vehículos de renta, con seguimiento.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--fe-text-secondary)]">Si tienes vehículos para renta y necesitas apoyo para administrarlos, conversemos sobre tu operación. Contamos con más de 8 años de experiencia con vehículos de renta para conductores de plataformas.</p>
        <Link href="/contacto-ventas?tipo=administracion" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[var(--fe-lime)] px-6 py-3 text-sm font-bold text-[var(--fe-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--fe-lime)]">Solicitar información de administración</Link>
        <section aria-labelledby="alcance-title" className="mt-12 border-t border-[var(--fe-border)] pt-8">
          <h2 id="alcance-title" className="text-3xl font-semibold tracking-tight">En qué podemos apoyarte</h2>
          <dl className="mt-6 divide-y divide-[var(--fe-border)]">
            {[['Operación', 'Información de las unidades, asignaciones y seguimiento de la operación de renta.'], ['Finanzas', 'Ingresos, gastos y rentabilidad por vehículo para revisar el resultado de la operación.'], ['Mantenimiento', 'Servicios y gastos de mantenimiento para mantener visibles las necesidades de cada unidad.']].map(([title,text]) => <div key={title} className="grid gap-2 py-5 sm:grid-cols-[0.6fr_1.4fr] sm:gap-8"><dt className="text-xl font-semibold">{title}</dt><dd className="text-base leading-7 text-[var(--fe-text-secondary)]">{text}</dd></div>)}
          </dl>
        </section>
        <section className="mt-8 grid gap-5 rounded-[var(--fe-radius-lg)] bg-[var(--fe-surface)] p-6 sm:p-8 md:grid-cols-2 md:gap-10"><h2 className="text-2xl font-semibold tracking-tight">Primero, revisamos tu caso.</h2><div><p className="text-base leading-7 text-[var(--fe-text-secondary)]">Cuéntanos cuántas unidades tienes y qué apoyo necesitas. A partir de esa información podemos conversar sobre el alcance, las responsabilidades y las condiciones del servicio.</p><p className="mt-3 text-base leading-7 text-[var(--fe-text-secondary)]">El servicio presencial está disponible exclusivamente en Monterrey. Los planes del software se consultan por separado.</p></div></section>
        <section className="mt-10"><h2 className="text-2xl font-semibold">Dudas sobre el servicio</h2><details className="mt-4 border-b border-[var(--fe-border)]"><summary className="min-h-14 cursor-pointer py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fe-lime)]">¿Puedo usar el software fuera de Monterrey?</summary><p className="pb-5 text-base leading-7 text-[var(--fe-text-secondary)]">Sí. La cobertura local corresponde al servicio de administración. FleetEase es un software web para gestionar flotillas en México.</p></details><details className="border-b border-[var(--fe-border)]"><summary className="min-h-14 cursor-pointer py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fe-lime)]">¿Dónde consulto el costo y las responsabilidades?</summary><p className="pb-5 text-base leading-7 text-[var(--fe-text-secondary)]">Solicita información con los datos de tu operación para revisar el alcance y las condiciones aplicables antes de contratar.</p></details></section>
        <div className="mt-7 flex flex-wrap gap-x-8"><Link href="/contacto-ventas?tipo=administracion" className="fe-marketing-link">Consultar mi caso</Link><Link href="/#pricing" className="fe-marketing-link">Ver planes del software</Link></div>
      </div>
    </PublicMarketingLayout>
  );
}
