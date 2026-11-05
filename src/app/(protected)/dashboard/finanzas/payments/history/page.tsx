"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaymentHistoryPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/finanzas/payments");
  }, [router]);
  return <div className="p-6 text-sm text-muted-foreground">Redirigiendo a Pagos...</div>;
}
