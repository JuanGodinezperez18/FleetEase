
"use client";
import { Skeleton } from "@/components/ui/skeleton";

import React, { useState, useMemo, useCallback } from 'react';
import { useFinances } from '@/contexts/providers/finances-provider';
import { useVehicles } from '@/contexts/providers/vehicles-provider';
import { useClients } from '@/contexts/providers/clients-provider';
import { useData } from '@/contexts/data-provider';
import type { FinancialRecord, FinancialCategory } from '@/types';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { DeleteConfirmationDialog } from '@/components/common/delete-confirmation-dialog';
import { useAuth } from '@/contexts/auth-provider';
import { getColumns, type IncomeData } from './columns';
import { mapIncomes } from './data';
import { infallibleNormalizeDate, formatDate } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/utils';
import { toast as sonnerToast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, Users, TrendingUp, Hash, Banknote } from 'lucide-react';
import { format } from 'date-fns';
import { useDashboardDate } from '@/contexts/dashboard-date-context';
import { ModuleDateFilterBar } from '@/components/common/module-date-filter-bar';
import { isDateInRange } from '@/lib/is-date-in-range';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import IncomeForm from './components/IncomeForm';
import MassIncomeForm from './components/MassIncomeForm';
import { MetricCard } from '@/components/dashboard/components/MetricCard';
import { IncomeMobileCard } from './components/income-mobile-card';

