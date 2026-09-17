"use client";

import { useMemo, useState } from "react";
import { useData } from "@/contexts/data-provider";
import { useAuth } from "@/contexts/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, CreditCard, HandCoins, Users, Briefcase, Building2, Search, TrendingUp, CalendarDays, RotateCcw } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

const PAYMENT_LABELS: Record<string, string> = {
  client: "Pago de Cliente",
  partner: "Pago a Socio",
  supplier: "Pago a Proveedor",
  credit: "Pago de Crédito",
  other: "Pago",
};

type PaymentFilter = "all" | "client" | "partner" | "supplier" | "credit";

export default function PaymentHistoryPage() {
  const { financialRecords, clients, partners, credits, loading, selectedCompanyId } = useData();
  const { currentUser } = useAuth();
  const [kind, setKind] = useState<PaymentFilter>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const companyId = selectedCompanyId || currentUser?.companyId || null;

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, `${c.firstname} ${c.lastname}`.trim()])), [clients]);
  const partnerMap = useMemo(() => new Map(partners.map(p => [p.id, p.name || `${p.firstname} ${p.lastname}`.trim()])), [partners]);
  const creditMap = useMemo(() => new Map(credits.map(c => [c.id, c.referenceCode || c.id.slice(0, 8)])), [credits]);

  const paymentRecords = useMemo(() => {
    return financialRecords
      .filter(r => !r.isDeleted && (r.type === "payment" || r.creditPayment === true))
      .filter(r => !companyId || !r.companyId || r.companyId === companyId)
      .map(r => {
        const recordKind: PaymentFilter = r.creditPayment || r.creditId ? "credit" : r.partnerId ? "partner" : r.clientId ? "client" : "supplier";
        const entityName = r.clientId ? clientMap.get(r.clientId) : r.partnerId ? partnerMap.get(r.partnerId) : r.creditId ? creditMap.get(r.creditId) : undefined;
        return { ...r, recordKind, entityName: entityName || "Sin asignar" };
      })
      .filter(r => kind === "all" || r.recordKind === kind)
      .filter(r => !from || r.date >= from)
      .filter(r => !to || r.date <= to)
      .filter(r => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [r.entityName, r.referenceCode, r.category, r.description, r.paymentMethod, r.recordKind].some(v => String(v || "").toLowerCase().includes(q));
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [financialRecords, companyId, clientMap, partnerMap, creditMap, kind, from, to, search]);

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
    const average = count ? total / count : 0;
    const lastPayment = paymentRecords[0]?.date || null;
    return { total, count, client: byKind("client"), partner: byKind("partner"), supplier: byKind("supplier"), credit: byKind("credit"), average, topMethod, lastPayment };
  }, [paymentRecords]);

  const resetFilters = () => { setKind("all"); setSearch(""); setFrom(""); setTo(""); };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3"><HandCoins className="h-6 w-6 text-primary" /></div>
          <div><h1 className="text-2xl font-bold tracking-tight">Historial de Pagos</h1><p className="text-muted-foreground">Consulta todos los pagos registrados y analiza su comportamiento.</p></div>
        </div>
        <Button asChild variant="outline"><Link href="/dashboard/finanzas/payments"><ArrowLeft className="mr-2 h-4 w-4" />Registrar pago</Link></Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total pagado</CardDescription><CardTitle className="text-2xl">{formatCurrency(analysis.total)}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">{analysis.count} registros en el filtro actual</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Pagos de clientes</CardDescription><CardTitle className="text-2xl">{formatCurrency(analysis.client)}</CardTitle></CardHeader><CardContent><Users className="h-4 w-4 text-muted-foreground" /></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Pagos a socios</CardDescription><CardTitle className="text-2xl">{formatCurrency(analysis.partner)}</CardTitle></CardHeader><CardContent><Briefcase className="h-4 w-4 text-muted-foreground" /></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Pagos de créditos</CardDescription><CardTitle className="text-2xl">{formatCurrency(analysis.credit)}</CardTitle></CardHeader><CardContent><CreditCard className="h-4 w-4 text-muted-foreground" /></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Análisis del módulo</CardTitle><CardDescription>Indicadores calculados sobre los registros visibles después de aplicar los filtros.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Pago promedio</p><p className="mt-1 text-xl font-semibold">{formatCurrency(analysis.average)}</p></div>
          <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Proveedores</p><p className="mt-1 text-xl font-semibold">{formatCurrency(analysis.supplier)}</p></div>
          <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Método principal</p><p className="mt-1 text-xl font-semibold">{analysis.topMethod?.[0] || "—"}</p>{analysis.topMethod && <p className="text-xs text-muted-foreground">{formatCurrency(analysis.topMethod[1])}</p>}</div>
          <div className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">Último pago</p><p className="mt-1 text-xl font-semibold">{analysis.lastPayment ? new Date(analysis.lastPayment).toLocaleDateString("es-MX") : "—"}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Filtros</CardTitle><CardDescription>Busca por cliente, socio, referencia, categoría o método y acota el periodo.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2 md:col-span-2"><Label>Buscar</Label><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre, referencia, categoría..." /></div></div>
          <div className="space-y-2"><Label>Tipo</Label><Select value={kind} onValueChange={v => setKind(v as PaymentFilter)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="client">Clientes</SelectItem><SelectItem value="partner">Socios</SelectItem><SelectItem value="supplier">Proveedores</SelectItem><SelectItem value="credit">Créditos</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Desde</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
          <div className="space-y-2"><Label>Hasta</Label><div className="flex gap-2"><Input type="date" value={to} onChange={e => setTo(e.target.value)} /><Button variant="outline" size="icon" onClick={resetFilters} title="Limpiar filtros"><RotateCcw className="h-4 w-4" /></Button></div></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pagos realizados</CardTitle><CardDescription>{paymentRecords.length} registros visibles. Los pagos no se mezclan con los ingresos operativos.</CardDescription></CardHeader>
        <CardContent>
          {loading ? <div className="py-10 text-center text-muted-foreground">Cargando registros...</div> : paymentRecords.length === 0 ? <div className="py-10 text-center text-muted-foreground">No hay pagos que coincidan con los filtros.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="p-3">Fecha</th><th className="p-3">Tipo</th><th className="p-3">Aplicado a</th><th className="p-3">Categoría</th><th className="p-3">Método</th><th className="p-3">Referencia</th><th className="p-3 text-right">Importe</th></tr></thead><tbody>{paymentRecords.map(r => <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30"><td className="p-3 whitespace-nowrap">{new Date(r.date).toLocaleDateString("es-MX")}</td><td className="p-3"><Badge variant="outline">{PAYMENT_LABELS[r.recordKind]}</Badge></td><td className="p-3 font-medium">{r.entityName}</td><td className="p-3">{r.category || "—"}</td><td className="p-3">{r.paymentMethod || "—"}</td><td className="p-3">{r.referenceCode || "—"}</td><td className="p-3 text-right font-semibold">{formatCurrency(Number(r.amount || 0))}</td></tr>)}</tbody></table></div>}
        </CardContent>
      </Card>
    </div>
  );
}
