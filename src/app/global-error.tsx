'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[FleetEase GlobalError]', error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, background: '#080a0f', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <section style={{ width: '100%', maxWidth: 560, padding: 28, border: '1px solid rgba(255,255,255,.1)', borderRadius: 24, background: '#0e1117' }}>
            <div style={{ width: 48, height: 48, display: 'grid', placeItems: 'center', borderRadius: 14, background: 'rgba(245,158,11,.12)', color: '#fbbf24', fontSize: 24 }}>
              !
            </div>
            <h1 style={{ margin: '20px 0 8px', fontSize: 22 }}>FleetEase encontró un error de carga</h1>
            <p style={{ margin: 0, color: 'rgba(255,255,255,.6)', lineHeight: 1.6 }}>
              El servidor o el navegador rechazó una parte de la navegación. Esta pantalla muestra el detalle real para poder corregirlo.
            </p>
            <details open style={{ marginTop: 20, padding: 14, borderRadius: 12, background: 'rgba(0,0,0,.25)' }}>
              <summary style={{ cursor: 'pointer', color: 'rgba(255,255,255,.8)', fontWeight: 600 }}>
                Detalles técnicos
              </summary>
              <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: 'rgba(255,255,255,.65)', fontSize: 12 }}>
                {error?.name || 'Error'}: {error?.message || 'Sin mensaje'}
                {error?.digest ? `\nDigest: ${error.digest}` : ''}
              </pre>
            </details>
            <button
              type="button"
              onClick={() => reset()}
              style={{ marginTop: 20, width: '100%', minHeight: 44, border: 0, borderRadius: 12, background: '#d7ff3f', color: '#080a0f', fontWeight: 700, cursor: 'pointer' }}
            >
              Reintentar
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
