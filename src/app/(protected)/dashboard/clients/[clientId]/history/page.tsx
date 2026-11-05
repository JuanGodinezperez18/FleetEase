"use client";

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ClientHistoryRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  useEffect(() => {
    if (clientId) {
      router.replace(`/dashboard/clients/${clientId}#historial`);
    }
  }, [clientId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-[18px] bg-[#080a0f] text-white/50">
      Cargando historial del cliente…
    </div>
  );
}
