import type { ReactNode } from "react";

export function PublicLegalShell({ children }: { children: ReactNode }) {
  return (
    <main className="fe-public-page min-h-screen bg-[#080a0f] text-white">
      <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16 lg:px-8 lg:py-24">
        {children}
      </div>
    </main>
  );
}
