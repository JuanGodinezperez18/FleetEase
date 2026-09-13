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
import { HandCoins, UserRound, Briefcase, Building2, CreditCard, Link2, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const PAYMENT_KINDS = [
  { value: "client_payment", label: "Pago de Cliente", short: "Clientes", affects: "client_balance", icon: UserRound },
  { value: "partner_payment", label: "Pago a Socio", short: "Socios", affects: "partner_balance", icon: Briefcase },
  { value: "supplier_payment", label: "Pago a Proveedor", short: "Proveedores", affects: "supplier_balance", icon: Building2 },
  { value: "credit_payment", label: "Pago de Crédito", short: "Créditos", affects: "credit_payment", icon: CreditCard },
] as const;
type PaymentKind = typeof PAYMENT_KINDS[number]["value"];
type OperationKind = PaymentKind | "security_deposit_refund";
type PaymentSource = "direct" | "security_deposit";
type LinkRow = { target_financial_record_id: string; source_financial_record_id: string; amount_applied: number | null; relationship_type: string };

const SECURITY_DEPOSIT_CATEGORY = "Depósito en Garantía";

function getSupabaseErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const e = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    const parts = [
      typeof e.message === "string" ? e.message : "",
      typeof e.code === "string" ? `Código: ${e.code}` : "",
      typeof e.details === "string" ? e.details : "",
      typeof e.hint === "string" ? `Ayuda: ${e.hint}` : "",
    ].filter(Boolean);
    if (parts.length) return parts.join(" — ");
  }
  return "Error inesperado.";
}

