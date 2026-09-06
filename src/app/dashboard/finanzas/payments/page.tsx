"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useData } from "@/contexts/data-provider";
import { useAuth } from "@/contexts/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HandCoins, UserRound, Briefcase, Building2, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const PAYMENT_KINDS = [
  { value: "client_payment", label: "Pago de Cliente", affects: "client_balance", icon: UserRound },
  { value: "partner_payment", label: "Pago a Socio", affects: "partner_balance", icon: Briefcase },
  { value: "supplier_payment", label: "Pago a Proveedor", affects: "none", icon: Building2 },
] as const;
type PaymentKind = typeof PAYMENT_KINDS[number]["value"];

export default function PaymentsPage() {
  const { financialRecords, financialCategories, clients, partners, refreshData, selectedCompanyId } = useData();
  const { currentUser } = useAuth();
  const [kind, setKind] = useState<PaymentKind>("client_payment");
  const [entityId, setEntityId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("Transferencia");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const companyId = selectedCompanyId || currentUser?.companyId || null;

  const paymentCategory = useMemo(() => {
    const aliases: Record<PaymentKind, string[]> = {
      client_payment: ["Pago de Cliente", "Pago Cliente", "Abono de Cliente"],
      partner_payment: ["Pago a Socio", "Pago de Socio", "Abono a Socio"],
      supplier_payment: ["Pago a Proveedor", "Pago de Proveedor", "Abono a Proveedor"],
    };
    return financialCategories.find(c => c.type === "payment" && aliases[kind].some(n => n.toLowerCase() === c.name.trim().toLowerCase())) || financialCategories.find(c => c.type === "payment" && c.affects === PAYMENT_KINDS.find(k => k.value === kind)?.affects);
  }, [financialCategories, kind]);

  const entities = kind === "client_payment" ? clients.filter(c => c.status === "active" && !c.isDeleted) : partners.filter(p => !p.isDeleted);
  const targets = useMemo(() => {
    if (!entityId) return [];
    if (kind === "client_payment") return financialRecords.filter(r => !r.isDeleted && r.type === "income" && r.clientId === entityId && r.category !== "Depósito en Garantía").sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (kind === "partner_payment") return financialRecords.filter(r => !r.isDeleted && r.type === "expense" && r.partnerId === entityId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return [];
  }, [financialRecords, entityId, kind]);
  const selectedTarget = targets.find(r => r.id === targetId);
  const reset = () => { setEntityId(""); setTargetId(""); setAmount(""); setReference(""); };

  const savePayment = async () => {
    const numericAmount = Number(amount);
    if (!companyId) return toast.error("No hay una empresa seleccionada.");
    if (!paymentCategory) return toast.error(`No existe una categoría configurada para ${PAYMENT_KINDS.find(k => k.value === kind)?.label}.`);
    if (!entityId) return toast.error("Selecciona a quién corresponde el pago.");
    if (!(numericAmount > 0)) return toast.error("El importe debe ser mayor a cero.");
    if (kind !== "supplier_payment" && !targetId) return toast.error("Selecciona el registro al que se aplicará el pago.");
    if (selectedTarget && numericAmount > selectedTarget.amount) return toast.error("El pago no puede exceder el importe del registro seleccionado.");
    setSaving(true);
    try {
      const payload: any = { company_id: companyId, category_id: paymentCategory.id, category: paymentCategory.name, type: "payment", amount: numericAmount, payment_method: method, description: `${PAYMENT_KINDS.find(k => k.value === kind)?.label}${reference ? ` · Ref. ${reference}` : ""}`, date: new Date(`${date}T12:00:00`).toISOString(), is_deleted: false, created_by: currentUser?.uid || null, payment_kind: kind };
      if (kind === "client_payment") payload.client_id = entityId;
      if (kind === "partner_payment") payload.partner_id = entityId;
      if (kind === "supplier_payment") payload.supplier_id = entityId;
      const { data: payment, error } = await supabase.from("financial_records").insert(payload).select("id").single();
      if (error) throw error;
      if (targetId && payment?.id) {
        const { error: linkError } = await supabase.from("financial_record_links").insert({ company_id: companyId, source_financial_record_id: payment.id, target_financial_record_id: targetId, relationship_type: `${kind}_to_financial_record`, amount_applied: numericAmount, created_by: currentUser?.uid || null } as any);
        if (linkError) throw linkError;
      }
      toast.success("Pago registrado", { description: targetId ? "El pago quedó ligado al registro seleccionado." : "El pago quedó registrado." });
      await refreshData(); reset();
    } catch (error) { toast.error("No se pudo registrar el pago", { description: error instanceof Error ? error.message : "Error inesperado." }); }
    finally { setSaving(false); }
  };

  return <div className="space-y-6 p-4 md:p-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-3"><HandCoins className="h-6 w-6 text-primary" /></div><div><h1 className="text-2xl font-bold tracking-tight">Pagos</h1><p className="text-muted-foreground">Clientes, socios y proveedores en un flujo separado de Ingresos y Gastos.</p></div></div><Tabs value={kind} onValueChange={v => { setKind(v as PaymentKind); reset(); }}><TabsList className="grid w-full max-w-2xl grid-cols-3">{PAYMENT_KINDS.map(item => { const Icon = item.icon; return <TabsTrigger key={item.value} value={item.value}><Icon className="mr-2 h-4 w-4" />{item.label.replace("Pago de ", "").replace("Pago a ", "")}</TabsTrigger>; })}</TabsList>{PAYMENT_KINDS.map(item => <TabsContent key={item.value} value={item.value} className="mt-6"><Card className="max-w-4xl"><CardHeader><CardTitle>{item.label}</CardTitle><CardDescription>El pago queda como movimiento financiero independiente y puede ligarse al registro que está liquidando.</CardDescription></CardHeader><CardContent className="grid gap-5 md:grid-cols-2"><div className="space-y-2"><Label>{kind === "client_payment" ? "Cliente" : kind === "partner_payment" ? "Socio" : "Proveedor"}</Label>{kind === "supplier_payment" ? <SupplierSelect value={entityId} onChange={setEntityId} companyId={companyId} /> : <Select value={entityId} onValueChange={v => { setEntityId(v); setTargetId(""); }}><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger><SelectContent>{entities.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name || `${e.firstname || ""} ${e.lastname || ""}`.trim()}</SelectItem>)}</SelectContent></Select>}</div>{kind !== "supplier_payment" && <div className="space-y-2"><Label>Aplicar a registro</Label><Select value={targetId} onValueChange={setTargetId} disabled={!entityId}><SelectTrigger><SelectValue placeholder="Seleccionar cargo..." /></SelectTrigger><SelectContent>{targets.map(r => <SelectItem key={r.id} value={r.id}>{r.category} · {formatCurrency(r.amount)} · {new Date(r.date).toLocaleDateString("es-MX")}</SelectItem>)}</SelectContent></Select></div>}<div className="space-y-2"><Label>Importe</Label><Input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" /></div><div className="space-y-2"><Label>Fecha</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div><div className="space-y-2"><Label>Método de pago</Label><Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Efectivo", "Transferencia", "Tarjeta", "Cheque"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Referencia</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Opcional" /></div>{selectedTarget && <div className="md:col-span-2 rounded-lg border bg-muted/30 p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Registro relacionado</span><Badge variant="outline"><Link2 className="mr-1 h-3 w-3" />Trazabilidad</Badge></div><p className="mt-2 font-medium">{selectedTarget.category} · {formatCurrency(selectedTarget.amount)}</p><p className="text-sm text-muted-foreground">El pago de {formatCurrency(Number(amount) || 0)} se aplicará a este registro.</p></div>}<div className="md:col-span-2 flex justify-end"><Button onClick={savePayment} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HandCoins className="mr-2 h-4 w-4" />}Registrar pago</Button></div></CardContent></Card></TabsContent>)}</Tabs></div>;
}

function SupplierSelect({ value, onChange, companyId }: { value: string; onChange: (value: string) => void; companyId: string | null }) {
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => { let cancelled = false; if (!companyId) { setSuppliers([]); return; } void supabase.from("suppliers").select("id,name").eq("company_id", companyId).order("name").then(({ data }) => { if (!cancelled) setSuppliers(data || []); }); return () => { cancelled = true; }; }, [companyId]);
  return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger><SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>;
}
