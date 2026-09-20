"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-provider";
import { useData } from "@/contexts/data-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Plus, Trash2, Loader2, ShoppingCart, AlertCircle, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

type Supplier = { id: string; name: string };
type CatalogItem = { id: string; name: string; part_number: string | null; default_cost: number | null; category_id: string | null };
type PaymentMethod = "cash" | "transfer" | "card" | "credit";
type PurchaseItem = { catalog_item_id: string; description: string; quantity: string; unit_price: string };
type VehicleExpense = { id: string; description: string; date: string; vehicleName: string; categoryId: string | null; categoryName: string | null; lines: { id: string; concept: string; amount: number; catalogItemId: string | null; allocated: number }[] };
type AllocationSummary = { financialRecordId: string; expenseItemId: string; amount: number; purchaseId: string; supplierName: string; purchaseDate: string; reference: string | null };

const emptyItem = (): PurchaseItem => ({ catalog_item_id: "", description: "", quantity: "1", unit_price: "" });

export function SupplierPurchasesForm() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { selectedCompanyId } = useData();
  const companyId = selectedCompanyId || currentUser?.companyId || null;
  const canManage = currentUser?.role === "admin" || currentUser?.role === "superAdmin";
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [expenses, setExpenses] = useState<VehicleExpense[]>([]);
  const [allocationSummary, setAllocationSummary] = useState<AllocationSummary[]>([]);
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
      supabase.from("catalog_items").select("id,name,part_number,default_cost,category_id").eq("company_id", companyId).eq("is_deleted", false).eq("is_active", true).order("name").limit(2000),
      supabase.from("financial_records").select("id,description,date,category_id,items,financial_categories(name),vehicles(make,model,plate)").eq("company_id", companyId).eq("type", "expense").eq("is_deleted", false).not("vehicle_id", "is", null).order("date", { ascending: false }).limit(200),
      supabase.from("supplier_purchase_allocations").select("purchase_id,financial_record_id,expense_item_id,amount").eq("company_id", companyId).not("expense_item_id", "is", null),
      supabase.from("supplier_purchases").select("id,supplier_id,purchase_date,reference,suppliers(name)").eq("company_id", companyId).eq("is_deleted", false),
    ]).then(([supplierResult, catalogResult, expenseResult, allocationResult, purchaseResult]) => {
      if (cancelled) return;
      if (supplierResult.error) toast.error("No se pudieron cargar los proveedores.", { description: supplierResult.error.message });
      if (catalogResult.error) toast.error("No se pudo cargar el catálogo.", { description: catalogResult.error.message });
      if (expenseResult.error) toast.error("No se pudieron cargar los gastos para vinculación.", { description: expenseResult.error.message });
      if (allocationResult.error) toast.error("No se pudo comprobar qué líneas ya están utilizadas.", { description: allocationResult.error.message });
      if (purchaseResult.error) toast.error("No se pudo cargar el detalle de proveedores de las compras.", { description: purchaseResult.error.message });
      setSuppliers((supplierResult.data || []) as Supplier[]);
      setCatalog((catalogResult.data || []) as CatalogItem[]);
      const purchaseRows = (allocationResult.data || []) as any[];
      const purchaseById = new Map(((purchaseResult.data || []) as any[]).map(row => [row.id, row]));
      const allocatedByLine = new Map<string, number>();
      const summaries: AllocationSummary[] = [];
      purchaseRows.forEach(row => {
        if (!row.financial_record_id || !row.expense_item_id) return;
        const key = `${row.financial_record_id}:${row.expense_item_id}`;
        const amount = Number(row.amount || 0);
        allocatedByLine.set(key, (allocatedByLine.get(key) || 0) + amount);
        const purchase = purchaseById.get(row.purchase_id);
        summaries.push({ financialRecordId: row.financial_record_id, expenseItemId: row.expense_item_id, amount, purchaseId: row.purchase_id, supplierName: purchase?.suppliers?.name || "Proveedor", purchaseDate: purchase?.purchase_date || "", reference: purchase?.reference || null });
      });
      setAllocationSummary(summaries);
      setExpenses(((expenseResult.data || []) as any[]).map(row => ({
        id: row.id,
        description: row.description || "Gasto de vehículo",
        date: row.date,
        vehicleName: row.vehicles ? `${row.vehicles.make} ${row.vehicles.model} (${row.vehicles.plate})` : "Vehículo",
        categoryId: row.category_id || null,
        lines: (Array.isArray(row.items) ? row.items : []).map((line: any, index: number) => {
          const id = String(line.id || `legacy-${row.id}-${index}`);
          const amount = Number(line.amount || 0);
          return { id, concept: String(line.concept || line.description || "Concepto"), amount, catalogItemId: line.catalog_item_id || line.catalogItemId || line.article_id || null, allocated: allocatedByLine.get(`${row.id}:${id}`) || 0 };
        }).filter((line: { amount: number }) => line.amount > 0),
      })).filter(expense => expense.lines.some(line => line.amount - line.allocated > 0.009)));
    });
    return () => { cancelled = true; };
  }, [companyId]);

  const total = useMemo(() => items.reduce((sum, item) => sum + Math.round((Number(item.quantity) || 0) * (Number(item.unit_price) || 0) * 100) / 100, 0), [items]);
  const selectedExpense = expenses.find(expense => expense.id === expenseId);
  const catalogForSelectedExpense = useMemo(() => {
    if (!selectedExpense) return [];
    const availableLines = selectedExpense.lines.filter(line => line.amount - line.allocated > 0.009);
    const exactIds = new Set(availableLines.map(line => line.catalogItemId).filter(Boolean) as string[]);
    const exactItems = catalog.filter(item => exactIds.has(item.id));
    const byConcept = availableLines
      .map(line => catalog.find(item => item.name.trim().toLowerCase() === line.concept.trim().toLowerCase()))
      .filter(Boolean) as CatalogItem[];
    const merged = [...exactItems, ...byConcept];
    if (merged.length) return Array.from(new Map(merged.map(item => [item.id, item])).values());
    const categoryName = selectedExpense.categoryName?.trim().toLowerCase();
    if (selectedExpense.categoryId || categoryName) {
      return catalog.filter(item =>
        (selectedExpense.categoryId && item.category_id === selectedExpense.categoryId) ||
        (!!categoryName && item.category_name?.trim().toLowerCase() === categoryName)
      );
    }
    return [];
  }, [selectedExpense, catalog]);

  const updateItem = (index: number, patch: Partial<PurchaseItem>) => setItems(current => current.map((item, i) => i === index ? { ...item, ...patch } : item));

  const selectCatalog = (index: number, id: string) => {
    const item = catalog.find(c => c.id === id);
    updateItem(index, { catalog_item_id: id, description: item?.name || "", unit_price: item?.default_cost != null ? String(item.default_cost) : "" });
  };

  const loadExpenseLines = () => {
    if (!selectedExpense) return toast.error("Selecciona primero un gasto del vehículo.");
    const availableLines = selectedExpense.lines.filter(line => line.amount - line.allocated > 0.009);
    if (!availableLines.length) return toast.error("Todas las líneas de este gasto ya están cubiertas por compras de proveedores.");
    setItems(availableLines.map(line => {
      const matchingCatalog = (line.catalogItemId ? catalog.find(item => item.id === line.catalogItemId) : null) || catalogForSelectedExpense.find(item => item.name.trim().toLowerCase() === line.concept.trim().toLowerCase());
      return { catalog_item_id: matchingCatalog?.id || "", description: matchingCatalog?.name || line.concept, quantity: "1", unit_price: String(Math.max(0, line.amount - line.allocated)) };
    }));
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
    if (!selectedExpense) return toast.error("Selecciona un gasto de vehículo y carga sus partidas antes de registrar la compra.");
    if (!catalogForSelectedExpense.length) return toast.error("La categoría de este gasto no tiene artículos en el catálogo. Registra primero el artículo en el Catálogo de Artículos.");
    if (!items.length || items.some(i => !i.catalog_item_id || !i.description.trim() || !(Number(i.quantity) > 0) || Number(i.unit_price) < 0)) return toast.error("Cada partida debe corresponder a un artículo del catálogo.");
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

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              Finanzas
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">Compras a proveedores</h1>
            <p className="mt-1 text-sm text-white/40">Registra la compra y vincula partidas con el gasto del vehículo</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d7ff3f]/15 bg-[#d7ff3f]/[0.08] text-[#d7ff3f]">
            <ShoppingCart className="h-5 w-5" strokeWidth={1.75} />
          </div>
        </header>
        <div className="max-w-5xl overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-5 shadow-[0_18px_50px_rgba(0,0,0,.22)] sm:p-6">
          <div className="mb-5">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-white">Nueva compra</h2>
            <p className="mt-1 text-xs text-white/40">Una compra puede contener varias partidas y relacionarse con gastos de vehículos.</p>
          </div>
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                <Label className="text-white/50">Proveedor</Label>
                <div className="flex gap-2">
                  <Select value={supplierId} onValueChange={v => setSupplierId(v === "none" ? "" : v)}>
                    <SelectTrigger className="min-w-0 flex-1 border-white/10 bg-white/[0.03] text-white"><SelectValue placeholder="Seleccionar proveedor..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Seleccionar...</SelectItem>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      {suppliers.length === 0 && <div className="px-2 py-3 text-sm text-white/40">No hay proveedores en el catálogo.</div>}
                    </SelectContent>
                  </Select>
                  {canManage && (
                    <Button type="button" variant="outline" size="icon" title="Crear proveedor" onClick={() => setSupplierDialogOpen(true)} className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white">
                      <Plus className="h-4 w-4" strokeWidth={1.75} />
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-white/35">¿No aparece? Usa + para crearlo sin salir de la compra.</p>
              </div>
              <div className="space-y-2"><Label className="text-white/50">Fecha</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="border-white/10 bg-white/[0.03] text-white" /></div>
              <div className="space-y-2"><Label className="text-white/50">Referencia / factura</Label><Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Opcional" className="border-white/10 bg-white/[0.03] text-white" /></div>
              <div className="space-y-2">
                <Label className="text-white/50">Forma de pago</Label>
                <Select value={paymentMethod} onValueChange={v => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger className="border-white/10 bg-white/[0.03] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(paymentLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {paymentMethod === "credit" && <div className="space-y-2"><Label className="text-white/50">Vencimiento</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="border-white/10 bg-white/[0.03] text-white" /></div>}
              <div className="space-y-2 sm:col-span-2 lg:col-span-2"><Label className="text-white/50">Notas</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" className="border-white/10 bg-white/[0.03] text-white" /></div>
            </div>
            <div className="space-y-3 rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-[#d7ff3f]" strokeWidth={1.75} />
                <div className="min-w-0">
                  <p className="font-medium text-white/90">Cargar partidas desde un gasto de vehículo</p>
                  <p className="text-xs text-white/40 sm:text-sm">Solo artículos del catálogo de la categoría del gasto. Las líneas ya vinculadas no se reutilizan.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={expenseId || "none"} onValueChange={v => setExpenseId(v === "none" ? "" : v)}>
                  <SelectTrigger className="min-w-0 flex-1 border-white/10 bg-white/[0.03] text-white"><SelectValue placeholder="Seleccionar gasto del vehículo..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar gasto...</SelectItem>
                    {expenses.map(expense => <SelectItem key={expense.id} value={expense.id}>{expense.vehicleName} · {expense.description} · {new Date(expense.date).toLocaleDateString("es-MX")}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={loadExpenseLines} disabled={!expenseId || !catalogForSelectedExpense.length} className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white">
                  <Search className="mr-2 h-4 w-4" strokeWidth={1.75} />Cargar partidas
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="hidden grid-cols-[1.7fr_.7fr_1fr_1fr_auto] gap-2 px-3 text-[10px] font-semibold uppercase tracking-wide text-white/35 md:grid">
                <span>Concepto / catálogo</span><span>Cantidad</span><span>Precio unitario</span><span>Total</span><span />
              </div>
              {items.map((item, index) => (
                <div key={index} className="rounded-[16px] border border-white/[0.07] bg-white/[0.02] p-3 sm:p-4 md:grid md:grid-cols-[1.7fr_.7fr_1fr_1fr_auto] md:items-end md:gap-2 md:rounded-none md:border-x-0 md:border-b-0 md:border-t md:border-white/[0.06] md:bg-transparent md:p-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2 md:block">
                      <Label className="text-white/50 md:hidden">Artículo / concepto</Label>
                      <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50 md:hidden">Partida {index + 1}</span>
                    </div>
                    <Select value={item.catalog_item_id || "none"} onValueChange={v => (v === "none" ? updateItem(index, { catalog_item_id: "" }) : selectCatalog(index, v))}>
                      <SelectTrigger className="w-full min-w-0 border-white/10 bg-white/[0.03] text-white"><SelectValue placeholder={selectedExpense ? "Seleccionar artículo..." : "Selecciona primero el gasto"} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Seleccionar artículo...</SelectItem>
                        {catalogForSelectedExpense.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.part_number ? ` · ${c.part_number}` : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input value={item.description} onChange={e => updateItem(index, { description: e.target.value })} placeholder="Descripción del artículo" className="border-white/10 bg-white/[0.03] text-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:contents">
                    <div className="space-y-1 md:space-y-0"><Label className="text-xs text-white/50 md:hidden">Cantidad</Label><Input inputMode="decimal" value={item.quantity} onChange={e => updateItem(index, { quantity: e.target.value })} className="border-white/10 bg-white/[0.03] text-white" /></div>
                    <div className="space-y-1 md:space-y-0"><Label className="text-xs text-white/50 md:hidden">Precio unitario</Label><Input inputMode="decimal" value={item.unit_price} onChange={e => updateItem(index, { unit_price: e.target.value })} placeholder="0.00" className="border-white/10 bg-white/[0.03] text-white" /></div>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-3 md:pt-0">
                    <span className="text-xs text-white/40 md:hidden">Importe</span>
                    <span className="font-semibold tabular-nums text-white">{formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}</span>
                    <Button type="button" variant="ghost" size="icon" className="text-white/40 hover:bg-white/[0.06] hover:text-white md:hidden" onClick={() => setItems(current => (current.length > 1 ? current.filter((_, i) => i !== index) : current))} disabled={items.length === 1}><Trash2 className="h-4 w-4" strokeWidth={1.75} /></Button>
                  </div>
                  <div className="hidden justify-end md:flex">
                    <Button type="button" variant="ghost" size="icon" className="text-white/40 hover:bg-white/[0.06] hover:text-white" onClick={() => setItems(current => (current.length > 1 ? current.filter((_, i) => i !== index) : current))} disabled={items.length === 1}><Trash2 className="h-4 w-4" strokeWidth={1.75} /></Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setItems(current => [...current, emptyItem()])} className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white">
                <Plus className="mr-2 h-4 w-4" strokeWidth={1.75} />Agregar partida
              </Button>
              <div className="text-left sm:text-right">
                <p className="text-xs text-white/40">Total de la compra</p>
                <p className="font-heading text-2xl font-semibold tabular-nums tracking-tight text-white">{formatCurrency(total)}</p>
              </div>
            </div>
            {saveError && (
              <div className="flex items-start gap-3 rounded-[16px] border border-rose-400/25 bg-rose-400/[0.06] p-3 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-300" strokeWidth={1.75} />
                <div><p className="font-medium text-rose-300">No se pudo registrar la compra</p><p className="mt-1 break-words text-white/50">{saveError}</p></div>
              </div>
            )}
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
              {paymentMethod === "credit" ? (
                <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold text-amber-300">Generará CxP por {formatCurrency(total)}</span>
              ) : (<span />)}
              <Button onClick={save} disabled={saving} className="h-11 rounded-xl bg-[#d7ff3f] px-5 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90 disabled:opacity-60">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} /> : <Building2 className="mr-2 h-4 w-4" strokeWidth={1.75} />}
                Registrar compra
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-5xl overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-5 shadow-[0_18px_50px_rgba(0,0,0,.22)] sm:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold tracking-tight text-white">Gastos operativos pendientes de compra</h2>
            <p className="mt-1 text-xs text-white/40 sm:text-sm">Aquí aparecen las líneas de gastos de vehículos que todavía no están cubiertas por una compra de proveedor.</p>
          </div>
          <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold text-amber-300">{expenses.length} gasto(s) con saldo pendiente</div>
        </div>
        {expenses.length === 0 ? (
          <div className="rounded-[16px] border border-emerald-400/15 bg-emerald-400/[0.05] p-4 text-sm text-emerald-300">No hay líneas de gastos de vehículos pendientes de asociar a una compra de proveedor.</div>
        ) : (
          <div className="space-y-3">
            {expenses.map(expense => {
              const pendingLines = expense.lines.map(line => {
                const purchased = allocationSummary.filter(a => a.financialRecordId === expense.id && a.expenseItemId === line.id).reduce((sum, a) => sum + a.amount, 0);
                return { ...line, purchased, pending: Math.max(0, line.amount - purchased) };
              }).filter(line => line.pending > 0.009);
              if (!pendingLines.length) return null;
              return (
                <div key={expense.id} className="rounded-[16px] border border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-white">{expense.vehicleName}</p>
                      <p className="text-xs text-white/40">{expense.description} · {new Date(expense.date).toLocaleDateString("es-MX")}</p>
                    </div>
                    <span className="text-xs font-semibold text-amber-300">Pendiente de compra</span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {pendingLines.map(line => {
                      const links = allocationSummary.filter(a => a.financialRecordId === expense.id && a.expenseItemId === line.id);
                      const suppliers = Array.from(new Set(links.map(a => a.supplierName).filter(Boolean)));
                      return (
                        <div key={line.id} className="grid gap-2 rounded-xl border border-white/[0.06] bg-black/10 p-3 sm:grid-cols-[1.6fr_.8fr_.8fr_1.4fr] sm:items-center">
                          <div><p className="text-sm font-medium text-white/90">{line.concept}</p><p className="text-[11px] text-white/35">Gasto original {formatCurrency(line.amount)}</p></div>
                          <div><p className="text-[10px] uppercase tracking-wide text-white/30">Comprado</p><p className="text-sm font-semibold text-white">{formatCurrency(line.purchased)}</p></div>
                          <div><p className="text-[10px] uppercase tracking-wide text-white/30">Pendiente</p><p className="text-sm font-semibold text-amber-300">{formatCurrency(line.pending)}</p></div>
                          <div><p className="text-[10px] uppercase tracking-wide text-white/30">Proveedor asociado</p><p className="text-sm text-white/70">{suppliers.length ? suppliers.join(", ") : "Sin compra registrada"}</p></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo proveedor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Se creará en el mismo catálogo de proveedores de FleetEase.</p>
            <div className="space-y-2"><Label>Nombre comercial *</Label><Input autoFocus value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Ej. Refaccionaria X" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>RFC</Label><Input value={newSupplierRfc} onChange={e => setNewSupplierRfc(e.target.value)} /></div>
              <div className="space-y-2"><Label>Teléfono</Label><Input value={newSupplierPhone} onChange={e => setNewSupplierPhone(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierDialogOpen(false)}>Cancelar</Button>
            <Button disabled={savingSupplier || !newSupplierName.trim()} onClick={() => void createSupplierFromPurchase()}>{savingSupplier && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear proveedor</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
