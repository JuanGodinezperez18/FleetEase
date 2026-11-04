"use client";

import { useState } from "react";
import { HandCoins, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormModal } from "@/components/common/form-modal";
import { PaymentForm } from "./components/payment-form";
import { PaymentHistoryView } from "./history/components/payment-history-view";

export default function PaymentsPage() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[18px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="fe-module-header">
          <div>
            <div className="fe-module-eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              Finanzas
            </div>
            <h1 className="fe-module-title">Pagos</h1>
            <p className="fe-module-subtitle">
              Historial de pagos registrados. Usa el botón para crear uno nuevo.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setFormOpen(true)}
            className="h-10 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
          >
            <PlusCircle className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Registrar pago
          </Button>
        </header>

        <PaymentHistoryView embedded />
      </div>

      <FormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title="Registrar pago"
        description="Selecciona el tipo de pago y completa los datos requeridos."
      >
        <PaymentForm
          embedded
          onClose={() => setFormOpen(false)}
          onSuccess={() => setFormOpen(false)}
        />
      </FormModal>
    </div>
  );
}
