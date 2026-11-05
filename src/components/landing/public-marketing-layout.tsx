import type { ReactNode } from 'react';
import { LandingHeader } from './landing-header';
import { LandingFooter } from './landing-footer';

export function PublicMarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fe-landing min-h-screen bg-[var(--fe-ink)] text-[var(--fe-text)]">
      <LandingHeader secondary />
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-[var(--fe-ink)] focus:p-3 focus:text-[var(--fe-lime)]">Saltar al contenido principal</a>
      <main id="contenido" className="pt-[var(--header-h)]">{children}</main>
      <LandingFooter />
    </div>
  );
}
