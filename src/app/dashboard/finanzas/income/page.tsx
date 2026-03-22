
"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { DateRange } from 'react-day-picker';
import { infallibleNormalizeDate, formatDate } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/utils';
import { toast as sonnerToast } from 'sonner';
import { PARTNER_PAYMENT_CATEGORY_ID, CREDIT_PAYMENT_CATEGORY } from '@/contexts/finance-constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Download, FileText, MoreHorizontal, Edit, Trash2, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { startOfDay, endOfDay, format } from 'date-fns';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import IncomeForm from './components/IncomeForm';
import MassIncomeForm from './components/MassIncomeForm';
// import { NotificationService } from '@/lib/notification-service'; // Removed unused import

const IncomeMobileCard = ({ record, onEdit, onDelete }: { record: IncomeData, onEdit: (r: IncomeData) => void, onDelete: (r: IncomeData) => void }) => {
  const isCreditGranted = record.creditGranted === true;
  const canDelete = record.canDelete !== false && !isCreditGranted;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{record.description}</h3>
            <Badge variant={record.type === 'income' ? 'default' : 'secondary'}>
              {record.type === 'payment' ? 'Pago/Abono' : 'Ingreso/Cargo'}
            </Badge>
            {isCreditGranted && (
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                Crédito
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p className={`font-bold text-lg ${record.type === 'payment' ? 'text-green-600' : ''}`}>{formatCurrency(record.amount)}</p>
            <p><strong>Categoría:</strong> {record.categoryName}</p>
            <p><strong>Fecha:</strong> {formatDate(record.date)}</p>
            {record.clientName !== 'N/A' && <p><strong>Cliente:</strong> {record.clientName}</p>}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(record)}><Edit className="mr-2 h-4 w-4"/>Editar</DropdownMenuItem>
            {canDelete ? (
              <DropdownMenuItem onSelect={() => onDelete(record)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Eliminar</DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled className="text-muted-foreground">
                <Trash2 className="mr-2 h-4 w-4"/>
                {isCreditGranted ? 'No eliminable (Crédito)' : 'No eliminable'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
};

export default function IncomesPage() {
  const { financialRecords, financialCategories, deleteFinancialRecord, addIncome, loading: loadingFinances, processCreditPayment } = useFinances();
  const { clients, credits, loading: loadingClients } = useClients();
  const { vehicles, vehiclesLoading } = useVehicles();
  const { companies, selectedCompanyId, partners } = useData();
  const { currentUser } = useAuth();

  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);
  const loadingData = loadingFinances || loadingClients || vehiclesLoading;
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<IncomeData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);
  const [isMassIncomeFormOpen, setIsMassIncomeFormOpen] = useState(false);

  const incomes = useMemo(() => {
    const companyFilteredRecords = selectedCompanyId 
      ? financialRecords.filter(r => r.companyId === selectedCompanyId)
      : financialRecords;

    let allIncomes = mapIncomes(companyFilteredRecords, clients, vehicles, financialCategories);
    
    allIncomes = allIncomes.filter(income => !income.isDeleted);

    if (dateRange?.from) {
        const fromDate = startOfDay(dateRange.from).getTime();
        allIncomes = allIncomes.filter(income => {
            const incomeDate = infallibleNormalizeDate(income.date);
            return incomeDate && incomeDate.getTime() >= fromDate;
        });
    }
    if (dateRange?.to) {
        const toDate = endOfDay(dateRange.to).getTime();
        allIncomes = allIncomes.filter(income => {
            const incomeDate = infallibleNormalizeDate(income.date);
            return incomeDate && incomeDate.getTime() <= toDate;
        });
    }

    // Ordenar por fecha descendente
    return allIncomes.sort((a, b) => b.sortableDate - a.sortableDate);
  }, [financialRecords, clients, vehicles, dateRange, selectedCompanyId, financialCategories]);

  
  const incomeAndPaymentCategories = useMemo(() => {
    const isPrivileged = currentUser?.role === 'superAdmin' || currentUser?.role === 'admin';
    if (!financialCategories) return [];

    return financialCategories.filter(cat => {
        if (cat.id === PARTNER_PAYMENT_CATEGORY_ID) {
            return isPrivileged;
        }
        return cat.type === 'income' || cat.type === 'payment';
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [financialCategories, currentUser]);

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
    if (recordToDelete) {
      // Validación: No permitir eliminar registros de crédito otorgado
      if (recordToDelete.creditGranted === true) {
        sonnerToast.error("No se puede eliminar", {
          description: "Los registros de 'Crédito Otorgado' no se pueden eliminar desde aquí. Debes gestionar el crédito desde la sección de Créditos."
        });
        handleCloseDeleteDialog();
        return;
      }

      setIsSubmitting(true);
      const toastId = sonnerToast.loading("Eliminando registro...");
      try {
        await deleteFinancialRecord(recordToDelete.id);
        sonnerToast.success("Registro Eliminado", { id: toastId });
        handleCloseDeleteDialog();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "No se pudo eliminar el registro.";
        sonnerToast.error("Error al eliminar", { id: toastId, description: errorMessage });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const exportData = useCallback(() => {
    const dataToExport = incomes.map(item => ({
      'Fecha': formatDate(item.date),
      'Descripción': item.description,
      'Categoría': item.categoryName,
      'Tipo': item.type === 'income' ? 'Ingreso/Cargo' : 'Pago/Abono',
      'Monto': item.amount,
      'Cliente': item.clientName,
      'Vehículo': item.vehicleName,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ingresos_y_Pagos");
    XLSX.writeFile(wb, `ingresos_pagos_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }, [incomes]);

  const handleIncomeSubmit = async (data: any, category?: FinancialCategory) => {
    setIsSubmitting(true);
    try {
      await addIncome(data);
      sonnerToast.success('Ingreso creado exitosamente');
      setIsIncomeFormOpen(false);
    } catch (error) {
      sonnerToast.error('Error al crear ingreso', {
        description: error instanceof Error ? error.message : 'Intenta de nuevo.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const columns = useMemo(
      () => getColumns(() => {}, handleDeleteRequest, incomes), 
      [incomes, handleDeleteRequest]
  );

  if (loadingData) {
    return <p>Cargando ingresos...</p>;
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg">Registros de Ingresos y Pagos</CardTitle>
                <CardDescription>
                  Gestiona ingresos por rentas, cargos y abonos de clientes
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" onClick={() => setIsIncomeFormOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nuevo Ingreso
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsMassIncomeFormOpen(true)}>
                  <Users className="mr-2 h-4 w-4" />
                  Ingreso Masivo
                </Button>
                <Button variant="outline" size="sm" onClick={exportData} disabled={incomes.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <ResponsiveTable
              columns={columns}
              data={incomes}
              loading={loadingData}
              searchPlaceholder="Buscar por cliente, descripción, categoría..."
              noResultsText="No se encontraron registros para los filtros aplicados."
              mobileCardRenderer={(record) => (
                <IncomeMobileCard record={record} onEdit={() => {}} onDelete={handleDeleteRequest} />
              )}
            />
          </CardContent>
        </Card>
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

      {/* Modal de Ingreso Individual */}
      <Dialog open={isIncomeFormOpen} onOpenChange={setIsIncomeFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Ingreso</DialogTitle>
          </DialogHeader>
          <IncomeForm
            onSubmit={handleIncomeSubmit}
            initialData={null}
            companies={companies}
            incomeAndPaymentCategories={incomeAndPaymentCategories}
            isSubmitting={isSubmitting}
            onClose={() => setIsIncomeFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Ingreso Masivo */}
      <Dialog open={isMassIncomeFormOpen} onOpenChange={setIsMassIncomeFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ingreso Masivo de Rentas</DialogTitle>
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
