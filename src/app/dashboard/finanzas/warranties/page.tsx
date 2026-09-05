"use client";

import { useMemo, useState } from 'react';
import { Search, ShieldCheck, ShieldAlert, Package, Truck, CalendarDays, Store } from 'lucide-react';
import { useData } from '@/contexts/data-provider';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WarrantyLine {
  id: string;
  expenseId: string;
  date: string;
  vehicleId?: string | null;
  vehicleLabel: string;
  concept: string;
  partNumber?: string;
  supplierName?: string;
  amount: number;
  warrantyDays: number;
  warrantyExpiresAt?: string;
}

function parseDate(value?: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function WarrantiesPage() {
  const { financialRecords, vehicles, loadingData } = useData();
  const [search, setSearch] = useState('');
  const today = new Date();

  const rows = useMemo<WarrantyLine[]>(() => {
    const result: WarrantyLine[] = [];

    (financialRecords || []).filter((record: any) => record.type === 'expense' && !record.isDeleted).forEach((record: any) => {
      const items = Array.isArray(record.items) ? record.items : [];
      const vehicle = (vehicles || []).find((v: any) => v.id === record.vehicleId);

      items.forEach((item: any, index: number) => {
        const warrantyDays = Number(item.warrantyDays || 0);
        if (!warrantyDays && !item.warrantyExpiresAt && !item.supplierName && !item.supplierId) return;

        const vehicleLabel = vehicle
          ? `${vehicle.make || ''} ${vehicle.model || ''} - ${vehicle.plate || ''}`.trim()
          : 'Sin vehículo';

        let expires = item.warrantyExpiresAt;
        if (!expires && warrantyDays) {
          const purchaseDate = parseDate(record.date);
          if (purchaseDate) {
            purchaseDate.setDate(purchaseDate.getDate() + warrantyDays);
            expires = purchaseDate.toISOString();
          }
        }

        result.push({
          id: `${record.id}-${index}`,
          expenseId: record.id,
          date: String(record.date || ''),
          vehicleId: record.vehicleId,
          vehicleLabel,
          concept: item.concept || item.description || item.name || 'Refacción',
          partNumber: item.partNumber,
          supplierName: item.supplierName,
          amount: Number(item.amount || item.unitPrice || 0),
          warrantyDays,
          warrantyExpiresAt: expires,
        });
      });
    });

    return result.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [financialRecords, vehicles]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(row => [row.concept, row.partNumber, row.supplierName, row.vehicleLabel].some(value => String(value || '').toLowerCase().includes(query)));
  }, [rows, search]);

  const stats = useMemo(() => {
    const active = rows.filter(row => {
      const expiry = parseDate(row.warrantyExpiresAt);
      return expiry && expiry >= today;
    }).length;
    return { total: rows.length, active };
  }, [rows, today]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Garantías y Refacciones</h1>
        <p className="text-muted-foreground">Consulta qué proveedor vendió una refacción y verifica su garantía, incluso cuando no se capturó el ticket.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Package className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Compras con garantía registrada</p><p className="text-2xl font-bold">{stats.total}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Garantías vigentes</p><p className="text-2xl font-bold">{stats.active}</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de compras y garantías</CardTitle>
          <div className="relative max-w-xl mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} className="pl-9" placeholder="Buscar refacción, número de parte, proveedor o vehículo..." />
          </div>
        </CardHeader>
        <CardContent>
          {loadingData ? <p className="py-8 text-center text-muted-foreground">Cargando historial...</p> : filteredRows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No hay registros de garantía todavía.</p>
              <p className="text-sm mt-1">Cuando una compra tenga proveedor, refacción y garantía capturados en su línea de gasto, aparecerá aquí.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRows.map(row => {
                const expiry = parseDate(row.warrantyExpiresAt);
                const active = !!expiry && expiry >= today;
                return (
                  <div key={row.id} className="rounded-xl border p-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{row.concept}</p>
                          <Badge variant={active ? 'default' : 'secondary'}>{active ? 'Garantía vigente' : 'Garantía vencida'}</Badge>
                        </div>
                        {row.partNumber && <p className="text-sm text-muted-foreground">No. de parte: {row.partNumber}</p>}
                      </div>
                      <p className="font-semibold">${row.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div className="flex gap-2"><Store className="h-4 w-4 mt-0.5 text-muted-foreground" /><span><span className="text-muted-foreground">Proveedor:</span> {row.supplierName || 'No registrado'}</span></div>
                      <div className="flex gap-2"><Truck className="h-4 w-4 mt-0.5 text-muted-foreground" /><span><span className="text-muted-foreground">Vehículo:</span> {row.vehicleLabel}</span></div>
                      <div className="flex gap-2"><CalendarDays className="h-4 w-4 mt-0.5 text-muted-foreground" /><span><span className="text-muted-foreground">Compra:</span> {row.date || '—'}</span></div>
                      <div className="flex gap-2"><ShieldCheck className="h-4 w-4 mt-0.5 text-muted-foreground" /><span><span className="text-muted-foreground">Vence:</span> {expiry ? expiry.toLocaleDateString('es-MX') : 'Sin fecha'}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