export default function PaymentsPage() {
  const { financialRecords, financialCategories, clients, partners, credits, creditPaymentSchedules, refreshData, selectedCompanyId } = useData();
  const { currentUser } = useAuth();
  const [kind, setKind] = useState<OperationKind>("client_payment");
  const [entityId, setEntityId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("Transferencia");
  const [reference, setReference] = useState("");
  const [paymentSource, setPaymentSource] = useState<PaymentSource>("direct");
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const companyId = selectedCompanyId || currentUser?.companyId || null;

  useEffect(() => {
    let cancelled = false;
    if (!companyId) { setSuppliers([]); return; }
    void supabase.from("suppliers").select("id,name").eq("company_id", companyId).eq("is_deleted", false).eq("is_active", true).order("name")
      .then(({ data }) => { if (!cancelled) setSuppliers((data || []) as Array<{ id: string; name: string }>); });
    return () => { cancelled = true; };
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    if (!companyId || !financialRecords.length) { setLinks([]); return; }
    const targetIds = financialRecords.filter(r => !r.isDeleted).map(r => r.id);
    void supabase.from("financial_record_links")
      .select("target_financial_record_id,source_financial_record_id,amount_applied,relationship_type")
      .eq("company_id", companyId).in("target_financial_record_id", targetIds.slice(0, 5000))
      .then(({ data }) => { if (!cancelled) setLinks((data || []) as LinkRow[]); });
    return () => { cancelled = true; };
  }, [companyId, financialRecords]);

  const paymentCategory = useMemo(() => {
    const aliases: Record<PaymentKind, string[]> = {
      client_payment: ["Pago de Cliente", "Pago Cliente", "Abono de Cliente"],
      partner_payment: ["Pago a Socio", "Pago de Socio", "Abono a Socio"],
      supplier_payment: ["Pago a Proveedor", "Pago de Proveedor", "Abono a Proveedor"],
      credit_payment: ["Pago de Crédito", "Pago Credito", "Pago de Crédito Semanal"],
    };
    const exact = financialCategories.find(c => c.type === "payment" && aliases[kind as PaymentKind]?.some(n => n.toLowerCase() === c.name.trim().toLowerCase()));
    return exact || financialCategories.find(c => c.type === "payment" && c.paymentKind === kind);
  }, [financialCategories, kind]);

  const refundCategory = useMemo(() => financialCategories.find(c => c.type === "expense" && c.name.trim().toLowerCase() === "devolución de depósito"), [financialCategories]);

  const entities = kind === "client_payment" || kind === "security_deposit_refund" ? clients.filter(c => c.status === "active" && !c.isDeleted)
    : kind === "partner_payment" ? partners.filter(p => !p.isDeleted)
    : kind === "supplier_payment" ? suppliers
    : clients.filter(c => c.status === "active" && !c.isDeleted && credits.some(cr => cr.clientId === c.id && cr.status === "active" && !cr.isDeleted));

  const appliedByTarget = useMemo(() => {
    const map = new Map<string, number>();
    for (const link of links) {
      const applied = Number(link.amount_applied ?? financialRecords.find(r => r.id === link.source_financial_record_id)?.amount ?? 0);
      if (applied > 0) map.set(link.target_financial_record_id, (map.get(link.target_financial_record_id) || 0) + applied);
    }
    return map;
  }, [links, financialRecords]);

  const depositAvailableByClient = useMemo(() => {
    const received = new Map<string, number>();
    for (const record of financialRecords) {
      if (!record.isDeleted && record.type === "income" && record.category === SECURITY_DEPOSIT_CATEGORY && record.clientId) {
        received.set(record.clientId, (received.get(record.clientId) || 0) + Number(record.amount || 0));
      }
    }
    const used = new Map<string, number>();
    for (const link of links) {
      if (link.relationship_type !== "security_deposit_application" && link.relationship_type !== "security_deposit_refund") continue;
      const deposit = financialRecords.find(r => r.id === link.target_financial_record_id);
      if (!deposit?.clientId || deposit.isDeleted || deposit.category !== SECURITY_DEPOSIT_CATEGORY) continue;
      const applied = Number(link.amount_applied ?? financialRecords.find(r => r.id === link.source_financial_record_id)?.amount ?? 0);
      used.set(deposit.clientId, (used.get(deposit.clientId) || 0) + applied);
    }
    const result = new Map<string, number>();
    for (const [clientId, total] of received) result.set(clientId, Math.max(0, total - (used.get(clientId) || 0)));
    return result;
  }, [financialRecords, links]);

  const targets = useMemo(() => {
    if (!entityId) return [];
    if (kind === "client_payment") return financialRecords.filter(r => !r.isDeleted && r.type === "income" && r.clientId === entityId && r.category !== SECURITY_DEPOSIT_CATEGORY)
      .map(r => ({ ...r, outstanding: Math.max(0, Number(r.amount) - (appliedByTarget.get(r.id) || 0)) }))
      .filter(r => r.outstanding > 0).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (kind === "partner_payment") return financialRecords.filter(r => !r.isDeleted && r.type === "expense" && r.partnerId === entityId)
      .map(r => ({ ...r, outstanding: Math.max(0, Number(r.amount) - (appliedByTarget.get(r.id) || 0)) }))
      .filter(r => r.outstanding > 0).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return [];
  }, [financialRecords, entityId, kind, appliedByTarget]);

  const selectedCredit = useMemo(() => kind === "credit_payment" ? credits.find(c => c.id === entityId && c.status === "active" && !c.isDeleted) : null, [credits, entityId, kind]);
  const pendingSchedule = useMemo(() => selectedCredit ? creditPaymentSchedules.filter(s => s.creditId === selectedCredit.id && s.status === "pending").sort((a, b) => a.paymentNumber - b.paymentNumber) : [], [selectedCredit, creditPaymentSchedules]);
  const selectedTarget = targets.find(r => r.id === targetId);
  const depositAvailable = kind === "client_payment" ? (depositAvailableByClient.get(entityId) || 0) : 0;
  const targetOutstanding = selectedTarget?.outstanding || (kind === "credit_payment" ? Number(selectedCredit?.remainingBalance || 0) : 0);
  const maxAmount = kind === "security_deposit_refund" ? depositAvailableByClient.get(entityId) || 0 : paymentSource === "security_deposit" && kind === "client_payment" ? Math.min(targetOutstanding, depositAvailable) : targetOutstanding;

  const reset = () => { setEntityId(""); setTargetId(""); setAmount(""); setReference(""); setPaymentSource("direct"); };

  const savePayment = async () => {
    const numericAmount = Number(amount);
    if (!companyId) return toast.error("No hay una empresa seleccionada.");
    if (!entityId) return toast.error("Selecciona a quién corresponde la operación.");
    if (!(numericAmount > 0)) return toast.error("El importe debe ser mayor que cero.");
    if (kind === "security_deposit_refund") {
      if (!refundCategory) return toast.error("No existe la categoría Devolución de Depósito.");
      if (numericAmount > (depositAvailableByClient.get(entityId) || 0) + 0.009) return toast.error(`La devolución no puede exceder el depósito disponible de ${formatCurrency(depositAvailableByClient.get(entityId) || 0)}.`);
    } else {
      if (!paymentCategory) return toast.error(`No existe una categoría configurada para ${PAYMENT_KINDS.find(k => k.value === kind)?.label}.`);
      if (kind !== "supplier_payment" && kind !== "credit_payment" && !targetId) return toast.error("Selecciona el registro al que se aplicará el pago.");
      if (maxAmount > 0 && numericAmount > maxAmount + 0.009) return toast.error(`El pago no puede exceder el máximo aplicable de ${formatCurrency(maxAmount)}.`);
      if (kind === "client_payment" && paymentSource === "security_deposit" && depositAvailable <= 0) return toast.error("El cliente no tiene depósito en garantía disponible.");
    }

    setSaving(true);
    try {
      if (kind === "security_deposit_refund") {
        const { data, error } = await supabase.rpc("refund_security_deposit", {
          p_company_id: companyId, p_client_id: entityId, p_amount: numericAmount,
          p_payment_date: date, p_payment_method: method, p_reference: reference || null,
          p_created_by: currentUser?.uid || null,
        } as any);
        if (error) throw error;
        if (!data) throw new Error("La base de datos no devolvió la devolución creada.");
        toast.success("Depósito devuelto", { description: "La devolución quedó registrada como salida de empresa y con trazabilidad." });
      } else if (kind === "credit_payment") {
        const { data, error } = await supabase.rpc("process_credit_payment_atomic", {
          p_company_id: companyId, p_credit_id: entityId, p_client_id: selectedCredit?.clientId || null,
          p_amount: numericAmount, p_payment_date: date, p_payment_method: method,
          p_reference: reference || null, p_created_by: currentUser?.uid || null,
        } as any);
        if (error) throw error;
        if (!data) throw new Error("La base de datos no devolvió el pago del crédito.");
        toast.success("Pago registrado");
      } else if (kind === "client_payment" && paymentSource === "security_deposit") {
        const { data, error } = await supabase.rpc("apply_security_deposit_payment", {
          p_company_id: companyId, p_client_id: entityId, p_target_financial_record_id: targetId,
          p_amount: numericAmount, p_payment_date: date, p_payment_method: method,
          p_reference: reference || null, p_created_by: currentUser?.uid || null,
        } as any);
        if (error) throw error;
        if (!data) throw new Error("La base de datos no devolvió la aplicación del depósito.");
        toast.success("Depósito aplicado", { description: "El depósito disminuyó y el importe se aplicó al folio seleccionado sin generar un ingreso duplicado." });
      } else {
        const { data, error } = await supabase.rpc("create_financial_payment", {
          p_company_id: companyId, p_payment_kind: kind, p_amount: numericAmount,
          p_payment_date: date, p_payment_method: method, p_reference: reference || null,
          p_client_id: kind === "client_payment" ? entityId : null,
          p_partner_id: kind === "partner_payment" ? entityId : null,
          p_supplier_id: kind === "supplier_payment" ? entityId : null,
          p_target_financial_record_id: targetId || null, p_credit_id: null,
          p_credit_payment_schedule_id: null, p_created_by: currentUser?.uid || null,
        } as any);
        if (error) throw error;
        if (!data) throw new Error("La base de datos no devolvió el pago creado.");
        toast.success("Pago registrado", { description: "El movimiento quedó separado de Ingresos y con trazabilidad financiera." });
      }

      reset();
      try {
        await refreshData();
      } catch (refreshError) {
        console.warn("Pago registrado correctamente, pero no se pudo actualizar la vista automáticamente.", refreshError);
      }
    } catch (error) {
      toast.error("No se pudo registrar la operación", { description: getSupabaseErrorMessage(error) });
    } finally { setSaving(false); }
  };

  const tabItems = [...PAYMENT_KINDS.map(item => ({ ...item, value: item.value as OperationKind })), { value: "security_deposit_refund" as const, label: "Devolver Depósito", short: "Devolución", icon: RotateCcw }];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-3"><HandCoins className="h-6 w-6 text-primary" /></div>
        <div><h1 className="text-2xl font-bold tracking-tight">Pagos</h1><p className="text-muted-foreground">Pagos, aplicación de depósitos y devoluciones con trazabilidad financiera.</p></div>
      </div>

      <Tabs value={kind} onValueChange={v => { setKind(v as OperationKind); reset(); }}>
        <TabsList className="grid w-full max-w-5xl grid-cols-2 md:grid-cols-5">
          {tabItems.map(item => { const Icon = item.icon; return <TabsTrigger key={item.value} value={item.value}><Icon className="mr-2 h-4 w-4" />{item.short}</TabsTrigger>; })}
        </TabsList>
        {tabItems.map(item => <TabsContent key={item.value} value={item.value} className="mt-6">
          <Card className="max-w-4xl">
            <CardHeader>
              <CardTitle>{item.label}</CardTitle>
              <CardDescription>{kind === "security_deposit_refund" ? "Devuelve al cliente una parte o la totalidad del depósito disponible. La devolución se registra como salida de la empresa." : "El movimiento se registra separado de Ingresos y se relaciona con la obligación que está liquidando."}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2"><Label>{kind === "client_payment" || kind === "credit_payment" || kind === "security_deposit_refund" ? "Cliente" : kind === "partner_payment" ? "Socio" : "Proveedor"}</Label>
                <Select value={entityId} onValueChange={v => { setEntityId(v); setTargetId(""); }}><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger><SelectContent>{entities.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name || `${e.firstname || ""} ${e.lastname || ""}`.trim()}</SelectItem>)}</SelectContent></Select>
              </div>

              {kind === "client_payment" && <div className="space-y-2"><Label>Origen del pago</Label><Select value={paymentSource} onValueChange={v => setPaymentSource(v as PaymentSource)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="direct">Pago directo (efectivo, transferencia, tarjeta)</SelectItem><SelectItem value="security_deposit">Aplicar Depósito en Garantía</SelectItem></SelectContent></Select></div>}

              {kind === "client_payment" && entityId && <div className="md:col-span-2 rounded-lg border bg-muted/30 p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Depósito en garantía disponible</span><Badge variant="outline"><ShieldCheck className="mr-1 h-3 w-3" />Separado de deuda</Badge></div><p className="mt-1 text-xl font-semibold">{formatCurrency(depositAvailable)}</p></div>}

              {kind !== "supplier_payment" && kind !== "credit_payment" && <div className="space-y-2"><Label>Aplicar a registro</Label><Select value={targetId} onValueChange={setTargetId} disabled={!entityId}><SelectTrigger><SelectValue placeholder="Seleccionar cargo pendiente..." /></SelectTrigger><SelectContent>{targets.map(r => <SelectItem key={r.id} value={r.id}>{r.category} · Pendiente {formatCurrency(r.outstanding)} · {new Date(r.date).toLocaleDateString("es-MX")}</SelectItem>)}</SelectContent></Select></div>}

              {kind === "credit_payment" && selectedCredit && <div className="space-y-2 md:col-span-2"><Label>Cuota pendiente</Label><div className="rounded-lg border bg-muted/30 p-3 text-sm">{pendingSchedule.length ? <>{pendingSchedule.slice(0, 3).map(s => <div key={s.id} className="flex justify-between py-1"><span>Cuota #{s.paymentNumber}</span><span>{formatCurrency(Number(s.amount) - Number(s.paidAmount || 0))}</span></div>)}</> : <span className="text-muted-foreground">No hay cuotas pendientes.</span>}</div></div>}

              <div className="space-y-2"><Label>Importe</Label><Input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" /></div>
              <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div className="space-y-2"><Label>Método de pago</Label><Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Efectivo", "Transferencia", "Tarjeta", "Cheque"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Referencia</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Opcional" /></div>

              {kind === "security_deposit_refund" && entityId && <div className="md:col-span-2 rounded-lg border bg-muted/30 p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Disponible para devolución</span><Badge variant="outline"><RotateCcw className="mr-1 h-3 w-3" />Depósito en Garantía</Badge></div><p className="mt-1 text-xl font-semibold">{formatCurrency(depositAvailableByClient.get(entityId) || 0)}</p></div>}

              {((selectedTarget || selectedCredit) || kind === "security_deposit_refund") && <div className="md:col-span-2 rounded-lg border bg-muted/30 p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Resumen de operación</span><Badge variant="outline"><Link2 className="mr-1 h-3 w-3" />Trazabilidad FIN</Badge></div><div className="mt-2 grid gap-2 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Máximo aplicable</p><p className="font-semibold">{formatCurrency(maxAmount)}</p></div><div><p className="text-xs text-muted-foreground">Este movimiento</p><p className="font-semibold">{formatCurrency(Number(amount) || 0)}</p></div><div><p className="text-xs text-muted-foreground">Restante</p><p className="font-semibold">{formatCurrency(Math.max(0, maxAmount - (Number(amount) || 0)))}</p></div></div></div>}

              <div className="md:col-span-2 flex justify-end"><Button onClick={savePayment} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : kind === "security_deposit_refund" ? <RotateCcw className="mr-2 h-4 w-4" /> : <HandCoins className="mr-2 h-4 w-4" />} {kind === "security_deposit_refund" ? "Devolver depósito" : "Registrar pago"}</Button></div>
            </CardContent>
          </Card>
        </TabsContent>)}
      </Tabs>
    </div>
  );
}
