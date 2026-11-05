'use client';

import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LandingProductImage } from './landing-product-image';
import { productViews } from './product-views';

export function LandingProductShowcase() {
  return (
    <section id="producto" aria-labelledby="producto-title" className="scroll-mt-[var(--header-h)] border-y border-[var(--fe-border)] bg-[var(--fe-main)]">
      <div className="mx-auto max-w-[1240px] px-5 py-12 lg:px-8 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <h2 id="producto-title" className="max-w-xl text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">De la operación al resultado.</h2>
          <Link href="/funciones" className="fe-marketing-link">Ver todas las funciones</Link>
        </div>
        <Tabs defaultValue="vehicles" className="mt-7">
          <TabsList aria-label="Vistas del producto" className="grid h-auto w-full grid-cols-3 gap-1 border-0 bg-transparent p-0 sm:inline-flex sm:w-auto">
            {productViews.map(view => (
              <TabsTrigger key={view.screen} value={view.screen} className="min-h-11 min-w-0 whitespace-normal px-2 text-xs transition-colors [transition-duration:var(--fe-motion-fast)] data-[state=active]:shadow-none sm:px-5 sm:text-sm">{view.label}</TabsTrigger>
            ))}
          </TabsList>
          {productViews.map(view => (
            <TabsContent key={view.screen} value={view.screen} className="mt-6">
              <div className="fe-product-change grid min-w-0 gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-center lg:gap-10">
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight">{view.title}</h3>
                  <p className="mt-4 max-w-lg text-base leading-7 text-[var(--fe-text-secondary)] lg:min-h-28">{view.description}</p>
                  <ul className="mt-5 space-y-2 text-sm text-[var(--fe-text-secondary)]">
                    {view.details.map(detail => <li key={detail} className="flex items-center gap-2"><span aria-hidden="true" className="h-1 w-1 rounded-full bg-[var(--fe-lime)]" />{detail}</li>)}
                  </ul>
                </div>
                <LandingProductImage screen={view.screen} alt={view.alt} focused sizes="(min-width: 1280px) 710px, (min-width: 1024px) 60vw, calc(100vw - 40px)" />
              </div>
            </TabsContent>
          ))}
        </Tabs>
        <div id="como-funciona" className="mt-8 scroll-mt-[calc(var(--header-h)+24px)] border-t border-[var(--fe-border)] pt-6">
          <h3 className="text-base font-semibold">Cómo empezar</h3>
          <ol className="mt-3 grid gap-3 text-sm leading-6 text-[var(--fe-text-secondary)] sm:grid-cols-3">
            <li><strong className="text-[var(--fe-text)]">Registra tus unidades.</strong> Agrega vehículos y clientes.</li>
            <li><strong className="text-[var(--fe-text)]">Lleva la operación.</strong> Captura rentas, pagos y servicios.</li>
            <li><strong className="text-[var(--fe-text)]">Revisa el resultado.</strong> Consulta costos y rentabilidad.</li>
          </ol>
        </div>
      </div>
    </section>
  );
}
