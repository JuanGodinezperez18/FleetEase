"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useData, calculatePartnerBalance } from "@/contexts/data-provider";
import { useAuth } from "@/contexts/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HandCoins, UserRound, Briefcase, Building2, CreditCard, Link2, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const PAYMENT_KINDS = [
  { value: "client_payment", label: "Pago de Cliente", short: "Clientes", affects: "client_balance", icon: UserRound },
  { value: "multa_payment", label: "Pago de Multa", short: "Multas", affects: "client_balance", icon: ShieldCheck },
  { value: "partner_payment", label: "Pago a Socio", short: "Socios", affects: "partner_balance", icon: Briefcase },
  { value: "supplier_payment", label: "Pago a Proveedor", short: "Proveedores", affects: "supplier_balance", icon: Building2 },
  { value: "credit_payment", label: "Pago de Crédito", short: "Créditos", affects: "credit_payment", icon: CreditCard },
] as const;
type PaymentKind = typeof PAYMENT_KINDS[number]["value"];
type OperationKind = PaymentKind | "security_deposit_refund";
type PaymentSource = "direct" | "security_deposit";
type LinkRow = { target_financial_record_id: string; source_financial_record_id: string; amount_applied: number | null; relationship_type: string };
type SupplierPayable = { id: string; purchaseId: string | null; sourceFinancialRecordId: string | null; purchaseDate: string | null; reference: string | null; total: number; dueDate: string | null; status: string; outstanding: number };

const SECURITY_DEPOSIT_CATEGORY = "Depósito en Garantía";

function getSupabaseErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (/financial_records_company_reference_code_uidx|duplicate key.*reference_code/i.test(error.message)) {
      return "La referencia ya existe en esta empresa. Déjala vacía para generar un folio automático, o usa una referencia distinta.";
    }
    return error.message;
  }
  if (error && typeof error === "object") {
    const e = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    const msg = typeof e.message === "string" ? e.message : "";
    if (e.code === "23505" || /financial_records_company_reference_code_uidx|duplicate key.*reference_code/i.test(msg)) {
      return "La referencia ya existe en esta empresa. Déjala vacía para generar un folio automático, o usa una referencia distinta.";
    }
    const parts = [
      msg,
      typeof e.code === "string" ? `Código: ${e.code}` : "",
      typeof e.details === "string" ? e.details : "",
      typeof e.hint === "string" ? `Ayuda: ${e.hint}` : "",
    ].filter(Boolean);
    if (parts.length) return parts.join(" — ");
  }
  return "Error inesperado.";
}

