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
type ExpenseLine = { id: string; concept: string; amount: number; allocated: number };
type Expense = { id: string; vehicleName: string; description: string; amount: number; date: string; lines: ExpenseLine[]; allocated: number };
type Allocation = { supplier_purchase_item_id: string; financial_record_id: string; expense_item_id: string; amount: string; notes: string };
type ExistingAllocation = Allocation & { created_at?: string };

const emptyAllocation = (): Allocation => ({ supplier_purchase_item_id: "", financial_record_id: "", expense_item_id: "", amount: "", notes: "" });

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
  const [existingAllocations, setExistingAllocations] = useState<ExistingAllocation[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([emptyAllocation()]);
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
        supabase.from("financial_records").select("id,vehicle_id,description,amount,date,items,vehicles(make,model,plate)").eq("company_id", companyId).eq("type", "expense").eq("is_deleted", false).not("vehicle_id", "is", null).order("date", { ascending: false }).limit(300),
        supabase.from("supplier_purchase_allocations").select("supplier_purchase_item_id,financial_record_id,expense_item_id,amount,notes,created_at").eq("company_id", companyId).eq("purchase_id", purchaseId).order("created_at"),
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
      const rawAllocations = (allocationResult.data || []) as any[];
      const allocationByLine = new Map<string, number>();
      rawAllocations.forEach(row => {
        if (row.expense_item_id) allocationByLine.set(`${row.financial_record_id}:${row.expense_item_id}`, (allocationByLine.get(`${row.financial_record_id}:${row.expense_item_id}`) || 0) + Number(row.amount || 0));
      });
      const vehicleRows = (expenseResult.data || []) as any[];
      const mappedExpenses: Expense[] = vehicleRows.map(r => {
        const rawItems = Array.isArray(r.items) ? r.items : [];
        const lines = rawItems.map((item: any, index: number) => {
          const id = String(item.id || `legacy-${r.id}-${index}`);
          const amount = Number(item.amount || 0);
          return { id, concept: String(item.concept || item.description || "Concepto de gasto"), amount, allocated: allocationByLine.get(`${r.id}:${id}`) || 0 };
        }).filter(line => line.amount > 0);
        const allocated = lines.reduce((sum, line) => sum + line.allocated, 0);
        return { id: r.id, vehicleName: r.vehicles ? `${r.vehicles.make} ${r.vehicles.model} (${r.vehicles.plate})` : "Vehículo", description: r.description || "Gasto", amount: Number(r.amount || 0), date: r.date, lines, allocated };
      }).filter(expense => expense.lines.length > 0);
      setPurchase({ id: p.id, supplierName: p.suppliers?.name || "Proveedor", total: Number(p.total), purchase_date: p.purchase_date, reference: p.reference, payment_method: p.payment_method, status: p.status });
      setItems((itemResult.data || []) as Item[]);
      setExistingAllocations(rawAllocations.map(row => ({ supplier_purchase_item_id: row.supplier_purchase_item_id || "", financial_record_id: row.financial_record_id, expense_item_id: row.expense_item_id || "", amount: String(row.amount || ""), notes: row.notes || "", created_at: row.created_at })));
      setExpenses(mappedExpenses);
      setAllocations([emptyAllocation()]);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [companyId, purchaseId, router]);

  const allocatedExisting = useMemo(() => existingAllocations.reduce((sum, row) => sum + Number(row.amount || 0), 0), [existingAllocations]);
  const pendingPurchase = useMemo(() => Math.max(0, (purchase?.total || 0) - allocatedExisting), [purchase, allocatedExisting]);
  const newAllocationTotal = useMemo(() => allocations.reduce((sum, row) => sum + Math.round((Number(row.amount) || 0) * 100) / 100, 0), [allocations]);
  const remainingAfterNew = Math.max(0, pendingPurchase - newAllocationTotal);

  const updateAllocation = (index: number, patch: Partial<Allocation>) => {
    setAllocations(current => current.map((row, i) => i === index ? { ...row, ...patch } : row));
  };

  const getExpense = (id: string) => expenses.find(expense => expense.id === id);
  const getLine = (expenseId: string, lineId: string) => getExpense(expenseId)?.lines.find(line => line.id === lineId);
  const lineAvailable = (expenseId: string, lineId: string, currentIndex: number) => {
    const line = getLine(expenseId, lineId);
    if (!line) return 0;
    const pendingRows = allocations.filter((row, index) => index !== currentIndex && row.financial_record_id === expenseId && row.expense_item_id === lineId);
    const pending = pendingRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    return Math.max(0, line.amount - line.allocated - pending);
  };

  const save = async () => {
    if (!companyId || !purchase) return;
    const rows = allocations.filter(row => row.supplier_purchase_item_id || row.financial_record_id || row.expense_item_id || row.amount);
    if (!rows.length) return toast.error("Agrega al menos una asignación.");
    if (rows.some(row => !row.supplier_purchase_item_id || !row.financial_record_id || !row.expense_item_id || !(Number(row.amount) > 0))) return toast.error("Completa partida de compra, gasto, línea e importe en cada asignación.");
    if (newAllocationTotal > pendingPurchase + 0.01) return toast.error("La distribución excede el saldo disponible de la compra.");

    const purchaseItemTotals = new Map<string, number>();
    const selectedLines = new Set<string>();
    for (const row of rows) {
      const item = items.find(i => i.id === row.supplier_purchase_item_id);
      const expense = getExpense(row.financial_record_id);
      const line = getLine(row.financial_record_id, row.expense_item_id);
      if (!item || !expense || !line) return toast.error("Una de las líneas seleccionadas ya no está disponible.");
      const requested = Number(row.amount);
      const purchaseItemUsed = (purchaseItemTotals.get(item.id) || 0) + requested;
      const alreadyAllocatedToItem = existingAllocations.filter(a => a.supplier_purchase_item_id === item.id).reduce((sum, a) => sum + Number(a.amount || 0), 0);
      if (purchaseItemUsed + alreadyAllocatedToItem > Number(item.total) + 0.01) return toast.error(`La distribución excede la partida de compra: ${item.description}.`);
      purchaseItemTotals.set(item.id, purchaseItemUsed);
      const lineKey = `${expense.id}:${line.id}`;
      if (selectedLines.has(lineKey)) return toast.error("No puedes repetir la misma línea de gasto en esta distribución.");
      selectedLines.add(lineKey);
      if (requested > lineAvailable(expense.id, line.id, allocations.indexOf(row)) + 0.01) return toast.error(`La asignación excede el saldo disponible de ${line.concept}.`);
    }

    setSaving(true);
    try {
      const { error, data } = await supabase.rpc("allocate_supplier_purchase", {
        p_company_id: companyId,
        p_purchase_id: purchase.id,
        p_allocations: rows.map(row => ({ supplier_purchase_item_id: row.supplier_purchase_item_id, financial_record_id: row.financial_record_id, expense_item_id: row.expense_item_id, amount: Number(row.amount), notes: row.notes || null })),
        p_created_by: currentUser?.uid || null,
      } as any);
      if (error) throw error;
      const result = data as any;
      toast.success("Compra vinculada a las líneas de gasto", { description: `Asignado ${formatCurrency(Number(result?.allocated_total || allocatedExisting + newAllocationTotal))}. Restante: ${formatCurrency(Number(result?.remaining || remainingAfterNew))}.` });
      window.location.reload();
    } catch (error) {
      toast.error("No se pudo distribuir la compra", { description: error instanceof Error ? error.message : "Error inesperado." });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!purchase) return null;

  return <div className="space-y-6 p-4 md:p-6">
    <div className="flex items-center gap-3"><Button variant="ghost" size="icon" asChild><Link href="/dashboard/finanzas/accounts-payable"><ArrowLeft className="h-5 w-5" /></Link></Button><div><h1 className="text-2xl font-bold tracking-tight">Vincular compra con gastos</h1><p className="text-muted-foreground">Relaciona cada partida de proveedor con la línea exacta del gasto del vehículo.</p></div></div>

    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader className="pb-2"><CardDescription>Proveedor</CardDescription><CardTitle>{purchase.supplierName}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{new Date(purchase.purchase_date).toLocaleDateString("es-MX")}{purchase.reference ? ` · ${purchase.reference}` : ""}</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Total de compra</CardDescription><CardTitle>{formatCurrency(purchase.total)}</CardTitle></CardHeader><CardContent><Badge variant="outline">{purchase.payment_method === "credit" ? "Crédito" : "Contado"}</Badge></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardDescription>Sin distribuir</CardDescription><CardTitle>{formatCurrency(pendingPurchase)}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Saldo de esta compra aún no vinculado</p></CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle>Partidas de la compra</CardTitle><CardDescription>Selecciona cada partida cuando la relaciones con una o varias líneas del gasto.</CardDescription></CardHeader><CardContent><div className="space-y-2">{items.map(item => { const allocated = existingAllocations.filter(a => a.supplier_purchase_item_id === item.id).reduce((sum, a) => sum + Number(a.amount || 0), 0); return <div key={item.id} className="flex items-center justify-between rounded-lg border px-3 py-2"><div><p className="font-medium">{item.description}</p><p className="text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.unit_price)} · Disponible {formatCurrency(Math.max(0, item.total - allocated))}</p></div><span className="font-semibold">{formatCurrency(item.total)}</span></div>; })}</div></CardContent></Card>

    <Card><CardHeader><CardTitle>Distribución por línea</CardTitle><CardDescription>Un mismo gasto puede recibir partidas de varios proveedores. No agregamos proveedor al gasto del vehículo.</CardDescription></CardHeader><CardContent className="space-y-4">
      {allocations.map((allocation, index) => {
        const expense = getExpense(allocation.financial_record_id);
        const line = getLine(allocation.financial_record_id, allocation.expense_item_id);
        const available = line ? lineAvailable(allocation.financial_record_id, allocation.expense_item_id, index) : 0;
        return <div key={index} className="space-y-3 rounded-xl border p-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2"><Label>Partida de compra</Label><Select value={allocation.supplier_purchase_item_id || "none"} onValueChange={value => updateAllocation(index, { supplier_purchase_item_id: value === "none" ? "" : value, amount: "" })}><SelectTrigger><SelectValue placeholder="Seleccionar partida..." /></SelectTrigger><SelectContent><SelectItem value="none">Seleccionar...</SelectItem>{items.map(item => { const allocated = existingAllocations.filter(a => a.supplier_purchase_item_id === item.id).reduce((sum, a) => sum + Number(a.amount || 0), 0); return <SelectItem key={item.id} value={item.id}>{item.description} · {formatCurrency(Math.max(0, item.total - allocated))} disponible</SelectItem>; })}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Gasto / vehículo</Label><Select value={allocation.financial_record_id || "none"} onValueChange={value => updateAllocation(index, { financial_record_id: value === "none" ? "" : value, expense_item_id: "", amount: "" })}><SelectTrigger><SelectValue placeholder="Seleccionar gasto..." /></SelectTrigger><SelectContent><SelectItem value="none">Seleccionar...</SelectItem>{expenses.map(item => <SelectItem key={item.id} value={item.id}>{item.vehicleName} · {item.description}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1.5fr_auto] md:items-end">
            <div className="space-y-2"><Label>Línea exacta del gasto</Label><Select value={allocation.expense_item_id || "none"} onValueChange={value => { const nextLine = value === "none" ? null : getLine(allocation.financial_record_id, value); updateAllocation(index, { expense_item_id: value === "none" ? "" : value, amount: nextLine ? String(nextLine.amount) : "" }); }} disabled={!expense}><SelectTrigger><SelectValue placeholder="Seleccionar línea..." /></SelectTrigger><SelectContent><SelectItem value="none">Seleccionar...</SelectItem>{expense?.lines.map(item => { const availableLine = lineAvailable(expense.id, item.id, index); return <SelectItem key={item.id} value={item.id} disabled={availableLine <= 0.009}>{item.concept} · {formatCurrency(availableLine)} disponible</SelectItem>; })}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Importe</Label><Input inputMode="decimal" value={allocation.amount} onChange={event => updateAllocation(index, { amount: event.target.value })} placeholder="0.00" disabled={!line} /><p className="text-xs text-muted-foreground">Disponible: {formatCurrency(available)}</p></div>
            <div className="space-y-2"><Label>Nota</Label><Input value={allocation.notes} onChange={event => updateAllocation(index, { notes: event.target.value })} placeholder="Opcional" /></div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setAllocations(current => current.length > 1 ? current.filter((_, i) => i !== index) : current)} disabled={allocations.length === 1}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>;
      })}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Button variant="outline" onClick={() => setAllocations(current => [...current, emptyAllocation()])}><Plus className="mr-2 h-4 w-4" />Agregar vínculo</Button><div className="text-right"><p className="text-sm text-muted-foreground">Nueva distribución</p><p className="text-xl font-bold">{formatCurrency(newAllocationTotal)}</p><p className="text-sm text-muted-foreground">Quedaría sin distribuir: {formatCurrency(remainingAfterNew)}</p></div></div>
      <div className="flex justify-end"><Button onClick={save} disabled={saving || pendingPurchase <= 0.009}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar vínculos</Button></div>
    </CardContent></Card>

    {existingAllocations.length > 0 && <Card><CardHeader><CardTitle>Vínculos existentes</CardTitle><CardDescription>Historial de las partidas ya relacionadas con gastos de vehículo.</CardDescription></CardHeader><CardContent><div className="space-y-2">{existingAllocations.map((allocation, index) => { const expense = getExpense(allocation.financial_record_id); const line = getLine(allocation.financial_record_id, allocation.expense_item_id); const purchaseItem = items.find(item => item.id === allocation.supplier_purchase_item_id); return <div key={`${allocation.supplier_purchase_item_id}-${allocation.financial_record_id}-${allocation.expense_item_id}-${index}`} className="flex flex-col gap-1 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{purchaseItem?.description || "Partida de compra"} → {line?.concept || "Línea de gasto"}</p><p className="text-xs text-muted-foreground">{expense?.vehicleName || "Vehículo"} · {expense?.description || "Gasto"}</p></div><span className="font-semibold">{formatCurrency(Number(allocation.amount || 0))}</span></div>; })}</div></CardContent></Card>}


  </div>;
}
