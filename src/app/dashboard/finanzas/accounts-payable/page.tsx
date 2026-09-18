"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-provider";
import { useData } from "@/contexts/data-provider";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Briefcase,
  CalendarClock,
  CircleDollarSign,
  ExternalLink,
  Loader2,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { MetricCard } from "@/components/dashboard/components/MetricCard";

type Payable = {
  id: string;
  partyType: "supplier" | "partner";
  partyId: string;
  partyName: string;
  original: number;
  applied: number;
  dueDate: string | null;
  sourceId: string | null;
  purchaseId: string | null;
};
type SupplierPurchase = {
  id: string;
  supplier_id: string;
  supplierName: string;
  total: number;
  purchase_date: string;
  due_date: string | null;
  status: string;
  reference: string | null;
};

export default function AccountsPayablePage() {
  const { currentUser } = useAuth();
  const { selectedCompanyId, financialRecords, partners } = useData();
  const companyId = selectedCompanyId || currentUser?.companyId || null;
  const [supplierPayables, setSupplierPayables] = useState<Payable[]>([]);
  const [purchases, setPurchases] = useState<SupplierPurchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data: rows, error } = await supabase
        .from("accounts_payable")
        .select(
          "id,party_type,party_id,original_amount,due_date,source_financial_record_id,supplier_purchase_id,status,suppliers(name),supplier_purchases(reference,purchase_date,total,status)"
        )
        .eq("company_id", companyId)
        .eq("is_deleted", false)
        .eq("party_type", "supplier")
        .neq("status", "cancelled")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (cancelled) return;
      if (error) {
        setLoading(false);
        return;
      }
      const sourceIds = (rows || []).map((r: any) => r.source_financial_record_id).filter(Boolean);
      let appliedMap = new Map<string, number>();
      if (sourceIds.length) {
        const { data: links } = await supabase
          .from("financial_record_links")
          .select("target_financial_record_id,amount_applied,source_financial_record_id")
          .eq("company_id", companyId)
          .in("target_financial_record_id", sourceIds);
        appliedMap = new Map<string, number>();
        for (const link of links || []) {
          appliedMap.set(
            link.target_financial_record_id,
            (appliedMap.get(link.target_financial_record_id) || 0) + Number(link.amount_applied || 0)
          );
        }
      }
      const mapped: Payable[] = (rows || []).map((r: any) => ({
        id: r.id,
        partyType: "supplier",
        partyId: r.party_id,
        partyName: r.suppliers?.name || "Proveedor",
        original: Number(r.original_amount),
        applied: appliedMap.get(r.source_financial_record_id) || 0,
        dueDate: r.due_date,
        sourceId: r.source_financial_record_id,
        purchaseId: r.supplier_purchase_id,
      }));
      const purchaseRows: SupplierPurchase[] = (rows || [])
        .map((r: any) =>
          r.supplier_purchases
            ? {
                id: r.supplier_purchase_id,
                supplier_id: r.party_id,
                supplierName: r.suppliers?.name || "Proveedor",
                total: Number(r.supplier_purchases.total),
                purchase_date: r.supplier_purchases.purchase_date,
                due_date: r.due_date,
                status: r.supplier_purchases.status,
                reference: r.supplier_purchases.reference,
              }
            : null
        )
        .filter(Boolean) as SupplierPurchase[];
      setSupplierPayables(mapped.filter(p => p.original - p.applied > 0.009));
      setPurchases(purchaseRows);
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const partnerPayables = useMemo<Payable[]>(() => {
    if (!companyId) return [];
    const partnerById = new Map(partners.map(p => [p.id, p]));
    const result: Payable[] = [];
    for (const r of financialRecords) {
      if (r.isDeleted || r.type !== "expense" || !r.partnerId || r.paymentMethod === "partner_pays") continue;
      const remaining = Math.max(0, Number(r.amount));
      if (remaining <= 0.009) continue;
      const p = partnerById.get(r.partnerId);
      result.push({
        id: `partner-${r.id}`,
        partyType: "partner",
        partyId: r.partnerId,
        partyName: p?.name || `${(p as any)?.firstname || ""} ${(p as any)?.lastname || ""}`.trim() || "Socio",
        original: Number(r.amount),
        applied: 0,
        dueDate: r.date,
        sourceId: r.id,
        purchaseId: null,
      });
    }
    return result;
  }, [companyId, financialRecords, partners]);

  const supplierPending = supplierPayables.reduce((s, p) => s + Math.max(0, p.original - p.applied), 0);
  const partnerPending = partnerPayables.reduce((s, p) => s + Math.max(0, p.original - p.applied), 0);
  const totalPending = supplierPending + partnerPending;
  const dueSoon = [...supplierPayables, ...partnerPayables]
    .filter(p => p.dueDate && new Date(p.dueDate).getTime() <= Date.now() + 7 * 86400000)
    .reduce((s, p) => s + Math.max(0, p.original - p.applied), 0);

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-white/[0.06]" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 animate-pulse rounded-[20px] border border-white/[0.07] bg-[#0e1117]" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-[20px] border border-white/[0.07] bg-[#0e1117]" />
      </div>
    );
  }

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              Finanzas
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
              Cuentas por pagar
            </h1>
            <p className="mt-1 text-sm text-white/40">Pendiente con proveedores y socios</p>
          </div>
          <Button
            asChild
            className="h-10 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
          >
            <Link href="/dashboard/finanzas/supplier-purchases">
              <CircleDollarSign className="mr-2 h-4 w-4" strokeWidth={1.75} />
              Nueva compra
            </Link>
          </Button>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Total pendiente"
            value={formatCurrency(totalPending)}
            description="Proveedores + socios"
            icon={<Wallet className="h-5 w-5" strokeWidth={1.75} />}
            variant={totalPending > 0 ? "danger" : "default"}
          />
          <MetricCard
            title="Proveedores"
            value={formatCurrency(supplierPending)}
            description={`${supplierPayables.length} obligación${supplierPayables.length === 1 ? "" : "es"}`}
            icon={<Building2 className="h-5 w-5" strokeWidth={1.75} />}
          />
          <MetricCard
            title="Vence en 7 días"
            value={formatCurrency(dueSoon)}
            description="Próximos vencimientos"
            icon={<AlertTriangle className="h-5 w-5" strokeWidth={1.75} />}
            variant={dueSoon > 0 ? "warning" : "default"}
          />
        </div>

        {/* Proveedores */}
        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-heading text-base font-semibold text-white">Proveedores</h2>
            <p className="mt-0.5 text-xs text-white/40">Compras a crédito y saldo restante</p>
          </div>
          <div className="p-4 sm:p-5">
            {supplierPayables.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/35">No hay cuentas por pagar a proveedores.</p>
            ) : (
              <div className="space-y-3">
                {supplierPayables.map(p => {
                  const remaining = Math.max(0, p.original - p.applied);
                  return (
                    <div
                      key={p.id}
                      className="flex flex-col gap-3 rounded-[16px] border border-white/[0.07] bg-white/[0.02] p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Building2 className="h-4 w-4 text-white/35" strokeWidth={1.75} />
                          <span className="font-semibold text-white/90">{p.partyName}</span>
                          <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                            Proveedor
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-white/45">
                          Original {formatCurrency(p.original)} · Pagado {formatCurrency(p.applied)}
                        </p>
                        {p.dueDate && (
                          <p className="mt-1 text-xs text-white/35">
                            <CalendarClock className="mr-1 inline h-3 w-3" strokeWidth={1.75} />
                            Vence {new Date(p.dueDate).toLocaleDateString("es-MX")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[11px] text-white/35">Pendiente</p>
                          <p className="font-heading text-lg font-semibold tabular-nums text-rose-300">
                            {formatCurrency(remaining)}
                          </p>
                        </div>
                        {p.purchaseId ? (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-9 rounded-xl border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white"
                          >
                            <Link href={`/dashboard/finanzas/supplier-purchases/${p.purchaseId}`}>
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                              Distribuir
                            </Link>
                          </Button>
                        ) : null}
                        <Button
                          asChild
                          size="sm"
                          className="h-9 rounded-xl bg-[#d7ff3f] px-3 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
                        >
                          <Link href="/dashboard/finanzas/payments">Pagar</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Socios */}
        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-heading text-base font-semibold text-white">Socios</h2>
            <p className="mt-0.5 text-xs text-white/40">Gastos pendientes de pago al socio</p>
          </div>
          <div className="p-4 sm:p-5">
            {partnerPayables.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/35">No hay obligaciones pendientes con socios.</p>
            ) : (
              <div className="space-y-3">
                {partnerPayables.map(p => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 rounded-[16px] border border-white/[0.07] bg-white/[0.02] p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Briefcase className="h-4 w-4 text-white/35" strokeWidth={1.75} />
                        <span className="font-semibold text-white/90">{p.partyName}</span>
                        <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                          Socio
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-white/45">
                        Gasto {formatCurrency(p.original)}
                        {p.dueDate ? ` · ${new Date(p.dueDate).toLocaleDateString("es-MX")}` : ""}
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className="h-9 rounded-xl bg-[#d7ff3f] px-3 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
                    >
                      <Link href="/dashboard/finanzas/payments">Pagar</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Compras a crédito */}
        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-heading text-base font-semibold text-white">Compras a crédito</h2>
            <p className="mt-0.5 text-xs text-white/40">Historial que originó cuentas por pagar</p>
          </div>
          <div className="p-4 sm:p-5">
            {purchases.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/35">No hay compras a crédito.</p>
            ) : (
              <div className="space-y-2">
                {purchases.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border-b border-white/[0.06] py-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white/90">
                        {p.supplierName}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </p>
                      <p className="text-xs text-white/35">
                        {new Date(p.purchase_date).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                        {p.status === "pending" ? "Pendiente" : p.status}
                      </span>
                      <span className="font-semibold tabular-nums text-white">{formatCurrency(p.total)}</span>
                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-white/40 hover:bg-white/[0.06] hover:text-white"
                      >
                        <Link href={`/dashboard/finanzas/supplier-purchases/${p.id}`} aria-label="Distribuir compra">
                          <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
