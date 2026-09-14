"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-provider";
import { useData } from "@/contexts/data-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        const { data } = await supabase.from("suppliers").select("name").eq("id", partyId).eq("company_id", companyId).maybeSingle();
        if (!cancelled) setName(data?.name || "Proveedor");
      } else {
        const partner = partners.find(p => p.id === partyId);
        if (!cancelled) setName(partner?.name || "Socio");
      }
    };
    void load();
    return () => { cancelled = true; };
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
      toast.success("Pago registrado", { description: `${name}: ${formatCurrency(numericAmount)} aplicado a la obligación.` });
      router.push("/dashboard/finanzas/accounts-payable");
    } catch (error) {
      toast.error("No se pudo registrar el pago", { description: error instanceof Error ? error.message : "Error inesperado." });
    } finally { setSaving(false); }
  };

  return <div className="space-y-6 p-4 md:p-6">
    <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Regresar</Button>
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Registrar pago</CardTitle><CardDescription>{partyType === "partner" ? "Pago a socio" : "Pago a proveedor"} · {name}</CardDescription></CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2"><Label>Importe a aplicar</Label><Input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" /></div>
        <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="space-y-2"><Label>Método de pago</Label><Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Efectivo", "Transferencia", "Tarjeta", "Cheque"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2 md:col-span-2"><Label>Referencia</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Opcional" /></div>
        <div className="md:col-span-2 flex justify-end"><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HandCoins className="mr-2 h-4 w-4" />}Aplicar pago</Button></div>
      </CardContent>
    </Card>
  </div>;
}
