"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Redirige al módulo unificado de Pagos (pestaña Historial). */
export default function PaymentHistoryPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/finanzas/payments?tab=historial");
  }, [router]);
  return (
    <div className="p-6 text-sm text-muted-foreground">
      Redirigiendo al historial de pagos...
    </div>
  );
}
