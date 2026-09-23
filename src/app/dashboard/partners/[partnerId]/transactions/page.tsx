
'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import { calculatePartnerBalance, getPartnerFinancialRecords } from '@/contexts/data-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Car, DollarSign, TrendingDown, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { MetricCard } from '@/components/dashboard/components/MetricCard';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


const ITEMS_PER_PAGE = 10; // ← Cambiar si necesitas más o menos

export default function PartnerDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const partnerId = params.partnerId as string;
  const { partners, vehicles, financialRecords } = useData();
  
  // 🆕 ESTADO PARA PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);

  const partner = useMemo(
    () => partners.find(p => p.id === partnerId),
    [partners, partnerId]
  );

  const partnerVehicles = useMemo(
    () => vehicles.filter(v => v.partnerId === partnerId && !v.isDeleted),
    [vehicles, partnerId]
  );

  const partnerRecords = useMemo(
    () => getPartnerFinancialRecords(partner!, partnerVehicles, financialRecords)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [financialRecords, partnerVehicles, partner]
  );

  // El saldo no se recalcula aquí. La tarjeta y este estado de cuenta
  // consumen exactamente la misma función central del Data Provider.
  const partnerBalance = useMemo(
    () => calculatePartnerBalance(partner!, partnerVehicles, financialRecords),
    [financialRecords, partnerVehicles, partner]
  );

  // 📊 CÁLCULO DE PAGINACIÓN
  const totalPages = Math.ceil(partnerRecords.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentRecords = partnerRecords.slice(startIndex, endIndex);

  // 📈 RESUMEN
  const summary = useMemo(() => {
    const income = partnerRecords
      .filter(r => r.type === 'income' && r.sourceRecordType !== 'vehicle_admin_fee')
      .reduce((sum, r) => sum + r.amount, 0);
    const expenses = partnerRecords
      .filter(r => r.type === 'expense' && r.paymentMethod !== 'partner_pays')
      .reduce((sum, r) => sum + r.amount, 0);
    const payments = partnerRecords
      .filter(r => r.type === 'payment' && r.partnerId === partnerId)
      .reduce((sum, r) => sum + r.amount, 0);
    return {
      totalIncome: income,
      totalExpenses: expenses,
      totalPayments: payments,
      netProfit: income - expenses,
    };
  }, [partnerRecords, partnerId]);

  if (!partner) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Socios
        </Button>
        <Card>
          <CardContent className="pt-6">
            El socio especificado no fue encontrado o no está activo.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.back()} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Socios
          </Button>
          <h1 className="text-3xl font-bold">Estado de Cuenta de {partner.firstname} {partner.lastname}</h1>
          <p className="text-muted-foreground">Un resumen detallado del historial financiero y saldo del socio.</p>
        </div>
      </div>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Saldo Inicial"
          value={formatCurrency(partner.initialBalance || 0)}
          icon={<DollarSign className="w-5 h-5" />}
        />

        <MetricCard
          title="Total de Ingresos (Flota)"
          value={formatCurrency(summary.totalIncome)}
          description="+Ingresos"
          icon={<TrendingUp className="w-5 h-5 text-green-500" />}
          variant="success"
        />

        <MetricCard
          title="Total de Gastos (Flota)"
          value={formatCurrency(summary.totalExpenses)}
          description="-Gastos"
          icon={<TrendingDown className="w-5 h-5 text-red-500" />}
          variant="danger"
        />

        <MetricCard
          title="SALDO FINAL (A PAGAR AL SOCIO)"
          value={formatCurrency(partnerBalance)}
          icon={<DollarSign className="w-5 h-5" />}
          variant={partnerBalance > 0 ? "success" : "danger"}
        />
      </div>

      {/* TIMELINE DE TRANSACCIONES */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Transacciones</CardTitle>
          <CardDescription>
            Mostrando {startIndex + 1} - {Math.min(endIndex, partnerRecords.length)} de {partnerRecords.length} registros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentRecords.length > 0 ? (
            <div className="space-y-4">
              {currentRecords.map((record) => {
                const vehicle = vehicles.find(v => v.id === record.vehicleId);
                const isIncome = record.type === 'income';
                
                return (
                  <div key={record.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isIncome ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      <div className={`w-3 h-3 rounded-full ${isIncome ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{record.description}</p>
                          {vehicle && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Car className="w-3 h-3" />
                              {vehicle.plate}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${isIncome ? 'text-green-500' : 'text-red-500'}`}>
                            {isIncome ? '+' : '-'} {formatCurrency(record.amount)}
                          </p>
                          <p className="text-sm text-muted-foreground">{record.date}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {record.type === 'income' ? 'Ingreso' : 'Gasto'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {record.paymentMethod || 'Efectivo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No hay transacciones registradas</p>
          )}

          {/* 🆕 CONTROLES DE PAGINACIÓN */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
