// app/(partner)/expenses/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/hooks/use-data';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import { ExpenseEvidenceModal } from './components/expense-evidence-modal';
import type { FinancialRecord } from '@/types';

export default function PartnerExpensesPage() {
  const { currentUser } = useAuth();
  const { partners, financialRecords, rawVehicles } = useData();
  const [selectedExpense, setSelectedExpense] = useState<FinancialRecord | null>(null);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);

  const currentPartner = useMemo(() => {
    return partners.find(p => p.userId === currentUser?.uid);
  }, [partners, currentUser]);

  const partnerExpenses = useMemo(() => {
    if (!currentPartner) return [];
    
    // Obtener IDs de vehículos del socio
    const vehicleIds = rawVehicles
      .filter(v => v.partnerId === currentPartner.id)
      .map(v => v.id);

    // Filtrar gastos relacionados con sus vehículos
    return financialRecords
      .filter(r => 
        !r.isDeleted && 
        r.type === 'expense' &&
        r.vehicleId && 
        vehicleIds.includes(r.vehicleId)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [currentPartner, financialRecords, rawVehicles]);

  const handleViewEvidence = (expense: FinancialRecord) => {
    setSelectedExpense(expense);
    setEvidenceModalOpen(true);
  };

  const columns = [
    {
      accessorKey: 'date',
      header: 'Fecha',
      cell: ({ row }: any) => format(new Date(row.original.date), 'PPp', { locale: es }),
    },
    {
      accessorKey: 'category',
      header: 'Categoría',
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.original.category}</Badge>
      ),
    },
    {
      accessorKey: 'vehicleId',
      header: 'Vehículo',
      cell: ({ row }: any) => {
        const vehicle = rawVehicles.find(v => v.id === row.original.vehicleId);
        return vehicle?.alias || 'N/A';
      },
    },
    {
      accessorKey: 'description',
      header: 'Descripción',
      cell: ({ row }: any) => (
        <div className="max-w-md truncate">
          {row.original.description || 'Sin descripción'}
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Monto',
      cell: ({ row }: any) => (
        <span className="font-semibold text-red-600">
          {formatCurrency(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: 'evidences',
      header: 'Evidencias',
      cell: ({ row }: any) => {
        const hasEvidence = row.original.evidenceUrls && row.original.evidenceUrls.length > 0;

        if (!hasEvidence) {
          return (
            <Badge variant="secondary" className="text-xs">
              Sin evidencia
            </Badge>
          );
        }

        const evidenceCount = row.original.evidenceUrls.length;

        return (
          <Badge variant="default" className="gap-1">
            <ImageIcon className="h-3 w-3" />
            {evidenceCount} foto{evidenceCount > 1 ? 's' : ''}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }: any) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleViewEvidence(row.original)}
        >
          <Eye className="h-4 w-4 mr-2" />
          Ver Detalles
        </Button>
      ),
    },
  ];

  const mobileCardRenderer = (expense: FinancialRecord) => {
    const vehicle = rawVehicles.find(v => v.id === expense.vehicleId);
    const hasEvidence = expense.evidenceUrls && expense.evidenceUrls.length > 0;
    const evidenceCount = expense.evidenceUrls?.length || 0;

    return (
      <Card key={expense.id} className="mb-3">
        <CardContent className="pt-4">
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(expense.date), 'PPp', { locale: es })}
                </p>
                <Badge variant="outline" className="mt-1">{expense.category}</Badge>
              </div>
              <span className="text-lg font-bold text-red-600">
                {formatCurrency(expense.amount)}
              </span>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Vehículo</p>
              <p className="font-medium">{vehicle?.alias || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Descripción</p>
              <p className="text-sm">{expense.description || 'Sin descripción'}</p>
            </div>

            <div className="flex justify-between items-center">
              {hasEvidence ? (
                <Badge variant="default" className="gap-1">
                  <ImageIcon className="h-3 w-3" />
                  {evidenceCount} foto{evidenceCount > 1 ? 's' : ''}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Sin evidencia
                </Badge>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleViewEvidence(expense)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalles
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!currentPartner) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              No se encontró información del socio. Contacta al administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gastos de Mis Vehículos</h1>
        <p className="text-muted-foreground mt-1">
          Historial de gastos y mantenimientos registrados
        </p>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(partnerExpenses.reduce((sum, e) => sum + e.amount, 0))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Histórico acumulado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {partnerExpenses.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gastos registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Con Evidencia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {partnerExpenses.filter(e =>
                e.evidenceUrls && e.evidenceUrls.length > 0
              ).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Gastos documentados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de gastos */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Gastos ({partnerExpenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveTable
            columns={columns}
            data={partnerExpenses}
            mobileCardRenderer={mobileCardRenderer}
            searchPlaceholder="Buscar gasto..."
          />
        </CardContent>
      </Card>

      {/* Modal de evidencias */}
      {selectedExpense && (
        <ExpenseEvidenceModal
          expense={selectedExpense}
          vehicle={rawVehicles.find(v => v.id === selectedExpense.vehicleId)}
          isOpen={evidenceModalOpen}
          onClose={() => {
            setEvidenceModalOpen(false);
            setSelectedExpense(null);
          }}
        />
      )}
    </div>
  );
}