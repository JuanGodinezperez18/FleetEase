import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-3xl border border-white/[0.08] bg-white/[0.03] p-10 text-center shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Error 404</p>
        <h1 className="mt-3 text-3xl font-bold">Página no encontrada</h1>
        <p className="mt-3 text-muted-foreground">La ruta que intentaste abrir no existe o fue movida. Puedes volver al dashboard y continuar desde el menú.</p>
        <div className="mt-7 flex justify-center gap-3">
          <Link href="/dashboard" className="rounded-xl bg-[#d7ff3f] px-5 py-3 text-sm font-semibold text-[#080a0f] hover:opacity-90">Ir al dashboard</Link>
          <Link href="/dashboard/profitability" className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold hover:bg-white/5">Rentabilidad</Link>
        </div>
      </section>
    </main>
  );
}
