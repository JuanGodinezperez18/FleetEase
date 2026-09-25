"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/hooks/use-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Building2,
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  MoreHorizontal,
} from 'lucide-react';

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

const emptySupplier = {
  name: '',
  legal_name: '',
  rfc: '',
  phone: '',
  email: '',
  address: '',
  contact_name: '',
  notes: '',
};
const emptyItem = {
  name: '',
  part_number: '',
  brand: '',
  category_id: '',
  default_supplier_id: '',
  unit: 'pieza',
  default_cost: '',
  warranty_days: '',
  compatibility: '',
  notes: '',
};

const inputClass =
  'h-11 rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:ring-[#d7ff3f]/30';
const textareaClass =
  'min-h-[80px] rounded-xl border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:ring-[#d7ff3f]/30';
const labelClass = 'text-xs font-medium text-white/55';
const selectTriggerClass =
  'h-11 rounded-xl border-white/10 bg-white/[0.03] text-white focus:ring-[#d7ff3f]/30';
const sectionClass =
  'overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-3 shadow-[0_18px_50px_rgba(0,0,0,.22)] sm:p-5';

export default function CatalogsPage() {
  const { currentUser } = useAuth();
  const { financialCategories } = useData();
  const companyId = currentUser?.companyId || null;
  const canManage = currentUser?.role === 'admin' || currentUser?.role === 'superAdmin';

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
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
      const [{ data: supplierData, error: supplierError }, { data: itemData, error: itemError }] =
        await Promise.all([
          supabase
            .from('suppliers')
            .select('*')
            .eq('company_id', companyId)
            .eq('is_deleted', false)
            .order('name'),
          supabase
            .from('catalog_items')
            .select('*')
            .eq('company_id', companyId)
            .eq('is_deleted', false)
            .order('name'),
        ]);
      if (supplierError) throw supplierError;
      if (itemError) throw itemError;
      setSuppliers((supplierData || []) as Supplier[]);
      setItems((itemData || []) as CatalogItem[]);
    } catch (error) {
      toast.error('No se pudieron cargar los catálogos', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredSuppliers = useMemo(
    () =>
      suppliers.filter(s =>
        `${s.name} ${s.legal_name || ''} ${s.rfc || ''}`
          .toLowerCase()
          .includes(supplierSearch.toLowerCase())
      ),
    [suppliers, supplierSearch]
  );
  const filteredItems = useMemo(
    () =>
      items.filter(i =>
        `${i.name} ${i.part_number || ''} ${i.brand || ''}`
          .toLowerCase()
          .includes(itemSearch.toLowerCase())
      ),
    [items, itemSearch]
  );

  const openSupplier = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setSupplierForm({
        name: supplier.name,
        legal_name: supplier.legal_name || '',
        rfc: supplier.rfc || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        contact_name: supplier.contact_name || '',
        notes: supplier.notes || '',
      });
    } else {
      setEditingSupplier(null);
      setSupplierForm(emptySupplier);
    }
    setSupplierOpen(true);
  };

  const openItem = (item?: CatalogItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        part_number: item.part_number || '',
        brand: item.brand || '',
        category_id: item.category_id || '',
        default_supplier_id: item.default_supplier_id || '',
        unit: item.unit || 'pieza',
        default_cost: item.default_cost == null ? '' : String(item.default_cost),
        warranty_days: item.warranty_days == null ? '' : String(item.warranty_days),
        compatibility: item.compatibility || '',
        notes: item.notes || '',
      });
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
        ? await supabase
            .from('suppliers')
            .update(payload)
            .eq('id', editingSupplier.id)
            .eq('company_id', companyId)
        : await supabase.from('suppliers').insert(payload);
      if (result.error) throw result.error;
      toast.success(editingSupplier ? 'Proveedor actualizado' : 'Proveedor creado');
      setSupplierOpen(false);
      await load();
    } catch (error) {
      toast.error('No se pudo guardar el proveedor', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setSaving(false);
    }
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
        unit: itemForm.unit || 'pieza',
        default_cost: itemForm.default_cost === '' ? null : Number(itemForm.default_cost),
        warranty_days:
          itemForm.warranty_days === '' ? null : Number(itemForm.warranty_days),
        compatibility: itemForm.compatibility || null,
        notes: itemForm.notes || null,
      };
      const result = editingItem
        ? await supabase
            .from('catalog_items')
            .update(payload)
            .eq('id', editingItem.id)
            .eq('company_id', companyId)
        : await supabase.from('catalog_items').insert(payload);
      if (result.error) throw result.error;
      toast.success(editingItem ? 'Artículo actualizado' : 'Artículo creado');
      setItemOpen(false);
      await load();
    } catch (error) {
      toast.error('No se pudo guardar el artículo', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setSaving(false);
    }
  };

  const softDelete = async (
    table: 'suppliers' | 'catalog_items',
    id: string,
    label: string
  ) => {
    if (!canManage || !companyId) return;
    try {
      const { error } = await supabase
        .from(table)
        .update({ is_deleted: true, is_active: false })
        .eq('id', id)
        .eq('company_id', companyId);
      if (error) throw error;
      toast.success(`${label} eliminado del catálogo`);
      await load();
    } catch (error) {
      toast.error('No se pudo eliminar', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  };

  const supplierName = (id: string | null) =>
    suppliers.find(s => s.id === id)?.name || 'Sin proveedor habitual';

  if (!companyId) {
    return (
      <div className="relative min-h-full overflow-hidden rounded-[18px] bg-[#080a0f] p-6 text-white">
        <div className="mx-auto max-w-md rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
            <Package className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <h2 className="font-heading text-lg font-semibold">Sin empresa</h2>
          <p className="mt-2 text-sm text-white/50">
            Selecciona una empresa para administrar sus catálogos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[18px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header>
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
            Administración
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            Catálogos
          </h1>
          <p className="mt-1 text-sm text-white/45">
            Proveedores y refacciones para compras y garantías
          </p>
        </header>

        <Tabs defaultValue="suppliers" className="space-y-4">
          <TabsList className="grid h-11 w-full max-w-md grid-cols-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
            <TabsTrigger
              value="suppliers"
              className="rounded-lg text-xs data-[state=active]:bg-[#d7ff3f]/15 data-[state=active]:text-[#d7ff3f]"
            >
              <Building2 className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
              Proveedores
            </TabsTrigger>
            <TabsTrigger
              value="items"
              className="rounded-lg text-xs data-[state=active]:bg-[#d7ff3f]/15 data-[state=active]:text-[#d7ff3f]"
            >
              <Package className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
              Artículos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="mt-0">
            <section className={sectionClass}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#d7ff3f]/80">
                    Proveedores
                  </p>
                  <h2 className="text-base font-semibold text-white">Listado</h2>
                </div>
                {canManage && (
                  <Button
                    onClick={() => openSupplier()}
                    className="h-11 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
                  >
                    <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                    Nuevo proveedor
                  </Button>
                )}
              </div>

              <div className="relative mb-4 max-w-md">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
                  strokeWidth={1.75}
                />
                <Input
                  className={`${inputClass} pl-9`}
                  placeholder="Buscar proveedor, RFC..."
                  value={supplierSearch}
                  onChange={e => setSupplierSearch(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-7 w-7 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <p className="py-12 text-center text-sm text-white/40">
                  No hay proveedores registrados.
                </p>
              ) : (
                <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.07]">
                  {filteredSuppliers.map(s => (
                    <div
                      key={s.id}
                      className="flex items-start justify-between gap-3 p-4 hover:bg-white/[0.02]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium text-white/90">{s.name}</span>
                          {s.is_active ? (
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                              Activo
                            </span>
                          ) : (
                            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/45">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-white/40">
                          {[s.legal_name, s.rfc ? `RFC ${s.rfc}` : null, s.phone]
                            .filter(Boolean)
                            .join(' · ') || 'Sin datos adicionales'}
                        </p>
                      </div>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 shrink-0 rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white"
                            >
                              <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={6}>
                            <DropdownMenuItem onSelect={() => openSupplier(s)}>
                              <Pencil className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => void softDelete('suppliers', s.id, 'Proveedor')}
                              className="text-rose-400 focus:bg-rose-500/15 focus:text-rose-300"
                            >
                              <Trash2 className="mr-2.5 h-4 w-4" strokeWidth={1.75} />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="items" className="mt-0">
            <section className={sectionClass}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#d7ff3f]/80">
                    Artículos
                  </p>
                  <h2 className="text-base font-semibold text-white">Refacciones</h2>
                </div>
                {canManage && (
                  <Button
                    onClick={() => openItem()}
                    className="h-11 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
                  >
                    <Plus className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                    Nuevo artículo
                  </Button>
                )}
              </div>

              <div className="relative mb-4 max-w-md">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
                  strokeWidth={1.75}
                />
                <Input
                  className={`${inputClass} pl-9`}
                  placeholder="Buscar artículo, parte, marca..."
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-7 w-7 animate-spin text-[#d7ff3f]" strokeWidth={1.75} />
                </div>
              ) : filteredItems.length === 0 ? (
                <p className="py-12 text-center text-sm text-white/40">
                  No hay artículos registrados.
                </p>
              ) : (
                <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.07]">
                  {filteredItems.map(i => (
                    <div
                      key={i.id}
                      className="flex items-start justify-between gap-3 p-4 hover:bg-white/[0.02]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-white/90">{i.name}</span>
                          {i.brand && (
                            <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/55">
                              {i.brand}
                            </span>
                          )}
                          {i.part_number && (
                            <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                              {i.part_number}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-white/40">
                          {supplierName(i.default_supplier_id)}
                          {' · '}
                          {i.default_cost != null
                            ? `$${Number(i.default_cost).toLocaleString('es-MX', {
                                minimumFractionDigits: 2,
                              })}`
                            : 'Sin costo'}
                          {' · '}
                          {i.warranty_days != null
                            ? `${i.warranty_days} días garantía`
                            : 'Sin garantía'}
                        </p>
                      </div>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 shrink-0 rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white"
                            >
                              <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" sideOffset={6}>
                            <DropdownMenuItem onSelect={() => openItem(i)}>
                              <Pencil className="mr-2.5 h-4 w-4 text-white/50" strokeWidth={1.75} />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => void softDelete('catalog_items', i.id, 'Artículo')}
                              className="text-rose-400 focus:bg-rose-500/15 focus:text-rose-300"
                            >
                              <Trash2 className="mr-2.5 h-4 w-4" strokeWidth={1.75} />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </div>

      {/* Formulario proveedor — mismo estilo de inputs que el resto del sistema */}
      <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-4 overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? 'Editar proveedor' : 'Nuevo proveedor'}
            </DialogTitle>
            <DialogDescription>
              Datos comerciales y de contacto para compras
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ['name', 'Nombre comercial *'],
                  ['legal_name', 'Razón social'],
                  ['rfc', 'RFC'],
                  ['phone', 'Teléfono'],
                  ['email', 'Correo'],
                  ['contact_name', 'Contacto'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label className={labelClass}>{label}</Label>
                  <Input
                    className={inputClass}
                    value={supplierForm[key]}
                    onChange={e =>
                      setSupplierForm(f => ({ ...f, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className={labelClass}>Dirección</Label>
                <Textarea
                  className={textareaClass}
                  value={supplierForm.address}
                  onChange={e =>
                    setSupplierForm(f => ({ ...f, address: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className={labelClass}>Notas</Label>
                <Textarea
                  className={textareaClass}
                  value={supplierForm.notes}
                  onChange={e =>
                    setSupplierForm(f => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-white/[0.06] pt-4">
            <Button
              variant="outline"
              onClick={() => setSupplierOpen(false)}
              className="h-11 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              disabled={saving || !supplierForm.name.trim()}
              onClick={() => void saveSupplier()}
              className="h-11 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
            >
              {saving && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.75} />
              )}
              Guardar proveedor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Formulario artículo — mismos inputs/selects dark */}
      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col gap-4 overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar artículo' : 'Nuevo artículo / refacción'}
            </DialogTitle>
            <DialogDescription>
              Costo, proveedor y garantía predeterminada
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className={labelClass}>Nombre *</Label>
                <Input
                  className={inputClass}
                  value={itemForm.name}
                  onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej. Balatas delanteras"
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Número de parte / SKU</Label>
                <Input
                  className={inputClass}
                  value={itemForm.part_number}
                  onChange={e =>
                    setItemForm(f => ({ ...f, part_number: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Marca</Label>
                <Input
                  className={inputClass}
                  value={itemForm.brand}
                  onChange={e => setItemForm(f => ({ ...f, brand: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Unidad</Label>
                <Input
                  className={inputClass}
                  value={itemForm.unit}
                  onChange={e => setItemForm(f => ({ ...f, unit: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Proveedor habitual</Label>
                <Select
                  value={itemForm.default_supplier_id || 'none'}
                  onValueChange={v =>
                    setItemForm(f => ({
                      ...f,
                      default_supplier_id: v === 'none' ? '' : v,
                    }))
                  }
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin proveedor</SelectItem>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Categoría de gasto</Label>
                <Select
                  value={itemForm.category_id || 'none'}
                  onValueChange={v =>
                    setItemForm(f => ({
                      ...f,
                      category_id: v === 'none' ? '' : v,
                    }))
                  }
                >
                  <SelectTrigger className={selectTriggerClass}>
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {financialCategories
                      .filter(c => c.type === 'expense')
                      .map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Costo habitual</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={itemForm.default_cost}
                  onChange={e =>
                    setItemForm(f => ({ ...f, default_cost: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Garantía (días)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  className={inputClass}
                  value={itemForm.warranty_days}
                  onChange={e =>
                    setItemForm(f => ({ ...f, warranty_days: e.target.value }))
                  }
                  placeholder="Ej. 365"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className={labelClass}>Compatibilidad</Label>
                <Textarea
                  className={textareaClass}
                  value={itemForm.compatibility}
                  onChange={e =>
                    setItemForm(f => ({ ...f, compatibility: e.target.value }))
                  }
                  placeholder="Ej. Nissan Versa 2020-2024"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className={labelClass}>Notas</Label>
                <Textarea
                  className={textareaClass}
                  value={itemForm.notes}
                  onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 border-t border-white/[0.06] pt-4">
            <Button
              variant="outline"
              onClick={() => setItemOpen(false)}
              className="h-11 rounded-xl border-white/10 bg-white/[0.03] text-xs text-white/70 hover:bg-white/[0.06] hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              disabled={saving || !itemForm.name.trim()}
              onClick={() => void saveItem()}
              className="h-11 rounded-xl bg-[#d7ff3f] text-xs font-semibold text-black hover:bg-[#c8f02e]"
            >
              {saving && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" strokeWidth={1.75} />
              )}
              Guardar artículo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
