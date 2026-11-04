"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Ruta legacy /dashboard/clients/transactions (sin clientId).
 * El estado de cuenta vive en /dashboard/clients/[clientId]/transactions.
 * Redirigimos a la lista para evitar una página duplicada y rota.
 */
export default function ClientsTransactionsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/clients');
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-[18px] bg-[#080a0f] text-white/50">
      <Loader2 className="h-8 w-8 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
    </div>
  );
}
