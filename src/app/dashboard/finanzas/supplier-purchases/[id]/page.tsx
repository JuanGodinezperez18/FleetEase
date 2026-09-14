"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-provider";
import { useData } from "@/contexts/data-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Car, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type Purchase = { id: string; supplierName: string; total: number; purchase_date: string; reference: string | null; payment_method: string; status: string };
type Item = { id: string; description: string; quantity: number; unit_price: number; total: number };
type Expense = { id: string; vehicleName: string; description: string; amount: number; date: string; allocated: number };
type Allocation = { financial_record_id: string; amount: string; notes: string };

export default function SupplierPurchaseAllocationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { selectedCompanyId } = useData();
  const companyId = selectedCompanyId || currentUser?.companyId || null;
  const purchaseId = params?.id;
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([{ financial_record_id: "", amount: "", notes: "" }]);
  const [allocatedExisting, setAllocatedExisting] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId || !purchaseId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [purchaseResult, itemResult, expenseResult, allocationResult] = await Promise.all([
        supabase.from("supplier_purchases").select("id,total,purchase_date,reference,payment_method,status,suppliers(name)").eq("id", purchaseId).eq("company_id", companyId).eq("is_deleted", false).maybeSingle(),
        supabase.from("supplier_purchase_items").select("id,description,quantity,unit_price,total").eq("purchase_id", purchaseId).order("created_at"),
        supabase.from("financial_records").select("id,vehicle_id,description,amount,date,vehicles(make,model,plate)").eq("company_id", companyId).eq("type", "expense").eq("is_deleted", false).not("vehicle_id", "is", null).order("date", { ascending: false }).limit(300),
        supabase.from("supplier_purchase_allocations").select("financial_record_id,amount,notes").eq("company_id", companyId).eq("purchase_id", purchaseId).order("created_at"),
      ]);
      if (cancelled) return;
      if (purchaseResult.error || !purchaseResult.data) {
        toast.error("No se encontró la compra.");
        router.replace("/dashboard/finanzas/supplier-purchases");
        return;
      }
      if (itemResult.error || expenseResult.error || allocationResult.error) {
        toast.error("No se pudo cargar toda la información de la compra.");
      }
      const p: any = purchaseResult.data;
      setPurchase({ id: p.id, supplierName: p.suppliers?.name || "Proveedor", total: Number(p.total), purchase_date: p.purchase_date, reference: p.reference, payment_method: p.payment_method, status: p.status });
      setItems((itemResult.data || []) as Item[]);
      const existingRows = (allocationResult.data || []) as any[];
      const existingIds = new Set(existingRows.map(r => r.financial_record_id));
      const existingTotal = existingRows.reduce((s, r) => s + Number(r.amount || 0), 0);
      setAllocatedExisting(existingTotal);
      const vehicleRows = (expenseResult.data || []) as any[];
      setExpenses(vehicleRows.map(r => ({ id: r.id, vehicleName: r.vehicles ? `${r.vehicles.make} ${r.vehicles.model} (${r.vehicles.plate})` : "Vehículo", description: r.description || "Gasto", amount: Number(r.amount || 0), date: r.date, allocated: existingIds.has(r.id) ? Number(existingRows.find(x => x.financial_record_id === r.id)?.amount || 0) : 0 })));
      setAllocations([{ financial_record_id: "", amount: "", notes: "" }]);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [companyId, purchaseId, router]);

  const pendingPurchase = useMemo(() => Math.max(0, (purchase?.total || 0) - allocatedExisting), [purchase, allocatedExisting]);
  const newAllocationTotal = useMemo(() => allocations.reduce((s, a) => s + Math.round((Number(a.amount) || 0) * 100) / 100, 0), [allocations]);
  const remainingAfterNew = Math.max(0, pendingPurchase - newAllocationTotal);

  const updateAllocation = (index: number, patch: Partial<Allocation>) => setAllocations(current => current.map((a, i) => i === index ? { ...a, ...patch } : a));

  const save = async () => {
    if (!companyId || !purchase) return;
    const rows = allocations.filter(a => a.financial_record_id || a.amount);
    if (!rows.length) return toast.error("Agrega al menos una asignación.");
    if (rows.some(a => !a.financial_record_id || !(Number(a.amount) > 0))) return toast.error("Completa correctamente cada asignación.");
    if (newAllocationTotal > pendingPurchase + 0.01) return toast.error("La distribución excede el saldo disponible de la compra.");
    const selected = new Set<string>();
    for (const row of rows) {
      if (selected.has(row.financial_record_id)) return toast.error("No puedes repetir el mismo gasto en esta distribución.");
      selected.add(row.financial_record_id);
      const expense = expenses.find(e => e.id === row.financial_record_id);
      if (!expense) return toast.error("Uno de los gastos seleccionados ya no está disponible.");
      if (Number(row.amount) > expense.amount - expense.allocated + 0.01) return toast.error(`La asignación a ${expense.vehicleName} excede el saldo disponible de ese gasto.`);
    }
    setSaving(true);
    try {
      const { error, data } = await supabase.rpc("allocate_supplier_purchase", { p_company_id: companyId, p_purchase_id: purchase.id, p_allocations: rows.map(a => ({ financial_record_id: a.financial_record_id, amount: Number(a.amount), notes: a.notes || null })), p_created_by: currentUser?.uid || null } as any);
      if (error) throw error;
      const result = data as any;
      toast.success("Compra distribuida", { description: `Asignado ${formatCurrency(Number(result?.allocated_total || allocatedExisting + newAllocationTotal))}. Restante de la compra: ${formatCurrency(Number(result?.remaining || remainingAfterNew))}.` });
      router.refresh();
      window.location.reload();
    } catch (error) {
      toast.error("No se pudo distribuir la compra", { description: error instanceof Error ? error.message : "Error inesperado." });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!purchase) return null;

  return <div className="space-y-6 p-4 md:p-6">
    <div className="flex items-center gap-3"><Button variant="ghost" size="icon" asChild><Link href="/dashboard/finanzas/accounts-payable"><ArrowLeft className="h-5 w-5" /></Link></Button><div><h1 className="text-2xl font-bold tracking-tight">Distribuir compra</h1><p className="text-muted-foreground">Relaciona una compra del proveedor con uno o varios gastos de vehículo.</p></div></div>

    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader className="pb-2"><CardDescription>Proveedor</CardDescription><CardTitle>{purchase.supplierName}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{new Date(purchase.purchase_date).toLocaleDateString("es-MX")}{purchase.reference ? ` · ${purchase.reference}` : ""}</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Total de compra</CardDescription><CardTitle>{formatCurrency(purchase.total)}</CardTitle></CardHeader><CardContent><Badge variant="outline">{purchase.payment_method === "credit" ? "Crédito" : "Contado"}</Badge></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Sin distribuir</CardDescription><CardTitle>{formatCurrency(pendingPurchase)}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Después de las asignaciones existentes</p></CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle>Partidas de la compra</CardTitle><CardDescription>Estas partidas conservan el detalle original de la factura del proveedor.</CardDescription></CardHeader><CardContent><div className="space-y-2">{items.map(item => <div key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2"><div><p className="font-medium">{item.description}</p><p className="text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.unit_price)}</p></div><span className="font-semibold">{formatCurrency(item.total)}</span></div>)}</div></CardContent></Card>

    <Card><CardHeader><CardTitle>Asignar a gastos</CardTitle><CardDescription>Ejemplo: una compra de $4,500 puede asignarse $2,700 a un Versa, $1,200 a un March y dejar $600 sin distribuir.</CardDescription></CardHeader><CardContent className="space-y-4">
      {allocations.map((allocation, index) => <div key={index} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[2fr_1fr_1.5fr_auto] md:items-end">
        <div className="space-y-2"><Label>Gasto / vehículo</Label><Select value={allocation.financial_record_id || "none"} onValueChange={v => updateAllocation(index, { financial_record_id: v === "none" ? "" : v })}><SelectTrigger><SelectValue placeholder="Seleccionar gasto..." /></SelectTrigger><SelectContent><SelectItem value="none">Seleccionar...</SelectItem>{expenses.filter(e => !allocations.some((a, i) => i !== index && a.financial_record_id === e.id)).map(e => <SelectItem key={e.id} value={e.id}>{e.vehicleName} · {e.description} · {formatCurrency(e.amount - e.allocated)} disponible</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Importe</Label><Input inputMode="decimal" value={allocation.amount} onChange={e => updateAllocation(index, { amount: e.target.value })} placeholder="0.00" /></div>
        <div className="space-y-2"><Label>Nota</Label><Input value={allocation.notes} onChange={e => updateAllocation(index, { notes: e.target.value })} placeholder="Opcional" /></div>
        <Button type="button" variant="ghost" size="icon" onClick={() => setAllocations(current => current.length > 1 ? current.filter((_, i) => i !== index) : current)} disabled={allocations.length === 1}><Trash2 className="h-4 w-4" /></Button>
      </div>)}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Button variant="outline" onClick={() => setAllocations(current => [...current, { financial_record_id: "", amount: "", notes: "" }])}><Plus className="mr-2 h-4 w-4" />Agregar destino</Button><div className="text-right"><p className="text-sm text-muted-foreground">Asignación nueva</p><p className="text-xl font-bold">{formatCurrency(newAllocationTotal)}</p><p className="text-sm text-muted-foreground">Quedaría sin distribuir: {formatCurrency(remainingAfterNew)}</p></div></div>
      <div className="flex justify-end"><Button onClick={save} disabled={saving || pendingPurchase <= 0.009}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar distribución</Button></div>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>Gastos disponibles</CardTitle><CardDescription>Solo se muestran gastos activos asociados a vehículos de esta empresa.</CardDescription></CardHeader><CardContent><div className="space-y-2">{expenses.slice(0, 30).map(e => <div key={e.id} className="flex items-center justify-between rounded-lg border px-3 py-2"><div className="flex items-center gap-2"><Car className="h-4 w-4 text-muted-foreground" /><div><p className="font-medium">{e.vehicleName}</p><p className="text-xs text-muted-foreground">{e.description} · {new Date(e.date).toLocaleDateString("es-MX")}</p></div></div><div className="text-right"><p className="font-semibold">{formatCurrency(e.amount)}</p><p className="text-xs text-muted-foreground">Disponible {formatCurrency(Math.max(0, e.amount - e.allocated))}</p></div></div>)}</div></CardContent></Card>
  </div>;
}
