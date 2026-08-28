
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, FileText, Filter, X, MoreHorizontal, Edit, Trash2, Users } from 'lucide-react';
import type { FinancialRecord } from '@/types';
import { ResponsiveTable } from '@/components/common/ResponsiveTable';
import { ExpensesForm, type ExpensesFormValues } from './components/ExpensesFormMultiLine';
import { DeleteConfirmationDialog } from '@/components/common/delete-confirmation-dialog';
import { useFinances } from '@/contexts/providers/finances-provider';
import { useVehicles } from '@/contexts/providers/vehicles-provider';
import { useClients } from '@/contexts/providers/clients-provider';
import { useData } from '@/contexts/data-provider';
import { startOfDay, endOfDay, format } from 'date-fns';
import { getColumns, type ExpenseData } from './columns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { infallibleNormalizeDate, formatDate } from '@/lib/date-utils';
import { sanitizeExpenseFormData } from '@/lib/sanitize-expense';
import type { DateRange } from 'react-day-picker';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-provider';
import { useStorage } from '@/hooks/use-storage';
import { sanitizeAndFormatData } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { FormModal } from '@/components/common/form-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GlobalLoader } from '@/components/common/GlobalLoader';


const ExpenseMobileCard = ({ record, onEdit, onDelete }: { record: ExpenseData, onEdit: (r: ExpenseData) => void, onDelete: (r: ExpenseData) => void }) => (
  <Card className="p-4">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <h3 className="font-semibold">{record.description}</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-bold text-lg text-destructive">{formatCurrency(record.amount)}</p>
          <p><strong>Categoría:</strong> {record.categoryName}</p>
          <p><strong>Fecha:</strong> {formatDate(record.date)}</p>
          {record.vehicleName !== 'N/A' && <p><strong>Vehículo:</strong> {record.vehicleName}</p>}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(record)}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onDelete(record)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Eliminar</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </Card>
);

