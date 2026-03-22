// app/(partner)/inspections/components/inspection-viewer-modal.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface InspectionViewerModalProps {
  inspection: any;
  isOpen: boolean;
  onClose: () => void;
}

export function InspectionViewerModal({
  inspection,
  isOpen,
  onClose,
}: InspectionViewerModalProps) {
  const [currentView, setCurrentView] = useState<'front' | 'left' | 'right' | 'rear'>('front');

  if (!inspection) return null;

  const views = [
    { key: 'front', label: 'Frente', url: inspection.photos.front },
    { key: 'left', label: 'Izquierda', url: inspection.photos.left },
    { key: 'right', label: 'Derecha', url: inspection.photos.right },
    { key: 'rear', label: 'Trasera', url: inspection.photos.rear },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{inspection.vehicleName} - Inspección Visual</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {inspection.date ? format(inspection.date, 'PPP', { locale: es }) : 'Fecha desconocida'}
          </p>
        </DialogHeader>

        <Tabs value={currentView} onValueChange={(value: any) => setCurrentView(value)}>
          <TabsList className="grid w-full grid-cols-4">
            {views.map(view => (
              <TabsTrigger key={view.key} value={view.key} disabled={!view.url}>
                {view.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {views.map(view => (
            <TabsContent key={view.key} value={view.key} className="mt-4">
              {view.url ? (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <img
                      src={view.url}
                      alt={`Vista ${view.label}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.open(view.url, '_blank')}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descargar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Foto no disponible</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Información adicional */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Vehículo</p>
            <p className="font-medium">{inspection.vehicleModel}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fecha de inspección</p>
            <p className="font-medium">
              {inspection.date ? format(inspection.date, 'PPp', { locale: es }) : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Expira en</p>
            <p className={`font-medium ${inspection.isExpired ? 'text-red-600' : ''}`}>
              {inspection.isExpired
                ? 'Expirada'
                : `${inspection.daysRemaining} días`}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fotos</p>
            <p className="font-medium">{inspection.photoCount} de 4</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}