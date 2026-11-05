'use client';

import { landingFaqs } from '@/config/landing-faq';

export function LandingFaq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-[var(--header-h)] border-y border-[var(--fe-border)] bg-[var(--fe-main)]">
      <div className="mx-auto grid max-w-[1240px] gap-6 px-5 py-10 sm:py-12 lg:grid-cols-[0.65fr_1.35fr] lg:gap-12 lg:px-8">
        <h2 id="faq-title" className="text-3xl font-semibold tracking-tight">Antes de empezar.</h2>
        <div>
          {landingFaqs.map(([question,answer]) => (
            <details key={question} className="group border-b border-[var(--fe-border)] last:border-0">
              <summary className="min-h-14 cursor-pointer rounded-sm py-4 pr-3 text-base font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fe-lime)]">{question}</summary>
              <p className="pb-5 text-base leading-7 text-[var(--fe-text-secondary)]">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
