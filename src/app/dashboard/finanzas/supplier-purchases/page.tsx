"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-provider";
import { useData } from "@/contexts/data-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Trash2, Loader2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type Supplier = { id: string; name: string };
type CatalogItem = { id: string; name: string; part_number: string | null; default_cost: number | null };
type PaymentMethod = "cash" | "transfer" | "card" | "credit";
type PurchaseItem = { catalog_item_id: string; description: string; quantity: string; unit_price: string };

const emptyItem = (): PurchaseItem => ({ catalog_item_id: "", description: "", quantity: "1", unit_price: "" });

export default function SupplierPurchasesPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { selectedCompanyId } = useData();
  const companyId = selectedCompanyId || currentUser?.companyId || null;
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [dueDate, setDueDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    Promise.all([
      supabase.from("suppliers").select("id,name").eq("company_id", companyId).eq("is_deleted", false).eq("is_active", true).order("name"),
      supabase.from("catalog_items").select("id,name,part_number,default_cost").eq("company_id", companyId).eq("is_deleted", false).eq("is_active", true).order("name").limit(2000),
    ]).then(([supplierResult, catalogResult]) => {
      if (cancelled) return;
      if (supplierResult.error) toast.error("No se pudieron cargar los proveedores.");
      if (catalogResult.error) toast.error("No se pudo cargar el catálogo.");
      setSuppliers((supplierResult.data || []) as Supplier[]);
      setCatalog((catalogResult.data || []) as CatalogItem[]);
    });
    return () => { cancelled = true; };
  }, [companyId]);

  const total = useMemo(() => items.reduce((sum, item) => sum + Math.round((Number(item.quantity) || 0) * (Number(item.unit_price) || 0) * 100) / 100, 0), [items]);

  const updateItem = (index: number, patch: Partial<PurchaseItem>) => setItems(current => current.map((item, i) => i === index ? { ...item, ...patch } : item));

  const selectCatalog = (index: number, id: string) => {
    const item = catalog.find(c => c.id === id);
    updateItem(index, { catalog_item_id: id, description: item?.name || "", unit_price: item?.default_cost != null ? String(item.default_cost) : "" });
  };

  const save = async () => {
    if (!companyId) return toast.error("No hay una empresa seleccionada.");
    if (!supplierId) return toast.error("Selecciona el proveedor.");
    if (!items.length || items.some(i => !i.description.trim() || !(Number(i.quantity) > 0) || Number(i.unit_price) < 0)) return toast.error("Completa correctamente todas las partidas.");
    if (paymentMethod === "credit" && !dueDate) return toast.error("Una compra a crédito requiere fecha de vencimiento.");
    if (paymentMethod !== "credit" && dueDate) return toast.error("La fecha de vencimiento solo aplica a compras a crédito.");
    if (!(total > 0)) return toast.error("El total debe ser mayor que cero.");
    setSaving(true);
    try {
      const { error, data } = await supabase.rpc("create_supplier_purchase", {
        p_company_id: companyId,
        p_supplier_id: supplierId,
        p_purchase_date: date,
        p_total: total,
        p_payment_method: paymentMethod,
        p_due_date: paymentMethod === "credit" ? dueDate : null,
        p_reference: reference || null,
        p_notes: notes || null,
        p_items: items.map(i => ({ catalog_item_id: i.catalog_item_id || null, description: i.description.trim(), quantity: Number(i.quantity), unit_price: Number(i.unit_price) })),
        p_created_by: currentUser?.uid || null,
      } as any);
      if (error) throw error;
      const purchase = data as any;
      const labels: Record<PaymentMethod, string> = { cash: "contado", transfer: "transferencia", card: "tarjeta", credit: "crédito" };
      toast.success("Compra registrada", { description: paymentMethod === "credit" ? "Se creó también la cuenta por pagar al proveedor." : `La compra quedó registrada como pagada por ${labels[paymentMethod]}.` });
      if (purchase?.id) {
        router.push(`/dashboard/finanzas/supplier-purchases/${purchase.id}`);
        return;
      }
      setSupplierId(""); setReference(""); setNotes(""); setDueDate(""); setPaymentMethod("cash"); setItems([emptyItem()]);
    } catch (error) {
      toast.error("No se pudo registrar la compra", { description: error instanceof Error ? error.message : "Error inesperado." });
    } finally { setSaving(false); }
  };

  const paymentLabels: Record<PaymentMethod, string> = { cash: "Contado / efectivo", transfer: "Transferencia", card: "Tarjeta", credit: "Crédito" };

  return <div className="space-y-6 p-4 md:p-6">
    <div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-3"><ShoppingCart className="h-6 w-6 text-primary" /></div><div><h1 className="text-2xl font-bold tracking-tight">Compras a proveedores</h1><p className="text-muted-foreground">Registra la compra del proveedor y después vincula sus partidas con las líneas exactas del gasto del vehículo.</p></div></div>
    <Card className="max-w-5xl">
      <CardHeader><CardTitle>Nueva compra</CardTitle><CardDescription>Una compra puede contener múltiples partidas y puede relacionarse con gastos de distintos vehículos.</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-2"><Label>Proveedor</Label><Select value={supplierId} onValueChange={setSupplierId}><SelectTrigger><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger><SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Referencia / factura</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Opcional" /></div>
          <div className="space-y-2"><Label>Forma de pago</Label><Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(paymentLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          {paymentMethod === "credit" && <div className="space-y-2"><Label>Vencimiento</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>}
          <div className="space-y-2 lg:col-span-2"><Label>Notas</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" /></div>
        </div>

        <div className="rounded-xl border overflow-hidden">
          <div className="grid grid-cols-[1.7fr_.7fr_1fr_1fr_auto] gap-2 bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground"><span>Concepto / catálogo</span><span>Cantidad</span><span>Precio unitario</span><span>Total</span><span /></div>
          {items.map((item, index) => <div key={index} className="grid grid-cols-[1.7fr_.7fr_1fr_1fr_auto] gap-2 border-t px-3 py-3 items-center">
            <div className="space-y-2"><Select value={item.catalog_item_id || "none"} onValueChange={v => v === "none" ? updateItem(index, { catalog_item_id: "" }) : selectCatalog(index, v)}><SelectTrigger><SelectValue placeholder="Catálogo o captura manual" /></SelectTrigger><SelectContent><SelectItem value="none">Captura manual</SelectItem>{catalog.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.part_number ? ` · ${c.part_number}` : ""}</SelectItem>)}</SelectContent></Select><Input value={item.description} onChange={e => updateItem(index, { description: e.target.value })} placeholder="Descripción" /></div>
            <Input inputMode="decimal" value={item.quantity} onChange={e => updateItem(index, { quantity: e.target.value })} />
            <Input inputMode="decimal" value={item.unit_price} onChange={e => updateItem(index, { unit_price: e.target.value })} placeholder="0.00" />
            <div className="font-semibold">{formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}</div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setItems(current => current.length > 1 ? current.filter((_, i) => i !== index) : current)} disabled={items.length === 1}><Trash2 className="h-4 w-4" /></Button>
          </div>)}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Button type="button" variant="outline" onClick={() => setItems(current => [...current, emptyItem()])}><Plus className="mr-2 h-4 w-4" />Agregar partida</Button><div className="text-right"><p className="text-sm text-muted-foreground">Total de la compra</p><p className="text-2xl font-bold">{formatCurrency(total)}</p></div></div>
        <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}Registrar compra</Button></div>
        {paymentMethod === "credit" && <Badge variant="outline">Esta compra generará una cuenta por pagar al proveedor por {formatCurrency(total)}.</Badge>}
      </CardContent>
    </Card>
  </div>;
}
