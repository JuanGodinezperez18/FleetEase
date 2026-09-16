"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-provider";
import { useData } from "@/contexts/data-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Trash2, Loader2, ShoppingCart, AlertCircle, Search, Wrench, Lock } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type Supplier = { id: string; name: string };
type CatalogItem = { id: string; name: string; part_number: string | null; default_cost: number | null };
type PaymentMethod = "cash" | "transfer" | "card" | "credit";
type PurchaseItem = { catalog_item_id: string; description: string; quantity: string; unit_price: string };
type VehicleExpense = { id: string; description: string; date: string; vehicleName: string; lines: { id: string; concept: string; amount: number; used: boolean }[] };

const emptyItem = (): PurchaseItem => ({ catalog_item_id: "", description: "", quantity: "1", unit_price: "" });

export default function SupplierPurchasesPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { selectedCompanyId } = useData();
  const companyId = selectedCompanyId || currentUser?.companyId || null;
  const canManage = currentUser?.role === "admin" || currentUser?.role === "superAdmin";
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [usedExpenseLines, setUsedExpenseLines] = useState<Set<string>>(new Set());
  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [dueDate, setDueDate] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierRfc, setNewSupplierRfc] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [expenseId, setExpenseId] = useState("");

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    Promise.all([
      supabase.from("suppliers").select("id,name").eq("company_id", companyId).eq("is_deleted", false).eq("is_active", true).order("name"),
      supabase.from("catalog_items").select("id,name,part_number,default_cost").eq("company_id", companyId).eq("is_deleted", false).eq("is_active", true).order("name").limit(2000),
      supabase.from("financial_records").select("id,description,date,items,vehicles(make,model,plate)").eq("company_id", companyId).eq("type", "expense").eq("is_deleted", false).not("vehicle_id", "is", null).order("date", { ascending: false }).limit(200),
      supabase.from("supplier_purchase_allocations").select("financial_record_id,expense_item_id").eq("company_id", companyId).not("expense_item_id", "is", null),
    ]).then(([supplierResult, catalogResult, expenseResult, allocationResult]) => {
      if (cancelled) return;
      if (supplierResult.error) toast.error("No se pudieron cargar los proveedores.", { description: supplierResult.error.message });
      if (catalogResult.error) toast.error("No se pudo cargar el catálogo.", { description: catalogResult.error.message });
      if (expenseResult.error) toast.error("No se pudieron cargar los gastos para vinculación.", { description: expenseResult.error.message });
      if (allocationResult.error) toast.error("No se pudo comprobar qué líneas ya están utilizadas.", { description: allocationResult.error.message });
      setSuppliers((supplierResult.data || []) as Supplier[]);
      setCatalog((catalogResult.data || []) as CatalogItem[]);
      setUsedExpenseLines(new Set(((allocationResult.data || []) as any[]).map(row => `${row.financial_record_id}:${row.expense_item_id}`)));
      setExpenses(((expenseResult.data || []) as any[]).map(row => ({
        id: row.id,
        description: row.description || "Gasto de vehículo",
        date: row.date,
        vehicleName: row.vehicles ? `${row.vehicles.make} ${row.vehicles.model} (${row.vehicles.plate})` : "Vehículo",
        lines: (Array.isArray(row.items) ? row.items : []).map((line: any, index: number) => {
          const id = String(line.id || `legacy-${row.id}-${index}`);
          return { id, concept: String(line.concept || line.description || "Concepto"), amount: Number(line.amount || 0), used: usedExpenseLines.has(`${row.id}:${id}`) };
        }).filter((line: { amount: number }) => line.amount > 0),
      })).filter(expense => expense.lines.some(line => !line.used)));
    });
    return () => { cancelled = true; };
  }, [companyId]);

  const total = useMemo(() => items.reduce((sum, item) => sum + Math.round((Number(item.quantity) || 0) * (Number(item.unit_price) || 0) * 100) / 100, 0), [items]);
  const selectedExpense = expenses.find(expense => expense.id === expenseId);

  const updateItem = (index: number, patch: Partial<PurchaseItem>) => setItems(current => current.map((item, i) => i === index ? { ...item, ...patch } : item));

  const selectCatalog = (index: number, id: string) => {
    const item = catalog.find(c => c.id === id);
    updateItem(index, { catalog_item_id: id, description: item?.name || "", unit_price: item?.default_cost != null ? String(item.default_cost) : "" });
  };

  const loadExpenseLines = () => {
    if (!selectedExpense) return toast.error("Selecciona primero un gasto del vehículo.");
    const availableLines = selectedExpense.lines.filter(line => !usedExpenseLines.has(`${selectedExpense.id}:${line.id}`));
    if (!availableLines.length) return toast.error("Todas las líneas de este gasto ya fueron vinculadas a un proveedor.");
    setItems(availableLines.map(line => ({ catalog_item_id: "", description: line.concept, quantity: "1", unit_price: String(line.amount) })));
    toast.success("Partidas disponibles cargadas", { description: `${availableLines.length} línea(s) disponible(s). Las líneas ya vinculadas no se pueden reutilizar.` });
  };

  const createSupplierFromPurchase = async () => {
    if (!canManage || !companyId || !newSupplierName.trim()) return;
    setSavingSupplier(true);
    try {
      const { data, error } = await supabase.from("suppliers").insert({ company_id: companyId, name: newSupplierName.trim(), rfc: newSupplierRfc.trim() || null, phone: newSupplierPhone.trim() || null }).select("id,name").single();
      if (error) throw error;
      const created = data as Supplier;
      setSuppliers(current => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSupplierId(created.id);
      setSupplierDialogOpen(false);
      setNewSupplierName(""); setNewSupplierRfc(""); setNewSupplierPhone("");
      toast.success("Proveedor creado", { description: "Quedó guardado en el Catálogo de Proveedores y seleccionado en esta compra." });
    } catch (error) {
      toast.error("No se pudo crear el proveedor", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally { setSavingSupplier(false); }
  };

  const save = async () => {
    setSaveError("");
    if (!companyId) return toast.error("No hay una empresa seleccionada.");
    if (!supplierId || supplierId === "none") return toast.error("Selecciona el proveedor.");
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
      const message = error instanceof Error ? error.message : "Error inesperado al registrar la compra.";
      console.error("[FleetEase] create_supplier_purchase failed", error);
      setSaveError(message);
      toast.error("No se pudo registrar la compra", { description: message });
    } finally { setSaving(false); }
  };

  const paymentLabels: Record<PaymentMethod, string> = { cash: "Contado / efectivo", transfer: "Transferencia", card: "Tarjeta", credit: "Crédito" };

  return <div className="space-y-6 p-3 sm:p-4 md:p-6">
    <div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-3 shrink-0"><ShoppingCart className="h-6 w-6 text-primary" /></div><div><h1 className="text-2xl font-bold tracking-tight">Compras a proveedores</h1><p className="text-sm md:text-base text-muted-foreground">Registra la compra y después vincula sus partidas con las líneas exactas del gasto del vehículo.</p></div></div>
    <Card className="max-w-5xl">
      <CardHeader><CardTitle>Nueva compra</CardTitle><CardDescription>Una compra puede contener múltiples partidas y puede relacionarse con gastos de distintos vehículos.</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 sm:col-span-2 lg:col-span-2"><Label>Proveedor</Label><div className="flex gap-2"><Select value={supplierId} onValueChange={v => setSupplierId(v === "none" ? "" : v)}><SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger><SelectContent><SelectItem value="none">Seleccionar...</SelectItem>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}{suppliers.length === 0 && <div className="px-2 py-3 text-sm text-muted-foreground">No hay proveedores en el catálogo.</div>}</SelectContent></Select>{canManage && <Button type="button" variant="outline" size="icon" title="Crear proveedor" onClick={() => setSupplierDialogOpen(true)}><Plus className="h-4 w-4" /></Button>}</div><p className="text-xs text-muted-foreground">¿No aparece? Usa + para crear el proveedor sin salir de la compra.</p></div>
          <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Referencia / factura</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Opcional" /></div>
          <div className="space-y-2"><Label>Forma de pago</Label><Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(paymentLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          {paymentMethod === "credit" && <div className="space-y-2"><Label>Vencimiento</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>}
          <div className="space-y-2 sm:col-span-2 lg:col-span-2"><Label>Notas</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" /></div>
        </div>

        <div className="rounded-xl border bg-muted/10 p-3 sm:p-4 space-y-3">
          <div className="flex items-start gap-3"><Wrench className="h-5 w-5 text-primary mt-0.5 shrink-0" /><div className="min-w-0"><p className="font-medium">Cargar partidas desde un gasto de vehículo</p><p className="text-xs sm:text-sm text-muted-foreground">Solo se pueden cargar líneas que todavía no estén vinculadas a otro proveedor.</p></div></div>
          <div className="flex flex-col sm:flex-row gap-2"><Select value={expenseId || "none"} onValueChange={v => setExpenseId(v === "none" ? "" : v)}><SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Seleccionar gasto del vehículo..." /></SelectTrigger><SelectContent><SelectItem value="none">Seleccionar gasto...</SelectItem>{expenses.map(expense => <SelectItem key={expense.id} value={expense.id}>{expense.vehicleName} · {expense.description} · {new Date(expense.date).toLocaleDateString("es-MX")}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" onClick={loadExpenseLines} disabled={!expenseId}><Search className="mr-2 h-4 w-4" />Cargar partidas</Button></div>
        </div>

        <div className="space-y-3">
          <div className="hidden md:grid grid-cols-[1.7fr_.7fr_1fr_1fr_auto] gap-2 px-3 text-xs font-medium text-muted-foreground"><span>Concepto / catálogo</span><span>Cantidad</span><span>Precio unitario</span><span>Total</span><span /></div>
          {items.map((item, index) => <div key={index} className="rounded-xl border bg-background p-3 sm:p-4 md:rounded-none md:border-t md:border-x-0 md:border-b-0 md:p-3 md:grid md:grid-cols-[1.7fr_.7fr_1fr_1fr_auto] md:gap-2 md:items-end">
            <div className="space-y-2 min-w-0"><div className="flex items-center justify-between gap-2 md:block"><Label className="md:hidden">Artículo / concepto</Label><Badge variant="outline" className="md:hidden">Partida {index + 1}</Badge></div><Select value={item.catalog_item_id || "none"} onValueChange={v => v === "none" ? updateItem(index, { catalog_item_id: "" }) : selectCatalog(index, v)}><SelectTrigger className="w-full min-w-0"><SelectValue placeholder="Catálogo o captura manual" /></SelectTrigger><SelectContent><SelectItem value="none">Captura manual</SelectItem>{catalog.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.part_number ? ` · ${c.part_number}` : ""}</SelectItem>)}</SelectContent></Select><Input value={item.description} onChange={e => updateItem(index, { description: e.target.value })} placeholder="Descripción del artículo" /></div>
            <div className="grid grid-cols-2 gap-3 md:contents"><div className="space-y-1 md:space-y-0"><Label className="md:hidden text-xs">Cantidad</Label><Input inputMode="decimal" value={item.quantity} onChange={e => updateItem(index, { quantity: e.target.value })} /></div><div className="space-y-1 md:space-y-0"><Label className="md:hidden text-xs">Precio unitario</Label><Input inputMode="decimal" value={item.unit_price} onChange={e => updateItem(index, { unit_price: e.target.value })} placeholder="0.00" /></div></div>
            <div className="flex items-center justify-between gap-3 pt-3 md:pt-0"><span className="text-xs text-muted-foreground md:hidden">Importe</span><span className="font-semibold">{formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}</span><Button type="button" variant="ghost" size="icon" className="md:hidden" onClick={() => setItems(current => current.length > 1 ? current.filter((_, i) => i !== index) : current)} disabled={items.length === 1}><Trash2 className="h-4 w-4" /></Button></div>
            <div className="hidden md:flex justify-end"><Button type="button" variant="ghost" size="icon" onClick={() => setItems(current => current.length > 1 ? current.filter((_, i) => i !== index) : current)} disabled={items.length === 1}><Trash2 className="h-4 w-4" /></Button></div>
          </div>)}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Button type="button" variant="outline" onClick={() => setItems(current => [...current, emptyItem()])}><Plus className="mr-2 h-4 w-4" />Agregar partida</Button><div className="text-left sm:text-right"><p className="text-sm text-muted-foreground">Total de la compra</p><p className="text-2xl font-bold">{formatCurrency(total)}</p></div></div>
        {saveError && <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"><AlertCircle className="h-5 w-5 shrink-0 text-destructive" /><div><p className="font-medium text-destructive">No se pudo registrar la compra</p><p className="mt-1 break-words text-muted-foreground">{saveError}</p></div></div>}
        <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}Registrar compra</Button></div>
        {paymentMethod === "credit" && <Badge variant="outline">Esta compra generará una cuenta por pagar al proveedor por {formatCurrency(total)}.</Badge>}
      </CardContent>
    </Card>

    <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Nuevo proveedor</DialogTitle></DialogHeader><div className="space-y-4"><p className="text-sm text-muted-foreground">Se creará directamente en el mismo Catálogo de Proveedores que usa FleetEase.</p><div className="space-y-2"><Label>Nombre comercial *</Label><Input autoFocus value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Ej. Refaccionaria X" /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>RFC</Label><Input value={newSupplierRfc} onChange={e => setNewSupplierRfc(e.target.value)} /></div><div className="space-y-2"><Label>Teléfono</Label><Input value={newSupplierPhone} onChange={e => setNewSupplierPhone(e.target.value)} /></div></div></div><DialogFooter><Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>Cancelar</Button><Button disabled={savingSupplier || !newSupplierName.trim()} onClick={() => void createSupplierFromPurchase()}>{savingSupplier && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear proveedor</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