export default function PaymentsPage() {
  const { financialRecords, financialCategories, clients, partners, vehicles, credits, creditPaymentSchedules, refreshData, selectedCompanyId } = useData();
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
  const [supplierPayables, setSupplierPayables] = useState<SupplierPayable[]>([]);
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

  useEffect(() => {
    let cancelled = false;
    if (!companyId || kind !== "supplier_payment" || !entityId) { setSupplierPayables([]); return; }
    void (async () => {
      const { data, error } = await supabase.from("accounts_payable").select("id,supplier_purchase_id,source_financial_record_id,original_amount,due_date,status,supplier_purchases(purchase_date,reference,total)").eq("company_id", companyId).eq("party_type", "supplier").eq("party_id", entityId).eq("is_deleted", false).in("status", ["pending", "partially_paid"]).order("due_date", { ascending: true, nullsFirst: false });
      if (cancelled) return;
      if (error) { console.error("[FleetEase] supplier payables load failed", error); setSupplierPayables([]); return; }
      const rows = (data || []) as any[];
      const sourceIds = rows.map(r => r.source_financial_record_id).filter(Boolean);
      let paymentLinks: any[] = [];
      if (sourceIds.length) { const lr = await supabase.from("financial_record_links").select("target_financial_record_id,amount_applied,source_financial_record_id").eq("company_id", companyId).in("target_financial_record_id", sourceIds).eq("relationship_type", "supplier_payment_to_financial_record"); if (!lr.error) paymentLinks = lr.data || []; }
      const recordsById = new Map(financialRecords.map(r => [r.id, r]));
      const applied = new Map<string, number>();
      for (const link of paymentLinks) { const payment = recordsById.get(link.source_financial_record_id); if (!payment || payment.isDeleted) continue; applied.set(link.target_financial_record_id, (applied.get(link.target_financial_record_id) || 0) + Number(link.amount_applied ?? payment.amount ?? 0)); }
      if (!cancelled) setSupplierPayables(rows.map(r => { const p = r.supplier_purchases; const total = Number(r.original_amount || p?.total || 0); return { id:r.id, purchaseId:r.supplier_purchase_id || null, sourceFinancialRecordId:r.source_financial_record_id || null, purchaseDate:p?.purchase_date || null, reference:p?.reference || null, total, dueDate:r.due_date || null, status:r.status, outstanding:Math.max(0,total-(applied.get(r.source_financial_record_id) || 0)) }; }).filter(r => r.outstanding > 0.009));
    })();
    return () => { cancelled = true; };
  }, [companyId, kind, entityId, financialRecords]);

  const paymentCategory = useMemo(() => {
    const aliases: Record<PaymentKind, string[]> = {
      client_payment: ["Pago de Cliente", "Pago Cliente", "Abono de Cliente"],
      multa_payment: ["Pago de Multa", "Pago Multa", "Abono de Multa"],
      partner_payment: ["Pago a Socio", "Pago de Socio", "Abono a Socio", "Comisión Socio", "Comision Socio"],
      supplier_payment: ["Pago a Proveedor", "Pago de Proveedor", "Abono a Proveedor"],
      credit_payment: ["Pago de Crédito", "Pago Credito", "Pago de Crédito Semanal"],
    };
    const exact = financialCategories.find(c => c.type === "payment" && aliases[kind as PaymentKind]?.some(n => n.toLowerCase() === c.name.trim().toLowerCase()));
    if (exact) return exact;
    const expectedAffects = PAYMENT_KINDS.find(k => k.value === kind)?.affects;
    return financialCategories.find(c => c.type === "payment" && c.affects === expectedAffects);
  }, [financialCategories, kind]);

  const refundCategory = useMemo(() => financialCategories.find(c => c.type === "expense" && c.name.trim().toLowerCase() === "devolución de depósito"), [financialCategories]);

  const clientsById = useMemo(() => new Map(clients.map(client => [client.id, client])), [clients]);

  const financialRecordsById = useMemo(() => new Map(financialRecords.map(record => [record.id, record])), [financialRecords]);

  const creditEntities = useMemo(() => credits
    .filter(c => c.status === "active" && !c.isDeleted && (!companyId || c.companyId === companyId))
    .map(c => {
      const client = clientsById.get(c.clientId);
      const clientName = client ? `${client.firstname || ""} ${client.lastname || ""}`.trim() : "Cliente sin nombre";
      return { ...c, name: clientName };
    }), [credits, clientsById, companyId]);

  const entities = kind === "client_payment" || kind === "multa_payment" || kind === "security_deposit_refund" ? clients.filter(c => c.status === "active" && !c.isDeleted)
    : kind === "partner_payment" ? partners.filter(p => !p.isDeleted)
    : kind === "supplier_payment" ? suppliers
    : creditEntities;

  const appliedByTarget = useMemo(() => {
    const map = new Map<string, number>();
    for (const link of links) {
      // Los vínculos históricos de un pago eliminado se conservan para trazabilidad,
      // pero no deben seguir reduciendo el saldo pendiente del ingreso.
      const sourceRecord = financialRecordsById.get(link.source_financial_record_id);
      if (!sourceRecord || sourceRecord.isDeleted) continue;
      const applied = Number(link.amount_applied ?? sourceRecord.amount ?? 0);
      if (applied > 0) map.set(link.target_financial_record_id, (map.get(link.target_financial_record_id) || 0) + applied);
    }
    return map;
  }, [links, financialRecordsById]);

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
      const deposit = financialRecordsById.get(link.target_financial_record_id);
      if (!deposit?.clientId || deposit.isDeleted || deposit.category !== SECURITY_DEPOSIT_CATEGORY) continue;
      const sourceRecord = financialRecordsById.get(link.source_financial_record_id);
      if (!sourceRecord || sourceRecord.isDeleted) continue;
      const applied = Number(link.amount_applied ?? sourceRecord.amount ?? 0);
      used.set(deposit.clientId, (used.get(deposit.clientId) || 0) + applied);
    }
    const result = new Map<string, number>();
    for (const [clientId, total] of received) result.set(clientId, Math.max(0, total - (used.get(clientId) || 0)));
    return result;
  }, [financialRecords, links, financialRecordsById]);

  const targets = useMemo(() => {
    if (!entityId) return [];
    if (kind === "client_payment") return financialRecords.filter(r => !r.isDeleted && r.type === "income" && r.clientId === entityId && r.category !== SECURITY_DEPOSIT_CATEGORY && r.sourceRecordType !== "multa")
      .map(r => ({ ...r, outstanding: Math.max(0, Number(r.amount) - (appliedByTarget.get(r.id) || 0)) }))
      .filter(r => r.outstanding > 0).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (kind === "multa_payment") return financialRecords.filter(r => !r.isDeleted && r.type === "income" && r.clientId === entityId && r.sourceRecordType === "multa" && r.category === "Multa")
      .map(r => ({ ...r, outstanding: Math.max(0, Number(r.amount) - (appliedByTarget.get(r.id) || 0)) }))
      .filter(r => r.outstanding > 0).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return [];
  }, [financialRecords, entityId, kind, appliedByTarget]);

  const selectedCredit = useMemo(() => kind === "credit_payment" ? credits.find(c => c.id === entityId && c.status === "active" && !c.isDeleted) : null, [credits, entityId, kind]);
  const pendingSchedule = useMemo(() => selectedCredit ? creditPaymentSchedules
    .filter(s => s.creditId === selectedCredit.id && (s.status === "pending" || s.status === "overdue"))
    .sort((a, b) => a.paymentNumber - b.paymentNumber) : [], [selectedCredit, creditPaymentSchedules]);
  const selectedPartner = useMemo(() => kind === "partner_payment" ? partners.find(p => p.id === entityId && !p.isDeleted) : null, [partners, entityId, kind]);
  const selectedTarget = targets.find(r => r.id === targetId);
  const selectedSupplierPayable = kind === "supplier_payment" ? supplierPayables.find(r => r.id === targetId) : null;
  const depositAvailable = kind === "client_payment" ? (depositAvailableByClient.get(entityId) || 0) : 0;
  const partnerBalance = useMemo(() => {
    if (!selectedPartner) return 0;
    const partnerVehicles = vehicles.filter(v => v.partnerId === selectedPartner.id && !v.isDeleted);
    return calculatePartnerBalance(selectedPartner, partnerVehicles, financialRecords);
  }, [selectedPartner, vehicles, financialRecords]);
  const targetOutstanding = selectedTarget?.outstanding || selectedSupplierPayable?.outstanding || (kind === "credit_payment" ? Number(selectedCredit?.remainingBalance || 0) : 0);
  const maxAmount = kind === "partner_payment" ? Math.max(0, partnerBalance)
    : kind === "security_deposit_refund" ? depositAvailableByClient.get(entityId) || 0
    : paymentSource === "security_deposit" && kind === "client_payment" ? Math.min(targetOutstanding, depositAvailable) : targetOutstanding;

  const reset = () => { setEntityId(""); setTargetId(""); setAmount(""); setReference(""); setPaymentSource("direct"); };

  const savePayment = async () => {
    const numericAmount = Number(amount);
    if (!companyId) return toast.error("No hay una empresa seleccionada.");
    if (!entityId) return toast.error("Selecciona a quién corresponde la operación.");
    if (!(numericAmount > 0)) return toast.error("El importe debe ser mayor que cero.");
    if (kind === "credit_payment" && !selectedCredit) return toast.error("Selecciona un crédito activo.");
    if (kind === "security_deposit_refund") {
      if (!refundCategory) return toast.error("No existe la categoría Devolución de Depósito.");
      if (numericAmount > (depositAvailableByClient.get(entityId) || 0) + 0.009) return toast.error(`La devolución no puede exceder el depósito disponible de ${formatCurrency(depositAvailableByClient.get(entityId) || 0)}.`);
    } else {
      if (!paymentCategory) return toast.error(`No existe una categoría configurada para ${PAYMENT_KINDS.find(k => k.value === kind)?.label}.`);
      if ((kind === "client_payment" || kind === "multa_payment" || kind === "supplier_payment") && !targetId) return toast.error(kind === "supplier_payment" ? "Selecciona la compra o factura pendiente a la que se aplicará el pago." : "Selecciona el registro al que se aplicará el pago.");
      if (kind === "partner_payment" && numericAmount > partnerBalance + 0.009) return toast.error(`El pago no puede exceder el balance disponible del socio de ${formatCurrency(Math.max(0, partnerBalance))}.`);
      if (kind !== "partner_payment" && maxAmount > 0 && numericAmount > maxAmount + 0.009) return toast.error(`El pago no puede exceder el máximo aplicable de ${formatCurrency(maxAmount)}.`);
      if (kind === "client_payment" && paymentSource === "security_deposit") {
        if (depositAvailable <= 0) return toast.error("El cliente no tiene depósito en garantía disponible.");
        if (numericAmount > depositAvailable + 0.009) return toast.error(`El importe no puede exceder el depósito en garantía disponible de ${formatCurrency(depositAvailable)}.`);
      }
      if (kind === "supplier_payment" && !selectedSupplierPayable) return toast.error("Selecciona una compra pendiente del proveedor.");
    }

    setSaving(true);
    try {
      if (kind === "security_deposit_refund") {
        const { data, error } = await supabase.rpc("refund_security_deposit", {
          p_company_id: companyId, p_client_id: entityId, p_amount: numericAmount,
          p_payment_date: date, p_payment_method: method, p_reference: (reference || "").trim() || null,
          p_created_by: currentUser?.uid || null,
        } as any);
        if (error) throw error;
        if (!data) throw new Error("La base de datos no devolvió la devolución creada.");
        toast.success("Depósito devuelto", { description: "La devolución quedó registrada como salida de empresa y con trazabilidad." });
      } else if (kind === "credit_payment") {
        const { data, error } = await supabase.rpc("process_credit_payment_atomic", {
          p_company_id: companyId, p_credit_id: entityId, p_client_id: selectedCredit?.clientId || null,
          p_amount: numericAmount, p_payment_date: date, p_payment_method: method,
          p_reference: (reference || "").trim() || null, p_created_by: currentUser?.uid || null,
        } as any);
        if (error) throw error;
        if (!data) throw new Error("La base de datos no devolvió el pago del crédito.");
        toast.success("Pago registrado");
      } else if (kind === "client_payment" && paymentSource === "security_deposit") {
        const { data, error } = await supabase.rpc("apply_security_deposit_payment", {
          p_company_id: companyId, p_client_id: entityId, p_target_financial_record_id: targetId,
          p_amount: numericAmount, p_payment_date: date, p_payment_method: method,
          p_reference: (reference || "").trim() || null, p_created_by: currentUser?.uid || null,
        } as any);        if (error) throw error;
        if (!data) throw new Error("La base de datos no devolvió la aplicación del depósito.");
        toast.success("Depósito aplicado", { description: "El depósito disminuyó y el importe se aplicó al folio seleccionado sin generar un ingreso duplicado." });
      } else {
        const { data, error } = await supabase.rpc("create_financial_payment", {
          p_company_id: companyId, p_payment_kind: kind, p_amount: numericAmount,
          p_payment_date: date, p_payment_method: method, p_reference: (reference || "").trim() || null,
          p_client_id: (kind === "client_payment" || kind === "multa_payment") ? entityId : null,
          p_partner_id: kind === "partner_payment" ? entityId : null,
          p_supplier_id: kind === "supplier_payment" ? entityId : null,
          p_target_financial_record_id: kind === "partner_payment" ? null : (kind === "supplier_payment" ? (selectedSupplierPayable?.sourceFinancialRecordId || null) : (targetId || null)), p_credit_id: null,
          p_credit_payment_schedule_id: null, p_created_by: currentUser?.uid || null,
        } as any);
        if (error) throw error;
        if (!data) throw new Error("La base de datos no devolvió el pago creado.");
        toast.success("Pago registrado", { description: kind === "partner_payment" ? "El pago se aplicó al balance del socio, considerando sus ingresos, gastos y pagos anteriores." : "El movimiento quedó separado de Ingresos y con trazabilidad financiera." });
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
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[18px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="fe-module-header">
          <div>
            <div className="fe-module-eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              Finanzas
            </div>
            <h1 className="fe-module-title">
              Pagos
            </h1>
            <p className="fe-module-subtitle">
              Aplicación de pagos, depósitos y devoluciones
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
            <HandCoins className="h-5 w-5" strokeWidth={1.75} />
          </div>
        </header>

        <Tabs value={kind} onValueChange={v => { setKind(v as OperationKind); reset(); }}>
          <TabsList className="grid h-auto w-full max-w-5xl grid-cols-2 gap-1 rounded-[16px] border border-white/[0.07] bg-[#0e1117] p-1.5 md:grid-cols-5">
            {tabItems.map(item => {
              const Icon = item.icon;
              return (
                <TabsTrigger
                  key={item.value}
                  value={item.value}
                  className="min-h-11 rounded-xl px-2 py-2.5 text-xs text-white/50 data-[state=active]:bg-[#d7ff3f]/15 data-[state=active]:text-[#d7ff3f] data-[state=active]:shadow-none"
                >
                  <Icon className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                  {item.short}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tabItems.map(item => (
            <TabsContent key={item.value} value={item.value} className="mt-5">
              <div className="max-w-4xl overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-5 shadow-[0_18px_50px_rgba(0,0,0,.22)] sm:p-6">
                <div className="mb-5">
                  <h2 className="font-heading text-lg font-semibold tracking-tight text-white">
                    {item.label}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-white/40">
                    {kind === "partner_payment"
                      ? "Se descuenta del balance del socio (ingresos − gastos − pagos previos)."
                      : kind === "security_deposit_refund"
                      ? "Devuelve depósito disponible. Se registra como salida de la empresa."
                      : "Movimiento separado de Ingresos, con trazabilidad a la obligación."}
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-white/50">
                      {kind === "client_payment" || kind === "security_deposit_refund"
                        ? "Cliente"
                        : kind === "credit_payment"
                        ? "Crédito / Cliente"
                        : kind === "partner_payment"
                        ? "Socio"
                        : kind === "multa_payment"
                        ? "Cliente"
                        : "Proveedor"}
                    </Label>
                    <Select value={entityId} onValueChange={v => { setEntityId(v); setTargetId(""); }}>
                      <SelectTrigger aria-label={kind === "client_payment" || kind === "security_deposit_refund" || kind === "multa_payment" ? "Cliente" : kind === "credit_payment" ? "Crédito / Cliente" : kind === "partner_payment" ? "Socio" : "Proveedor"} className="border-white/10 bg-white/[0.03] text-white">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {entities.map((e: any) => (
                          <SelectItem key={e.id} value={e.id}>
                            {kind === "credit_payment"
                              ? `${e.name || "Cliente sin nombre"} · Saldo ${formatCurrency(Number(e.remainingBalance || 0))}`
                              : e.name || `${e.firstname || ""} ${e.lastname || ""}`.trim()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {kind === "supplier_payment" && (
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-white/50">Compra / factura pendiente</Label>
                      <Select value={targetId} onValueChange={v => { setTargetId(v); const p = supplierPayables.find(row => row.id === v); setAmount(p ? p.outstanding.toFixed(2) : ""); }} disabled={!entityId || supplierPayables.length === 0}>
                        <SelectTrigger aria-label="Compra o factura pendiente" className="border-white/10 bg-white/[0.03] text-white"><SelectValue placeholder={supplierPayables.length ? "Seleccionar compra pendiente..." : "No hay compras pendientes"} /></SelectTrigger>
                        <SelectContent>{supplierPayables.map(row => <SelectItem key={row.id} value={row.id}>{(row.reference || "Compra sin referencia") + " · " + (row.purchaseDate ? new Date(row.purchaseDate).toLocaleDateString("es-MX") : "Sin fecha") + " · Pendiente " + formatCurrency(row.outstanding)}</SelectItem>)}</SelectContent>
                      </Select>
                      {selectedSupplierPayable && <p className="text-xs text-white/35">Total de compra: {formatCurrency(selectedSupplierPayable.total)}{selectedSupplierPayable.dueDate ? " · Vence " + new Date(selectedSupplierPayable.dueDate).toLocaleDateString("es-MX") : ""}</p>}
                    </div>
                  )}

                  {kind === "client_payment" && (
                    <div className="space-y-2">
                      <Label className="text-white/50">Origen del pago</Label>
                      <Select value={paymentSource} onValueChange={v => setPaymentSource(v as PaymentSource)}>
                        <SelectTrigger aria-label="Origen del pago" className="border-white/10 bg-white/[0.03] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">Pago directo</SelectItem>
                          <SelectItem value="security_deposit">Aplicar depósito en garantía</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {kind === "client_payment" && entityId && (
                    <div className="md:col-span-2 rounded-[14px] border border-white/[0.07] bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">Depósito en garantía disponible</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                          <ShieldCheck className="h-3 w-3" strokeWidth={1.75} />
                          Separado de deuda
                        </span>
                      </div>
                      <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-white">
                        {formatCurrency(depositAvailable)}
                      </p>
                    </div>
                  )}

                  {kind === "partner_payment" && entityId && (
                    <div className="md:col-span-2 rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">Balance disponible del socio</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">
                          <Briefcase className="h-3 w-3" strokeWidth={1.75} />
                          Ingresos − gastos − pagos
                        </span>
                      </div>
                      <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-white">
                        {formatCurrency(Math.max(0, partnerBalance))}
                      </p>
                    </div>
                  )}

                  {(kind === "client_payment" || kind === "multa_payment") && (
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-white/50">{kind === "multa_payment" ? "Aplicar a multa" : "Aplicar a registro"}</Label>
                      <Select
                        value={targetId}
                        onValueChange={v => {
                          setTargetId(v);
                          const target = targets.find(r => r.id === v);
                          if (kind === "multa_payment" && target) setAmount(target.outstanding.toFixed(2));
                        }}
                        disabled={!entityId || targets.length === 0}
                      >
                        <SelectTrigger aria-label={kind === "multa_payment" ? "Multa pendiente" : "Cargo pendiente"} className="border-white/10 bg-white/[0.03] text-white">
                          <SelectValue placeholder={kind === "multa_payment" ? (targets.length ? "Seleccionar multa pendiente..." : "Este cliente no tiene multas pendientes") : "Seleccionar cargo pendiente..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {targets.map(r => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.sourceRecordType === "multa" ? `Multa${r.referenceCode ? ` · Folio ${r.referenceCode}` : ""}` : r.category} · Pendiente {formatCurrency(r.outstanding)} · {new Date(r.date).toLocaleDateString("es-MX")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {kind === "multa_payment" && entityId && targets.length === 0 && (
                        <p className="text-xs text-white/35">No hay multas con saldo pendiente para este cliente.</p>
                      )}
                    </div>
                  )}

                  {kind === "credit_payment" && selectedCredit && (
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-white/50">Cuota pendiente</Label>
                      <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-3 text-sm">
                        {pendingSchedule.length ? (
                          pendingSchedule.slice(0, 3).map(s => (
                            <div key={s.id} className="flex justify-between py-1.5 text-white/80">
                              <span>Cuota #{s.paymentNumber}</span>
                              <span className="tabular-nums">{formatCurrency(Number(s.amount) - Number(s.paidAmount || 0))}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-white/40">No hay cuotas pendientes.</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-white/50">Importe</Label>
                    {kind === "multa_payment" && selectedTarget && (
                      <p className="mb-1 text-[11px] text-[#d7ff3f]/70">Saldo pendiente de la multa: {formatCurrency(selectedTarget.outstanding)}</p>
                    )}
                    {kind === "client_payment" && paymentSource === "security_deposit" && targetId && (
                      <p className="mb-1 text-[11px] text-[#d7ff3f]/70">
                        Máximo aplicable: {formatCurrency(maxAmount)} · Depósito: {formatCurrency(depositAvailable)} · Saldo pendiente: {formatCurrency(targetOutstanding)}
                      </p>
                    )}
                    <Input
                      inputMode="decimal"
                      type="number"
                      min="0"
                      max={maxAmount > 0 ? maxAmount : undefined}
                      step="0.01"
                      value={amount}
                      onChange={e => {
                        const raw = e.target.value.replace(/[^0-9.]/g, "");
                        const next = Number(raw);
                        if (Number.isFinite(next) && next > maxAmount && maxAmount > 0) {
                          setAmount(maxAmount.toFixed(2));
                          return;
                        }
                        setAmount(raw);
                      }}
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
                      <SelectTrigger aria-label="Método de pago" className="border-white/10 bg-white/[0.03] text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Efectivo", "Transferencia", "Tarjeta", "Cheque"].map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/50">Referencia</Label>
                    <Input
                      value={reference}
                      onChange={e => setReference(e.target.value)}
                      placeholder="Opcional"
                      className="border-white/10 bg-white/[0.03] text-white"
                    />
                  </div>

                  {kind === "security_deposit_refund" && entityId && (
                    <div className="md:col-span-2 rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">Disponible para devolución</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                          <RotateCcw className="h-3 w-3" strokeWidth={1.75} />
                          Depósito
                        </span>
                      </div>
                      <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-white">
                        {formatCurrency(depositAvailableByClient.get(entityId) || 0)}
                      </p>
                    </div>
                  )}

                  {((selectedTarget || selectedCredit) || kind === "security_deposit_refund" || kind === "partner_payment") && (
                    <div className="md:col-span-2 rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">Resumen de operación</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">
                          <Link2 className="h-3 w-3" strokeWidth={1.75} />
                          Trazabilidad
                        </span>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div>
                          <p className="text-[11px] text-white/35">Máximo aplicable</p>
                          <p className="font-semibold tabular-nums text-white">{formatCurrency(maxAmount)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-white/35">Este movimiento</p>
                          <p className="font-semibold tabular-nums text-[#d7ff3f]">{formatCurrency(Number(amount) || 0)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-white/35">Restante</p>
                          <p className="font-semibold tabular-nums text-white">
                            {formatCurrency(Math.max(0, maxAmount - (Number(amount) || 0)))}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2 flex justify-end pt-1">
                    <Button
                      onClick={savePayment}
                      disabled={saving}
                      className="h-11 rounded-xl bg-[#d7ff3f] px-5 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90 disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />
                      ) : kind === "security_deposit_refund" ? (
                        <RotateCcw className="mr-2 h-4 w-4" strokeWidth={1.75} />
                      ) : (
                        <HandCoins className="mr-2 h-4 w-4" strokeWidth={1.75} />
                      )}
                      {kind === "security_deposit_refund" ? "Devolver depósito" : "Registrar pago"}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
