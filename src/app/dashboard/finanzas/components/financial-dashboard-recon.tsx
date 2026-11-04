"use client";

import React, { useMemo } from "react";
import type { FinancialAnalytics } from "@/hooks/use-financial-analytics";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, AlertCircle, WalletCards, ArrowDownToLine } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Section } from "./financial-dashboard-shared";

export const Reconciliation = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const rows: [string, number, string][] = [
    ["Ingresos operativos", analytics.operationalIncome, "Rentas/servicios"],
    ["Ventas financiadas", analytics.vehicleSales, "Cartera, no efectivo"],
    ["Costo de ventas", -analytics.vehicleSalesCost, "Costo de adquisición"],
    ["Utilidad bruta ventas", analytics.vehicleSalesGrossProfit, "Venta \u2212 costo"],
    ["Cobros de clientes", analytics.customerCollections, "Cobranza"],
    ["Recuperación de créditos", analytics.creditCollections, "Cartera"],
    ["Depósitos en garantía", analytics.securityDeposits, "Efectivo, no utilidad"],
    ["Gastos", -analytics.totalExpenses, "Reducen utilidad"],
    ["Pagos a socios", -analytics.partnerPayments, "Salida de efectivo"],
    ["Pagos a proveedores", -analytics.supplierPayments, "Salida de efectivo"],
    ["Otros pagos", -analytics.otherPayments, "Salida de efectivo"],
  ];
  return (
    <Section
      title={
        <span className="inline-flex items-center gap-2">
          <WalletCards className="h-4 w-4 text-[#d7ff3f]" strokeWidth={1.75} />
          Conciliación financiera
        </span>
      }
      description="Separa utilidad y flujo para evitar doble conteo"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.75} />
            Utilidad
          </div>
          <p
            className={`mt-1 font-heading text-2xl font-semibold tabular-nums ${
              analytics.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {formatCurrency(analytics.netProfit)}
          </p>
          <p className="mt-1 text-[11px] text-white/35">
            Ingresos {formatCurrency(analytics.totalIncome)} \u2212 costo{" "}
            {formatCurrency(analytics.vehicleSalesCost)} \u2212 gastos {formatCurrency(analytics.totalExpenses)}
          </p>
        </div>
        <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <ArrowDownToLine className="h-3.5 w-3.5" strokeWidth={1.75} />
            Flujo neto
          </div>
          <p
            className={`mt-1 font-heading text-2xl font-semibold tabular-nums ${
              analytics.netCashFlow >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {formatCurrency(analytics.netCashFlow)}
          </p>
          <p className="mt-1 text-[11px] text-white/35">
            Entradas {formatCurrency(analytics.cashInflow)} \u2212 salidas {formatCurrency(analytics.cashOutflow)}
          </p>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                Concepto
              </TableHead>
              <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wide text-white/35">
                Importe
              </TableHead>
              <TableHead className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                Tratamiento
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(([label, value, treatment]) => (
              <TableRow key={label} className="border-white/[0.04] hover:bg-white/[0.02]">
                <TableCell className="text-white/80">{label}</TableCell>
                <TableCell
                  className={`text-right font-mono tabular-nums ${
                    Number(value) < 0 ? "text-rose-300" : "text-white"
                  }`}
                >
                  {formatCurrency(Number(value))}
                </TableCell>
                <TableCell className="text-xs text-white/40">{treatment}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Section>
  );
};

export const FinancialAlerts = ({ analytics }: { analytics: FinancialAnalytics }) => {
  const alerts = useMemo(() => {
    const list: Array<{ type: "warning" | "error"; message: string }> = [];
    if (analytics.totalIncome > 0 && analytics.profitMargin < 10) {
      list.push({ type: "error", message: `Margen bajo: ${analytics.profitMargin.toFixed(1)}%` });
    }
    const highExpenses = analytics.expenseCategories.filter(cat => cat.value > 50000);
    if (highExpenses.length > 0) {
      list.push({
        type: "warning",
        message: `${highExpenses.length} categor\u00eda(s) con gastos > $50,000`,
      });
    }
    return list;
  }, [analytics]);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 rounded-[16px] border p-3 text-sm ${
            alert.type === "error"
              ? "border-rose-400/25 bg-rose-400/[0.06] text-rose-200"
              : "border-amber-400/25 bg-amber-400/[0.06] text-amber-200"
          }`}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>{alert.message}</span>
        </div>
      ))}
    </div>
  );
};
