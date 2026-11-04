// app/(partner)/expenses/components/expense-evidence-modal.tsx
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, Image as ImageIcon, X, FileText, Wrench, Package } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import type { FinancialRecord, Vehicle } from '@/types';
import { useState } from 'react';
import Image from 'next/image';
import { openSafeUrl } from '@/lib/security/safe-url';

interface ExpenseEvidenceModalProps {
  expense: FinancialRecord;
  vehicle?: Vehicle;
  isOpen: boolean;
  onClose: () => void;
}

export function ExpenseEvidenceModal({
  expense,
  vehicle,
  isOpen,
  onClose
}: ExpenseEvidenceModalProps) {
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  const evidences = [
    {
      key: 'ticket',
      label: 'Ticket/Factura',
      icon: FileText,
      url: expense.evidenceUrls?.[0],
    },
    {
      key: 'damaged',
      label: 'Pieza Dañada',
      icon: Wrench,
      url: expense.evidenceUrls?.[1],
    },
    {
      key: 'new',
      label: 'Pieza Nueva',
      icon: Package,
      url: expense.evidenceUrls?.[2],
    },
  ].filter((e): e is typeof e & { url: string } =>
    typeof e.url === 'string'
  ); // Solo mostrar las que tienen URL string

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error al descargar imagen:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles del Gasto</DialogTitle>
        </DialogHeader>

        {/* Información del gasto */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Información General</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Fecha</p>
              <p className="font-medium">
                {format(new Date(expense.date), 'PPP', { locale: es })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Categoría</p>
              <Badge variant="outline" className="mt-1">{expense.category}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vehículo</p>
              <p className="font-medium">{vehicle?.alias || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Monto</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(expense.amount)}
              </p>
            </div>
            {expense.description && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Descripción</p>
                <p className="font-medium mt-1">{expense.description}</p>
              </div>
            )}
            {expense.notes && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">Notas</p>
                <p className="text-sm mt-1">{expense.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evidencias fotográficas */}
        {evidences.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Evidencias Fotográficas ({evidences.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={evidences[0].key} className="w-full">
                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${evidences.length}, 1fr)` }}>
                  {evidences.map(evidence => {
                    const Icon = evidence.icon;
                    return (
                      <TabsTrigger key={evidence.key} value={evidence.key} className="gap-2">
                        <Icon className="h-4 w-4" />
                        {evidence.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {evidences.map(evidence => (
                  <TabsContent key={evidence.key} value={evidence.key} className="mt-4">
                    <div className="space-y-4">
                      {/* Visor de imagen */}
                      <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden border-2 border-border">
                        {!imageError[evidence.key] ? (
                          <Image
                            src={evidence.url!}
                            alt={evidence.label}
                            fill
                            className="object-contain"
                            onError={() => setImageError({ ...imageError, [evidence.key]: true })}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">
                                No se pudo cargar la imagen
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Controles */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => openSafeUrl(evidence.url)}
                        >
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Ver en Pantalla Completa
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleDownload(
                            evidence.url!,
                            `${evidence.key}-${expense.id}.jpg`
                          )}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Este gasto no tiene evidencias fotográficas adjuntas
              </p>
            </CardContent>
          </Card>
        )}

        {/* Botón de cerrar */}
        <div className="flex justify-end">
          <Button onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}