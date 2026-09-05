"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-provider";
import { useData } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Package, Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";

interface Supplier {
  id: string;
  company_id: string;
  name: string;
  legal_name: string | null;
  rfc: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  contact_name: string | null;
  notes: string | null;
  is_active: boolean;
}

interface CatalogItem {
  id: string;
  company_id: string;
  name: string;
  part_number: string | null;
  brand: string | null;
  category_id: string | null;
  default_supplier_id: string | null;
  unit: string;
  default_cost: number | null;
  warranty_days: number | null;
  compatibility: string | null;
  notes: string | null;
  is_active: boolean;
}

const emptySupplier = { name: "", legal_name: "", rfc: "", phone: "", email: "", address: "", contact_name: "", notes: "" };
const emptyItem = { name: "", part_number: "", brand: "", category_id: "", default_supplier_id: "", unit: "pieza", default_cost: "", warranty_days: "", compatibility: "", notes: "" };

export default function CatalogsPage() {
  const { currentUser } = useAuth();
  const { financialCategories } = useData();
  const companyId = currentUser?.companyId || null;
  const canManage = currentUser?.role === "admin" || currentUser?.role === "superAdmin";

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [supplierForm, setSupplierForm] = useState(emptySupplier);
  const [itemForm, setItemForm] = useState(emptyItem);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [{ data: supplierData, error: supplierError }, { data: itemData, error: itemError }] = await Promise.all([
        supabase.from("suppliers").select("*").eq("company_id", companyId).eq("is_deleted", false).order("name"),
        supabase.from("catalog_items").select("*").eq("company_id", companyId).eq("is_deleted", false).order("name"),
      ]);
      if (supplierError) throw supplierError;
      if (itemError) throw itemError;
      setSuppliers((supplierData || []) as Supplier[]);
      setItems((itemData || []) as CatalogItem[]);
    } catch (error) {
      toast.error("No se pudieron cargar los catálogos", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  const filteredSuppliers = useMemo(() => suppliers.filter(s => `${s.name} ${s.legal_name || ""} ${s.rfc || ""}`.toLowerCase().includes(supplierSearch.toLowerCase())), [suppliers, supplierSearch]);
  const filteredItems = useMemo(() => items.filter(i => `${i.name} ${i.part_number || ""} ${i.brand || ""}`.toLowerCase().includes(itemSearch.toLowerCase())), [items, itemSearch]);

  const openSupplier = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setSupplierForm({ name: supplier.name, legal_name: supplier.legal_name || "", rfc: supplier.rfc || "", phone: supplier.phone || "", email: supplier.email || "", address: supplier.address || "", contact_name: supplier.contact_name || "", notes: supplier.notes || "" });
    } else {
      setEditingSupplier(null);
      setSupplierForm(emptySupplier);
    }
    setSupplierOpen(true);
  };

  const openItem = (item?: CatalogItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({ name: item.name, part_number: item.part_number || "", brand: item.brand || "", category_id: item.category_id || "", default_supplier_id: item.default_supplier_id || "", unit: item.unit || "pieza", default_cost: item.default_cost == null ? "" : String(item.default_cost), warranty_days: item.warranty_days == null ? "" : String(item.warranty_days), compatibility: item.compatibility || "", notes: item.notes || "" });
    } else {
      setEditingItem(null);
      setItemForm(emptyItem);
    }
    setItemOpen(true);
  };

  const saveSupplier = async () => {
    if (!canManage || !companyId || !supplierForm.name.trim()) return;
    setSaving(true);
    try {
      const payload = { ...supplierForm, name: supplierForm.name.trim(), company_id: companyId };
      const result = editingSupplier
        ? await supabase.from("suppliers").update(payload).eq("id", editingSupplier.id).eq("company_id", companyId)
        : await supabase.from("suppliers").insert(payload);
      if (result.error) throw result.error;
      toast.success(editingSupplier ? "Proveedor actualizado" : "Proveedor creado");
      setSupplierOpen(false);
      await load();
    } catch (error) {
      toast.error("No se pudo guardar el proveedor", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally { setSaving(false); }
  };

  const saveItem = async () => {
    if (!canManage || !companyId || !itemForm.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        name: itemForm.name.trim(),
        part_number: itemForm.part_number || null,
        brand: itemForm.brand || null,
        category_id: itemForm.category_id || null,
        default_supplier_id: itemForm.default_supplier_id || null,
        unit: itemForm.unit || "pieza",
        default_cost: itemForm.default_cost === "" ? null : Number(itemForm.default_cost),
        warranty_days: itemForm.warranty_days === "" ? null : Number(itemForm.warranty_days),
        compatibility: itemForm.compatibility || null,
        notes: itemForm.notes || null,
      };
      const result = editingItem
        ? await supabase.from("catalog_items").update(payload).eq("id", editingItem.id).eq("company_id", companyId)
        : await supabase.from("catalog_items").insert(payload);
      if (result.error) throw result.error;
      toast.success(editingItem ? "Artículo actualizado" : "Artículo creado");
      setItemOpen(false);
      await load();
    } catch (error) {
      toast.error("No se pudo guardar el artículo", { description: error instanceof Error ? error.message : "Error desconocido" });
    } finally { setSaving(false); }
  };

  const softDelete = async (table: "suppliers" | "catalog_items", id: string, label: string) => {
    if (!canManage || !companyId) return;
    try {
      const { error } = await supabase.from(table).update({ is_deleted: true, is_active: false }).eq("id", id).eq("company_id", companyId);
      if (error) throw error;
      toast.success(`${label} eliminado del catálogo`);
      await load();
    } catch (error) {
      toast.error("No se pudo eliminar", { description: error instanceof Error ? error.message : "Error desconocido" });
    }
  };

  const supplierName = (id: string | null) => suppliers.find(s => s.id === id)?.name || "Sin proveedor habitual";

  if (!companyId) return <div className="p-6"><Card><CardContent className="py-10 text-center">Selecciona una empresa para administrar sus catálogos.</CardContent></Card></div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catálogos</h1>
        <p className="text-muted-foreground">Proveedores y artículos/refacciones para registrar compras y conservar la trazabilidad de garantías.</p>
      </div>

      <Tabs defaultValue="suppliers" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="suppliers"><Building2 className="mr-2 h-4 w-4" />Proveedores</TabsTrigger>
          <TabsTrigger value="items"><Package className="mr-2 h-4 w-4" />Artículos / Refacciones</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div><CardTitle>Proveedores</CardTitle><CardDescription>Conserva los datos de las tiendas, distribuidores y talleres donde compras.</CardDescription></div>
              {canManage && <Button onClick={() => openSupplier()}><Plus className="mr-2 h-4 w-4" />Nuevo proveedor</Button>}
            </CardHeader>
            <CardContent>
              <div className="relative mb-4 max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar proveedor, RFC..." value={supplierSearch} onChange={e => setSupplierSearch(e.target.value)} /></div>
              {loading ? <div className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div> : filteredSuppliers.length === 0 ? <div className="py-10 text-center text-muted-foreground">No hay proveedores registrados.</div> : <div className="divide-y rounded-lg border">{filteredSuppliers.map(s => <div key={s.id} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><div className="flex items-center gap-2 font-medium"><span className="truncate">{s.name}</span>{s.is_active ? <Badge variant="secondary">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>}</div><p className="text-sm text-muted-foreground">{s.legal_name || ""}{s.rfc ? ` · RFC ${s.rfc}` : ""}{s.phone ? ` · ${s.phone}` : ""}</p></div><div className="flex shrink-0 gap-1">{canManage && <><Button variant="ghost" size="icon" onClick={() => openSupplier(s)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => void softDelete("suppliers", s.id, "Proveedor")}><Trash2 className="h-4 w-4" /></Button></>}</div></div>)}</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div><CardTitle>Artículos / Refacciones</CardTitle><CardDescription>Catálogo común con proveedor habitual, costo y garantía predeterminada.</CardDescription></div>
              {canManage && <Button onClick={() => openItem()}><Plus className="mr-2 h-4 w-4" />Nuevo artículo</Button>}
            </CardHeader>
            <CardContent>
              <div className="relative mb-4 max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar artículo, número de parte, marca..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} /></div>
              {loading ? <div className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div> : filteredItems.length === 0 ? <div className="py-10 text-center text-muted-foreground">No hay artículos registrados.</div> : <div className="divide-y rounded-lg border">{filteredItems.map(i => <div key={i.id} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 font-medium"><span>{i.name}</span>{i.brand && <Badge variant="outline">{i.brand}</Badge>}{i.part_number && <Badge variant="secondary">{i.part_number}</Badge>}</div><p className="text-sm text-muted-foreground">Proveedor: {supplierName(i.default_supplier_id)} · {i.default_cost != null ? `$${Number(i.default_cost).toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "Sin costo"} · Garantía: {i.warranty_days != null ? `${i.warranty_days} días` : "No definida"}</p></div><div className="flex shrink-0 gap-1">{canManage && <><Button variant="ghost" size="icon" onClick={() => openItem(i)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => void softDelete("catalog_items", i.id, "Artículo")}><Trash2 className="h-4 w-4" /></Button></>}</div></div>)}</div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editingSupplier ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            {([["name","Nombre comercial *"],["legal_name","Razón social"],["rfc","RFC"],["phone","Teléfono"],["email","Correo"],["contact_name","Contacto"]] as const).map(([key,label]) => <div key={key} className="space-y-2"><Label>{label}</Label><Input value={supplierForm[key]} onChange={e => setSupplierForm(f => ({...f,[key]:e.target.value}))} /></div>)}
            <div className="space-y-2 md:col-span-2"><Label>Dirección</Label><Textarea value={supplierForm.address} onChange={e => setSupplierForm(f => ({...f,address:e.target.value}))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Notas</Label><Textarea value={supplierForm.notes} onChange={e => setSupplierForm(f => ({...f,notes:e.target.value}))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSupplierOpen(false)}>Cancelar</Button><Button disabled={saving || !supplierForm.name.trim()} onClick={() => void saveSupplier()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar proveedor</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{editingItem ? "Editar artículo / refacción" : "Nuevo artículo / refacción"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Nombre *</Label><Input value={itemForm.name} onChange={e => setItemForm(f => ({...f,name:e.target.value}))} placeholder="Ej. Balatas delanteras" /></div>
            <div className="space-y-2"><Label>Número de parte / SKU</Label><Input value={itemForm.part_number} onChange={e => setItemForm(f => ({...f,part_number:e.target.value}))} /></div>
            <div className="space-y-2"><Label>Marca</Label><Input value={itemForm.brand} onChange={e => setItemForm(f => ({...f,brand:e.target.value}))} /></div>
            <div className="space-y-2"><Label>Unidad</Label><Input value={itemForm.unit} onChange={e => setItemForm(f => ({...f,unit:e.target.value}))} /></div>
            <div className="space-y-2"><Label>Proveedor habitual</Label><Select value={itemForm.default_supplier_id || "none"} onValueChange={v => setItemForm(f => ({...f,default_supplier_id:v === "none" ? "" : v}))}><SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger><SelectContent><SelectItem value="none">Sin proveedor</SelectItem>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Categoría de gasto</Label><Select value={itemForm.category_id || "none"} onValueChange={v => setItemForm(f => ({...f,category_id:v === "none" ? "" : v}))}><SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger><SelectContent><SelectItem value="none">Sin categoría</SelectItem>{financialCategories.filter(c => c.type === "expense").map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Costo habitual</Label><Input type="number" min="0" step="0.01" value={itemForm.default_cost} onChange={e => setItemForm(f => ({...f,default_cost:e.target.value}))} /></div>
            <div className="space-y-2"><Label>Garantía predeterminada (días)</Label><Input type="number" min="0" step="1" value={itemForm.warranty_days} onChange={e => setItemForm(f => ({...f,warranty_days:e.target.value}))} placeholder="Ej. 365" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Compatibilidad</Label><Textarea value={itemForm.compatibility} onChange={e => setItemForm(f => ({...f,compatibility:e.target.value}))} placeholder="Ej. Nissan Versa 2020-2024" /></div>
            <div className="space-y-2 md:col-span-2"><Label>Notas</Label><Textarea value={itemForm.notes} onChange={e => setItemForm(f => ({...f,notes:e.target.value}))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setItemOpen(false)}>Cancelar</Button><Button disabled={saving || !itemForm.name.trim()} onClick={() => void saveItem()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar artículo</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
