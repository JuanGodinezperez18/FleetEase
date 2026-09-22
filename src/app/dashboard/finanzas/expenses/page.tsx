
"use client";

import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Receipt, Hash, TrendingDown } from 'lucide-react';
import type { FinancialRecord } from '@/types';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { ExpensesForm, type ExpensesFormValues } from './components/ExpensesFormMultiLine';
import { DeleteConfirmationDialog } from '@/components/common/delete-confirmation-dialog';
import { useFinances } from '@/contexts/providers/finances-provider';
import { useVehicles } from '@/contexts/providers/vehicles-provider';
import { useClients } from '@/contexts/providers/clients-provider';
import { useData } from '@/contexts/data-provider';
import { getColumns, type ExpenseData } from './columns';
import { toast } from 'sonner';
import { infallibleNormalizeDate, formatDate } from '@/lib/date-utils';
import { sanitizeExpenseFormData } from '@/lib/sanitize-expense';
import { formatCurrency } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { FormModal } from '@/components/common/form-modal';
import { MetricCard } from '@/components/dashboard/components/MetricCard';
import { ExpenseMobileCard } from './components/expense-mobile-card';

const ExpenseCategoryBreakdown: React.FC<{ expenses: ExpenseData[] }> = ({ expenses }) => {
  const categoryTotals = useMemo(() => {
    const totals = expenses.reduce((acc, exp) => {
      const category = exp.categoryName || 'Sin categoría';
      acc[category] = (acc[category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [expenses]);

  const totalAmount = useMemo(
    () => categoryTotals.reduce((sum, [, amount]) => sum + amount, 0),
    [categoryTotals]
  );

  return (
    <div className="hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] p-5 shadow-[0_18px_50px_rgba(0,0,0,.22)] md:block md:col-span-2">
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          Gastos por categoría
        </p>
        <p className="mt-1 text-xs text-white/40">Top 5 en esta vista</p>
      </div>

      {categoryTotals.length > 0 ? (
        <div className="space-y-3">
          {categoryTotals.map(([category, amount]) => {
            const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
            return (
              <div key={category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-white/80">{category}</span>
                  <span className="font-semibold tabular-nums text-white/90">
                    {formatCurrency(amount)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={percentage} className="h-1.5 flex-1 bg-white/[0.06]" />
                  <span className="w-12 text-right text-[11px] tabular-nums text-white/40">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
          <div className="flex justify-between border-t border-white/[0.06] pt-3 text-sm font-semibold">
            <span className="text-white/50">Total top 5</span>
            <span className="tabular-nums text-white">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-white/35">Sin gastos en esta vista</p>
      )}
    </div>
  );
};

export default function ExpensesPage() {
  const {
    financialRecords,
    financialCategories,
    addExpense,
    updateFinancialRecord,
    deleteFinancialRecord,
    loading: loadingFinances,
  } = useFinances();
  const { vehicles, vehiclesLoading } = useVehicles();
  const { clients, loading: loadingClients } = useClients();
  const { companies, selectedCompanyId } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const loadingData = loadingFinances || vehiclesLoading || loadingClients;
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<ExpenseData | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const expensesWithDetails: ExpenseData[] = useMemo(() => {
    const clientMap = new Map(clients.map(c => [c.id, `${c.firstname} ${c.lastname}`]));
    const vehicleMap = new Map(vehicles.map(v => [v.id, `${v.make} ${v.model} (${v.plate})`]));
    const categoryMap = new Map(financialCategories.map(cat => [cat.id, cat.name]));

    const companyFilteredRecords = selectedCompanyId
      ? financialRecords.filter(r => r.companyId === selectedCompanyId)
      : financialRecords;

    const expenses = companyFilteredRecords
      .filter(
        (r): r is FinancialRecord & { type: 'expense' } =>
          r.type === 'expense' && !r.isDeleted
      )
      .map(expense => ({
        ...expense,
        sortableDate: infallibleNormalizeDate(expense.date)?.getTime() || 0,
        clientName: expense.clientId ? clientMap.get(expense.clientId) || 'N/A' : 'N/A',
        vehicleName: expense.vehicleId ? vehicleMap.get(expense.vehicleId) || 'N/A' : 'N/A',
        categoryName: categoryMap.get(expense.categoryId || '') || expense.category || 'General',
      }));

    return expenses.sort((a, b) => b.sortableDate - a.sortableDate);
  }, [financialRecords, clients, vehicles, selectedCompanyId, financialCategories]);

  const stats = useMemo(() => {
    const totalExpenses = expensesWithDetails.reduce((sum, item) => sum + (item.amount || 0), 0);
    const avg =
      expensesWithDetails.length > 0 ? totalExpenses / expensesWithDetails.length : 0;
    return {
      totalExpenses,
      totalRecords: expensesWithDetails.length,
      average: avg,
    };
  }, [expensesWithDetails]);

  const handleOpenModal = useCallback((record?: FinancialRecord) => {
    setEditingRecord(record || null);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setTimeout(() => {
      setEditingRecord(null);
    }, 300);
  }, [isSubmitting]);

  const handleSubmit = async (data: ExpensesFormValues) => {
    setIsSubmitting(true);
    const toastId = toast.loading(editingRecord ? 'Actualizando gasto...' : 'Agregando gasto...');
    try {
      const sanitizedData = sanitizeExpenseFormData(data);

      if (editingRecord) {
        // La BD protege los campos contables/relacionales del gasto como inmutables.
        // En edición enviamos únicamente los campos que el RPC de metadata permite modificar.
        await updateFinancialRecord(editingRecord.id, {
          date: sanitizedData.date,
          description: sanitizedData.description || '',
          paymentMethod: sanitizedData.paymentMethod,
          evidenceUrls: sanitizedData.evidenceUrls || [],
        });
        toast.success('Gasto actualizado', { id: toastId });
      } else {
        const totalAmount = sanitizedData.items.reduce((sum, item) => sum + item.amount, 0);
        const description = sanitizedData.items
          .map(item => `${item.concept}: ${formatCurrency(item.amount)}`)
          .join(' | ');

        const category = financialCategories.find(c => c.id === data.categoryId)?.name || '';

        await addExpense({
          ...sanitizedData,
          amount: totalAmount,
          description: sanitizedData.description || description,
          isDeleted: false,
          createdAt: new Date().toISOString(),
          category,
          partnerId: null,
          notes: '',
        });
        toast.success('Gasto agregado', { id: toastId });
      }
      handleCloseModal();
    } catch (error) {
      toast.error('Error al guardar', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = useCallback(
    (record: ExpenseData) => {
      handleOpenModal(record);
    },
    [handleOpenModal]
  );

  const handleDeleteRequest = useCallback((record: ExpenseData) => {
    setRecordToDelete(record);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    if (isSubmitting) return;
    setIsDeleteDialogOpen(false);
    setTimeout(() => setRecordToDelete(null), 300);
  }, [isSubmitting]);

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    const toastId = toast.loading('Eliminando gasto...');
    setIsSubmitting(true);

    await deleteFinancialRecord(recordToDelete.id, () => {
      toast.success('Gasto eliminado', { id: toastId });
      handleCloseDeleteDialog();
    });
  };

  const columns = useMemo(
    () => getColumns(handleEdit, handleDeleteRequest, expensesWithDetails),
    [expensesWithDetails, handleEdit, handleDeleteRequest]
  );

  if (loadingData) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-white/[0.06]" />
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
              Gastos
            </h1>
            <p className="mt-1 text-sm text-white/40">
              {stats.totalRecords} registro{stats.totalRecords === 1 ? '' : 's'} en esta vista
            </p>
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="h-10 rounded-xl bg-[#d7ff3f] px-4 text-xs font-semibold text-[#080a0f] hover:bg-[#d7ff3f]/90"
          >
            <PlusCircle className="mr-2 h-4 w-4" strokeWidth={1.75} />
            Agregar gasto
          </Button>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Gastos totales"
            value={formatCurrency(stats.totalExpenses)}
            description={`${stats.totalRecords} registros`}
            icon={<TrendingDown className="h-5 w-5" strokeWidth={1.75} />}
            variant="danger"
          />
          <MetricCard
            title="Registros"
            value={stats.totalRecords}
            description="Gastos operativos"
            icon={<Hash className="h-5 w-5" strokeWidth={1.75} />}
          />
          <MetricCard
            title="Promedio"
            value={formatCurrency(stats.average)}
            description="Por registro"
            icon={<Receipt className="h-5 w-5" strokeWidth={1.75} />}
          />
        </div>

        <ExpenseCategoryBreakdown expenses={expensesWithDetails} />

        <section className="overflow-hidden rounded-[20px] border border-white/[0.07] bg-[#0e1117] shadow-[0_18px_50px_rgba(0,0,0,.22)]">
          <div className="p-4 sm:p-5">
            <ResponsiveTable
              columns={columns}
              data={expensesWithDetails}
              loading={loadingData}
              searchPlaceholder="Buscar por descripción, categoría, cliente..."
              noResultsText="No se encontraron gastos."
              mobileCardRenderer={record => (
                <ExpenseMobileCard
                  record={record}
                  onEdit={handleEdit}
                  onDelete={handleDeleteRequest}
                />
              )}
            />
          </div>
        </section>
      </div>

      <FormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingRecord ? 'Editar Gasto' : 'Agregar Gasto'}
        description="Registra un nuevo gasto operativo."
      >
        <ExpensesForm
          key={editingRecord?.id || 'new-expense'}
          onSubmit={handleSubmit}
          initialData={editingRecord}
          companies={companies}
          expenseCategories={financialCategories.filter(c => c.type === 'expense')}
          isSubmitting={isSubmitting}
          onClose={handleCloseModal}
        />
      </FormModal>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={confirmDelete}
        titleText="Eliminar Gasto"
        descriptionText="¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer."
        itemName={recordToDelete?.description || ''}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
