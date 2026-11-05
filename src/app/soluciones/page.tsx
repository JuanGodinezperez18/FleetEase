import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicMarketingLayout } from '@/components/landing/public-marketing-layout';

const url = 'https://www.fleetease.com.mx/soluciones';
export const metadata: Metadata = {
  title: 'Soluciones para Flotillas y Renta de Vehículos',
  description: 'Soluciones para renta de vehículos, flotillas comerciales y unidades asignadas: operación, costos y rentabilidad en una sola plataforma.',
  alternates: { canonical: url },
  openGraph: { title: 'Soluciones para Flotillas y Renta de Vehículos | FleetEase', description: 'Elige el control que necesita tu operación con vehículos.', url, siteName: 'FleetEase', locale: 'es_MX', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: 'Soluciones para Flotillas y Renta de Vehículos | FleetEase', description: 'Control de operación, costos y rentabilidad.', images: ['/og-image.png'] },
};

const audiences = [
  { title: 'Tu primer vehículo', text: 'Si llevas tus cuentas por separado, reúne ingresos, gastos y servicios para conocer el resultado de tu unidad.', details: 'Empieza con el plan Free: 1 vehículo y 1 usuario, sin tarjeta y con anuncios.', href: '/registro', action: 'Crear mi cuenta Free' },
  { title: 'Vehículos de renta para conductores', text: 'Da seguimiento a asignaciones, rentas, cobranza y créditos. Conserva el historial de cada cliente y los compromisos de cada unidad.', details: 'Revisa también multas, vencimientos y mantenimiento desde la misma operación.', href: '/funciones#vehicles', action: 'Ver el control de rentas' },
  { title: 'Flotillas y vehículos de socios', text: 'Concentra los gastos de las unidades, sus mantenimientos y el resultado por vehículo para revisar cómo se comporta la flotilla.', details: 'Consulta balances de socios y reportes para dar seguimiento a ingresos y costos.', href: '/funciones#rentabilidad', action: 'Ver rentabilidad por unidad' },
];

export default function SolutionsPage() {
  return (
    <PublicMarketingLayout>
      <div className="mx-auto max-w-[1240px] px-5 py-12 lg:px-8 lg:py-16">
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">Control para tu forma de operar.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--fe-text-secondary)]">Desde una unidad hasta una flotilla de renta: reúne la información que necesitas para administrar tus vehículos.</p>
        <div className="mt-8">
          {audiences.map(item => <section key={item.title} className="grid gap-4 border-t border-[var(--fe-border)] py-8 md:grid-cols-[0.7fr_1.3fr] md:gap-12"><h2 className="text-2xl font-semibold tracking-tight">{item.title}</h2><div><p className="text-base leading-7 text-[var(--fe-text-secondary)]">{item.text}</p><p className="mt-3 text-base leading-7 text-[var(--fe-text-secondary)]">{item.details}</p><Link href={item.href} className="fe-marketing-link mt-3">{item.action}</Link></div></section>)}
        </div>
        <section className="mt-4 rounded-[var(--fe-radius-lg)] bg-[var(--fe-surface)] p-6 sm:p-8"><h2 className="text-2xl font-semibold">¿Buscas que alguien administre tus unidades?</h2><p className="mt-3 text-base leading-7 text-[var(--fe-text-secondary)]">También ofrecemos un servicio de administración de vehículos de renta, exclusivamente en Monterrey, Nuevo León.</p><Link href="/administracion-de-vehiculos-monterrey" className="fe-marketing-link mt-3">Consultar el servicio en Monterrey</Link></section>
        <Link href="/#pricing" className="fe-marketing-link mt-6">Comparar planes del software</Link>
      </div>
    </PublicMarketingLayout>
  );
}