export default function IncomesPage() {
  const {
    financialRecords,
    financialCategories,
    deleteFinancialRecord,
    addIncome,
    loading: loadingFinances,
  } = useFinances();
  const { clients, loading: loadingClients } = useClients();
  const { vehicles, vehiclesLoading } = useVehicles();
  const { companies, selectedCompanyId } = useData();
  const { currentUser } = useAuth();

  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const loadingData = loadingFinances || loadingClients || vehiclesLoading;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<IncomeData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { dateRange } = useDashboardDate();
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);
  const [isMassIncomeFormOpen, setIsMassIncomeFormOpen] = useState(false);

  const incomes = useMemo(() => {
    const companyFilteredRecords = selectedCompanyId
      ? financialRecords.filter(r => r.companyId === selectedCompanyId)
      : financialRecords;
    let allIncomes = mapIncomes(companyFilteredRecords, clients, vehicles, financialCategories).filter(
      income => !income.isDeleted && income.type === 'income'
    );

    allIncomes = allIncomes.filter(income => isDateInRange(income.date, dateRange));
    return allIncomes.sort((a, b) => b.sortableDate - a.sortableDate);
  }, [financialRecords, clients, vehicles, dateRange, selectedCompanyId, financialCategories]);

  const incomeCategories = useMemo(() => {
    if (!financialCategories) return [];
    return financialCategories
      .filter(cat => cat.type === 'income')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [financialCategories]);

  const stats = useMemo(() => {
    const total = incomes.reduce((sum, item) => sum + (item.amount || 0), 0);
    const avg = incomes.length > 0 ? total / incomes.length : 0;
    return { total, count: incomes.length, average: avg };
  }, [incomes]);

  const handleDeleteRequest = useCallback((income: IncomeData) => {
    setRecordToDelete(income);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    if (isSubmitting) return;
    setIsDeleteDialogOpen(false);
    setTimeout(() => setRecordToDelete(null), 300);
  }, [isSubmitting]);

  const handleDelete = async () => {
    if (!recordToDelete) return;
    if (recordToDelete.creditGranted === true) {
      sonnerToast.error('No se puede eliminar', {
        description: "Los registros de 'Crédito Otorgado' se gestionan desde Créditos.",
      });
      handleCloseDeleteDialog();
      return;
    }
    setIsSubmitting(true);
    const toastId = sonnerToast.loading('Eliminando registro...');
    try {
      await deleteFinancialRecord(recordToDelete.id);
      sonnerToast.success('Registro eliminado', { id: toastId });
      handleCloseDeleteDialog();
    } catch (error) {
      sonnerToast.error('Error al eliminar', {
        id: toastId,
        description: error instanceof Error ? error.message : 'No se pudo eliminar el registro.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportData = useCallback(async () => {
    const dataToExport = incomes.map(item => ({
      Fecha: formatDate(item.date),
      Descripción: item.description,
      Categoría: item.categoryName,
      Tipo: 'Ingreso/Cargo',
      Monto: item.amount,
      Cliente: item.clientName,
      Vehículo: item.vehicleName,
    }));
        const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ingresos');
    XLSX.writeFile(wb, `ingresos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }, [incomes]);

  const handleIncomeSubmit = async (data: any, category?: FinancialCategory) => {
    setIsSubmitting(true);
    try {
      if (data.type !== 'income' || category?.type !== 'income') {
        throw new Error('Los pagos deben registrarse desde Finanzas > Pagos.');
      }
      await addIncome(data);
      sonnerToast.success('Ingreso creado exitosamente');
      setIsIncomeFormOpen(false);
    } catch (error) {
      sonnerToast.error('Error al crear ingreso', {
        description: error instanceof Error ? error.message : 'Intenta de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = useCallback((record: IncomeData) => {
    setEditingRecord(record);
    setIsIncomeFormOpen(true);
  }, []);

  const columns = useMemo(
    () => getColumns(handleEdit, handleDeleteRequest, incomes),
    [incomes, handleEdit, handleDeleteRequest]
  );

  if (loadingData) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-[20px] border border-white/[0.07] bg-[#0e1117]"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-[20px] border border-white/[0.07] bg-[#0e1117]" />
      </div>
    );
  }

  return (
    <>
      <div className="relative min-h-full space-y-5 overflow-hidden rounded-[18px] bg-[#080a0f] p-4 pb-24 text-white sm:space-y-6 sm:p-6 sm:pb-8 lg:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:72px_72px]" />

        <div className="relative z-10 space-y-5 sm:space-y-6">
          <header className="fe-module-header">
            <div>
              <div className="fe-module-eyebrow">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d7ff3f] shadow-[0_0_12px_#d7ff3f]" />
                Finanzas
              </div>
              <h1 className="fe-module-title">
                Ingresos
              </h1>
              <p className="fe-module-subtitle">
                {stats.count} registro{stats.count === 1 ? '' : 's'} en esta vista
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <ModuleDateFilterBar />
              <Button
                variant="outline"
                size="sm"
                onClick={exportData}
                disabled={incomes.length === 0}
                className="h-11 rounded-xl border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white"
              >
                <Download className="mr-2 h-4 w-4" strokeWidth={1.75} />
                Exportar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMassIncomeFormOpen(true)}
                className="h-11 rounded-xl border-white/10 bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white"
              >
                <Users className="mr-2 h-4 w-4" strokeWidth={1.75} />
                Masivo
              </Button>
              <Button
                onClick={() => {
                  setEditingRecord(null);
                  setIsIncomeFormOpen(true);
                }}
                className="h-10 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
              >
                <PlusCircle className="mr-2 h-4 w-4" strokeWidth={1.75} />
                Nuevo ingreso
              </Button>
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Ingresos totales"
              value={formatCurrency(stats.total)}
              description={`${stats.count} registros`}
              icon={<TrendingUp className="h-5 w-5" strokeWidth={1.75} />}
              variant="success"
            />
            <MetricCard
              title="Registros"
              value={stats.count}
              description="Ingresos / cargos"
              icon={<Hash className="h-5 w-5" strokeWidth={1.75} />}
            />
            <MetricCard
              title="Promedio"
              value={formatCurrency(stats.average)}
              description="Por registro"
              icon={<Banknote className="h-5 w-5" strokeWidth={1.75} />}
            />
          </div>

          <section className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
            <div className="p-4 sm:p-5">
              <ResponsiveTable
                columns={columns}
                data={incomes}
                loading={loadingData}
                searchPlaceholder="Buscar por cliente, descripción, categoría..."
                noResultsText="No se encontraron ingresos."
                mobileCardRenderer={record => (
                  <IncomeMobileCard
                    record={record}
                    onEdit={handleEdit}
                    onDelete={handleDeleteRequest}
                  />
                )}
              />
            </div>
          </section>
        </div>
      </div>

      {recordToDelete && (
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleDelete}
          itemName={recordToDelete.description ?? 'este registro'}
          isDeleting={isSubmitting}
        />
      )}

      <Dialog open={isIncomeFormOpen} onOpenChange={setIsIncomeFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Editar ingreso' : 'Nuevo ingreso'}</DialogTitle>
          </DialogHeader>
          <IncomeForm
            onSubmit={handleIncomeSubmit}
            initialData={editingRecord}
            companies={companies}
            incomeAndPaymentCategories={incomeCategories}
            isSubmitting={isSubmitting}
            onClose={() => {
              setIsIncomeFormOpen(false);
              setEditingRecord(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isMassIncomeFormOpen} onOpenChange={setIsMassIncomeFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ingreso masivo de rentas</DialogTitle>
          </DialogHeader>
          <MassIncomeForm
            onSuccess={() => {
              setIsMassIncomeFormOpen(false);
              sonnerToast.success('Ingresos masivos creados exitosamente');
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
