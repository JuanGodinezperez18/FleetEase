"use client";

import { useParams } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Check, Ban, Clock, DollarSign, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DataTable } from '@/components/common/data-table';
import type { CreditPaymentSchedule } from '@/types';
import type { ColumnDef } from '@tanstack/react-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function CreditDetailPage() {
  const params = useParams();
  const creditId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const { credits, clients, vehicles, financialRecords, creditPaymentSchedules, financialCategories, selectedCompanyId } = useData();

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const credit = useMemo(() => credits.find(c => c.id === creditId), [credits, creditId]);
  const client = useMemo(() => clients.find(c => c.id === credit?.clientId), [clients, credit]);
  const vehicle = useMemo(() => vehicles.find(v => v.id === credit?.vehicleId), [vehicles, credit]);

  const payments = useMemo(() => financialRecords.filter(fr => fr.creditId === creditId && fr.type === 'payment' && !fr.isDeleted).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [financialRecords, creditId]);
  const schedule = useMemo(() => creditPaymentSchedules.filter(s => s.creditId === creditId).sort((a, b) => a.paymentNumber - b.paymentNumber), [creditPaymentSchedules, creditId]);

  const getCategoryName = (categoryId: string) => financialCategories.find(c => c.id === categoryId)?.name || 'Sin categoría';

  const scheduleColumns: ColumnDef<CreditPaymentSchedule>[] = [
    { accessorKey: 'paymentNumber', header: 'Pago #' },
    { accessorKey: 'dueDate', header: 'Fecha Vencimiento', cell: ({ row }) => format(new Date(row.original.dueDate), "PPP", { locale: es }) },
    { accessorKey: 'status', header: 'Estado', cell: ({ row }) => {
      const schedulePayment = row.original;
      const paidAmount = Number(schedulePayment.paidAmount || 0);
      const amount = Number(schedulePayment.amount || 0);
      const isPartial = paidAmount > 0 && paidAmount < amount && schedulePayment.status !== 'cancelled';
      if (schedulePayment.status === 'paid') return <Badge className="bg-green-100 text-green-800"><Check className="mr-1 h-3 w-3" /> Pagado</Badge>;
      if (schedulePayment.status === 'cancelled') return <Badge variant="destructive"><Ban className="mr-1 h-3 w-3" />Cancelado</Badge>;
      if (isPartial) return <Badge variant="outline" className="border-amber-500 text-amber-700"><Clock className="mr-1 h-3 w-3" />Abono parcial</Badge>;
      return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />Pendiente</Badge>;
    } },
    { accessorKey: 'amount', header: 'Cuota', cell: ({ row }) => formatCurrency(row.original.amount) },
    { id: 'paidAmount', header: 'Abonado', cell: ({ row }) => {
      const paidAmount = Number(row.original.paidAmount || 0);
      return <span className={paidAmount > 0 ? 'font-semibold text-green-600' : 'text-muted-foreground'}>{formatCurrency(paidAmount)}</span>;
    } },
    { id: 'remainingAmount', header: 'Pendiente', cell: ({ row }) => {
      const remaining = Math.max(Number(row.original.amount || 0) - Number(row.original.paidAmount || 0), 0);
      return <span className={remaining > 0 ? 'font-semibold' : 'text-muted-foreground'}>{formatCurrency(remaining)}</span>;
    } },
    { accessorKey: 'paidDate', header: 'Fecha de Pago', cell: ({ row }) => row.original.paidDate ? format(new Date(row.original.paidDate), "PPP", { locale: es }) : '-' },
  ];

  if (!credit) return <div>Crédito no encontrado</div>;

  const progress = credit.totalAmount > 0 ? ((credit.paidAmount || 0) / credit.totalAmount) * 100 : 0;

  const handleOpenPaymentDialog = () => {
    const nextPending = schedule.find(s => s.status === 'pending');
    setPaymentAmount(nextPending ? String(Math.max(0, nextPending.amount - Number(nextPending.paidAmount || 0))) : credit.remainingBalance ? String(Math.min(credit.remainingBalance, credit.weeklyPayment || credit.remainingBalance)) : '');
    setPaymentMethod('transferencia');
    setIsPaymentDialogOpen(true);
  };

  const handleRegisterPayment = async () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) { toast({ variant: 'destructive', title: 'Monto inválido', description: 'Ingresa un monto mayor a 0.' }); return; }
    if (amount > (credit.remainingBalance || 0)) { toast({ variant: 'destructive', title: 'El monto excede el saldo', description: `El saldo restante es ${formatCurrency(credit.remainingBalance || 0)}.` }); return; }
    if (!selectedCompanyId) { toast({ variant: 'destructive', title: 'Empresa no seleccionada', description: 'No se pudo determinar la empresa del crédito.' }); return; }

    setIsSubmittingPayment(true);
    try {
      const { data, error } = await supabase.rpc('process_credit_payment_atomic', {
        p_company_id: selectedCompanyId,
        p_credit_id: credit.id,
        p_client_id: credit.clientId,
        p_amount: amount,
        p_payment_date: new Date().toISOString().slice(0, 10),
        p_payment_method: paymentMethod,
        p_reference: null,
        p_created_by: null,
      } as any);
      if (error) throw error;
      if (!data) throw new Error('No se pudo registrar el pago.');
      toast({ title: 'Pago registrado', description: amount >= (credit.remainingBalance || 0) ? '¡Crédito completado! El saldo llegó a $0.' : 'El pago fue aplicado a las cuotas pendientes y el saldo fue actualizado.' });
      setIsPaymentDialogOpen(false);
      setPaymentAmount('');
      router.refresh();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error al registrar el pago', description: error?.message || 'No se pudo registrar el pago.' });
    } finally { setIsSubmittingPayment(false); }
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.push('/dashboard/credits')}><ArrowLeft className="mr-2 h-4 w-4" /> Volver a Créditos</Button>
      <Card>
        <CardHeader><div className="flex justify-between items-start"><div><CardTitle>Detalle del Crédito</CardTitle><CardDescription>Resumen del estado actual del crédito.</CardDescription></div><div className="flex items-center gap-2">{credit.status === 'active' && (credit.remainingBalance || 0) > 0 && <Button onClick={handleOpenPaymentDialog}><DollarSign className="mr-2 h-4 w-4" /> Registrar Pago</Button>}<Badge variant={credit.status === 'active' ? 'default' : (credit.status === 'completed' ? 'secondary' : 'destructive')}>{credit.status}</Badge></div></div></CardHeader>
        <CardContent className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-muted rounded-lg"><p className="text-muted-foreground">Cliente</p><p className="font-semibold">{client?.firstname} {client?.lastname}</p></div>
          <div className="p-3 bg-muted rounded-lg"><p className="text-muted-foreground">Vehículo</p><p className="font-semibold">{vehicle?.make} {vehicle?.model} ({vehicle?.plate})</p></div>
          <div className="p-3 bg-muted rounded-lg"><p className="text-muted-foreground">Monto Total del Crédito</p><p className="font-semibold text-lg">{formatCurrency(credit.totalAmount)}</p></div>
          <div className="p-3 bg-muted rounded-lg"><p className="text-muted-foreground">Monto Pagado</p><p className="font-semibold text-green-600 text-lg">{formatCurrency(credit.paidAmount || 0)}</p></div>
          <div className="p-3 bg-destructive/10 rounded-lg"><p className="text-destructive font-medium">Saldo Pendiente</p><p className="font-semibold text-destructive text-lg">{formatCurrency(credit.remainingBalance || 0)}</p></div>
          <div className="p-3 bg-muted rounded-lg"><p className="text-muted-foreground">Fecha de Inicio</p><p className="font-semibold">{format(new Date(credit.startDate), "PPP", { locale: es })}</p></div>
        </div><div><p className="text-sm text-muted-foreground mb-1">Progreso del Crédito</p><Progress value={progress} className="h-2.5" /><p className="text-xs text-muted-foreground mt-1 text-right">{credit.paymentsMade} de {credit.numberOfPayments} pagos realizados ({progress.toFixed(1)}%)</p></div></CardContent>
      </Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5"/> Calendario de Pagos</CardTitle><CardDescription>Plan de pagos completo. Los abonos mayores a una cuota se aplican automáticamente a las siguientes cuotas.</CardDescription></CardHeader><CardContent><DataTable columns={scheduleColumns} data={schedule} noResultsText="No hay calendario de pagos para este crédito." /></DataTable></CardContent></Card>
      <Card><CardHeader><CardTitle>Historial de Pagos Registrados ({payments.length})</CardTitle><CardDescription>Lista de todas las transacciones de abono registradas para este crédito.</CardDescription></CardHeader><CardContent><div className="space-y-3">{payments.map(payment => { const categoryName = getCategoryName(payment.categoryId); return <div key={payment.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50"><div><p className="font-semibold text-green-600">{formatCurrency(payment.amount)}</p><p className="text-sm text-muted-foreground">{format(new Date(payment.date), "PPP", { locale: es })}</p></div><Badge variant={categoryName === "Pago de Crédito" ? 'default' : 'secondary'}>{categoryName}</Badge></div>; })}{payments.length === 0 && <p className="text-sm text-muted-foreground">No hay pagos registrados para este crédito.</p>}</div></CardContent></Card>
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}><DialogContent><DialogHeader><DialogTitle>Registrar Pago de Crédito</DialogTitle><DialogDescription>El pago se aplicará automáticamente a las cuotas pendientes en orden.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label htmlFor="paymentAmount">Monto del pago</Label><Input id="paymentAmount" type="number" min="0.01" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} /></div><div><Label>Método de pago</Label><select className="w-full border rounded-md h-10 px-3 bg-background" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="cheque">Cheque</option></select></div></div><DialogFooter><Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} disabled={isSubmittingPayment}>Cancelar</Button><Button onClick={handleRegisterPayment} disabled={isSubmittingPayment}>{isSubmittingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}Registrar Pago</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
