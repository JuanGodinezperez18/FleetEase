"use client";

import { useEffect, useMemo, useState } from "react";
import { useData } from "@/contexts/data-provider";
import { useAuth } from "@/contexts/auth-provider";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CreditCard, HandCoins, Users, Briefcase, Search, RotateCcw, Pencil, Trash2, Loader2, X } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { MetricCard } from "@/components/dashboard/components/MetricCard";

const PAYMENT_LABELS: Record<string, string> = {
  client: "Pago de Cliente",
  partner: "Pago a Socio",
  supplier: "Pago a Proveedor",
  credit: "Pago de Crédito",
  refund: "Devolución de Depósito",
  other: "Pago",
};

type PaymentFilter = "all" | "client" | "partner" | "supplier" | "credit";
type LinkRow = {
  source_financial_record_id: string;
  target_financial_record_id: string;
  relationship_type: string;
  amount_applied: number | null;
};

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) return String((error as { message?: unknown }).message || "Error inesperado.");
  return error instanceof Error ? error.message : "Error inesperado.";
}

export function PaymentHistoryView() {
  const { financialRecords, clients, partners, credits, loading, selectedCompanyId, refreshData } = useData();
  const { currentUser } = useAuth();
  const [kind, setKind] = useState<PaymentFilter>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [supplierByTarget, setSupplierByTarget] = useState<Map<string, string>>(new Map());
  const [editing, setEditing] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editMethod, setEditMethod] = useState("Transferencia");
  const [editReference, setEditReference] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const companyId = selectedCompanyId || currentUser?.companyId || null;

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, `${c.firstname} ${c.lastname}`.trim()])), [clients]);
  const partnerMap = useMemo(() => new Map(partners.map(p => [p.id, p.name || `${p.firstname} ${p.lastname}`.trim()])), [partners]);
  const creditMap = useMemo(() => new Map(credits.map(c => [c.id, c.referenceCode || c.id.slice(0, 8)])), [credits]);

  const loadLinks = async () => {
    if (!companyId) {
      setLinks([]);
      return;
    }
    const { data, error } = await supabase
      .from("financial_record_links")
      .select("source_financial_record_id,target_financial_record_id,relationship_type,amount_applied")
      .eq("company_id", companyId);
    if (!error) setLinks((data || []) as LinkRow[]);
  };

  useEffect(() => {
    void loadLinks();
  }, [companyId, financialRecords.length]);

  useEffect(() => {
    let cancelled = false;
    const loadSupplierTargets = async () => {
      if (!companyId || !links.length) {
        setSupplierByTarget(new Map());
        return;
      }
      const targetIds = [...new Set(
        links
          .filter(l => l.relationship_type === "supplier_payment_to_financial_record")
          .map(l => l.target_financial_record_id)
          .filter(Boolean)
      )];
      if (!targetIds.length) {
        setSupplierByTarget(new Map());
        return;
      }

      const { data: payables, error } = await supabase
        .from("accounts_payable")
        .select("source_financial_record_id,party_id")
        .eq("company_id", companyId)
        .eq("party_type", "supplier")
        .eq("is_deleted", false)
        .in("source_financial_record_id", targetIds);

      if (cancelled) return;
      if (error) {
        console.error("[payment-history] Error loading supplier targets:", error);
        setSupplierByTarget(new Map());
        return;
      }

      const supplierIds = [...new Set((payables || []).map((p: any) => p.party_id).filter(Boolean))];
      const { data: suppliers, error: supplierError } = supplierIds.length
        ? await supabase.from("suppliers").select("id,name").in("id", supplierIds)
        : { data: [], error: null };

      if (cancelled) return;
      if (supplierError) {
        console.error("[payment-history] Error loading supplier names:", supplierError);
      }

      const names = new Map<string, string>(
        (suppliers || []).map((s: any) => [s.id, s.name])
      );
      const byTarget = new Map<string, string>();
      for (const payable of payables || []) {
        const name = names.get(payable.party_id);
        if (name) byTarget.set(payable.source_financial_record_id, name);
      }
      setSupplierByTarget(byTarget);
    };

    void loadSupplierTargets();
    return () => {
      cancelled = true;
    };
  }, [companyId, links]);

  const paymentRecords = useMemo(() => {
    return financialRecords
      .filter(r => !r.isDeleted && (r.type === "payment" || r.creditPayment === true))
      .filter(r => !companyId || !r.companyId || r.companyId === companyId)
      .map(r => {
        const ownLinks = links.filter(l => l.source_financial_record_id === r.id);
        const linkKind = ownLinks.some(l => l.relationship_type === "client_payment_to_financial_record") ? "client"
          : ownLinks.some(l => l.relationship_type === "supplier_payment_to_financial_record") ? "supplier"
          : null;
        const targetLink = ownLinks.find(l =>
          l.relationship_type === "client_payment_to_financial_record" ||
          l.relationship_type === "supplier_payment_to_financial_record"
        );
        const recordKind: PaymentFilter | "refund" =
          r.creditPayment || r.creditId ? "credit"
          : String(r.category || "").trim().toLowerCase() === "devolución de depósito" ? "refund"
          : r.partnerId ? "partner"
          : linkKind || (r.clientId ? "client" : "supplier");
        const entityName = r.clientId ? clientMap.get(r.clientId)
          : r.partnerId ? partnerMap.get(r.partnerId)
          : r.creditId ? creditMap.get(r.creditId)
          : linkKind === "supplier" ? supplierByTarget.get(targetLink?.target_financial_record_id || "")
          : undefined;
        return { ...r, recordKind, entityName: entityName || "Sin asignar", targetId: targetLink?.target_financial_record_id || "" };
      })
      .filter(r => kind === "all" || r.recordKind === kind)
      .filter(r => !from || r.date >= from)
      .filter(r => !to || r.date <= to)
      .filter(r => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [r.entityName, r.referenceCode, r.category, r.description, r.paymentMethod, r.recordKind]
          .some(v => String(v || "").toLowerCase().includes(q));
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [financialRecords, companyId, clientMap, partnerMap, creditMap, links, supplierByTarget, kind, from, to, search]);

  const analysis = useMemo(() => {
    const total = paymentRecords.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const count = paymentRecords.length;
    const byKind = (key: PaymentFilter) => paymentRecords.filter(r => r.recordKind === key).reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const methods = new Map<string, number>();
    for (const r of paymentRecords) {
      const method = r.paymentMethod || "Sin método";
      methods.set(method, (methods.get(method) || 0) + Number(r.amount || 0));
    }
    const topMethod = [...methods.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      total,
      count,
      client: byKind("client"),
      partner: byKind("partner"),
      supplier: byKind("supplier"),
      credit: byKind("credit"),
      average: count ? total / count : 0,
      topMethod,
      lastPayment: paymentRecords[0]?.date || null,
    };
  }, [paymentRecords]);

  const targetOptions = useMemo(() => {
    if (!editing) return [];
    if (editing.recordKind === "client") {
      return financialRecords
        .filter(r => !r.isDeleted && r.type === "income" && r.clientId === editing.clientId && r.category !== "Depósito en Garantía")
        .map(r => ({ id: r.id, label: `${r.category} · ${formatCurrency(Number(r.amount || 0))} · ${new Date(r.date).toLocaleDateString("es-MX")}` }));
    }
    if (editing.recordKind === "supplier") {
      return financialRecords
        .filter(r => !r.isDeleted && r.type === "expense" && supplierByTarget.has(r.id))
        .map(r => ({
          id: r.id,
          label: `${supplierByTarget.get(r.id) || "Proveedor"} · ${r.category} · ${formatCurrency(Number(r.amount || 0))} · ${new Date(r.date).toLocaleDateString("es-MX")}`,
        }));
    }
    return [];
  }, [editing, financialRecords, supplierByTarget]);

  const startEdit = (record: any) => {
    setEditing(record);
    setEditAmount(String(Number(record.amount || 0)));
    setEditDate(record.date);
    setEditMethod(record.paymentMethod || "Transferencia");
    setEditReference(record.referenceCode || "");
    setEditTarget(record.targetId || "");
  };

  const closeEdit = () => {
    setEditing(null);
    setEditAmount("");
    setEditReference("");
    setEditTarget("");
  };

  const saveEdit = async () => {
    if (!editing || !companyId) return;
    const numericAmount = Number(editAmount);
    if (!(numericAmount > 0)) return toast.error("El importe debe ser mayor que cero.");
    if ((editing.recordKind === "client" || editing.recordKind === "supplier") && !editTarget) {
      return toast.error("Selecciona el registro al que se aplicará el pago.");
    }
    setSaving(true);
    try {
      const { error } = await supabase.rpc("update_financial_payment_atomic", {
        p_payment_id: editing.id,
        p_amount: numericAmount,
        p_payment_date: editDate,
        p_payment_method: editMethod || null,
        p_reference: editReference || null,
        p_target_financial_record_id: editing.recordKind === "partner" || editing.recordKind === "credit" || editing.recordKind === "refund" ? null : editTarget,
      } as any);
      if (error) throw error;
      toast.success("Pago actualizado", { description: "Los movimientos relacionados se recalcularon dentro de la misma transacción." });
      closeEdit();
      await refreshData();
      await loadLinks();
    } catch (error) {
      toast.error("No se pudo actualizar el pago", { description: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const deletePayment = async (record: any) => {
    if (!companyId || deletingId) return;
    const ok = window.confirm(`¿Eliminar el pago de ${formatCurrency(Number(record.amount || 0))}? Se conservará el registro de auditoría y se revertirá su efecto financiero.`);
    if (!ok) return;
    setDeletingId(record.id);
    try {
      const { error } = await supabase.rpc("delete_financial_payment_atomic", { p_payment_id: record.id } as any);
      if (error) throw error;
      toast.success("Pago eliminado", { description: record.recordKind === "credit" ? "Se revirtieron las cuotas, saldo y estado del crédito." : "Se revirtió su aplicación financiera sin borrar físicamente el registro." });
      await refreshData();
      await loadLinks();
    } catch (error) {
      toast.error("No se pudo eliminar el pago", { description: errorMessage(error) });
    } finally {
      setDeletingId(null);
    }
  };

  const resetFilters = () => { setKind("all"); setSearch(""); setFrom(""); setTo(""); };

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
            <h1 className="fe-module-title">Historial de pagos</h1>
            <p className="fe-module-subtitle">Consulta, edita y elimina con reversión atómica</p>
          </div>
          <Button asChild className="h-10 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90">
            <Link href="/dashboard/finanzas/payments"><HandCoins className="mr-2 h-4 w-4" strokeWidth={1.75} />Registrar pago</Link>
          </Button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Total pagado" value={formatCurrency(analysis.total)} description={`${analysis.count} registros`} icon={<HandCoins className="h-5 w-5" strokeWidth={1.75} />} />
          <MetricCard title="Clientes" value={formatCurrency(analysis.client)} description="Pagos recibidos" icon={<Users className="h-5 w-5" strokeWidth={1.75} />} />
          <MetricCard title="Socios" value={formatCurrency(analysis.partner)} description="Pagos a socios" icon={<Briefcase className="h-5 w-5" strokeWidth={1.75} />} />
          <MetricCard title="Créditos" value={formatCurrency(analysis.credit)} description="Cuotas aplicadas" icon={<CreditCard className="h-5 w-5" strokeWidth={1.75} />} />
        </div>

        <section className="rounded-[14px] border border-white/[0.07] bg-[#0e1117] p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-white/50">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/30" strokeWidth={1.75} />
                <Input className="border-white/10 bg-white/[0.03] pl-9 text-white" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre, referencia..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/50">Tipo</Label>
              <Select value={kind} onValueChange={v => setKind(v as PaymentFilter)}>
                <SelectTrigger className="border-white/10 bg-white/[0.03] text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="client">Clientes</SelectItem>
                  <SelectItem value="partner">Socios</SelectItem>
                  <SelectItem value="supplier">Proveedores</SelectItem>
                  <SelectItem value="credit">Créditos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-white/50">Desde</Label>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="border-white/10 bg-white/[0.03] text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/50">Hasta</Label>
              <div className="flex gap-2">
                <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="border-white/10 bg-white/[0.03] text-white" />
                <Button variant="outline" size="icon" onClick={resetFilters} className="border-white/10 bg-transparent text-white/60 hover:bg-white/[0.06] hover:text-white"><RotateCcw className="h-4 w-4" strokeWidth={1.75} /></Button>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117]">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-heading text-base font-semibold text-white">Pagos realizados</h2>
            <p className="mt-0.5 text-xs text-white/40">{paymentRecords.length} registros</p>
          </div>
          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="py-10 text-center text-sm text-white/35">Cargando...</div>
            ) : paymentRecords.length === 0 ? (
              <div className="py-10 text-center text-sm text-white/35">Sin resultados para los filtros.</div>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {paymentRecords.map(r => (
                    <div key={r.id} className="rounded-[14px] border border-white/[0.07] bg-white/[0.02] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-white/90">{r.entityName}</p>
                          <p className="mt-0.5 text-xs text-white/40">{new Date(r.date).toLocaleDateString("es-MX")}{r.paymentMethod ? ` · ${r.paymentMethod}` : ""}</p>
                        </div>
                        <span className="font-heading text-base font-semibold tabular-nums text-white">{formatCurrency(Number(r.amount || 0))}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">{PAYMENT_LABELS[r.recordKind] || "Pago"}</span>
                        <div className="ml-auto flex gap-1">
                          <Button size="icon" variant="ghost" className="h-9 w-9 text-white/40 hover:bg-white/[0.06] hover:text-white" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" strokeWidth={1.75} /></Button>
                          <Button size="icon" variant="ghost" className="h-9 w-9 text-white/40 hover:bg-white/[0.06] hover:text-rose-300" disabled={deletingId === r.id} onClick={() => void deletePayment(r)}>
                            {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <Trash2 className="h-4 w-4" strokeWidth={1.75} />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-left text-[10px] font-semibold uppercase tracking-wide text-white/35">
                        <th className="p-3">Fecha</th><th className="p-3">Tipo</th><th className="p-3">Aplicado a</th><th className="p-3">Método</th><th className="p-3">Ref.</th><th className="p-3 text-right">Importe</th><th className="p-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentRecords.map(r => (
                        <tr key={r.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                          <td className="whitespace-nowrap p-3 text-white/70">{new Date(r.date).toLocaleDateString("es-MX")}</td>
                          <td className="p-3"><span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">{PAYMENT_LABELS[r.recordKind] || "Pago"}</span></td>
                          <td className="p-3 font-medium text-white/90">{r.entityName}</td>
                          <td className="p-3 text-white/55">{r.paymentMethod || "—"}</td>
                          <td className="p-3 text-white/55">{r.referenceCode || "—"}</td>
                          <td className="p-3 text-right font-semibold tabular-nums text-white">{formatCurrency(Number(r.amount || 0))}</td>
                          <td className="p-3">
                            <div className="flex justify-end gap-1">
                              <Button size="icon" variant="ghost" className="h-11 w-11 text-white/40 hover:bg-white/[0.06] hover:text-white" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" strokeWidth={1.75} /></Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-white/40 hover:bg-white/[0.06] hover:text-rose-300" disabled={deletingId === r.id} onClick={() => void deletePayment(r)}>
                                {deletingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} /> : <Trash2 className="h-4 w-4" strokeWidth={1.75} />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-[14px] border border-white/[0.1] bg-[#0e1117] p-5 text-white shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-lg font-semibold">Editar {PAYMENT_LABELS[editing.recordKind] || "Pago"}</h2>
                <p className="mt-1 text-xs text-white/40">Cambios atómicos con recalculo financiero.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeEdit} className="text-white/40 hover:bg-white/[0.06] hover:text-white"><X className="h-4 w-4" strokeWidth={1.75} /></Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {(editing.recordKind === "client" || editing.recordKind === "supplier") && (
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-white/50">Aplicar a</Label>
                  <Select value={editTarget} onValueChange={setEditTarget}>
                    <SelectTrigger className="border-white/10 bg-white/[0.03] text-white"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>{targetOptions.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2"><Label className="text-white/50">Importe</Label><Input inputMode="decimal" value={editAmount} onChange={e => setEditAmount(e.target.value.replace(/[^0-9.]/g, ""))} className="border-white/10 bg-white/[0.03] text-white" /></div>
              <div className="space-y-2"><Label className="text-white/50">Fecha</Label><Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="border-white/10 bg-white/[0.03] text-white" /></div>
              <div className="space-y-2">
                <Label className="text-white/50">Método</Label>
                <Select value={editMethod} onValueChange={setEditMethod}>
                  <SelectTrigger className="border-white/10 bg-white/[0.03] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Efectivo","Transferencia","Tarjeta","Cheque"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="text-white/50">Referencia</Label><Input value={editReference} onChange={e => setEditReference(e.target.value)} className="border-white/10 bg-white/[0.03] text-white" /></div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={closeEdit} disabled={saving} className="border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white">Cancelar</Button>
              <Button onClick={() => void saveEdit()} disabled={saving} className="h-10 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.75} />}Guardar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
