"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  FileSpreadsheet,
  FileText,
  FileImage,
  File,
  Download,
  Loader2,
} from 'lucide-react';
import type { ClientWithMetrics } from '@/types';
import type { ExportOptions, ExportFormat } from '@/hooks/use-export-data';

interface ExportDialogProps {
  clients: ClientWithMetrics[];
  balances?: Record<string, number>;
  onExport: (options: ExportOptions) => void;
  onExportTemplate: () => void;
  isExporting?: boolean;
  children: React.ReactNode;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  clients,
  onExport,
  onExportTemplate,
  isExporting = false,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [includeBalance, setIncludeBalance] = useState(true);
  const [includeVehicles, setIncludeVehicles] = useState(true);
  const [includeDocuments, setIncludeDocuments] = useState(false);

  const formatOptions = [
    {
      value: 'xlsx' as ExportFormat,
      label: 'Excel (.xlsx)',
      description: 'Conjunto completo de datos para análisis y edición.',
      icon: FileSpreadsheet,
    },
    {
      value: 'pdf' as ExportFormat,
      label: 'PDF (.pdf)',
      description: 'Reporte formal paginado, listo para compartir o imprimir.',
      icon: FileText,
    },
    {
      value: 'png' as ExportFormat,
      label: 'Imagen (.png)',
      description: 'Reporte visual diseñado; no es una captura de pantalla.',
      icon: FileImage,
    },
    {
      value: 'csv' as ExportFormat,
      label: 'CSV (.csv)',
      description: 'Datos tabulares simples para sistemas compatibles.',
      icon: File,
    },
  ];

  const handleExport = () => {
    onExport({
      type: format,
      includeBalance,
      includeVehicles,
      filename: `clientes_${new Date().toISOString().split('T')[0]}`,
    });
  };

  const handleCheckedChange = (setter: React.Dispatch<React.SetStateAction<boolean>>) =>
    (checked: boolean | 'indeterminate') => {
      if (typeof checked === 'boolean') setter(checked);
    };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Exportar Datos de Clientes</DialogTitle>
          <DialogDescription>
            Genera un archivo con {clients.length} cliente{clients.length !== 1 ? 's' : ''}. El formato visual se genera desde los datos, no desde una captura de pantalla.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Formato de Archivo</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={format}
                onValueChange={(value) => setFormat(value as ExportFormat)}
                className="grid gap-3 sm:grid-cols-2"
              >
                {formatOptions.map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={option.value}
                    className="flex items-start gap-3 rounded-lg border p-4 hover:bg-accent/50 cursor-pointer"
                  >
                    <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                    <option.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <span className="font-medium">{option.label}</span>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contenido Permitido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="include-balance" checked={includeBalance} onCheckedChange={handleCheckedChange(setIncludeBalance)} />
                <Label htmlFor="include-balance" className="cursor-pointer">Incluir información de balance</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="include-vehicles" checked={includeVehicles} onCheckedChange={handleCheckedChange(setIncludeVehicles)} />
                <Label htmlFor="include-vehicles" className="cursor-pointer">Incluir vehículos asignados</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="include-documents" checked={includeDocuments} onCheckedChange={handleCheckedChange(setIncludeDocuments)} disabled />
                <Label htmlFor="include-documents" className="text-muted-foreground cursor-not-allowed">Documentos personales/archivos: no se incluyen (próximamente)</Label>
              </div>
              <p className="text-xs text-muted-foreground rounded-md bg-muted/50 p-3">
                Excel/CSV están pensados para datos tabulares. PDF es un reporte paginado. PNG es una composición visual de datos y no incluye archivos privados, documentos ni una captura de la interfaz.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Button onClick={handleExport} disabled={isExporting} className="w-full">
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Generar Exportación
            </Button>
            <Button variant="outline" onClick={onExportTemplate} className="w-full">
              Descargar Plantilla
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
