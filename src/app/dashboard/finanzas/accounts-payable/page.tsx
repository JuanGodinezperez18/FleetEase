"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-provider";
import { useData } from "@/contexts/data-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Briefcase, CalendarClock, CircleDollarSign, ExternalLink, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Payable = { id: string; partyType: "supplier" | "partner"; partyId: string; partyName: string; original: number; applied: number; dueDate: string | null; sourceId: string | null; purchaseId: string | null };
type SupplierPurchase = { id: string; supplier_id: string; supplierName: string; total: number; purchase_date: string; due_date: string | null; status: string; reference: string | null };

export default function AccountsPayablePage() {
  const { currentUser } = useAuth();
  const { selectedCompanyId, financialRecords, partners } = useData();
  const companyId = selectedCompanyId || currentUser?.companyId || null;
  const [supplierPayables, setSupplierPayables] = useState<Payable[]>([]);
  const [purchases, setPurchases] = useState<SupplierPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data: rows, error } = await supabase.from("accounts_payable").select("id,party_type,party_id,original_amount,due_date,source_financial_record_id,supplier_purchase_id,status,suppliers(name),supplier_purchases(reference,purchase_date,total,status)").eq("company_id", companyId).eq("is_deleted", false).eq("party_type", "supplier").neq("status", "cancelled").order("due_date", { ascending: true, nullsFirst: false });
      if (cancelled) return;
      if (error) { setLoading(false); return; }
      const sourceIds = (rows || []).map((r: any) => r.source_financial_record_id).filter(Boolean);
      let appliedMap = new Map<string, number>();
      if (sourceIds.length) {
        const { data: links } = await supabase.from("financial_record_links").select("target_financial_record_id,amount_applied,source_financial_record_id").eq("company_id", companyId).in("target_financial_record_id", sourceIds);
        appliedMap = new Map<string, number>();
        for (const link of links || []) appliedMap.set(link.target_financial_record_id, (appliedMap.get(link.target_financial_record_id) || 0) + Number(link.amount_applied || 0));
      }
      const mapped: Payable[] = (rows || []).map((r: any) => ({ id: r.id, partyType: "supplier", partyId: r.party_id, partyName: r.suppliers?.name || "Proveedor", original: Number(r.original_amount), applied: appliedMap.get(r.source_financial_record_id) || 0, dueDate: r.due_date, sourceId: r.source_financial_record_id, purchaseId: r.supplier_purchase_id }));
      const purchaseRows: SupplierPurchase[] = (rows || []).map((r: any) => r.supplier_purchases ? ({ id: r.supplier_purchase_id, supplier_id: r.party_id, supplierName: r.suppliers?.name || "Proveedor", total: Number(r.supplier_purchases.total), purchase_date: r.supplier_purchases.purchase_date, due_date: r.due_date, status: r.supplier_purchases.status, reference: r.supplier_purchases.reference }) : null).filter(Boolean) as SupplierPurchase[];
      setSupplierPayables(mapped.filter(p => p.original - p.applied > 0.009));
      setPurchases(purchaseRows);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [companyId]);

  const partnerPayables = useMemo<Payable[]>(() => {
    if (!companyId) return [];
    const partnerById = new Map(partners.map(p => [p.id, p]));
    const applied = new Map<string, number>();
    for (const r of financialRecords) {
      if (!r.isDeleted || r.type !== "payment" || !r.partnerId) continue;
    }
    const result: Payable[] = [];
    for (const r of financialRecords) {
      if (!r.isDeleted || r.type !== "expense" || !r.partnerId || r.paymentMethod === "partner_pays") continue;
      const already = applied.get(r.id) || 0;
      const remaining = Math.max(0, Number(r.amount) - already);
      if (remaining <= 0.009) continue;
      const p = partnerById.get(r.partnerId);
      result.push({ id: `partner-${r.id}`, partyType: "partner", partyId: r.partnerId, partyName: p?.name || "Socio", original: Number(r.amount), applied: 0, dueDate: r.date, sourceId: r.id, purchaseId: null });
    }
    return result;
  }, [companyId, financialRecords, partners]);

  const supplierPending = supplierPayables.reduce((s, p) => s + Math.max(0, p.original - p.applied), 0);
  const partnerPending = partnerPayables.reduce((s, p) => s + Math.max(0, p.original - p.applied), 0);
  const totalPending = supplierPending + partnerPending;
  const dueSoon = [...supplierPayables, ...partnerPayables].filter(p => p.dueDate && new Date(p.dueDate).getTime() <= Date.now() + 7 * 86400000).reduce((s, p) => s + Math.max(0, p.original - p.applied), 0);

  return <div className="space-y-6 p-4 md:p-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight">Cuentas por pagar</h1><p className="text-muted-foreground">Control central de lo pendiente con proveedores y socios.</p></div><Button asChild><Link href="/dashboard/finanzas/supplier-purchases"><CircleDollarSign className="mr-2 h-4 w-4" />Nueva compra a proveedor</Link></Button></div>
    <div className="grid gap-4 md:grid-cols-3"><Card><CardHeader className="pb-2"><CardDescription>Total pendiente</CardDescription><CardTitle>{formatCurrency(totalPending)}</CardTitle></CardHeader></Card><Card><CardHeader className="pb-2"><CardDescription>Proveedores</CardDescription><CardTitle>{formatCurrency(supplierPending)}</CardTitle></CardHeader></Card><Card><CardHeader className="pb-2"><CardDescription>Vence en 7 días</CardDescription><CardTitle>{formatCurrency(dueSoon)}</CardTitle></CardHeader></Card></div>

    <Card><CardHeader><CardTitle>Proveedores</CardTitle><CardDescription>Compras a crédito y saldo restante después de pagos parciales.</CardDescription></CardHeader><CardContent>{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : supplierPayables.length === 0 ? <p className="text-sm text-muted-foreground">No hay cuentas por pagar a proveedores.</p> : <div className="space-y-3">{supplierPayables.map(p => { const remaining = Math.max(0, p.original - p.applied); return <div key={p.id} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /><span className="font-semibold">{p.partyName}</span><Badge variant="outline">Proveedor</Badge></div><p className="mt-1 text-sm text-muted-foreground">Original {formatCurrency(p.original)} · Pagado {formatCurrency(p.applied)}</p>{p.dueDate && <p className="mt-1 text-xs text-muted-foreground"><CalendarClock className="mr-1 inline h-3 w-3" />Vence {new Date(p.dueDate).toLocaleDateString("es-MX")}</p>}</div><div className="flex items-center gap-3"><div className="text-right"><p className="text-xs text-muted-foreground">Pendiente</p><p className="text-lg font-bold">{formatCurrency(remaining)}</p></div>{p.purchaseId ? <Button asChild size="sm" variant="outline"><Link href={`/dashboard/finanzas/supplier-purchases/${p.purchaseId}`}><ExternalLink className="mr-2 h-4 w-4" />Distribuir</Link></Button> : null}<Button asChild size="sm"><Link href="/dashboard/finanzas/payments">Pagar</Link></Button></div></div>; })}</div>}</CardContent></Card>

    <Card><CardHeader><CardTitle>Socios</CardTitle><CardDescription>Gastos que corresponden al socio y siguen pendientes de pago.</CardDescription></CardHeader><CardContent>{partnerPayables.length === 0 ? <p className="text-sm text-muted-foreground">No hay obligaciones pendientes con socios.</p> : <div className="space-y-3">{partnerPayables.map(p => <div key={p.id} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /><span className="font-semibold">{p.partyName}</span><Badge variant="outline">Socio</Badge></div><p className="mt-1 text-sm text-muted-foreground">Gasto {formatCurrency(p.original)} · {new Date(p.dueDate || "").toLocaleDateString("es-MX")}</p></div><Button asChild size="sm"><Link href="/dashboard/finanzas/payments">Pagar</Link></Button></div>)}</div>}</CardContent></Card>

    <Card><CardHeader><CardTitle>Compras a crédito</CardTitle><CardDescription>Historial resumido de compras que originaron cuentas por pagar.</CardDescription></CardHeader><CardContent>{purchases.length === 0 ? <p className="text-sm text-muted-foreground">No hay compras a crédito.</p> : <div className="space-y-2">{purchases.map(p => <div key={p.id} className="flex items-center justify-between border-b py-3 last:border-0"><div><p className="font-medium">{p.supplierName}{p.reference ? ` · ${p.reference}` : ""}</p><p className="text-xs text-muted-foreground">{new Date(p.purchase_date).toLocaleDateString("es-MX")}</p></div><div className="flex items-center gap-2"><Badge>{p.status === "pending" ? "Pendiente" : p.status}</Badge><span className="font-semibold">{formatCurrency(p.total)}</span><Button asChild size="icon" variant="ghost"><Link href={`/dashboard/finanzas/supplier-purchases/${p.id}`} aria-label="Distribuir compra"><ExternalLink className="h-4 w-4" /></Link></Button></div></div>)}</div>}</CardContent></Card>
  </div>;
}