const ExpenseCategoryBreakdown: React.FC<{ expenses: ExpenseData[] }> = ({ expenses }) => {
  const categoryTotals = useMemo(() => {
    const totals = expenses.reduce((acc, exp) => {
      const category = exp.categoryName || 'Sin Categoría';
      acc[category] = (acc[category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5); // Top 5 categorías
  }, [expenses]);
  
  const totalAmount = useMemo(() => categoryTotals.reduce((sum, [, amount]) => sum + amount, 0), [categoryTotals]);
  
  return (
    <Card className="md:col-span-2">
      <CardHeader>
        <CardTitle>Gastos por Categoría</CardTitle>
        <CardDescription>
          Top 5 categorías en el período seleccionado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {categoryTotals.length > 0 ? (
          <>
            {categoryTotals.map(([category, amount]) => {
              const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
              
              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{category}</span>
                    <span className="font-semibold">{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={percentage} className="flex-1" />
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
            
            <Separator className="my-2" />
            
            <div className="flex justify-between font-bold">
              <span>Total Top 5:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No hay gastos para mostrar en este período.</p>
        )}
      </CardContent>
    </Card>
  );
};


export default function ExpensesPage() {
    const { financialRecords, financialCategories, addExpense, updateFinancialRecord, deleteFinancialRecord, loading: loadingFinances } = useFinances();
    const { vehicles, vehiclesLoading } = useVehicles();
    const { clients, loading: loadingClients } = useClients();
    const { companies, selectedCompanyId } = useData();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const loadingData = loadingFinances || vehiclesLoading || loadingClients;
    const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Separated state for delete dialog
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
      .filter((r): r is FinancialRecord & { type: 'expense' } => 
        r.type === 'expense' && !r.isDeleted
      )
      .map(expense => ({
        ...expense,
        sortableDate: infallibleNormalizeDate(expense.date)?.getTime() || 0,
        clientName: expense.clientId ? clientMap.get(expense.clientId) || 'N/A' : 'N/A',
        vehicleName: expense.vehicleId ? vehicleMap.get(expense.vehicleId) || 'N/A' : 'N/A',
        categoryName: categoryMap.get(expense.categoryId || '') || expense.category || 'General',
      }));

      // Ordenar por fecha descendente
      return expenses.sort((a, b) => b.sortableDate - a.sortableDate);
  }, [financialRecords, clients, vehicles, selectedCompanyId, financialCategories]);
  
  const stats = useMemo(() => {
    const totalExpenses = expensesWithDetails.reduce((sum, item) => sum + (item.amount || 0), 0);
    return {
      totalExpenses,
      totalRecords: expensesWithDetails.length,
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
                await updateFinancialRecord(editingRecord.id, sanitizedData);
                toast.success('Gasto actualizado', { id: toastId });
            } else {
                // Calcular amount total de los items
                const totalAmount = sanitizedData.items.reduce((sum, item) => sum + item.amount, 0);
                const description = sanitizedData.items.map(item => `${item.concept}: ${formatCurrency(item.amount)}`).join(' | ');

                // Obtener nombre de la categoría
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
            toast.error('Error al guardar', { id: toastId, description: error instanceof Error ? error.message : 'Error desconocido' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = useCallback((record: ExpenseData) => {
        handleOpenModal(record);
    }, [handleOpenModal]);

    const handleDeleteRequest = useCallback((record: ExpenseData) => {
        setRecordToDelete(record);
        setIsDeleteDialogOpen(true);
    }, []);

    const handleCloseDeleteDialog = useCallback(() => {
      if (isSubmitting) return; // Prevent closing while an operation is in progress
      setIsDeleteDialogOpen(false);
      // Give time for modal animation to finish before clearing the data
      setTimeout(() => setRecordToDelete(null), 300);
    }, [isSubmitting]);
    
    // ✅ Flujo de borrado corregido
    const confirmDelete = async () => {
      if (!recordToDelete) return;
    
      const toastId = toast.loading("Eliminando gasto...");
      setIsSubmitting(true); // Usar el estado `isSubmitting` general para bloquear la UI
      
      // Llamar a deleteFinancialRecord y pasar el callback onSuccess
      await deleteFinancialRecord(recordToDelete.id, () => {
        toast.success("Gasto eliminado", { id: toastId });
        handleCloseDeleteDialog(); // Cerrar el modal solo cuando la operación es exitosa
      });

      // La mutación se encargará del error y del `finally`, por lo que no es necesario aquí.
      // Se resetea el estado isSubmitting en el modal de confirmación.
    };

  const columns = useMemo(
      () => getColumns(handleEdit, handleDeleteRequest, expensesWithDetails),
      [expensesWithDetails, handleEdit, handleDeleteRequest]
  );
  
  if (loadingData) {
    return <GlobalLoader />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
                <div className="h-4 w-4 text-red-600">↓</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(stats.totalExpenses)}
                </div>
                <p className="text-xs text-muted-foreground">
                    Total de {stats.totalRecords} gastos en el período seleccionado.
                </p>
              </CardContent>
          </Card>
          <ExpenseCategoryBreakdown expenses={expensesWithDetails} />
      </div>

      <Card>
          <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                      <CardTitle className="text-lg">Registro de Gastos Operativos</CardTitle>
                      <CardDescription>Gestiona todos los gastos asociados a los vehículos y la operación.</CardDescription>
                  </div>
                  <Button onClick={() => handleOpenModal()}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Agregar Gasto
                  </Button>
              </div>
          </CardHeader>
          <CardContent>
              <ResponsiveTable
                  columns={columns}
                  data={expensesWithDetails}
                  loading={loadingData}
                  searchPlaceholder="Buscar por descripción, categoría, cliente..."
                  noResultsText="No se encontraron gastos para el período seleccionado."
                  mobileCardRenderer={(record) => (
                    <ExpenseMobileCard record={record} onEdit={handleEdit} onDelete={handleDeleteRequest} />
                  )}
              />
          </CardContent>
      </Card>
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
        descriptionText={`¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.`}
        itemName={recordToDelete?.description || ''}
        isDeleting={isSubmitting}
      />
    </div>
  );
}
