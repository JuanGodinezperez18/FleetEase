"use client";
import Link from "next/link";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-provider";
import { useData } from "@/contexts/data-provider";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Plus, ShoppingCart, Wrench, ReceiptText, MoreHorizontal, Eye, CreditCard } from "lucide-react";
import { SupplierPurchasesForm } from "./components/supplier-purchase-form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type RecentPurchase = {
  id: string;
  purchase_date: string;
  total: number;
  payment_method: string;
  status: string;
  reference: string | null;
  supplierName: string;
};

type RecentExpense = {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
  vehicleName: string;
};

const paymentLabels: Record<string, string> = {
  cash: "Contado",
  transfer: "Transferencia",
  card: "Tarjeta",
  credit: "Crédito",
};

export default function SupplierPurchasesPage() {
  const { currentUser } = useAuth();
  const { selectedCompanyId } = useData();
  const companyId = selectedCompanyId || currentUser?.companyId || null;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<RecentPurchase[]>([]);
  const [expenses, setExpenses] = useState<RecentExpense[]>([]);

  const loadRecentActivity = useCallback(async () => {
    if (!companyId) {
      setPurchases([]);
      setExpenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [purchaseResult, expenseResult] = await Promise.all([
        supabase
          .from("supplier_purchases")
          .select("id,purchase_date,total,payment_method,status,reference,suppliers(name)")
          .eq("company_id", companyId)
          .eq("is_deleted", false)
          .order("purchase_date", { ascending: false })
          .limit(30),
        supabase
          .from("financial_records")
          .select("id,date,amount,description,category,vehicles(make,model,plate)")
          .eq("company_id", companyId)
          .eq("type", "expense")
          .eq("is_deleted", false)
          .not("vehicle_id", "is", null)
          .order("date", { ascending: false })
          .limit(30),
      ]);

      if (purchaseResult.error) throw purchaseResult.error;
      if (expenseResult.error) throw expenseResult.error;

      setPurchases(
        ((purchaseResult.data || []) as any[]).map((row) => ({
          id: row.id,
          purchase_date: row.purchase_date,
          total: Number(row.total || 0),
          payment_method: row.payment_method,
          status: row.status,
          reference: row.reference || null,
          supplierName: row.suppliers?.name || "Proveedor sin nombre",
        }))
      );

      setExpenses(
        ((expenseResult.data || []) as any[]).map((row) => ({
          id: row.id,
          date: row.date,
          amount: Number(row.amount || 0),
          description: row.description || "Gasto operativo",
          category: row.category || "Gasto operativo",
          vehicleName: row.vehicles
            ? `${row.vehicles.make || ""} ${row.vehicles.model || ""} · ${row.vehicles.plate || ""}`.trim()
            : "Vehículo",
        }))
      );
    } catch (error) {
      console.error("[FleetEase] supplier purchases activity failed", error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadRecentActivity();
  }, [loadRecentActivity]);

  const openCreatePurchase = () => setOpen(true);

  return (
    <div className="relative min-h-full space-y-5 overflow-hidden rounded-[30px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 lg:p-7">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 space-y-5 sm:space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
              Finanzas
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
              Proveedores
            </h1>
            <p className="mt-1 text-sm text-white/40">
              Compras y gastos operativos de vehículos
            </p>
          </div>

          <Button
            type="button"
            onClick={openCreatePurchase}
            className="h-11 rounded-xl bg-[#d7ff3f] px-5 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
          >
            <Plus className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Crear compra
          </Button>
        </header>

        <section className="rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_18px_50px_rgba(0,0,0,.18)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold tracking-tight">Compras recientes</h2>
              <p className="mt-1 text-xs text-white/40">Del más reciente al más antiguo.</p>
            </div>
            <ShoppingCart className="h-5 w-5 text-white/30" strokeWidth={1.75} />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-white/40">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando actividad...
            </div>
          ) : purchases.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/35">
              Todavía no hay compras registradas.
            </div>
          ) : (
            <div className="space-y-2">
              {purchases.map((purchase) => (
                <div
                  key={purchase.id}
                  className="grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-[1.5fr_.8fr_.8fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white/90">{purchase.supplierName}</p>
                    <p className="mt-0.5 text-xs text-white/35">
                      {new Date(purchase.purchase_date).toLocaleDateString("es-MX")}
                      {purchase.reference ? ` · ${purchase.reference}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/25">Forma de pago</p>
                    <p className="text-sm text-white/70">{paymentLabels[purchase.payment_method] || purchase.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/25">Total</p>
                    <p className="font-semibold tabular-nums text-white">{formatCurrency(purchase.total)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      purchase.status === "paid"
                        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                        : purchase.status === "cancelled"
                          ? "border-red-400/20 bg-red-400/10 text-red-300"
                          : "border-amber-400/20 bg-amber-400/10 text-amber-300"
                    }`}>
                      {purchase.status === "paid" ? "Pagada" : purchase.status === "cancelled" ? "Cancelada" : "Pendiente"}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="icon" aria-label={`Acciones de compra de ${purchase.supplierName}`} className="h-9 w-9 shrink-0 border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:text-white">
                          <MoreHorizontal className="h-4 w-4" strokeWidth={1.75} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/finanzas/supplier-purchases/${purchase.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver compra
                          </Link>
                        </DropdownMenuItem>
                        {purchase.payment_method === "credit" && purchase.status !== "paid" && purchase.status !== "cancelled" && (
                          <DropdownMenuItem asChild>
                            <Link href="/dashboard/finanzas/payments">
                              <CreditCard className="mr-2 h-4 w-4" />
                              Pagar compra
                            </Link>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-4 shadow-[0_18px_50px_rgba(0,0,0,.18)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold tracking-tight">Gastos operativos</h2>
              <p className="mt-1 text-xs text-white/40">Gastos asociados a vehículos, del más reciente al más antiguo.</p>
            </div>
            <Wrench className="h-5 w-5 text-white/30" strokeWidth={1.75} />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-white/40">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando gastos...
            </div>
          ) : expenses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/35">
              No hay gastos operativos de vehículos registrados.
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="grid gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:grid-cols-[1.5fr_1fr_.8fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white/90">{expense.description}</p>
                    <p className="mt-0.5 truncate text-xs text-white/35">{expense.vehicleName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/25">Categoría</p>
                    <p className="truncate text-sm text-white/70">{expense.category}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/25">Importe</p>
                    <p className="font-semibold tabular-nums text-white">{formatCurrency(expense.amount)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/35">
                    <ReceiptText className="h-4 w-4" strokeWidth={1.75} />
                    {new Date(expense.date).toLocaleDateString("es-MX")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <SupplierPurchasesForm
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) void loadRecentActivity();
        }}
      />
    </div>
  );
}
