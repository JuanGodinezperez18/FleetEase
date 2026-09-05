"use client";

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit, Search, Trash2, CreditCard, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { MultaWithDetails } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFinances } from '@/contexts/providers/finances-provider';
import { toast } from 'sonner';

interface MultasTableProps {
  multas: MultaWithDetails[];
  onEdit: (multa: MultaWithDetails) => void;
}

export function MultasTable({ multas, onEdit }: MultasTableProps) {
  const { deleteMulta, processMultaPayment } = useFinances();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [vehicleFilter, setVehicleFilter] = useState<string>('todos');
  const [multaToDelete, setMultaToDelete] = useState<MultaWithDetails | null>(null);
  const [multaToPay, setMultaToPay] = useState<MultaWithDetails | null>(null);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Transferencia');
  const [paying, setPaying] = useState(false);

  const uniqueVehicles = useMemo(() => {
    const vehiclesMap = new Map();
    multas.forEach(m => {
      if (m.vehiclePlate && !vehiclesMap.has(m.vehicleId)) {
        vehiclesMap.set(m.vehicleId, {
          id: m.vehicleId,
          plate: m.vehiclePlate,
          alias: m.vehicleAlias,
        });
      }
    });
    return Array.from(vehiclesMap.values());
  }, [multas]);

  const filteredMultas = useMemo(() => {
    return multas.filter(multa => {
      const matchesSearch =
        searchTerm === '' ||
        multa.folio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        multa.vehiclePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        multa.vehicleAlias?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        multa.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        multa.descripcion.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'todos' || multa.status === statusFilter;
      const matchesVehicle = vehicleFilter === 'todos' || multa.vehicleId === vehicleFilter;

      return matchesSearch && matchesStatus && matchesVehicle;
    });
  }, [multas, searchTerm, statusFilter, vehicleFilter]);

  const getStatusBadge = (status: string) => {
    const variants = {
      pendiente: 'destructive',
      pagada: 'default',
      en_proceso: 'secondary',
      cancelada: 'outline',
    };

    const labels = {
      pendiente: 'Pendiente',
      pagada: 'Pagada',
      en_proceso: 'En Proceso',
      cancelada: 'Cancelada',
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const handleDelete = async () => {
    if (!multaToDelete) return;

    try {
      await deleteMulta(multaToDelete.id);
      toast.success('Multa eliminada exitosamente');
      setMultaToDelete(null);
    } catch (error) {
      console.error('Error al eliminar multa:', error);
      toast.error('Error al eliminar la multa');
    }
  };

  const openPaymentDialog = (multa: MultaWithDetails) => {
    if (multa.status === 'pagada' || multa.status === 'cancelada') return;
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('Transferencia');
    setMultaToPay(multa);
  };

  const handlePayment = async () => {
    if (!multaToPay || !paymentDate) return;

    try {
      setPaying(true);
      await processMultaPayment(multaToPay.id, {
        clientId: multaToPay.clientId,
        vehicleId: multaToPay.vehicleId,
        companyId: multaToPay.companyId,
        amount: multaToPay.total,
        date: paymentDate,
        paymentMethod,
        description: `Pago de multa${multaToPay.folio ? ` - Folio ${multaToPay.folio}` : ''}`,
        isDeleted: false,
      });
      toast.success('Multa pagada correctamente', {
        description: `Se registró el pago de ${formatCurrency(multaToPay.total)} y la multa pasó a Pagada.`,
      });
      setMultaToPay(null);
    } catch (error) {
      console.error('Error al registrar pago de multa:', error);
      toast.error('No se pudo registrar el pago de la multa');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por folio, vehículo, cliente o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Vehículo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los vehículos</SelectItem>
            {uniqueVehicles.map((vehicle) => (
              <SelectItem key={vehicle.id} value={vehicle.id}>
                {vehicle.alias} - {vehicle.plate}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendientes</SelectItem>
            <SelectItem value="en_proceso">En Proceso</SelectItem>
            <SelectItem value="pagada">Pagadas</SelectItem>
            <SelectItem value="cancelada">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMultas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No se encontraron multas
                </TableCell>
              </TableRow>
            ) : (
              filteredMultas.map((multa) => (
                <TableRow key={multa.id}>
                  <TableCell className="font-medium">{multa.folio || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{format(new Date(multa.fechaInfraccion), 'dd/MM/yyyy', { locale: es })}</span>
                      <span className="text-xs text-muted-foreground">Hace {multa.daysOverdue} días</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{multa.vehiclePlate}</span>
                      <span className="text-xs text-muted-foreground">{multa.vehicleAlias}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{multa.clientName}</span>
                      {multa.clientPhone && (
                        <span className="text-xs text-muted-foreground">{multa.clientPhone}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate" title={multa.descripcion}>{multa.descripcion}</div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate" title={multa.direccion}>{multa.direccion}</div>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(multa.importe)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(multa.total)}</TableCell>
                  <TableCell>{getStatusBadge(multa.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {multa.status !== 'pagada' && multa.status !== 'cancelada' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Registrar pago"
                          onClick={() => openPaymentDialog(multa)}
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => onEdit(multa)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Eliminar" onClick={() => setMultaToDelete(multa)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!multaToPay} onOpenChange={(open) => !open && !paying && setMultaToPay(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar pago de multa</AlertDialogTitle>
            <AlertDialogDescription>
              {multaToPay && (
                <span>
                  Se registrará el pago total de <strong>{formatCurrency(multaToPay.total)}</strong> para la multa
                  {multaToPay.folio ? ` con folio ${multaToPay.folio}` : ''}. Al confirmar, el estado cambiará a Pagada.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {multaToPay && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="multa-payment-date">Fecha de pago</Label>
                <Input
                  id="multa-payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={paying}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="multa-payment-method">Método de pago</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={paying}>
                  <SelectTrigger id="multa-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                    <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={paying}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePayment} disabled={paying || !paymentDate}>
              {paying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar pago
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!multaToDelete} onOpenChange={(open) => !open && setMultaToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la multa permanentemente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
