"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-provider";
import { useData } from "@/contexts/data-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type Supplier = { id: string; name: string };
type Item = { id?: string; catalog_item_id: string | null; description: string; quantity: string; unit_price: string; allocated: number };
type PaymentMethod = "cash" | "transfer" | "card" | "credit";

export default function EditSupplierPurchasePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { selectedCompanyId } = useData();
  const companyId = selectedCompanyId || currentUser?.companyId || null;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [dueDate, setDueDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [paid, setPaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId || !id) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const [purchaseResult, itemResult, supplierResult] = await Promise.all([
        supabase.from("supplier_purchases").select("id,supplier_id,purchase_date,reference,payment_method,due_date,total,notes,financial_record_id,status").eq("id", id).eq("company_id", companyId).eq("is_deleted", false).maybeSingle(),
        supabase.from("supplier_purchase_items").select("id,catalog_item_id,description,quantity,unit_price").eq("purchase_id", id).order("created_at"),
        supabase.from("suppliers").select("id,name").eq("company_id", companyId).eq("is_deleted", false).eq("is_active", true).order("name"),
      ]);
      if (cancelled) return;
      if (purchaseResult.error || !purchaseResult.data) { toast.error("No se encontró la compra."); router.replace("/dashboard/finanzas/supplier-purchases"); return; }
      if (itemResult.error || supplierResult.error) { toast.error("No se pudo cargar la compra."); return; }
      const p: any = purchaseResult.data;
      const itemRows = (itemResult.data || []) as any[];
      const itemIds = itemRows.map(x => x.id);
      let allocations: any[] = [];
      if (itemIds.length) {
        const ar = await supabase.from("supplier_purchase_allocations").select("supplier_purchase_item_id,amount").eq("company_id", companyId).in("supplier_purchase_item_id", itemIds);
        if (ar.error) { toast.error("No se pudieron cargar los vínculos de la compra."); return; }
        allocations = (ar.data || []) as any[];
      }
      const allocationByItem = new Map<string, number>();
      allocations.forEach(a => allocationByItem.set(a.supplier_purchase_item_id, (allocationByItem.get(a.supplier_purchase_item_id) || 0) + Number(a.amount || 0)));
      let applied = 0;
      if (p.financial_record_id) {
        const lr = await supabase.from("financial_record_links").select("amount_applied,source_financial_record_id").eq("company_id", companyId).eq("target_financial_record_id", p.financial_record_id).eq("relationship_type", "supplier_payment_to_financial_record");
        if (!lr.error && lr.data?.length) {
          const paymentIds = lr.data.map(x => x.source_financial_record_id).filter(Boolean);
          if (paymentIds.length) {
            const pr = await supabase.from("financial_records").select("id,amount,is_deleted,type").eq("company_id", companyId).in("id", paymentIds).eq("type", "payment").eq("is_deleted", false);
            applied = (lr.data as any[]).reduce((sum, link) => {
              const payment = (pr.data || []).find((row: any) => row.id === link.source_financial_record_id);
              return sum + Number(link.amount_applied ?? payment?.amount ?? 0);
            }, 0);
          }
        }
      }
      setSuppliers((supplierResult.data || []) as Supplier[]);
      setSupplierId(p.supplier_id);
      setDate(p.purchase_date);
      setPaymentMethod(p.payment_method);
      setDueDate(p.due_date || "");
      setReference(p.reference || "");
      setNotes(p.notes || "");
      setPaid(applied);
      setItems(itemRows.map(row => ({ id: row.id, catalog_item_id: row.catalog_item_id || null, description: row.description, quantity: String(row.quantity), unit_price: String(row.unit_price), allocated: allocationByItem.get(row.id) || 0 })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [companyId, id, router]);

  const total = useMemo(() => items.reduce((sum, item) => sum + Math.round((Number(item.quantity) || 0) * (Number(item.unit_price) || 0) * 100) / 100, 0), [items]);

  const updateItem = (index: number, patch: Partial<Item>) => setItems(current => current.map((item, i) => i === index ? { ...item, ...patch } : item));

  const save = async () => {
    if (!companyId || !id) return;
    if (!supplierId) return toast.error("Selecciona el proveedor.");
    if (!items.length || items.some(item => !item.description.trim() || !(Number(item.quantity) > 0) || Number(item.unit_price) < 0)) return toast.error("Todas las partidas deben tener descripción, cantidad y precio válidos.");
    if (paymentMethod === "credit" && !dueDate) return toast.error("Una compra a crédito requiere fecha de vencimiento.");
    if (paymentMethod !== "credit" && dueDate) return toast.error("La fecha de vencimiento solo aplica a crédito.");
    if (total + 0.01 < paid) return toast.error(`El total no puede ser menor a lo ya pagado: ${formatCurrency(paid)}.`);
    setSaving(true);
    try {
      const { error } = await supabase.rpc("update_supplier_purchase", {
        p_company_id: companyId, p_purchase_id: id, p_supplier_id: supplierId,
        p_purchase_date: date, p_total: total, p_payment_method: paymentMethod,
        p_due_date: paymentMethod === "credit" ? dueDate : null,
        p_reference: reference || null, p_notes: notes || null,
        p_items: items.map(item => ({ id: item.id || null, catalog_item_id: item.catalog_item_id || null, description: item.description.trim(), quantity: Number(item.quantity), unit_price: Number(item.unit_price) })),
        p_created_by: currentUser?.uid || null,
      } as any);
      if (error) throw error;
      toast.success("Compra actualizada");
      router.push(`/dashboard/finanzas/supplier-purchases/${id}`);
    } catch (error) {
      toast.error("No se pudo actualizar la compra", { description: error instanceof Error ? error.message : "Error inesperado." });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return <div className="min-h-full space-y-6 p-4 md:p-6">
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" asChild><Link href={`/dashboard/finanzas/supplier-purchases/${id}`}><ArrowLeft className="h-5 w-5" /></Link></Button>
      <div><h1 className="text-2xl font-bold tracking-tight">Editar compra</h1><p className="text-sm text-muted-foreground">Modifica la compra sin romper sus vínculos contables.</p></div>
    </div>
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Datos de la compra</CardTitle><CardDescription>Los vínculos existentes con gastos operativos se conservan.</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 sm:col-span-2"><Label>Proveedor</Label><Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger><SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Referencia / factura</Label><Input value={reference} onChange={e => setReference(e.target.value)} /></div>
          <div className="space-y-2"><Label>Forma de pago</Label><Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Contado</SelectItem><SelectItem value="transfer">Transferencia</SelectItem><SelectItem value="card">Tarjeta</SelectItem><SelectItem value="credit">Crédito</SelectItem></SelectContent></Select></div>
          {paymentMethod === "credit" && <div className="space-y-2"><Label>Vencimiento</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>}
          <div className="space-y-2 sm:col-span-2"><Label>Notas</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">Pagado hasta ahora: <strong>{formatCurrency(paid)}</strong>. Este importe no puede ser eliminado al editar la compra.</div>
        <div className="space-y-3">
          {items.map((item, index) => <div key={item.id || index} className="grid gap-3 rounded-xl border p-3 md:grid-cols-[2fr_.7fr_1fr_auto] md:items-end">
            <div className="space-y-2"><Label>Artículo / concepto</Label><Input value={item.description} onChange={e => updateItem(index, { description: e.target.value })} /><p className="text-xs text-muted-foreground">Vinculado: {formatCurrency(item.allocated)}</p></div>
            <div className="space-y-2"><Label>Cantidad</Label><Input inputMode="decimal" value={item.quantity} onChange={e => updateItem(index, { quantity: e.target.value })} /></div>
            <div className="space-y-2"><Label>Precio unitario</Label><Input inputMode="decimal" value={item.unit_price} onChange={e => updateItem(index, { unit_price: e.target.value })} /></div>
            <Button type="button" variant="ghost" size="icon" disabled={items.length === 1 || item.allocated > 0.01} onClick={() => setItems(current => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button>
          </div>)}
          <Button type="button" variant="outline" onClick={() => setItems(current => [...current, { catalog_item_id: null, description: "", quantity: "1", unit_price: "", allocated: 0 }])}>Agregar partida</Button>
        </div>
        <div className="flex items-center justify-between border-t pt-4"><div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{formatCurrency(total)}</p></div><Button onClick={save} disabled={saving} className="bg-[#d7ff3f] text-[#080a0f] hover:bg-[#d7ff3f]/90">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar cambios</Button></div>
      </CardContent>
    </Card>
  </div>;
}
