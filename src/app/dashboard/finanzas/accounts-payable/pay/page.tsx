"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-provider";
import { useData } from "@/contexts/data-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, HandCoins, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export default function PayableSettlementPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { selectedCompanyId, partners } = useData();
  const companyId = selectedCompanyId || currentUser?.companyId || null;
  const targetId = params.get("targetId") || "";
  const partyType = params.get("partyType") || "supplier";
  const partyId = params.get("partyId") || "";
  const initialAmount = params.get("amount") || "";
  const [name, setName] = useState("Cargando...");
  const [amount, setAmount] = useState(initialAmount);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("Transferencia");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId || !partyId) return;
    let cancelled = false;
    const load = async () => {
      if (partyType === "supplier") {
        const { data } = await supabase
          .from("suppliers")
          .select("name")
          .eq("id", partyId)
          .eq("company_id", companyId)
          .maybeSingle();
        if (!cancelled) setName(data?.name || "Proveedor");
      } else {
        const partner = partners.find(p => p.id === partyId);
        if (!cancelled) setName(partner?.name || "Socio");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId, partyId, partyType, partners]);

  const save = async () => {
    const numericAmount = Number(amount);
    if (!companyId || !partyId || !targetId) return toast.error("Faltan datos de la obligación.");
    if (!(numericAmount > 0)) return toast.error("El importe debe ser mayor que cero.");
    setSaving(true);
    try {
      const { error } = await supabase.rpc("create_financial_payment", {
        p_company_id: companyId,
        p_payment_kind: partyType === "partner" ? "partner_payment" : "supplier_payment",
        p_amount: numericAmount,
        p_payment_date: date,
        p_payment_method: method,
        p_reference: reference || null,
        p_client_id: null,
        p_partner_id: partyType === "partner" ? partyId : null,
        p_supplier_id: partyType === "supplier" ? partyId : null,
        p_target_financial_record_id: targetId,
        p_credit_id: null,
        p_credit_payment_schedule_id: null,
        p_created_by: currentUser?.uid || null,
      } as any);
      if (error) throw error;
      toast.success("Pago registrado", {
        description: `${name}: ${formatCurrency(numericAmount)} aplicado a la obligación.`,
      });
      router.push("/dashboard/finanzas/accounts-payable");
    } catch (error) {
      toast.error("No se pudo registrar el pago", {
        description: error instanceof Error ? error.message : "Error inesperado.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="flex flex-col gap-3">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="h-9 w-fit rounded-xl px-3 text-white/50 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Regresar
          </Button>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
                Finanzas · CxP
              </div>
              <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
                Registrar pago
              </h1>
              <p className="mt-1 text-sm text-white/40">
                {partyType === "partner" ? "Pago a socio" : "Pago a proveedor"} · {name}
              </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
              <HandCoins className="h-5 w-5" strokeWidth={1.75} />
            </div>
          </div>
        </header>

        <div className="max-w-2xl overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-5 shadow-[0_18px_50px_rgba(0,0,0,.22)] sm:p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-white/50">Importe a aplicar</Label>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                className="border-white/10 bg-white/[0.03] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/50">Fecha</Label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="border-white/10 bg-white/[0.03] text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/50">Método de pago</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="border-white/10 bg-white/[0.03] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Efectivo", "Transferencia", "Tarjeta", "Cheque"].map(m => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-white/50">Referencia</Label>
              <Input
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="Opcional"
                className="border-white/10 bg-white/[0.03] text-white"
              />
            </div>
            <div className="md:col-span-2 flex justify-end pt-1">
              <Button
                onClick={save}
                disabled={saving}
                className="h-11 rounded-xl bg-[#d7ff3f] px-5 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
                ) : (
                  <HandCoins className="mr-2 h-4 w-4" strokeWidth={1.75} />
                )}
                Aplicar pago
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
